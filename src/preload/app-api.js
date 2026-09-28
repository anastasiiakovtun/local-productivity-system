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
    abandonSessionWithOutcome: (sessionId, outcome) => call(CHANNELS.SESSIONS_ABANDON, sessionId, outcome),
    openFloatingTimer:  () => call('floating:open'),
    closeFloatingTimer: () => call('floating:close'),
    endSession:       (sessionId)                            => call(CHANNELS.SESSIONS_END, sessionId),
    getActiveSession: ()                                     => call('sessions:get-active'),
    getLastCheckpoint:(taskId)                               => call('sessions:get-checkpoint', taskId),
    listSessions:     (filters)                              => call(CHANNELS.SESSIONS_LIST, filters),
    saveCheckpoint:   (sessionId, fields)                    => call(CHANNELS.CHECKPOINTS_SAVE, sessionId, fields),
    getHomeResume:    ()                                     => call(CHANNELS.HOME_GET_RESUME),
    listProjects:     ()                                     => call(CHANNELS.PROJECTS_LIST),
    setProjectCover:  (projectLabel, color)                  => call(CHANNELS.PROJECTS_SET_COVER, projectLabel, color),
  });
}
