const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateTaskId() {
  let suffix = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) suffix += CHARS[b % CHARS.length];
  return `^task-${suffix}`;
}
