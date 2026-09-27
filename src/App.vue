<script setup>
import { computed, ref } from 'vue';

const result = ref(null);
const isSelecting = ref(false);

const invalidMessages = {
  'not-directory': 'Choose a directory.',
  'not-readable': 'This directory is not readable.',
  'not-writable': 'This directory is not writable.',
  'missing-obsidian-directory': 'This directory does not contain a .obsidian directory.',
  'invalid-obsidian-directory': '.obsidian must be a directory.',
  unavailable: 'This directory is unavailable.',
};

const message = computed(() => {
  if (!result.value) return null;
  if (result.value.status === 'selected') return `Selected Vault: ${result.value.path}`;
  if (result.value.status === 'cancelled') return 'Vault selection cancelled.';
  if (result.value.status === 'invalid') return invalidMessages[result.value.reason];
  return 'Vault selection failed. Try again.';
});

const isError = computed(() => result.value?.status === 'invalid' || result.value?.status === 'error');

async function chooseVault() {
  if (isSelecting.value) return;
  isSelecting.value = true;
  try {
    result.value = await window.vault.select();
  } catch {
    result.value = { status: 'error', reason: 'unexpected-error' };
  } finally {
    isSelecting.value = false;
  }
}
</script>

<template>
  <main class="shell">
    <section class="panel" aria-labelledby="vault-heading">
      <p class="eyebrow">Technical spike</p>
      <h1 id="vault-heading">Connect a test Obsidian Vault</h1>
      <p class="description">
        Choose a readable and writable Vault directory containing <code>.obsidian</code>.
      </p>
      <button type="button" :disabled="isSelecting" @click="chooseVault">
        {{ isSelecting ? 'Choosing…' : 'Choose test Vault' }}
      </button>
      <p v-if="message" :role="isError ? 'alert' : 'status'" class="result">
        {{ message }}
      </p>
    </section>
  </main>
</template>
