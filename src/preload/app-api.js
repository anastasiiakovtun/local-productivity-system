import { CHANNELS, parseAppResult } from '../shared/app-schema.js';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

export function createAppApi(invoke) {
  async function call(channel, ...args) {
    try {
      return parseAppResult(await invoke(channel, ...args));
    } catch {
      return unexpectedError();
    }
  }

  return Object.freeze({
    getPreferences:   ()                                     => call(CHANNELS.GET_PREFERENCES),
    setPreferences:   (prefs)                                => call(CHANNELS.SET_PREFERENCES, prefs),
    createTask:       (fields)                               => call(CHANNELS.TASKS_CREATE, fields),
    editTask:         (id, changes)                          => call(CHANNELS.TASKS_EDIT, id, changes),
    completeTask:     (id)                                   => call(CHANNELS.TASKS_COMPLETE, id),
    reopenTask:       (id)                                   => call(CHANNELS.TASKS_REOPEN, id),
    deleteTask:       (id)                                   => call(CHANNELS.TASKS_DELETE, id),
    listTasks:        (view, filters)                        => call(CHANNELS.TASKS_LIST, view, filters),
    startSession:     (taskId, plannedMinutes)               => call(CHANNELS.SESSIONS_START, taskId, plannedMinutes),
    pauseSession:     (sessionId)                            => call(CHANNELS.SESSIONS_PAUSE, sessionId),
    resumeSession:    (sessionId)                            => call(CHANNELS.SESSIONS_RESUME, sessionId),
    abandonSession:   (sessionId)                            => call(CHANNELS.SESSIONS_ABANDON, sessionId),
    endSession:       (sessionId)                            => call(CHANNELS.SESSIONS_END, sessionId),
    listSessions:     (filters)                              => call(CHANNELS.SESSIONS_LIST, filters),
    saveCheckpoint:   (sessionId, fields)                    => call(CHANNELS.CHECKPOINTS_SAVE, sessionId, fields),
  });
}
