<script setup>
import { ref, onMounted } from 'vue';
import { PhPencil, PhX, PhFloppyDisk } from '@phosphor-icons/vue';
import { useSessionStore } from '../stores/session.js';
import ProjectCover from '../components/base/ProjectCover.vue';
import ResumeSection from '../components/base/ResumeSection.vue';

const props = defineProps({
  task: { type: Object, required: true },
});
const emit = defineEmits(['started', 'cancel']);

const session = useSessionStore();
const plannedMinutes = ref(25);
const loadingPrefs = ref(true);

// Supporting notes state
const notesEditing = ref(false);
const notesDraft = ref(props.task.supporting_notes ?? '');
const notesDisplay = ref(props.task.supporting_notes ?? '');
const notesSaving = ref(false);
const notesError = ref(null);

onMounted(async () => {
  const r = await window.app.getPreferences();
  if (r.status === 'success') plannedMinutes.value = r.data.defaultFocusMinutes ?? 25;
  loadingPrefs.value = false;
  await session.loadLastCheckpoint(props.task.id);
});

async function start() {
  const r = await session.startSession(props.task.id, plannedMinutes.value);
  if (r.status === 'success') emit('started');
}

function editNotes() {
  notesDraft.value = notesDisplay.value;
  notesEditing.value = true;
  notesError.value = null;
}

function cancelNotes() {
  notesDraft.value = notesDisplay.value;
  notesEditing.value = false;
  notesError.value = null;
}

async function saveNotes() {
  notesSaving.value = true;
  notesError.value = null;
  const r = await window.app.editTask(props.task.id, { supportingNotes: notesDraft.value || null });
  notesSaving.value = false;
  if (r.status === 'success') {
    notesDisplay.value = notesDraft.value;
    notesEditing.value = false;
  } else {
    notesError.value = r.reason ?? 'Save failed';
  }
}
</script>

<template>
  <div class="resume-packet">
    <!-- Header: project cover + task identity -->
    <div class="rp-identity">
      <ProjectCover :project-label="task.project_label" :color="null" :size="48" />
      <div class="rp-identity-text">
        <p class="rp-project">{{ task.project_label || 'No project' }}</p>
        <h2 class="rp-title">{{ task.title }}</h2>
      </div>
    </div>

    <!-- Previous checkpoint -->
    <ResumeSection label="Previous checkpoint" icon="arrow">
      <template v-if="session.lastCheckpoint">
        <p class="rp-checkpoint-outcome">{{ session.lastCheckpoint.outcome }}</p>
        <p v-if="session.lastCheckpoint.next_action" class="rp-checkpoint-action">
          Next: {{ session.lastCheckpoint.next_action }}
        </p>
      </template>
      <p v-else class="rp-muted">No previous checkpoint.</p>
    </ResumeSection>

    <!-- Blockers -->
    <ResumeSection
      label="Blockers"
      icon="warning"
      :tone="session.lastCheckpoint?.blocker ? 'blocked' : null"
    >
      <p v-if="session.lastCheckpoint?.blocker" class="rp-blocker">
        {{ session.lastCheckpoint.blocker }}
      </p>
      <p v-else class="rp-muted">No blockers identified.</p>
    </ResumeSection>

    <!-- Supporting notes -->
    <ResumeSection label="Notes" icon="note">
      <template v-if="notesEditing">
        <textarea
          v-model="notesDraft"
          class="rp-notes-editor"
          data-notes-editor
          placeholder="Add context, links, or thoughts…"
          rows="4"
        />
        <p v-if="notesError" class="rp-notes-error" role="alert">{{ notesError }}</p>
        <div class="rp-notes-actions">
          <button
            type="button"
            class="btn-secondary rp-notes-btn"
            data-action="cancel-notes"
            @click="cancelNotes"
          >
            <PhX :size="14" /> Cancel
          </button>
          <button
            type="button"
            class="btn-primary rp-notes-btn"
            data-action="save-notes"
            :disabled="notesSaving"
            @click="saveNotes"
          >
            <PhFloppyDisk :size="14" /> Save
          </button>
        </div>
      </template>
      <template v-else>
        <p v-if="notesDisplay" class="rp-notes-display">{{ notesDisplay }}</p>
        <p v-else class="rp-muted">No notes yet.</p>
        <button
          type="button"
          class="rp-edit-btn"
          data-action="edit-notes"
          aria-label="Edit notes"
          @click="editNotes"
        >
          <PhPencil :size="14" /> Edit
        </button>
      </template>
    </ResumeSection>

    <!-- Duration + start -->
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

    <div class="rp-actions">
      <button type="button" class="btn-primary" @click="start">▶ Start Session</button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancel</button>
    </div>
  </div>
</template>
