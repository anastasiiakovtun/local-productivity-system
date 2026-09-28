<script setup>
import { ref, onMounted } from 'vue';
import { PhCalendarBlank } from '@phosphor-icons/vue';
import IconContainer from '../components/IconContainer.vue';

const tasks = ref([]);
const loading = ref(false);
const error = ref(null);

onMounted(async () => {
  loading.value = true;
  try {
    const result = await window.app.listTasks({ view: 'upcoming' });
    if (result.status === 'success') {
      tasks.value = result.data;
    } else {
      error.value = 'Could not load upcoming tasks.';
    }
  } catch {
    error.value = 'Could not load upcoming tasks.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="view">
    <h2>Upcoming</h2>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <ul v-if="tasks.length" class="task-list">
      <li v-for="task in tasks" :key="task.id" class="task-row">
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.project_label" class="task-project">[{{ task.project_label }}]</span>
        <span v-if="task.start_date" class="task-project">{{ task.start_date }}</span>
      </li>
    </ul>
    <div v-else-if="!loading" class="empty-state">
      <IconContainer><PhCalendarBlank :size="24" aria-hidden="true" /></IconContainer>
      <p>No upcoming tasks.</p>
    </div>
  </div>
</template>
