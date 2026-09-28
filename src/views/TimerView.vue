<script setup>
import { ref } from 'vue';
import { useSessionStore } from '../stores/session.js';
import TimerModal from '../components/timer/TimerModal.vue';
import QuickAbandonPanel from '../components/timer/QuickAbandonPanel.vue';

const props = defineProps({
  showFloatingToggle: { type: Boolean, default: false },
});

const emit = defineEmits(['end', 'abandoned', 'minimize']);

const session = useSessionStore();
const showAbandon = ref(false);

function onRequestAbandon() {
  showAbandon.value = true;
}

function onBack() {
  showAbandon.value = false;
}

async function onConfirm(outcome) {
  await session.abandonSessionWithOutcome(outcome);
  emit('abandoned');
}

function onFinish() {
  emit('end');
}
</script>

<template>
  <div class="timer-view">
    <QuickAbandonPanel
      v-if="showAbandon"
      @back="onBack"
      @confirm="onConfirm"
    />
    <TimerModal
      v-else
      :show-floating-toggle="showFloatingToggle"
      @finish="onFinish"
      @request-abandon="onRequestAbandon"
      @minimize="$emit('minimize')"
    />
  </div>
</template>
