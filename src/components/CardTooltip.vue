<template>
  <div 
    v-if="uiStore.isTooltipVisible && uiStore.hoveredCard"
    class="card-tooltip"
    :style="tooltipStyle"
  >
    <div class="tooltip-content" :class="cardTypeClass">
      <!-- Header -->
      <div class="tooltip-header">
        <span class="name">{{ uiStore.hoveredCard.name }}</span>
        <span v-if="uiStore.hoveredCard.hp" class="hp">
          {{ uiStore.hoveredCard.currentHp }}/{{ uiStore.hoveredCard.hp }} HP
        </span>
      </div>

      <!-- Image/Type -->
      <div class="tooltip-image">
        <span class="element-icon">
          {{ getElementEmoji(uiStore.hoveredCard.element as string) }}
        </span>
        <span class="type-text">{{ uiStore.hoveredCard.element }}</span>
      </div>

      <!-- Pokemon Details -->
      <div v-if="uiStore.hoveredCard.type === 'pokemon'" class="pokemon-details">
        <div class="attacks-list">
          <div 
            v-for="(attack, idx) in uiStore.hoveredCard.attacks" 
            :key="idx"
            class="attack-item"
          >
            <div class="attack-header">
              <span class="attack-name">{{ attack.name }}</span>
              <span class="attack-damage">{{ attack.damage }}</span>
            </div>
            <div class="attack-cost">
              Cost: {{ attack.energyCost }} {{ getElementEmoji(uiStore.hoveredCard.element as string) }}
            </div>
            <div v-if="attack.effect" class="attack-effect">
              Effect: {{ attack.effect }} ({{ (attack.effectChance || 1) * 100 }}%)
            </div>
          </div>
        </div>

        <div class="stats-row">
          <div v-if="uiStore.hoveredCard.weakness" class="stat">
            <span class="label">Weak:</span>
            {{ getElementEmoji(uiStore.hoveredCard.weakness) }}
          </div>
          <div v-if="uiStore.hoveredCard.resistance" class="stat">
            <span class="label">Resist:</span>
            {{ getElementEmoji(uiStore.hoveredCard.resistance) }}
          </div>
        </div>
        
        <div v-if="uiStore.hoveredCard.statusEffects?.length" class="status-effects">
          Status: {{ uiStore.hoveredCard.statusEffects.join(', ') }}
        </div>
      </div>

      <!-- Trainer Details -->
      <div v-else-if="uiStore.hoveredCard.category === 'trainer'" class="trainer-details">
        <div class="description">
          {{ uiStore.hoveredCard.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { getElementEmoji } from '../utils/gameUtils'

const uiStore = useUIStore()

const tooltipStyle = computed(() => {
  // Offset slightly from cursor
  const x = uiStore.tooltipPosition.x + 15
  const y = uiStore.tooltipPosition.y + 15
  
  // Basic boundary checking could be added here
  // For now, just position absolute
  return {
    top: `${y}px`,
    left: `${x}px`
  }
})

const cardTypeClass = computed(() => {
  const card = uiStore.hoveredCard
  if (!card) return ''
  return [
    card.type === 'pokemon' ? `type-${card.element}` : '',
    card.category === 'trainer' ? 'type-trainer' : '',
    card.type === 'energy' ? 'type-energy' : ''
  ]
})
</script>

<style scoped>
.card-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none; /* Let mouse events pass through */
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
}

.tooltip-content {
  background: rgba(20, 20, 30, 0.95);
  border: 2px solid #444;
  border-radius: 12px;
  padding: 12px;
  width: 220px;
  color: #fff;
  backdrop-filter: blur(4px);
}

/* Element Themes */
.type-fire { border-color: #ff5555; box-shadow: 0 0 10px rgba(255, 85, 85, 0.2); }
.type-water { border-color: #5555ff; box-shadow: 0 0 10px rgba(85, 85, 255, 0.2); }
.type-grass { border-color: #55ff55; box-shadow: 0 0 10px rgba(85, 255, 85, 0.2); }
.type-electric { border-color: #ffff55; box-shadow: 0 0 10px rgba(255, 255, 85, 0.2); }
.type-psychic { border-color: #ff55ff; box-shadow: 0 0 10px rgba(255, 85, 255, 0.2); }
.type-fighting { border-color: #cc5500; box-shadow: 0 0 10px rgba(204, 85, 0, 0.2); }

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 4px;
}

.name {
  font-weight: bold;
  font-size: 1.1rem;
}

.hp {
  color: #ff5555;
  font-weight: bold;
}

.tooltip-image {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  background: rgba(0,0,0,0.3);
  padding: 4px 8px;
  border-radius: 4px;
}

.element-icon {
  font-size: 1.5rem;
}

.type-text {
  text-transform: capitalize;
  color: #aaa;
  font-size: 0.9rem;
}

.attack-item {
  background: rgba(255,255,255,0.05);
  padding: 6px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.attack-header {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  margin-bottom: 2px;
}

.attack-cost {
  font-size: 0.8rem;
  color: #aaa;
}

.attack-effect {
  font-size: 0.75rem;
  color: #ffd700;
  margin-top: 2px;
  font-style: italic;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  font-size: 0.85rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.label {
  color: #aaa;
}

.trainer-details .description {
  font-style: italic;
  line-height: 1.4;
  color: #ddd;
}

.status-effects {
  margin-top: 8px;
  color: #ffaa00;
  font-weight: bold;
  font-size: 0.85rem;
}
</style>
