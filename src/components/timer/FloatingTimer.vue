<script setup>
import { PhPause, PhPlay, PhArrowsIn } from '@phosphor-icons/vue';
import { useSessionStore } from '../../stores/session.js';
import { useTimerDisplay } from '../../composables/useTimerDisplay.js';
import ProjectCover from '../base/ProjectCover.vue';

defineEmits(['restore']);

const session = useSessionStore();
const { displayTime, isPaused } = useTimerDisplay(session);

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
