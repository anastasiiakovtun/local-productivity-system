<script setup>
import { ref, onMounted } from 'vue';
import { PhTrash } from '@phosphor-icons/vue';
import IconContainer from '../components/IconContainer.vue';

const tasks = ref([]);
const loading = ref(false);
const error = ref(null);

onMounted(async () => {
  loading.value = true;
  try {
    const result = await window.app.listTasks({ view: 'trash' });
    if (result.status === 'success') {
      tasks.value = result.data;
    } else {
      error.value = 'Could not load trash.';
    }
  } catch {
    error.value = 'Could not load trash.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="view">
    <h2>Trash</h2>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <ul v-if="tasks.length" class="task-list">
      <li v-for="task in tasks" :key="task.id" class="task-row">
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.project_label" class="task-project">[{{ task.project_label }}]</span>
      </li>
    </ul>
    <div v-else-if="!loading" class="empty-state">
      <IconContainer><PhTrash :size="24" aria-hidden="true" /></IconContainer>
      <p>Trash is empty.</p>
    </div>
  </div>
</template>
