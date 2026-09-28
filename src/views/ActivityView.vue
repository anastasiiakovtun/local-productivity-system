<script setup>
import { ref, onMounted } from 'vue';
import { PhActivity } from '@phosphor-icons/vue';
import IconContainer from '../components/IconContainer.vue';

const events = ref([]);
const loading = ref(false);
const error = ref(null);

onMounted(async () => {
  loading.value = true;
  try {
    const result = await window.app.listTaskEvents();
    if (result.status === 'success') {
      events.value = result.data;
    } else {
      error.value = 'Could not load activity.';
    }
  } catch {
    error.value = 'Could not load activity.';
  } finally {
    loading.value = false;
  }
});

function formatType(type) {
  return type.replace(/_/g, ' ');
}
</script>

<template>
  <div class="view">
    <h2>Activity</h2>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <ul v-if="events.length" class="task-list">
      <li v-for="ev in events" :key="ev.event_id" class="task-row">
        <span class="task-title">{{ ev.task_title }}</span>
        <span class="task-project">{{ formatType(ev.event_type) }}</span>
        <span class="task-project">{{ ev.local_date }}</span>
      </li>
    </ul>
    <div v-else-if="!loading" class="empty-state">
      <IconContainer><PhActivity :size="24" aria-hidden="true" /></IconContainer>
      <p>No activity recorded yet.</p>
    </div>
  </div>
</template>
