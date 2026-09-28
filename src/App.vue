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
import BreakView from './views/BreakView.vue';

const vault = useVaultStore();
const activeView = ref('inbox');
// screens: list | resume | timer | checkpoint | break-offer | break
const screen = ref('list');
const focusTask = ref(null);
const breakMinutes = ref(5);

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
async function onCheckpointSaved() {
  try {
    const r = await window.app.getPreferences();
    if (r.status === 'success') breakMinutes.value = r.data.defaultBreakMinutes ?? 5;
  } catch { /* use default */ }
  screen.value = 'break-offer';
}
function onTakeBreak() { screen.value = 'break'; }
function onFinishFlow() { screen.value = 'list'; focusTask.value = null; }
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

    <template v-else-if="screen === 'break-offer'">
      <div class="break-offer">
        <h2>Session complete</h2>
        <p>Take a break before your next session?</p>
        <div style="display:flex;gap:10px">
          <button type="button" class="btn-primary" aria-label="Take Break" @click="onTakeBreak">Take Break</button>
          <button type="button" class="btn-secondary" aria-label="Skip break" @click="onFinishFlow">Done</button>
        </div>
      </div>
    </template>

    <template v-else-if="screen === 'break'">
      <BreakView :break-minutes="breakMinutes" @done="onFinishFlow" />
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
