<script setup>
import { ref, onMounted } from 'vue';
import { useTaskStore } from '../stores/tasks.js';

const taskStore = useTaskStore();
const emit = defineEmits(['focus']);
const newTitle = ref('');
const newProject = ref('');
const error = ref(null);

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
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.project_label" class="task-project">[{{ task.project_label }}]</span>
        <button type="button" class="btn-icon" aria-label="Complete" @click="complete(task.id)">✓</button>
        <button type="button" class="btn-icon btn-delete" aria-label="Delete" @click="remove(task.id)">✕</button>
        <button type="button" class="btn-icon" aria-label="Focus" @click="emit('focus', task)">▶</button>
      </li>
    </ul>
    <p v-else class="empty-state">No tasks in Inbox.</p>
  </div>
</template>
