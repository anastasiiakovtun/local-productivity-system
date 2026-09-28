<script setup>
import { ref, onMounted } from 'vue';
import { useSessionStore } from '../stores/session.js';

const props = defineProps({
  task: { type: Object, required: true },
});
const emit = defineEmits(['started', 'cancel']);

const session = useSessionStore();
const plannedMinutes = ref(25);
const loadingPrefs = ref(true);

onMounted(async () => {
  // Load default focus minutes from preferences
  const r = await window.app.getPreferences();
  if (r.status === 'success') plannedMinutes.value = r.data.defaultFocusMinutes ?? 25;
  loadingPrefs.value = false;

  // Load last checkpoint for this task
  await session.loadLastCheckpoint(props.task.id);
});

async function start() {
  const r = await session.startSession(props.task.id, plannedMinutes.value);
  if (r.status === 'success') emit('started');
}
</script>

<template>
  <div class="resume-packet">
    <h2>Resume</h2>

    <div class="rp-field">
      <div class="rp-label">Task</div>
      <div class="rp-value">{{ task.title }}</div>
    </div>

    <div class="rp-field">
      <div class="rp-label">Project</div>
      <div class="rp-value">{{ task.project_label || '—' }}</div>
    </div>

    <div class="rp-field">
      <div class="rp-label">Previous checkpoint</div>
      <div v-if="session.lastCheckpoint" class="rp-checkpoint">
        <strong>{{ session.lastCheckpoint.status }}</strong> — {{ session.lastCheckpoint.outcome }}
      </div>
      <div v-else class="rp-checkpoint" style="color:#6b7280">No previous checkpoint.</div>
    </div>

    <div class="duration-row">
      <label for="duration-input" class="rp-label" style="margin:0">Focus duration (min)</label>
      <input
        id="duration-input"
        v-model.number="plannedMinutes"
        class="duration-input"
        type="number"
        min="1"
        max="180"
        :disabled="loadingPrefs"
      />
    </div>

    <div style="display:flex;gap:10px">
      <button type="button" class="btn-primary" @click="start">▶ Start Session</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancel</button>
    </div>
  </div>
</template>
