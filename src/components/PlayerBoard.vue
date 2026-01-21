<template>
  <div 
    class="player-board" 
    :class="[playerClass, elementClass, { 'active': isActive }]"
  >
    <!-- Player Info -->
    <div class="player-info">
      <div class="player-name">
        {{ playerName }}
        <span v-if="element" class="element-badge" :class="element">
          {{ element }}
        </span>
      </div>
      <div v-if="isActive" class="turn-indicator">
        Your Turn
      </div>
    </div>
    
    <!-- Zones Grid -->
    <div class="zones-grid">
      <!-- Row 1: Active Row -->
      <Zone label="0" type="prizes" class="grid-prizes" :count="prizeCards.length">
        <div class="mini-card-stack">
          <div v-for="c in prizeCards" :key="c.uniqueId" class="mini-card prize">🎁</div>
        </div>
      </Zone>

      <Zone label="ACTIVE" type="active" class="grid-active">
        <Card v-if="active" :card="active" size="normal" @click="handleCardClick" />
      </Zone>

      <Zone label="ENERGY" type="energy" class="grid-energy" :count="energyZone.length">
        <div class="mini-card-stack">
          <div v-for="e in energyZone" :key="e.uniqueId" class="mini-card" :class="e.element">
            {{ getElementEmoji(e.element as string) }}
          </div>
        </div>
      </Zone>

      <!-- Row 2: Bench Row -->
      <Zone label="DECK" type="deck" class="grid-deck" :count="deck.length">
        <div v-if="deck.length" class="deck-stack">
          <div class="card-back">{{ deck.length }}</div>
        </div>
      </Zone>

      <!-- Bank Slots (Split into 3 specific zones in logic, or one big zone spanning 3 cols) -->
      <!-- To match strict alignment, let's keep one zone but span it across the 3 middle columns -->
      <Zone label="BANK" type="bank" class="grid-bank" :count="bank.length">
        <div class="bank-container">
            <!-- Fixed slots for bank -->
            <div class="bank-slot">
                <Card v-if="bank[0]" :card="bank[0]" size="small" @click="handleCardClick" />
                <div v-else class="card-placeholder"></div>
            </div>
            <div class="bank-slot">
                <Card v-if="bank[1]" :card="bank[1]" size="small" @click="handleCardClick" />
                <div v-else class="card-placeholder"></div>
            </div>
            <div class="bank-slot">
                <Card v-if="bank[2]" :card="bank[2]" size="small" @click="handleCardClick" />
                <div v-else class="card-placeholder"></div>
            </div>
        </div>
      </Zone>

      <Zone label="DISCARD" type="discard" class="grid-discard" :count="discardPile.length">
        <Card v-if="topDiscard" :card="topDiscard" size="small" />
      </Zone>
    </div>

    <!-- Hand (Overlay) -->
    <div class="hand-container">
       <div class="hand-scroll">
          <Card v-for="card in hand" :key="card.uniqueId" :card="card" size="large" @click="handleCardClick" />
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ... existing script ...
import { computed } from 'vue'
import Zone from './Zone.vue'
import Card from './Card.vue'
import type { Card as CardType, ElementType } from '../types'

const props = defineProps<{
  playerNumber: number
  playerName: string
  element: ElementType | null
  deck: CardType[]
  hand: CardType[]
  active: CardType | null
  bank: CardType[]
  energyZone: CardType[]
  discardPile: CardType[]
  prizeCards: CardType[]
  isActive: boolean
}>()

const emit = defineEmits<{
  (e: 'cardClick', card: CardType): void
}>()

const playerClass = computed(() => `player-${props.playerNumber}`)
const elementClass = computed(() => props.element || '')

const topDiscard = computed((): CardType | null => {
  if (props.discardPile.length === 0) return null
  return props.discardPile[props.discardPile.length - 1] || null
})

function handleCardClick(card: CardType) {
  emit('cardClick', card)
}

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
.player-board {
  display: flex;
  flex-direction: column;
  height: 30vh; /* Reduced to fit everything */
  padding: 8px 8px 70px 8px; /* Bottom padding for hand */
  position: relative;
  align-items: center; 
}

.zones-grid {
  display: grid;
  width: 100%;
  max-width: 550px;
  /* 5 Columns layout */
  grid-template-columns: 70px 1fr 120px 1fr 70px;
  grid-template-rows: 1fr 0.8fr;
  grid-template-areas:
    "prizes .      active .      energy"
    "deck   bank   bank   bank   discard";
  gap: 6px;
  flex: 1;
}

/* Specific Grid Areas */
.grid-prizes  { grid-area: prizes; }
.grid-active  { grid-area: active; }
.grid-energy  { grid-area: energy; }
.grid-deck    { grid-area: deck; }
.grid-bank    { grid-area: bank; }
.grid-discard { grid-area: discard; }

/* Bank Layout */
.bank-container {
  display: flex;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  align-items: center;
}

.bank-slot {
  width: 70px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-placeholder {
  width: 60px;
  height: 84px;
  border: 2px dashed rgba(255,255,255,0.15);
  border-radius: 6px;
}

/* Hand Layout - Fixed at bottom */
.hand-container {
  height: 75px;
  width: 100%;
  max-width: 500px;
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  border-radius: 8px;
  padding: 4px 8px;
  z-index: 100;
  border: 1px solid rgba(255,255,255,0.2);
}

.hand-scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  align-items: center;
  justify-content: flex-start;
  padding: 2px;
}

.hand-scroll::-webkit-scrollbar {
  height: 4px;
}

.hand-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
}

/* P2 Hand at top */
:global(.player-2) .hand-container {
    top: 4px;
    bottom: auto;
    transform: translateX(-50%) rotate(180deg);
}

/* P2 Rotation Logic */
:global(.player-2) .zones-grid {
    grid-template-areas:
    "deck   bank   bank   bank   discard"
    "prizes .      active .      energy";
    grid-template-rows: 0.8fr 1fr;
}

/* Mini cards for prizes/energy */
.mini-card-stack {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
    max-height: 100%;
    overflow: hidden;
}

.mini-card {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: #333;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.mini-card.prize { background: goldenrod; }
.mini-card.fire { background: var(--fire-gradient); }
.mini-card.water { background: var(--water-gradient); }
.mini-card.grass { background: var(--grass-gradient); }
.mini-card.electric { background: var(--electric-gradient); }

/* Deck stack */
.deck-stack {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.card-back {
  width: 50px;
  height: 70px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
</style>

