<script setup>
import { computed } from 'vue';
import { PhPause, PhPlay, PhArrowsIn } from '@phosphor-icons/vue';
import { useSessionStore } from '../stores/session.js';
import ProjectCover from './ProjectCover.vue';

defineEmits(['restore']);

const session = useSessionStore();

function pad(n) {
  return String(Math.floor(Math.abs(n))).padStart(2, '0');
}

const displayTime = computed(() => {
  if (session.timerState === 'overflow') {
    const s = session.elapsedOverflow;
    return `+${pad(s / 60)}:${pad(s % 60)}`;
  }
  const s = Math.max(0, session.secondsRemaining);
  return `${pad(s / 60)}:${pad(s % 60)}`;
});

const isPaused = computed(() => session.timerState === 'paused');

async function pause()  { await session.pauseSession(); }
async function resume() { await session.resumeSession(); }
</script>

<template>
  <div class="floating-timer">
    <ProjectCover
      :project-label="session.activeSession?.project_label"
      :color="null"
      :size="28"
    />
    <div class="floating-timer-info">
      <span class="floating-timer-title">{{ session.activeSession?.task_title }}</span>
      <span class="timer-display floating-time">{{ displayTime }}</span>
    </div>
    <div class="floating-timer-controls">
      <button
        v-if="!isPaused"
        type="button"
        class="floating-icon-btn"
        data-action="pause"
        aria-label="Pause"
        @click="pause"
      >
        <PhPause :size="14" />
      </button>
      <button
        v-else
        type="button"
        class="floating-icon-btn"
        data-action="resume"
        aria-label="Resume"
        @click="resume"
      >
        <PhPlay :size="14" />
      </button>
      <button
        type="button"
        class="floating-icon-btn"
        data-action="restore"
        aria-label="Restore timer"
        @click="$emit('restore')"
      >
        <PhArrowsIn :size="14" />
      </button>
    </div>
  </div>
</template>
