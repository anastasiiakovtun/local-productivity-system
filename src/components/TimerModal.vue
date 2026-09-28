<script setup>
import { computed } from 'vue';
import { PhPause, PhPlay, PhX, PhMinus } from '@phosphor-icons/vue';
import { useSessionStore } from '../stores/session.js';
import ProjectCover from './ProjectCover.vue';

const props = defineProps({
  showFloatingToggle: { type: Boolean, default: false },
});

const emit = defineEmits(['finish', 'request-abandon', 'minimize']);

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

const isOverflow = computed(() => session.timerState === 'overflow');
const isPaused   = computed(() => session.timerState === 'paused');

async function pause()  { await session.pauseSession(); }
async function resume() { await session.resumeSession(); }
</script>

<template>
  <div class="timer-modal-backdrop" role="dialog" aria-modal="true" aria-label="Focus session timer">
    <div class="timer-modal">
      <!-- Header row: close (→ quick-abandon) + optional minimize -->
      <div class="timer-modal-header">
        <div class="timer-modal-header-actions">
          <button
            v-if="showFloatingToggle"
            type="button"
            class="timer-icon-btn"
            data-action="minimize"
            aria-label="Minimize timer"
            @click="emit('minimize')"
          >
            <PhMinus :size="18" />
          </button>
          <button
            type="button"
            class="timer-icon-btn"
            data-action="close"
            aria-label="Close timer (quick abandon)"
            @click="emit('request-abandon')"
          >
            <PhX :size="18" />
          </button>
        </div>
      </div>

      <!-- Project cover + task identity -->
      <div class="timer-modal-identity">
        <ProjectCover
          :project-label="session.activeSession?.project_label"
          :color="null"
          :size="56"
        />
        <div class="timer-modal-task">
          <p class="timer-modal-project">{{ session.activeSession?.project_label ?? 'No project' }}</p>
          <p class="timer-modal-title">{{ session.activeSession?.task_title }}</p>
        </div>
      </div>

      <!-- Timer display -->
      <div class="timer-display" :class="{ overflow: isOverflow }">
        {{ displayTime }}
      </div>

      <p v-if="isOverflow" class="timer-overflow-label">
        Overflow — minimum commitment reached.
      </p>

      <!-- Planned duration row -->
      <div class="timer-time-row">
        <span class="timer-time-label">Planned</span>
        <span class="timer-time-value">{{ session.activeSession?.planned_minutes }} min</span>
      </div>

      <!-- Controls -->
      <div class="timer-modal-controls">
        <button
          v-if="!isPaused"
          type="button"
          class="btn-secondary timer-control-btn"
          data-action="pause"
          @click="pause"
        >
          <PhPause :size="16" /> Pause
        </button>
        <button
          v-else
          type="button"
          class="btn-secondary timer-control-btn"
          data-action="resume"
          @click="resume"
        >
          <PhPlay :size="16" /> Resume
        </button>
        <button
          type="button"
          class="btn-primary timer-control-btn"
          data-action="finish"
          @click="emit('finish')"
        >
          Finish
        </button>
      </div>
    </div>
  </div>
</template>
