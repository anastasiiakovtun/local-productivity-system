import { describe, expect, it, vi } from 'vitest';
import { createAppApi } from '../../src/preload/app-api.js';
import { CHANNELS } from '../../src/shared/app-schema.js';

describe('createAppApi', () => {
  it('exposes the correct surface keys', () => {
    const api = createAppApi(vi.fn());
    expect(Object.keys(api)).toEqual([
      'getPreferences', 'setPreferences',
      'createTask', 'editTask', 'completeTask', 'reopenTask', 'deleteTask', 'listTasks', 'listTaskEvents',
      'startSession', 'pauseSession', 'resumeSession', 'abandonSession', 'abandonSessionWithOutcome',
      'openFloatingTimer', 'closeFloatingTimer', 'endSession',
      'getActiveSession', 'getLastCheckpoint',
      'listSessions', 'saveCheckpoint',
      'getHomeResume', 'listProjects', 'setProjectCover',
    ]);
  });

  it('getPreferences invokes the correct channel', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'success', data: {} });
    await createAppApi(invoke).getPreferences();
    expect(invoke).toHaveBeenCalledWith(CHANNELS.GET_PREFERENCES);
  });

  it('createTask passes fields to the correct channel', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'success', data: {} });
    await createAppApi(invoke).createTask({ title: 'Test' });
    expect(invoke).toHaveBeenCalledWith(CHANNELS.TASKS_CREATE, { title: 'Test' });
  });

  it('project and Home APIs invoke their channels', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'success', data: {} });
    const api = createAppApi(invoke);
    await api.getHomeResume();
    await api.listProjects();
    await api.setProjectCover('Thesis', '#2dd4bf');
    expect(invoke).toHaveBeenNthCalledWith(1, CHANNELS.HOME_GET_RESUME);
    expect(invoke).toHaveBeenNthCalledWith(2, CHANNELS.PROJECTS_LIST);
    expect(invoke).toHaveBeenNthCalledWith(3, CHANNELS.PROJECTS_SET_COVER, 'Thesis', '#2dd4bf');
  });

  it('converts a malformed result to unexpected-error', async () => {
    const api = createAppApi(vi.fn().mockResolvedValue({ notStatus: true }));
    const result = await api.getPreferences();
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
  });

  it('converts an IPC rejection to unexpected-error', async () => {
    const api = createAppApi(vi.fn().mockRejectedValue(new Error('ipc fail')));
    const result = await api.listTasks('inbox');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
  });
});
