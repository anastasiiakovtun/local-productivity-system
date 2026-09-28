/**
 * useTimerDisplay
 *
 * Shared timer-formatting logic for TimerModal and FloatingTimer.
 * Takes a session store ref and returns computed display values.
 *
 * Usage:
 *   import { useTimerDisplay } from '@/composables/useTimerDisplay.js'
 *   const { displayTime, isOverflow, isPaused } = useTimerDisplay(session)
 */
import { computed } from 'vue';

function pad(n) {
  return String(Math.floor(Math.abs(n))).padStart(2, '0');
}

export function useTimerDisplay(session) {
  const displayTime = computed(() => {
    if (session.timerState === 'overflow') {
      const s = session.elapsedOverflow;
      return `+${pad(s / 60)}:${pad(s % 60)}`;
    }
    const s = Math.max(0, session.secondsRemaining);
    return `${pad(s / 60)}:${pad(s % 60)}`;
  });

  const isOverflow = computed(() => session.timerState === 'overflow');
  const isPaused   = computed(() => session.timerState === 'paused');

  return { displayTime, isOverflow, isPaused };
}
