<script setup>
import { ref, computed } from 'vue';
import { useSessionStore } from '../stores/session.js';

const emit = defineEmits(['saved', 'cancel']);
const session = useSessionStore();

const outcome    = ref('');
const status     = ref('continue');
const nextAction = ref('');
const blocker    = ref('');
const error      = ref(null);
const saving     = ref(false);

const needsNextAction = computed(() => status.value === 'continue' || status.value === 'blocked');

const statuses = ['continue', 'blocked', 'completed', 'abandoned'];

async function submit() {
  error.value = null;
  if (!outcome.value.trim()) { error.value = 'Outcome is required.'; return; }
  if (needsNextAction.value && !nextAction.value.trim()) { error.value = 'Next action is required for this status.'; return; }

  saving.value = true;
  try {
    const r = await window.app.saveCheckpoint(session.activeSession.session_id, {
      outcome: outcome.value.trim(),
      status: status.value,
      nextAction: needsNextAction.value ? nextAction.value.trim() : null,
      blocker: blocker.value.trim() || null,
    });
    if (r.status === 'success' || r.status === 'error' && r.reason?.includes('outcome') === false) {
      if (r.status === 'success') {
        session.clearSession();
        emit('saved');
      } else {
        error.value = r.reason ?? 'Failed to save checkpoint.';
      }
    } else {
      error.value = r.reason ?? 'Failed to save checkpoint.';
    }
  } catch {
    error.value = 'Unexpected error.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="checkpoint-view workflow-card">
    <h2>Checkpoint</h2>

    <div class="form-group">
      <label for="cp-outcome">Outcome <span style="color:#f87171">*</span></label>
      <textarea id="cp-outcome" v-model="outcome" rows="3" placeholder="What did you accomplish? ('No progress' is valid.)" />
    </div>

    <div class="form-group">
      <label>Status <span style="color:#f87171">*</span></label>
      <div class="status-options">
        <label v-for="s in statuses" :key="s" class="status-option" :class="`status-option--${s}`">
          <input type="radio" v-model="status" :value="s" :name="`cp-status-${s}`" />
          <span>{{ s }}</span>
        </label>
      </div>
    </div>

    <div v-if="needsNextAction" class="form-group">
      <label for="cp-next-action">Next Action <span style="color:#f87171">*</span></label>
      <input id="cp-next-action" v-model="nextAction" type="text" placeholder="What is the next concrete step?" />
    </div>

    <div class="form-group" data-blocker-group :class="{ 'has-blocker': blocker.trim() }">
      <label for="cp-blocker">Blocker (optional)</label>
      <input id="cp-blocker" v-model="blocker" type="text" placeholder="What is blocking progress?" />
    </div>

    <p v-if="error" role="alert" class="error">{{ error }}</p>

    <div style="display:flex;gap:10px;margin-top:8px">
      <button type="button" class="btn-primary" :disabled="saving" @click="submit">
        {{ saving ? 'Saving…' : 'Save Checkpoint' }}
      </button>
      <button type="button" class="btn-secondary" @click="emit('cancel')">Cancel</button>
    </div>
  </div>
</template>
