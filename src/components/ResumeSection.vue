<script setup>
import { PhMapPinLine, PhArrowBendDownRight, PhNotePencil, PhWarningCircle } from '@phosphor-icons/vue';

const iconMap = {
  pin:      PhMapPinLine,
  arrow:    PhArrowBendDownRight,
  note:     PhNotePencil,
  warning:  PhWarningCircle,
};

const props = defineProps({
  label: { type: String, required: true },
  icon:  { type: String, default: null },
  tone:  { type: String, default: null }, // 'blocked' | 'muted' | null
});

const IconComponent = props.icon ? iconMap[props.icon] ?? null : null;
</script>

<template>
  <div class="resume-section" :class="tone ? `tone-${tone}` : ''">
    <div class="resume-section-header">
      <div v-if="IconComponent" class="resume-section-icon icon-container icon-container-sm">
        <component :is="IconComponent" :size="16" />
      </div>
      <span class="resume-section-label">{{ label }}</span>
    </div>
    <div class="resume-section-body">
      <slot />
    </div>
  </div>
</template>
