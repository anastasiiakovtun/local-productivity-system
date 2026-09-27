import { readFile, stat } from 'node:fs/promises';

export async function readNote(absolutePath) {
  try {
    const [content, stats] = await Promise.all([
      readFile(absolutePath, 'utf8'),
      stat(absolutePath),
    ]);
    return {
      status: 'success',
      content,
      mtime: Math.round(stats.mtimeMs),
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 'error', reason: 'not-found' };
    if (error?.code === 'EACCES') return { status: 'error', reason: 'not-readable' };
    return { status: 'error', reason: 'unexpected-error' };
  }
}
