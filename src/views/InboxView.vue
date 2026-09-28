<script setup>
import { ref, onMounted } from 'vue';
import { useTaskStore } from '../stores/tasks.js';

const taskStore = useTaskStore();
const emit = defineEmits(['focus']);
const newTitle = ref('');
const newProject = ref('');
const error = ref(null);
const editingId = ref(null);
const editTitle = ref('');
const editProject = ref('');
const editError = ref(null);
const editSaving = ref(false);

onMounted(() => taskStore.fetchInbox());

async function submit() {
  const title = newTitle.value.trim();
  if (!title) return;
  error.value = null;
  const r = await taskStore.createTask({
    title,
    projectLabel: newProject.value.trim() || null,
  });
  if (r.status === 'success') {
    newTitle.value = '';
    newProject.value = '';
  } else {
    error.value = r.reason ?? 'Failed to create task';
  }
}

async function complete(id) {
  await taskStore.completeTask(id);
}

async function remove(id) {
  await taskStore.deleteTask(id);
}

function startEdit(task) {
  editingId.value = task.id;
  editTitle.value = task.title;
  editProject.value = task.project_label ?? '';
  editError.value = null;
}

function cancelEdit() {
  editingId.value = null;
  editError.value = null;
}

async function saveEdit() {
  if (!editTitle.value.trim()) return;
  editError.value = null;
  editSaving.value = true;
  const r = await taskStore.editTask(editingId.value, {
    title: editTitle.value.trim(),
    projectLabel: editProject.value.trim() || null,
  });
  editSaving.value = false;
  if (r.status === 'success') {
    editingId.value = null;
  } else {
    editError.value = r.reason ?? 'Failed to save';
  }
}
</script>

<template>
  <div class="view">
    <h2>Inbox</h2>

    <form class="capture-bar" @submit.prevent="submit">
      <input
        v-model="newTitle"
        class="capture-title"
        type="text"
        placeholder="New task title…"
        aria-label="New task title"
      />
      <input
        v-model="newProject"
        class="capture-project"
        type="text"
        placeholder="Project (optional)"
        aria-label="Project label"
      />
      <button type="submit" :disabled="!newTitle.trim()">Add</button>
    </form>

    <p v-if="error" role="alert" class="error">{{ error }}</p>

    <ul v-if="taskStore.inbox.length" class="task-list">
      <li v-for="task in taskStore.inbox" :key="task.id" class="task-row">
        <template v-if="editingId === task.id">
          <input type="text" aria-label="Edit title" v-model="editTitle" class="capture-title" />
          <input type="text" aria-label="Edit project" v-model="editProject" class="capture-project" placeholder="Project (optional)" />
          <p v-if="editError" role="alert" class="error">{{ editError }}</p>
          <button type="button" aria-label="Save edit" :disabled="!editTitle.trim() || editSaving" @click="saveEdit">Save</button>
          <button type="button" aria-label="Cancel edit" @click="cancelEdit">Cancel</button>
        </template>
        <template v-else>
          <span class="task-title">{{ task.title }}</span>
          <span v-if="task.project_label" class="task-project">[{{ task.project_label }}]</span>
          <button type="button" class="btn-icon" aria-label="Complete" @click="complete(task.id)">✓</button>
          <button type="button" class="btn-icon btn-delete" aria-label="Delete" @click="remove(task.id)">✕</button>
          <button type="button" class="btn-icon" aria-label="Edit" @click="startEdit(task)">✎</button>
          <button type="button" class="btn-icon" aria-label="Focus" @click="emit('focus', task)">▶</button>
        </template>
      </li>
    </ul>
    <p v-else class="empty-state">No tasks in Inbox.</p>
  </div>
</template>
