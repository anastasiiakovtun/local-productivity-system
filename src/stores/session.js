import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSessionStore = defineStore('session', () => {
  const activeSession = ref(null);   // session row from DB
  const lastCheckpoint = ref(null);  // last checkpoint for current task
  const timerState = ref('idle');    // idle | running | paused | overflow
  const secondsRemaining = ref(0);
  const elapsedOverflow = ref(0);
  let ticker = null;

  function tick() {
    if (!activeSession.value) return;
    const { started_occurred_at_utc, paused_seconds, planned_minutes } = activeSession.value;
    const startMs = new Date(started_occurred_at_utc).getTime();
    const elapsed = Math.floor((Date.now() - startMs) / 1000) - (paused_seconds ?? 0);
    const total = planned_minutes * 60;
    const remaining = total - elapsed;
    secondsRemaining.value = remaining;
    if (remaining <= 0) {
      timerState.value = 'overflow';
      elapsedOverflow.value = -remaining;
    }
  }

  function startTicker() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, 1000);
    tick();
  }

  function stopTicker() {
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  async function loadActiveSession() {
    const r = await window.app.getActiveSession();
    if (r.status === 'success' && r.data) {
      activeSession.value = r.data;
      timerState.value = r.data.status === 'paused' ? 'paused' : 'running';
      startTicker();
    } else {
      activeSession.value = null;
      timerState.value = 'idle';
    }
  }

  async function loadLastCheckpoint(taskId) {
    const r = await window.app.getLastCheckpoint(taskId);
    lastCheckpoint.value = r.status === 'success' ? r.data : null;
  }

  async function startSession(taskId, plannedMinutes) {
    const r = await window.app.startSession(taskId, plannedMinutes);
    if (r.status === 'success') {
      activeSession.value = r.data;
      timerState.value = 'running';
      elapsedOverflow.value = 0;
      startTicker();
    }
    return r;
  }

  async function pauseSession() {
    if (!activeSession.value) return;
    const r = await window.app.pauseSession(activeSession.value.session_id);
    if (r.status === 'success') {
      activeSession.value = r.data;
      timerState.value = 'paused';
      stopTicker();
    }
    return r;
  }

  async function resumeSession() {
    if (!activeSession.value) return;
    const r = await window.app.resumeSession(activeSession.value.session_id);
    if (r.status === 'success') {
      activeSession.value = r.data;
      timerState.value = 'running';
      startTicker();
    }
    return r;
  }

  async function abandonSession() {
    if (!activeSession.value) return;
    stopTicker();
    const r = await window.app.abandonSessionWithOutcome(activeSession.value.session_id, null);
    if (r.status === 'success') {
      activeSession.value = null;
      timerState.value = 'idle';
    }
    return r;
  }

  async function abandonSessionWithOutcome(outcome = null) {
    if (!activeSession.value) return;
    stopTicker();
    const r = await window.app.abandonSessionWithOutcome(activeSession.value.session_id, outcome ?? null);
    if (r.status === 'success') {
      activeSession.value = null;
      timerState.value = 'idle';
    }
    return r;
  }

  function clearSession() {
    stopTicker();
    activeSession.value = null;
    timerState.value = 'idle';
    lastCheckpoint.value = null;
  }

  return {
    activeSession, lastCheckpoint, timerState,
    secondsRemaining, elapsedOverflow,
    loadActiveSession, loadLastCheckpoint,
    startSession, pauseSession, resumeSession, abandonSession, abandonSessionWithOutcome, clearSession,
  };
});
