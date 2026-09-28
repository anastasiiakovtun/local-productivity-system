<script setup>
import { ref, onMounted } from 'vue';
import { useVaultStore } from './stores/vault.js';
import InboxView from './views/InboxView.vue';
import TodayView from './views/TodayView.vue';
import CompletedView from './views/CompletedView.vue';
import SessionHistoryView from './views/SessionHistoryView.vue';

const vault = useVaultStore();
const activeView = ref('inbox');

onMounted(() => vault.init());

const navItems = [
  { id: 'inbox',     label: 'Inbox' },
  { id: 'today',     label: 'Today' },
  { id: 'completed', label: 'Completed' },
  { id: 'sessions',  label: 'Sessions' },
];
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
      <InboxView          v-if="activeView === 'inbox'" />
      <TodayView          v-else-if="activeView === 'today'" />
      <CompletedView      v-else-if="activeView === 'completed'" />
      <SessionHistoryView v-else-if="activeView === 'sessions'" />
    </main>
  </div>
</template>
