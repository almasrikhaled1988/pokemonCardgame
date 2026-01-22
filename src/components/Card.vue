<template>
  <div 
    v-if="card"
    :class="cardClasses"
    @click="$emit('click', card)"
    @contextmenu.prevent="handleRightClick"
  >
    <!-- Pokemon Card -->
    <div v-if="card.type === 'pokemon'" class="card-content">
      <div class="card-header">
        <span 
          class="card-name"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
        >{{ card.name }}</span>
        <span class="card-hp">{{ card.currentHp }}/{{ card.hp }} HP</span>
      </div>
      
      <div class="card-image">
        {{ getElementEmoji(card.element as string) }}
      </div>
      
      <div class="card-attacks">
        <div 
          v-for="(attack, index) in card.attacks" 
          :key="index"
          class="attack"
        >
          <span class="attack-name">{{ attack.name }}</span>
          <span class="attack-damage">{{ attack.damage }}</span>
        </div>
      </div>
      
      <div v-if="card.attachedEnergy && card.attachedEnergy.length > 0" class="attached-energy">
        <span 
          v-for="(energy, index) in card.attachedEnergy" 
          :key="index"
          class="energy-icon"
        >
          {{ getElementEmoji(energy.element as string) }}
        </span>
      </div>
    </div>
    
    <!-- Energy Card -->
    <div 
      v-else-if="card.type === 'energy'" 
      class="energy-card-content"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      {{ getElementEmoji(card.element as string) }}
    </div>
    
    <!-- Trainer Card -->
    <div v-else-if="card.category === 'trainer'" class="trainer-card-content">
      <div 
        class="trainer-name"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >{{ card.name }}</div>
      <div class="trainer-effect">{{ card.description }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '../types'
import { useGameStore } from '../stores/gameStore'

const props = withDefaults(defineProps<{
  card: Card
  size?: string
}>(), {
  size: 'normal'
})

const store = useGameStore()

function handleMouseEnter(event: MouseEvent) {
  store.hoveredCard = props.card
  store.hoveredCardPosition = { x: event.clientX, y: event.clientY }
}

function handleMouseLeave() {
  store.hoveredCard = null
  store.hoveredCardPosition = null
}

function handleRightClick() {
  store.selectedCard = props.card
}

defineEmits<{
  (e: 'click', card: Card): void
}>()

const cardClasses = computed(() => {
  const classes = []
  
  if (props.card.type === 'pokemon') {
    classes.push('pokemon-card', props.card.element)
  } else if (props.card.type === 'energy') {
    classes.push('energy-card', props.card.element)
  } else if (props.card.category === 'trainer') {
    classes.push('trainer-card')
  }
  
  classes.push(`size-${props.size}`)
  
  return classes
})

function getElementEmoji(element: string) {
  const emojis: Record<string, string> = {
    fire: '🔥',
    water: '💧',
    grass: '🌿',
    electric: '⚡'
  }
  return emojis[element] || '❓'
}
</script>

<style scoped>
/* Base Card Content */
.card-content, .energy-card-content, .trainer-card-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-content .card-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  margin-bottom: 2px;
}

.card-content .card-image {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
  margin-bottom: 2px;
}

.card-content .card-attacks {
  font-size: 0.5rem;
}

.card-content .attack {
  display: flex;
  justify-content: space-between;
  padding: 1px 2px;
  background: rgba(0,0,0,0.15);
  border-radius: 2px;
  margin-bottom: 1px;
}

.energy-card-content {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trainer-card-content {
  font-size: 0.55rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

/* Normal size (for Active zone) */
.size-normal.pokemon-card, .size-normal.trainer-card {
  width: 90px;
  height: 126px;
  padding: 4px;
}

.size-normal.energy-card {
  width: 50px;
  height: 70px;
}

/* Small size (for Hand cards) */
.size-small.pokemon-card, .size-small.trainer-card {
  width: 50px;
  height: 70px;
  padding: 3px;
  font-size: 0.5rem;
}

.size-small .card-image {
  font-size: 1rem;
}

.size-small .card-attacks {
  display: none; /* Hide attacks on small cards */
}

.size-small.energy-card {
  width: 35px;
  height: 50px;
  font-size: 1rem;
}

/* Attached energy icons */
.attached-energy {
  display: flex;
  gap: 2px;
  font-size: 0.6rem;
  margin-top: auto;
}
</style>
