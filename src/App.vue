<script setup>
import { computed, ref } from 'vue';

// ── Vault selection ──────────────────────────────────────────────────────────

const selectionResult = ref(null);
const isSelecting = ref(false);

const invalidMessages = {
  'not-directory': 'Choose a directory.',
  'not-readable': 'This directory is not readable.',
  'not-writable': 'This directory is not writable.',
  'missing-obsidian-directory': 'This directory does not contain a .obsidian directory.',
  'invalid-obsidian-directory': '.obsidian must be a directory.',
  unavailable: 'This directory is unavailable.',
};

const selectionMessage = computed(() => {
  if (!selectionResult.value) return null;
  if (selectionResult.value.status === 'selected') return `Selected Vault: ${selectionResult.value.path}`;
  if (selectionResult.value.status === 'cancelled') return 'Vault selection cancelled.';
  if (selectionResult.value.status === 'invalid') return invalidMessages[selectionResult.value.reason];
  return 'Vault selection failed. Try again.';
});

const isSelectionError = computed(() =>
  selectionResult.value?.status === 'invalid' || selectionResult.value?.status === 'error',
);

async function chooseVault() {
  if (isSelecting.value) return;
  isSelecting.value = true;
  try {
    selectionResult.value = await window.vault.select();
  } catch {
    selectionResult.value = { status: 'error', reason: 'unexpected-error' };
  } finally {
    isSelecting.value = false;
  }
}

// ── Note I/O ─────────────────────────────────────────────────────────────────

const notePath   = ref('');
const readResult = ref(null);
const isReading  = ref(false);
const noteContent = ref('');
const lastMtime   = ref(null);

const writeResult  = ref(null);
const isWriting    = ref(false);
const newSectionContent = ref('');

async function readNoteAction() {
  if (isReading.value || !notePath.value.trim()) return;
  isReading.value = true;
  readResult.value = null;
  writeResult.value = null;
  try {
    const result = await window.vault.readNote(notePath.value.trim());
    readResult.value = result;
    if (result.status === 'success') {
      noteContent.value = result.content;
      lastMtime.value = result.mtime;
    }
  } catch {
    readResult.value = { status: 'error', reason: 'unexpected-error' };
  } finally {
    isReading.value = false;
  }
}

async function writeSectionAction() {
  if (isWriting.value || !notePath.value.trim() || lastMtime.value === null) return;
  isWriting.value = true;
  writeResult.value = null;
  try {
    const result = await window.vault.writeSection(
      notePath.value.trim(),
      newSectionContent.value,
      lastMtime.value,
    );
    writeResult.value = result;
    if (result.status === 'success') lastMtime.value = result.mtime;
  } catch {
    writeResult.value = { status: 'error', reason: 'unexpected-error' };
  } finally {
    isWriting.value = false;
  }
}

const readStatusText = computed(() => {
  if (!readResult.value) return null;
  if (readResult.value.status === 'success') return `Read OK — mtime: ${readResult.value.mtime}`;
  return `Read error: ${readResult.value.reason}`;
});

const writeStatusText = computed(() => {
  if (!writeResult.value) return null;
  if (writeResult.value.status === 'success') return `Write OK — new mtime: ${writeResult.value.mtime}`;
  if (writeResult.value.status === 'conflict') return 'Write conflict: file changed since last read.';
  return `Write error: ${writeResult.value.reason}`;
});
</script>

<template>
  <main class="shell">
    <section class="panel" aria-labelledby="vault-heading">
      <p class="eyebrow">Technical spike · Vault selection</p>
      <h1 id="vault-heading">Connect a test Obsidian Vault</h1>
      <p class="description">
        Choose a readable and writable Vault directory containing <code>.obsidian</code>.
      </p>
      <button type="button" :disabled="isSelecting" @click="chooseVault">
        {{ isSelecting ? 'Choosing…' : 'Choose test Vault' }}
      </button>
      <p v-if="selectionMessage" :role="isSelectionError ? 'alert' : 'status'" class="result">
        {{ selectionMessage }}
      </p>
    </section>

    <section class="panel" aria-labelledby="io-heading">
      <p class="eyebrow">Technical spike · Note I/O</p>
      <h2 id="io-heading">Read and write a managed section</h2>
      <p class="description">
        Enter a path relative to the selected Vault. The file must contain
        <code>&lt;!-- focus:tasks:start --&gt;</code> / <code>&lt;!-- focus:tasks:end --&gt;</code> sentinels.
      </p>

      <label for="note-path">Relative note path</label>
      <input id="note-path" v-model="notePath" type="text" placeholder="Notes/Project.md" />

      <button type="button" :disabled="isReading || !notePath.trim()" @click="readNoteAction">
        {{ isReading ? 'Reading…' : 'Read note' }}
      </button>
      <p v-if="readStatusText" :role="readResult?.status === 'success' ? 'status' : 'alert'" class="result">
        {{ readStatusText }}
      </p>

      <template v-if="readResult?.status === 'success'">
        <label for="note-content" style="margin-top:0.75rem">Full note content (read-only)</label>
        <pre id="note-content" class="note-content">{{ noteContent }}</pre>

        <label for="new-section">New managed section content</label>
        <textarea id="new-section" v-model="newSectionContent" rows="4" placeholder="- [ ] My task" />

        <button type="button" :disabled="isWriting" @click="writeSectionAction">
          {{ isWriting ? 'Writing…' : 'Write section' }}
        </button>
        <p v-if="writeStatusText" :role="writeResult?.status === 'success' ? 'status' : 'alert'" class="result">
          {{ writeStatusText }}
        </p>
      </template>
    </section>
  </main>
</template>
