<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  breakMinutes: { type: Number, required: true },
});

const emit = defineEmits(['done']);

const totalSeconds = props.breakMinutes * 60;
const secondsLeft = ref(totalSeconds);
const completed = ref(false);
let ticker = null;

function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }
const display = computed(() => {
  const s = Math.max(0, secondsLeft.value);
  return `${pad(s / 60)}:${pad(s % 60)}`;
});

onMounted(() => {
  ticker = setInterval(() => {
    secondsLeft.value = Math.max(0, secondsLeft.value - 1);
    if (secondsLeft.value === 0) {
      clearInterval(ticker);
      ticker = null;
      completed.value = true;
    }
  }, 1000);
});

onUnmounted(() => {
  if (ticker) clearInterval(ticker);
});
</script>

<template>
  <div class="break-view workflow-card">
    <h2>Break</h2>

    <div v-if="!completed">
      <div class="break-timer">{{ display }}</div>
      <button type="button" class="btn-secondary" aria-label="End Break" @click="emit('done')">
        End Break
      </button>
    </div>

    <div v-else>
      <p>Break complete</p>
      <button type="button" class="btn-primary" aria-label="Done" @click="emit('done')">
        Done
      </button>
    </div>
  </div>
</template>
