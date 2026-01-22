<template>
  <Transition name="fade">
    <div 
      v-if="hoveredCard && hoveredCardPosition" 
      class="card-tooltip"
      :style="tooltipStyle"
      :class="hoveredCard.element"
    >
      <div class="tooltip-header">
        <span class="tooltip-name">{{ hoveredCard.name }}</span>
        <span v-if="hoveredCard.type === 'pokemon'" class="tooltip-hp">{{ hoveredCard.currentHp }}/{{ hoveredCard.hp }} HP</span>
      </div>

      <div class="tooltip-type-info">
        <span class="type-badge" :class="hoveredCard.element">{{ hoveredCard.element || hoveredCard.type }}</span>
        <span v-if="hoveredCard.stage" class="stage-badge">{{ hoveredCard.stage }}</span>
      </div>

      <div v-if="hoveredCard.attacks && hoveredCard.attacks.length" class="tooltip-attacks">
        <div v-for="(attack, idx) in hoveredCard.attacks" :key="idx" class="tooltip-attack">
          <div class="attack-header">
            <span class="attack-name">{{ attack.name }}</span>
            <span class="attack-info">
              <span class="attack-cost">{{ attack.energyCost }}⚡</span>
              <span class="attack-damage">{{ attack.damage }} DMG</span>
            </span>
          </div>
          <p v-if="attack.description" class="attack-desc">{{ attack.description }}</p>
        </div>
      </div>

      <div v-if="hoveredCard.description" class="tooltip-description">
        {{ hoveredCard.description }}
      </div>

      <div v-if="hoveredCard.type === 'pokemon'" class="tooltip-footer">
        <div class="footer-item" v-if="hoveredCard.weakness">
          <span class="label">Weak:</span>
          <span class="value weakness">{{ getSymbol(hoveredCard.weakness) }}</span>
        </div>
        <div class="footer-item" v-if="hoveredCard.resistance">
          <span class="label">Resist:</span>
          <span class="value resistance">{{ getSymbol(hoveredCard.resistance) }}</span>
        </div>
        <div class="footer-item">
          <span class="label">Retreat:</span>
          <span class="value">⚡</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const { hoveredCard, hoveredCardPosition } = storeToRefs(store)

const tooltipStyle = computed(() => {
  if (!hoveredCardPosition.value) return {}
  
  const { x, y } = hoveredCardPosition.value
  const padding = 20
  
  // Basic positioning: try to show it to the right-top of the mouse
  return {
    left: `${x + padding}px`,
    top: `${y - 100}px`
  }
})

function getSymbol(element: string) {
  const symbols: Record<string, string> = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮', fighting: '🥊'
  }
  return symbols[element] || element
}
</script>

<style scoped>
.card-tooltip {
  position: fixed;
  z-index: 9999;
  width: 240px;
  background: rgba(20, 20, 25, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.05);
  pointer-events: none;
  font-family: inherit;
  overflow: hidden;
}

.card-tooltip.fire { border-left: 4px solid #ef4444; }
.card-tooltip.water { border-left: 4px solid #3b82f6; }
.card-tooltip.grass { border-left: 4px solid #10b981; }
.card-tooltip.electric { border-left: 4px solid #f59e0b; }
.card-tooltip.psychic { border-left: 4px solid #8b5cf6; }
.card-tooltip.fighting { border-left: 4px solid #b45309; }

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tooltip-name {
  font-weight: 800;
  font-size: 1.1rem;
  color: #fff;
  letter-spacing: -0.5px;
}

.tooltip-hp {
  font-weight: 700;
  font-size: 0.85rem;
  color: #4ade80;
}

.tooltip-type-info {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.type-badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
}

.type-badge.fire { color: #f87171; }
.type-badge.water { color: #60a5fa; }
.type-badge.grass { color: #34d399; }
.type-badge.electric { color: #fbbf24; }

.stage-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: capitalize;
}

.tooltip-attacks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.tooltip-attack {
  background: rgba(255,255,255,0.05);
  padding: 6px 8px;
  border-radius: 6px;
}

.attack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.attack-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #e2e8f0;
}

.attack-info {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
}

.attack-cost { color: #fbbf24; font-weight: 800; }
.attack-damage { color: #f87171; font-weight: 800; }

.attack-desc {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 4px;
  line-height: 1.3;
}

.tooltip-description {
  font-size: 0.75rem;
  color: #cbd5e1;
  font-style: italic;
  line-height: 1.4;
  margin-bottom: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.tooltip-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.footer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.footer-item .label {
  font-size: 0.6rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.footer-item .value {
  font-size: 0.8rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
