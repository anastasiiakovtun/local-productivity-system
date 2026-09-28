const TASK_LINE_RE = /^- \[([ x])\] (.+?) (\^task-[a-z0-9]{6})$/;

/**
 * Parse a single managed-section line into { id, title, done }.
 * Returns null for non-task lines.
 */
export function parseTaskLine(line) {
  const m = line.match(TASK_LINE_RE);
  if (!m) return null;
  return { done: m[1] === 'x', title: m[2], id: m[3] };
}

/**
 * Format a task object back to a line (no trailing newline).
 */
export function formatTaskLine({ title, id, done }) {
  return `- [${done ? 'x' : ' '}] ${title} ${id}`;
}

const START_SENTINEL = '<!-- focus:tasks:start -->';
const END_SENTINEL   = '<!-- focus:tasks:end -->';

/**
 * Insert a new task line into the inner content of a managed section.
 * Returns updated inner string (appended before END sentinel, at end of inner).
 */
export function insertTaskLine(inner, newLine) {
  return inner + newLine + '\n';
}

/**
 * Remove the task line matching taskId from inner content.
 * Returns updated inner string.
 */
export function removeTaskLine(inner, taskId) {
  return inner
    .split('\n')
    .filter((line) => {
      const t = parseTaskLine(line);
      return !(t && t.id === taskId);
    })
    .join('\n');
}

/**
 * Replace the task line matching taskId with newLine.
 * Returns updated inner string.
 */
export function replaceTaskLine(inner, taskId, newLine) {
  return inner
    .split('\n')
    .map((line) => {
      const t = parseTaskLine(line);
      return t && t.id === taskId ? newLine : line;
    })
    .join('\n');
}
