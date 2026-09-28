<script setup>
import { computed } from 'vue';
import { useSessionStore } from '../stores/session.js';

const emit = defineEmits(['end', 'abandoned']);

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

async function pause()   { await session.pauseSession(); }
async function resume()  { await session.resumeSession(); }
async function abandon() {
  await session.abandonSession();
  emit('abandoned');
}
</script>

<template>
  <div class="timer-view">
    <h2>Focus</h2>
    <p style="color:#9ca3af;font-size:14px">{{ session.activeSession?.task_title }}</p>

    <div class="timer-display" :class="{ overflow: isOverflow }">
      {{ displayTime }}
    </div>

    <p v-if="isOverflow" style="color:#f59e0b;font-size:13px;margin-bottom:16px">
      Overflow — minimum commitment reached.
    </p>

    <div class="timer-actions">
      <button v-if="!isPaused" type="button" class="btn-secondary" @click="pause">⏸ Pause</button>
      <button v-else type="button" class="btn-secondary" @click="resume">▶ Resume</button>
      <button type="button" class="btn-primary" @click="emit('end')">End Session</button>
      <button type="button" class="btn-danger" @click="abandon">Abandon</button>
    </div>
  </div>
</template>
