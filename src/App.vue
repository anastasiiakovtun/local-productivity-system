<script setup>
import { ref, onMounted } from 'vue';
import { useVaultStore } from './stores/vault.js';
import InboxView from './views/InboxView.vue';
import TodayView from './views/TodayView.vue';
import CompletedView from './views/CompletedView.vue';
import SessionHistoryView from './views/SessionHistoryView.vue';
import ResumePacketView from './views/ResumePacketView.vue';
import TimerView from './views/TimerView.vue';
import CheckpointView from './views/CheckpointView.vue';

const vault = useVaultStore();
const activeView = ref('inbox');
const screen = ref('list');
const focusTask = ref(null);

onMounted(() => vault.init());

const navItems = [
  { id: 'inbox',     label: 'Inbox' },
  { id: 'today',     label: 'Today' },
  { id: 'completed', label: 'Completed' },
  { id: 'sessions',  label: 'Sessions' },
];

function onFocus(task) { focusTask.value = task; screen.value = 'resume'; }
function onResumeCancel() { screen.value = 'list'; focusTask.value = null; }
function onStarted() { screen.value = 'timer'; }
function onEnd() { screen.value = 'checkpoint'; }
function onAbandoned() { screen.value = 'list'; focusTask.value = null; }
function onCheckpointCancel() { screen.value = 'timer'; }
function onCheckpointSaved() { screen.value = 'list'; focusTask.value = null; }
</script>

<template>
  <div v-if="!vault.initialized && !vault.error" class="loading-screen">
    <p>Connecting to vault…</p>
  </div>

  <div v-else-if="vault.error === 'cancelled'" class="loading-screen">
    <p>No vault selected.</p>
    <button @click="vault.init()">Choose Vault</button>
  </div>

  <div v-else-if="vault.error" class="loading-screen">
    <p role="alert">Could not connect to vault: {{ vault.error }}</p>
    <button @click="vault.init()">Retry</button>
  </div>

  <div v-else class="app-shell">
    <template v-if="screen === 'resume'">
      <ResumePacketView
        :task="focusTask"
        @started="onStarted"
        @cancel="onResumeCancel"
      />
    </template>

    <template v-else-if="screen === 'timer'">
      <TimerView
        @end="onEnd"
        @abandoned="onAbandoned"
      />
    </template>

    <template v-else-if="screen === 'checkpoint'">
      <CheckpointView
        @saved="onCheckpointSaved"
        @cancel="onCheckpointCancel"
      />
    </template>

    <template v-else>
      <nav class="sidebar" aria-label="Main navigation">
        <div class="sidebar-logo">Focus</div>
        <ul class="nav-list">
          <li v-for="item in navItems" :key="item.id">
            <button
              type="button"
              class="nav-btn"
              :class="{ active: activeView === item.id }"
              :aria-current="activeView === item.id ? 'page' : undefined"
              @click="activeView = item.id"
            >
              {{ item.label }}
            </button>
          </li>
        </ul>
      </nav>

      <main class="main-content">
        <InboxView          v-if="activeView === 'inbox'"     @focus="onFocus" />
        <TodayView          v-else-if="activeView === 'today'" @focus="onFocus" />
        <CompletedView      v-else-if="activeView === 'completed'" />
        <SessionHistoryView v-else-if="activeView === 'sessions'" />
      </main>
    </template>
  </div>
</template>
