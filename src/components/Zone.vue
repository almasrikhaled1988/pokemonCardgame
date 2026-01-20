<template>
  <div class="zone" :class="zoneClasses">
    <div class="zone-label">{{ label }}</div>
    <div class="zone-content">
      <slot></slot>
    </div>
    <div v-if="count > 0" class="zone-count">{{ count }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  type: string
  count?: number
  canDrop?: boolean
}>(), {
  count: 0,
  canDrop: false
})

const zoneClasses = computed(() => {
  return [
    `zone-${props.type}`,
    { 'can-drop': props.canDrop }
  ]
})
</script>

<style scoped>
.zone-content {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.zone-count {
  position: absolute;
  bottom: var(--spacing-sm);
  right: var(--spacing-sm);
  background: var(--bg-darker);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
}
</style>
