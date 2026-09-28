// Channel name constants for the app IPC surface
export const CHANNELS = {
  GET_PREFERENCES:  'app:get-preferences',
  SET_PREFERENCES:  'app:set-preferences',
  TASKS_CREATE:     'tasks:create',
  TASKS_EDIT:       'tasks:edit',
  TASKS_COMPLETE:   'tasks:complete',
  TASKS_REOPEN:     'tasks:reopen',
  TASKS_DELETE:     'tasks:delete',
  TASKS_LIST:       'tasks:list',
  SESSIONS_START:   'sessions:start',
  SESSIONS_PAUSE:   'sessions:pause',
  SESSIONS_RESUME:  'sessions:resume',
  SESSIONS_ABANDON: 'sessions:abandon',
  SESSIONS_END:     'sessions:end',
  SESSIONS_LIST:    'sessions:list',
  CHECKPOINTS_SAVE: 'checkpoints:save',
};

const ALLOWED_VIEWS = new Set(['inbox', 'today', 'completed']);
const ALLOWED_CHECKPOINT_STATUSES = new Set(['continue', 'blocked', 'completed', 'abandoned']);

// Validates inbound task creation fields
export function validateCreateTask(fields) {
  if (!fields || typeof fields !== 'object') return 'fields must be an object';
  if (typeof fields.title !== 'string' || fields.title.trim() === '') return 'title is required';
  return null;
}

// Validates inbound task edit
export function validateEditTask(id, changes) {
  if (typeof id !== 'string' || !id) return 'id is required';
  if (!changes || typeof changes !== 'object') return 'changes must be an object';
  return null;
}

// Validates view name
export function validateListTasks(view) {
  if (!ALLOWED_VIEWS.has(view)) return `view must be one of: ${[...ALLOWED_VIEWS].join(', ')}`;
  return null;
}

// Validates preferences object
export function validatePreferences(prefs) {
  if (!prefs || typeof prefs !== 'object') return 'prefs must be an object';
  return null;
}

// Validates session start fields
export function validateStartSession(taskId, plannedMinutes) {
  if (typeof taskId !== 'string' || !taskId) return 'taskId is required';
  if (!Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 180) {
    return 'plannedMinutes must be an integer 1–180';
  }
  return null;
}

// Validates checkpoint fields
export function validateCheckpoint(fields) {
  if (!fields || typeof fields !== 'object') return 'fields must be an object';
  if (typeof fields.outcome !== 'string' || fields.outcome.trim() === '') return 'outcome is required';
  if (!ALLOWED_CHECKPOINT_STATUSES.has(fields.status)) return 'invalid status';
  if ((fields.status === 'continue' || fields.status === 'blocked') &&
      (!fields.nextAction || fields.nextAction.trim() === '')) {
    return 'nextAction is required for continue/blocked';
  }
  return null;
}

// Generic result parser — ensures result has { status } at minimum
export function parseAppResult(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.status !== 'string') {
    throw new TypeError('Invalid app result');
  }
  return raw;
}
