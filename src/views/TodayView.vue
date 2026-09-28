<script setup>
import { ref, onMounted } from 'vue';
import { PhCalendarBlank } from '@phosphor-icons/vue';
import IconContainer from '../components/base/IconContainer.vue';
import { useTaskStore } from '../stores/tasks.js';

const taskStore = useTaskStore();
const emit = defineEmits(['focus']);
const search = ref('');

onMounted(() => taskStore.fetchToday());

const filtered = () => taskStore.today.filter(t =>
  t.title.toLowerCase().includes(search.value.toLowerCase())
);
</script>

<template>
  <div class="view">
    <h2>Today</h2>
    <ul v-if="taskStore.today.length" class="task-list">
      <li v-for="task in taskStore.today" :key="task.id" class="task-row">
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.project_label" class="task-project">[{{ task.project_label }}]</span>
        <button type="button" class="btn-icon" aria-label="Complete" @click="taskStore.completeTask(task.id)">✓</button>
        <button type="button" class="btn-icon btn-delete" aria-label="Delete" @click="taskStore.deleteTask(task.id)">✕</button>
        <button type="button" class="btn-icon" aria-label="Focus" @click="emit('focus', task)">▶</button>
      </li>
    </ul>
    <div v-else class="empty-state">
      <IconContainer><PhCalendarBlank :size="24" aria-hidden="true" /></IconContainer>
      <p>No tasks due today.</p>
    </div>
  </div>
</template>
