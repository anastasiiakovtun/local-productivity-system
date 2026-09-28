<script setup>
import { computed, ref, onMounted } from 'vue';
import { useVaultStore } from './stores/vault.js';
import AppSidebar from './components/AppSidebar.vue';
import { useHomeStore } from './stores/home.js';
import HomeView from './views/HomeView.vue';
import InboxView from './views/InboxView.vue';
import TodayView from './views/TodayView.vue';
import CompletedView from './views/CompletedView.vue';
import SessionHistoryView from './views/SessionHistoryView.vue';
import ResumePacketView from './views/ResumePacketView.vue';
import TimerView from './views/TimerView.vue';
import CheckpointView from './views/CheckpointView.vue';
import BreakView from './views/BreakView.vue';

const vault = useVaultStore();
const homeStore = useHomeStore();
const activeView = ref('home');
// screens: list | resume | timer | checkpoint | break-offer | break
const screen = ref('list');
const focusTask = ref(null);
const breakMinutes = ref(5);
const breakError = ref(null);
const sidebarCollapsed = ref(false);
const sidebarError = ref(null);
const floatingTimerEnabled = ref(false);

onMounted(async () => {
  await vault.init();
  if (!vault.initialized) return;
  try {
    const result = await window.app.getPreferences();
    if (result.status === 'success') {
      sidebarCollapsed.value = result.data.sidebarCollapsed ?? false;
      floatingTimerEnabled.value = result.data.floatingTimerEnabled ?? false;
      breakMinutes.value = result.data.defaultBreakMinutes ?? 5;
    }
  } catch { /* use expanded default */ }
});

const appSidebarProjects = computed(() => homeStore.projects);

async function toggleSidebar() {
  const previous = sidebarCollapsed.value;
  sidebarCollapsed.value = !previous;
  sidebarError.value = null;
  try {
    const result = await window.app.setPreferences({ sidebarCollapsed: sidebarCollapsed.value });
    if (result.status !== 'success') throw new Error(result.reason);
  } catch {
    sidebarCollapsed.value = previous;
    sidebarError.value = 'Could not save sidebar preference.';
  }
}

function navigate(view) {
  activeView.value = view;
}

function selectProject() {
  activeView.value = 'inbox';
}

function onHomeResume(task) { onFocus(task); }
function onGoToday() { activeView.value = 'today'; }

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
async function onTakeBreak() {
  breakError.value = null;
  const minutes = Number(breakMinutes.value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
    breakError.value = 'Break duration must be between 1 and 60 minutes.';
    return;
  }
  try {
    const result = await window.app.setPreferences({ defaultBreakMinutes: minutes });
    if (result.status !== 'success') throw new Error(result.reason);
    breakMinutes.value = minutes;
    screen.value = 'break';
  } catch {
    breakError.value = 'Could not save break duration.';
  }
}
function onFinishFlow() { screen.value = 'list'; focusTask.value = null; }

async function onMinimizeTimer() {
  screen.value = 'list';
  try { await window.app.openFloatingTimer(); } catch { /* non-fatal */ }
}
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

  <div v-else class="app-shell" :class="{ 'app-shell-collapsed': sidebarCollapsed }">
    <template v-if="screen === 'resume'">
      <ResumePacketView
        :task="focusTask"
        @started="onStarted"
        @cancel="onResumeCancel"
      />
    </template>

    <template v-else-if="screen === 'timer'">
      <TimerView
        :show-floating-toggle="floatingTimerEnabled"
        @end="onEnd"
        @abandoned="onAbandoned"
        @minimize="onMinimizeTimer"
      />
    </template>

    <template v-else-if="screen === 'checkpoint'">
      <CheckpointView
        @saved="onCheckpointSaved"
        @cancel="onCheckpointCancel"
      />
    </template>

    <template v-else-if="screen === 'break-offer'">
      <div class="break-offer workflow-card">
        <h2>Session complete</h2>
        <p>Take a break before your next session?</p>
        <label class="break-duration-label" for="break-duration">Break duration</label>
        <div class="duration-row">
          <input
            id="break-duration"
            v-model.number="breakMinutes"
            class="duration-input"
            type="number"
            min="1"
            max="60"
            step="1"
            aria-label="Break duration in minutes"
          >
          <span>minutes</span>
        </div>
        <p v-if="breakError" role="alert" class="error">{{ breakError }}</p>
        <div class="break-offer-actions">
          <button type="button" class="btn-primary" aria-label="Take Break" @click="onTakeBreak">Take Break</button>
          <button type="button" class="btn-secondary" aria-label="Skip break" @click="onFinishFlow">Done</button>
        </div>
      </div>
    </template>

    <template v-else-if="screen === 'break'">
      <BreakView :break-minutes="breakMinutes" @done="onFinishFlow" />
    </template>

    <template v-else>
      <AppSidebar
        :active-view="activeView"
        :collapsed="sidebarCollapsed"
        :projects="appSidebarProjects"
        @navigate="navigate"
        @toggle-collapse="toggleSidebar"
        @select-project="selectProject"
      />

      <main class="main-content">
        <p v-if="sidebarError" role="alert" class="error sidebar-error">{{ sidebarError }}</p>
        <HomeView      v-if="activeView === 'home'"           @resume="onHomeResume" @go-today="onGoToday" @task-created="activeView = 'inbox'" />
        <InboxView     v-else-if="activeView === 'inbox'"     @focus="onFocus" />
        <TodayView     v-else-if="activeView === 'today'"     @focus="onFocus" />
        <CompletedView v-else-if="activeView === 'completed'" />
        <SessionHistoryView v-else-if="activeView === 'sessions'" />
      </main>
    </template>
  </div>
</template>
