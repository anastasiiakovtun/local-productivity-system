<script setup>
import { ref, onMounted } from 'vue';
import { PhClockCounterClockwise } from '@phosphor-icons/vue';
import IconContainer from '../components/IconContainer.vue';

const sessions = ref([]);
const expandedId = ref(null);
const fromDate = ref('');
const toDate = ref('');
const statusFilter = ref('');
const loading = ref(false);

async function load() {
  loading.value = true;
  const filters = {
    fromDate: fromDate.value || null,
    toDate: toDate.value || null,
    checkpointStatus: statusFilter.value || null,
  };
  const r = await window.app.listSessions(filters);
  if (r.status === 'success') sessions.value = r.data ?? [];
  loading.value = false;
}

onMounted(load);

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function formatMin(seconds) {
  return Math.round((seconds ?? 0) / 60);
}

const statusOptions = ['', 'continue', 'blocked', 'completed', 'abandoned'];
</script>

<template>
  <div class="view">
    <h2>Sessions</h2>

    <div class="session-filters">
      <label class="session-filter">
        From
        <input v-model="fromDate" type="date" class="duration-input session-filter-input" />
      </label>
      <label class="session-filter">
        To
        <input v-model="toDate" type="date" class="duration-input session-filter-input" />
      </label>
      <label class="session-filter">
        Status
        <select v-model="statusFilter" class="duration-input session-filter-input">
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s || 'All' }}</option>
        </select>
      </label>
      <button type="button" class="btn-secondary" @click="load">Filter</button>
    </div>

    <p v-if="loading" class="rp-muted">Loading…</p>

    <div v-else-if="sessions.length" class="session-list">
      <div
        v-for="s in sessions"
        :key="s.session_id"
        class="session-row"
        @click="toggle(s.session_id)"
        :aria-expanded="expandedId === s.session_id"
      >
        <div class="session-title">{{ s.task_title }}</div>
        <div class="session-meta">
          <span>{{ s.started_local_date }}</span>
          <span>{{ formatMin(s.planned_minutes * 60) }} min planned</span>
          <span v-if="s.actual_seconds">{{ formatMin(s.actual_seconds) }} min actual</span>
          <span v-if="s.overflow_seconds">+{{ formatMin(s.overflow_seconds) }} overflow</span>
          <span
            class="badge"
            :class="{
              'badge-continue':  s.checkpoint_status === 'continue',
              'badge-completed': s.checkpoint_status === 'completed',
              'badge-blocked':   s.checkpoint_status === 'blocked',
              'badge-abandoned': s.checkpoint_status === 'abandoned' || s.status === 'abandoned',
            }"
          >{{ s.checkpoint_status || s.status }}</span>
        </div>

        <div v-if="expandedId === s.session_id" class="session-detail">
          <div v-if="s.outcome"><strong>Outcome:</strong> {{ s.outcome }}</div>
          <div v-if="s.next_action"><strong>Next Action:</strong> {{ s.next_action }}</div>
          <div v-if="!s.outcome && s.status === 'abandoned'" style="color:#6b7280">Session was abandoned — no checkpoint.</div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <IconContainer><PhClockCounterClockwise :size="24" aria-hidden="true" /></IconContainer>
      <p>No completed sessions yet.</p>
    </div>
  </div>
</template>
