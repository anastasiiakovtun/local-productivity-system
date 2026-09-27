import { realpath } from 'node:fs/promises';
import path from 'node:path';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

export async function guardPath(vaultRoot, relativePath) {
  try {
    // Empty string is always a traversal (no specific child was requested)
    if (relativePath === '') return { status: 'error', reason: 'traversal' };

    // Canonicalize vaultRoot itself — on macOS /var is a symlink to /private/var
    let canonicalRoot;
    try {
      canonicalRoot = await realpath(vaultRoot);
    } catch {
      canonicalRoot = vaultRoot;
    }

    const rootWithSep = canonicalRoot.endsWith(path.sep) ? canonicalRoot : canonicalRoot + path.sep;
    const isInsideVault = (p) => p === canonicalRoot || p.startsWith(rootWithSep);

    // Resolve against vault root (absolute relativePath overrides — handled by path.resolve)
    const normalized = path.normalize(path.resolve(canonicalRoot, relativePath));

    // Check pre-realpath containment to catch .. traversal and absolute-outside paths
    if (!isInsideVault(normalized)) {
      return {
        status: 'error',
        reason: path.isAbsolute(relativePath) ? 'not-in-vault' : 'traversal',
      };
    }

    // Resolve symlinks for paths that exist; non-existent paths stay normalized
    let canonical;
    try {
      canonical = await realpath(normalized);
    } catch {
      canonical = normalized;
    }

    // Symlink target may escape the vault
    if (!isInsideVault(canonical)) {
      return { status: 'error', reason: 'not-in-vault' };
    }

    return { status: 'ok', absolutePath: canonical };
  } catch {
    return unexpectedError();
  }
}
