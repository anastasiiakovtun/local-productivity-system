<script setup>
import { ref, onMounted } from 'vue';
import { PhPencil, PhX, PhFloppyDisk, PhPlay } from '@phosphor-icons/vue';
import { useSessionStore } from '../stores/session.js';
import ProjectCover from '../components/ProjectCover.vue';
import ResumeSection from '../components/ResumeSection.vue';

const props = defineProps({
  task: { type: Object, required: true },
});
const emit = defineEmits(['started', 'cancel']);

const session = useSessionStore();
const plannedMinutes = ref(25);
const loadingPrefs = ref(true);

// Next Action state
const nextActionEditing = ref(false);
const nextActionDraft   = ref(props.task.next_action ?? '');
const nextActionDisplay = ref(props.task.next_action ?? '');
const nextActionSaving  = ref(false);
const nextActionError   = ref(null);

// Supporting Notes state
const notesEditing = ref(false);
const notesDraft   = ref(props.task.supporting_notes ?? '');
const notesDisplay = ref(props.task.supporting_notes ?? '');
const notesSaving  = ref(false);
const notesError   = ref(null);

// Blocker — direct inline input
const blockerValue = ref(props.task.blocker ?? session.lastCheckpoint?.blocker ?? '');

onMounted(async () => {
  const r = await window.app.getPreferences();
  if (r.status === 'success') plannedMinutes.value = r.data.defaultFocusMinutes ?? 25;
  loadingPrefs.value = false;
  await session.loadLastCheckpoint(props.task.id);
  blockerValue.value = session.lastCheckpoint?.blocker ?? '';
});

async function start() {
  const r = await session.startSession(props.task.id, plannedMinutes.value);
  if (r.status === 'success') emit('started');
}

// Next Action edit helpers
function editNextAction()   { nextActionDraft.value = nextActionDisplay.value; nextActionEditing.value = true; nextActionError.value = null; }
function cancelNextAction() { nextActionDraft.value = nextActionDisplay.value; nextActionEditing.value = false; nextActionError.value = null; }
async function saveNextAction() {
  nextActionSaving.value = true;
  nextActionError.value  = null;
  const r = await window.app.editTask(props.task.id, { nextAction: nextActionDraft.value || null });
  nextActionSaving.value = false;
  if (r.status === 'success') { nextActionDisplay.value = nextActionDraft.value; nextActionEditing.value = false; }
  else nextActionError.value = r.reason ?? 'Save failed';
}

// Notes edit helpers
function editNotes()   { notesDraft.value = notesDisplay.value; notesEditing.value = true; notesError.value = null; }
function cancelNotes() { notesDraft.value = notesDisplay.value; notesEditing.value = false; notesError.value = null; }
async function saveNotes() {
  notesSaving.value = true;
  notesError.value  = null;
  const r = await window.app.editTask(props.task.id, { supportingNotes: notesDraft.value || null });
  notesSaving.value = false;
  if (r.status === 'success') { notesDisplay.value = notesDraft.value; notesEditing.value = false; }
  else notesError.value = r.reason ?? 'Save failed';
}
</script>

<template>
  <div class="resume-packet workflow-card">

    <!-- Header: project + title (left) | close X (top-right) -->
    <div class="rp-header-row">
      <div class="rp-identity">
        <ProjectCover :project-label="task.project_label" :color="null" :size="40" />
        <div class="rp-identity-text">
          <p class="rp-project">{{ task.project_label || 'No project' }}</p>
          <h2 class="rp-title">{{ task.title }}</h2>
        </div>
      </div>

      <button
        type="button"
        class="timer-icon-btn"
        data-action="close"
        aria-label="Close"
        @click="emit('cancel')"
      >
        <PhX :size="16" />
      </button>
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

    <!-- Next Action — inline edit -->
    <ResumeSection label="Next Action" icon="arrow">
      <template v-if="nextActionEditing">
        <textarea
          v-model="nextActionDraft"
          class="rp-notes-editor"
          placeholder="What's the first thing to do?"
          rows="2"
        />
        <p v-if="nextActionError" class="rp-notes-error" role="alert">{{ nextActionError }}</p>
        <div class="rp-notes-actions">
          <button type="button" class="btn-secondary rp-notes-btn" data-action="cancel-next-action" @click="cancelNextAction">
            <PhX :size="16" /> Cancel
          </button>
          <button type="button" class="btn-primary rp-notes-btn" :disabled="nextActionSaving" @click="saveNextAction">
            <PhFloppyDisk :size="16" /> Save
          </button>
        </div>
      </template>
      <div v-else class="rp-inline-row">
        <p v-if="nextActionDisplay" class="rp-notes-display">{{ nextActionDisplay }}</p>
        <p v-else class="rp-muted">No next action recorded.</p>
        <button type="button" class="rp-edit-btn" aria-label="Edit next action" @click="editNextAction">
          <PhPencil :size="16" /> Edit
        </button>
      </div>
    </ResumeSection>

    <!-- Supporting Notes — inline edit -->
    <ResumeSection label="Supporting Notes" icon="note">
      <template v-if="notesEditing">
        <textarea
          v-model="notesDraft"
          class="rp-notes-editor"
          data-notes-editor
          placeholder="Add context, links, or thoughts…"
          rows="3"
        />
        <p v-if="notesError" class="rp-notes-error" role="alert">{{ notesError }}</p>
        <div class="rp-notes-actions">
          <button type="button" class="btn-secondary rp-notes-btn" data-action="cancel-notes" @click="cancelNotes">
            <PhX :size="16" /> Cancel
          </button>
          <button type="button" class="btn-primary rp-notes-btn" data-action="save-notes" :disabled="notesSaving" @click="saveNotes">
            <PhFloppyDisk :size="16" /> Save
          </button>
        </div>
      </template>
      <div v-else class="rp-inline-row">
        <ul v-if="notesDisplay" class="rp-notes-list">
          <li v-for="(line, i) in notesDisplay.split('\n').filter(l => l.trim())" :key="i">{{ line }}</li>
        </ul>
        <p v-else class="rp-muted">No notes yet.</p>
        <button type="button" class="rp-edit-btn" data-action="edit-notes" aria-label="Edit notes" @click="editNotes">
          <PhPencil :size="16" /> Edit
        </button>
      </div>
    </ResumeSection>

    <!-- Blocker — always-visible editable input -->
    <ResumeSection
      label="Blocker"
      icon="warning"
      :tone="blockerValue.trim() ? 'blocked' : null"
    >
      <input
        v-model="blockerValue"
        type="text"
        class="rp-blocker-input"
        data-blocker-input
        placeholder="No blocker — type to add one"
        aria-label="Blocker"
      />
    </ResumeSection>

    <!-- Duration + Start Session, centered together -->
    <div class="rp-start-row">
      <label class="rp-duration-label" for="duration-input">
        <input
          id="duration-input"
          v-model.number="plannedMinutes"
          class="duration-input rp-duration-input"
          type="number"
          min="1"
          max="180"
          :disabled="loadingPrefs"
        />
        <span class="rp-duration-unit">min</span>
      </label>
      <button type="button" class="btn-primary rp-start-btn" @click="start">
        <PhPlay :size="16" weight="fill" aria-hidden="true" /> Start Session
      </button>
    </div>
  </div>
</template>
