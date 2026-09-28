<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTaskStore } from '../stores/tasks.js';

const taskStore = useTaskStore();
const search = ref('');

onMounted(() => taskStore.fetchCompleted());

const filtered = computed(() =>
  taskStore.completed.filter(t =>
    t.title.toLowerCase().includes(search.value.toLowerCase())
  )
);
</script>

<template>
  <div class="view">
    <h2>Completed</h2>
    <input v-model="search" class="search-bar" type="text" placeholder="Search completed tasks…" aria-label="Search" />
    <ul v-if="filtered.length" class="task-list">
      <li v-for="task in filtered" :key="task.id" class="task-row">
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.project_label" class="task-project">[{{ task.project_label }}]</span>
        <button type="button" class="btn-icon" aria-label="Reopen" @click="taskStore.reopenTask(task.id)">↩</button>
      </li>
    </ul>
    <p v-else class="empty-state">No completed tasks.</p>
  </div>
</template>
