<template>
  <div class="opponent-summary" :class="element">
    <div class="opponent-info">
      <span class="opponent-name">{{ name }}</span>
      <span class="element-badge" :class="element">{{ element }}</span>
      <span class="opponent-score">Score: {{ score }}/3</span>
    </div>
    
    <div class="active-preview" v-if="active">
      <span class="pokemon-name">{{ active.name }}</span>
      <div class="hp-bar-container">
        <div class="hp-bar" :style="{ width: hpPercentage + '%' }" :class="hpClass"></div>
      </div>
      <span class="hp-text">{{ active.currentHp }}/{{ active.hp }}</span>
    </div>
    <div class="active-preview empty" v-else>
      <span>No Active Pokémon</span>
    </div>

    <div class="card-counts">
      <div class="count-item">
        <span class="count-icon">📚</span>
        <span class="count-value">{{ deckCount }}</span>
      </div>
      <div class="count-item">
        <span class="count-icon">✋</span>
        <span class="count-value">{{ handCount }}</span>
      </div>
      <div class="count-item">
        <span class="count-icon">🪑</span>
        <span class="count-value">{{ benchCount }}</span>
      </div>
      <div class="count-item">
        <span class="count-icon">🎁</span>
        <span class="count-value">{{ prizeCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card, ElementType } from '../types'

const props = defineProps<{
  name: string
  element: ElementType | null
  active: Card | null
  deckCount: number
  handCount: number
  benchCount: number
  prizeCount: number
  score: number
}>()

const hpPercentage = computed(() => {
  if (!props.active || !props.active.hp) return 0
  return Math.max(0, ((props.active.currentHp || 0) / props.active.hp) * 100)
})

const hpClass = computed(() => {
  const pct = hpPercentage.value
  if (pct > 60) return 'hp-high'
  if (pct > 30) return 'hp-medium'
  return 'hp-low'
})
</script>

<style scoped>
.opponent-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg-dark);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border-color);
  gap: 20px;
}

.opponent-summary.fire { border-color: var(--fire-primary); }
.opponent-summary.water { border-color: var(--water-primary); }
.opponent-summary.grass { border-color: var(--grass-primary); }
.opponent-summary.electric { border-color: var(--electric-primary); }

.opponent-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.opponent-name {
  font-weight: 700;
  font-size: 1.1rem;
}

.element-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.element-badge.fire { background: var(--fire-gradient); color: white; }
.element-badge.water { background: var(--water-gradient); color: white; }
.element-badge.grass { background: var(--grass-gradient); color: white; }
.element-badge.electric { background: var(--electric-gradient); color: #333; }

.opponent-score {
  padding: 4px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
}

.active-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 300px;
}

.active-preview.empty {
  color: var(--text-secondary);
  font-style: italic;
}

.pokemon-name {
  font-weight: 600;
  min-width: 80px;
}

.hp-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.hp-bar {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.hp-bar.hp-high { background: #4ade80; }
.hp-bar.hp-medium { background: #fbbf24; }
.hp-bar.hp-low { background: #ef4444; }

.hp-text {
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.card-counts {
  display: flex;
  gap: 16px;
}

.count-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
}

.count-icon {
  font-size: 1rem;
}

.count-value {
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
