<script setup>
import { ref } from 'vue';
import { PhArrowLeft, PhStopCircle } from '@phosphor-icons/vue';

const emit = defineEmits(['back', 'confirm']);

const outcome = ref('');

function onBack() { emit('back'); }
function onConfirm() {
  const val = outcome.value.trim() || null;
  emit('confirm', val);
}

function onKeydown(e) {
  if (e.key === 'Escape') onBack();
}
</script>

<template>
  <div class="quick-abandon-panel" @keydown="onKeydown" tabindex="-1">
    <h3 class="quick-abandon-title">End session early?</h3>
    <p class="quick-abandon-hint">Optionally note what happened (leave blank to skip).</p>

    <textarea
      v-model="outcome"
      class="quick-abandon-input"
      placeholder="What happened? (optional)"
      rows="3"
      aria-label="Abandon outcome"
    />

    <div class="quick-abandon-actions">
      <button
        type="button"
        class="btn-secondary"
        data-action="back"
        @click="onBack"
      >
        <PhArrowLeft :size="16" /> Back
      </button>
      <button
        type="button"
        class="btn-danger"
        data-action="confirm"
        @click="onConfirm"
      >
        <PhStopCircle :size="16" /> Abandon
      </button>
    </div>
  </div>
</template>
