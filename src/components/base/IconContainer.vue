<script setup>
defineProps({
  size: { type: Number, default: 48 },
});
</script>

<template>
  <span class="icon-container" :style="{ '--icon-container-size': `${size}px` }">
    <slot />
  </span>
</template>
