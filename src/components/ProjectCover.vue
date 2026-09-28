<script setup>
import { PhFolderSimple } from '@phosphor-icons/vue';

defineProps({
  projectLabel: { type: String, default: null },
  color: { type: String, default: null },
  size: { type: Number, default: 36 },
});
</script>

<template>
  <span
    class="project-cover-tile"
    :class="color ? 'project-cover-color' : 'project-cover-neutral'"
    :style="{
      '--project-cover-size': `${size}px`,
      ...(color ? { backgroundColor: color } : {}),
    }"
    role="img"
    :aria-label="projectLabel ? `${projectLabel} project cover` : 'No project cover'"
  >
    <PhFolderSimple v-if="!color" :size="Math.round(size * 0.5)" aria-hidden="true" />
  </span>
</template>
