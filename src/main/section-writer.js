import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';

const START_SENTINEL = '<!-- focus:tasks:start -->';
const END_SENTINEL   = '<!-- focus:tasks:end -->';

export function splitSection(content) {
  const startIdx = content.indexOf(START_SENTINEL);
  const endIdx   = content.indexOf(END_SENTINEL);

  if (startIdx === -1 && endIdx === -1) {
    return { status: 'error', reason: 'sentinels-missing' };
  }
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return { status: 'error', reason: 'sentinels-malformed' };
  }

  // before = everything up to and including the start-sentinel line's trailing newline
  const afterStart = startIdx + START_SENTINEL.length;
  const beforeEnd  = afterStart + (content[afterStart] === '\n' ? 1 : 0);
  const before     = content.slice(0, beforeEnd);

  // after = from the end sentinel through end of string
  const after = content.slice(endIdx);

  // inner = content between the start-sentinel newline and the end sentinel
  const inner = content.slice(beforeEnd, endIdx);

  return { before, inner, after };
}

export async function writeSection(absolutePath, newSectionContent, expectedMtime) {
  const tmpPath = absolutePath + '.tmp';

  // Conflict check
  try {
    const stats = await stat(absolutePath);
    if (Math.abs(Math.round(stats.mtimeMs) - expectedMtime) > 1) {
      return { status: 'conflict' };
    }
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 'error', reason: 'not-found' };
    return { status: 'error', reason: 'unexpected-error' };
  }

  // Read current content
  let content;
  try {
    content = await readFile(absolutePath, 'utf8');
  } catch {
    return { status: 'error', reason: 'not-readable' };
  }

  // Locate sentinel block
  const split = splitSection(content);
  if (split.status === 'error') return split;

  // Assemble replacement
  const replacement = split.before + newSectionContent + split.after;

  // Atomic write
  try {
    await writeFile(tmpPath, replacement, 'utf8');
    await rename(tmpPath, absolutePath);
    const newStats = await stat(absolutePath);
    return { status: 'success', mtime: Math.round(newStats.mtimeMs) };
  } catch (error) {
    try { await rm(tmpPath, { force: true }); } catch { /* ignore cleanup failure */ }
    if (error?.code === 'EACCES') return { status: 'error', reason: 'not-writable' };
    return { status: 'error', reason: 'unexpected-error' };
  }
}
