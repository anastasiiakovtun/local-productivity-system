import { describe, it, expect } from 'vitest';
import { ref, computed } from 'vue';
import { useTimerDisplay } from '../../src/composables/useTimerDisplay.js';

function makeSession(overrides = {}) {
  return {
    timerState:       overrides.timerState       ?? 'running',
    secondsRemaining: overrides.secondsRemaining ?? 0,
    elapsedOverflow:  overrides.elapsedOverflow  ?? 0,
  };
}

describe('useTimerDisplay', () => {
  it('formats remaining seconds as MM:SS', () => {
    const s = makeSession({ secondsRemaining: 754 }); // 12:34
    const { displayTime } = useTimerDisplay(s);
    expect(displayTime.value).toBe('12:34');
  });

  it('clamps negative remaining to 00:00', () => {
    const s = makeSession({ secondsRemaining: -5 });
    const { displayTime } = useTimerDisplay(s);
    expect(displayTime.value).toBe('00:00');
  });

  it('formats overflow as +MM:SS', () => {
    const s = makeSession({ timerState: 'overflow', elapsedOverflow: 90 });
    const { displayTime } = useTimerDisplay(s);
    expect(displayTime.value).toBe('+01:30');
  });

  it('isOverflow true only in overflow state', () => {
    const s = makeSession({ timerState: 'overflow' });
    const { isOverflow } = useTimerDisplay(s);
    expect(isOverflow.value).toBe(true);
  });

  it('isPaused true only in paused state', () => {
    const s = makeSession({ timerState: 'paused' });
    const { isPaused } = useTimerDisplay(s);
    expect(isPaused.value).toBe(true);
  });

  it('isPaused false when running', () => {
    const s = makeSession({ timerState: 'running' });
    const { isPaused } = useTimerDisplay(s);
    expect(isPaused.value).toBe(false);
  });
});
