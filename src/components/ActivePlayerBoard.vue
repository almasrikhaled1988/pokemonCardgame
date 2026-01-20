<template>
  <div class="active-board">
    <!-- Main Play Area -->
    <div class="play-area">
      <!-- Left Side: Deck & Energy -->
      <div class="side-column left">
        <div class="zone-stack deck-zone" @click="$emit('deckClick')">
          <div class="zone-label">DECK</div>
          <div class="deck-visual">
            <div class="card-back">{{ deck.length }}</div>
          </div>
        </div>
        
        <div class="zone-stack energy-zone">
          <div class="zone-label">ENERGY</div>
          <div class="energy-pile">
            <div 
              v-for="(energy, i) in energyZone.slice(0, 5)" 
              :key="energy.uniqueId"
              class="mini-energy"
              :class="energy.element"
              :style="{ transform: `translateY(${i * -4}px)` }"
            >
              {{ getEmoji(energy.element) }}
            </div>
            <span v-if="energyZone.length > 5" class="more-count">+{{ energyZone.length - 5 }}</span>
          </div>
          <div class="zone-count">{{ energyZone.length }}</div>
        </div>
      </div>

      <!-- Center: Active Pokemon -->
      <div class="center-column">
        <div class="active-zone" @click="handleActiveClick">
          <div class="zone-label">ACTIVE POKÉMON</div>
          
          <div v-if="active" class="active-card-container">
            <!-- Large Active Card -->
            <div class="active-card" :class="active.element">
              <div class="card-top">
                <span class="card-name">{{ active.name }}</span>
                <span class="card-hp" :class="hpClass">{{ active.currentHp }}/{{ active.hp }} HP</span>
              </div>
              
              <div class="card-art">
                <img 
                  :src="getPokemonImage(active.name)" 
                  :alt="active.name"
                  class="pokemon-image"
                  @error="handleImageError"
                />
              </div>
              
              <div class="hp-bar-large">
                <div class="hp-fill" :style="{ width: hpPercent + '%' }" :class="hpClass"></div>
              </div>
              
              <div class="attacks-section">
                <button 
                  v-for="(attack, index) in active.attacks" 
                  :key="index"
                  class="attack-button"
                  :class="{ disabled: energyZone.length < attack.energyCost }"
                  @click.stop="$emit('attack', index)"
                >
                  <span class="attack-name">{{ attack.name }}</span>
                  <span class="attack-cost">{{ attack.energyCost }}⚡</span>
                  <span class="attack-damage">{{ attack.damage }} DMG</span>
                </button>
              </div>
              
              <div v-if="active.attachedEnergy?.length" class="attached-energy">
                <span v-for="e in active.attachedEnergy" :key="e.uniqueId" class="attached-icon">
                  {{ getEmoji(e.element) }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-active">
            <span>Play a Pokémon from your hand!</span>
          </div>
        </div>
        
        <!-- Bench -->
        <div class="bench-zone">
          <div class="zone-label">BENCH ({{ bank.length }}/3)</div>
          <div class="bench-slots">
            <div 
              v-for="(slot, idx) in benchSlots" 
              :key="idx" 
              class="bench-slot"
              :class="{ filled: slot }"
              @click="slot && $emit('benchClick', slot)"
            >
              <div v-if="slot" class="bench-card" :class="slot.element">
                <img 
                  :src="getPokemonSprite(slot.name)" 
                  :alt="slot.name"
                  class="bench-pokemon-image"
                  @error="handleImageError"
                />
                <span class="bench-name">{{ slot.name }}</span>
                <span class="bench-hp">{{ slot.currentHp }}/{{ slot.hp }}</span>
              </div>
              <div v-else class="bench-placeholder">
                <span>Empty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side: Prizes & Discard -->
      <div class="side-column right">
        <div class="zone-stack prizes-zone">
          <div class="zone-label">PRIZES</div>
          <div class="prizes-stack">
            <div v-for="(p, i) in prizeCards" :key="i" class="prize-card">🎁</div>
          </div>
          <div class="zone-count">{{ prizeCards.length }}/3</div>
        </div>
        
        <div class="zone-stack discard-zone">
          <div class="zone-label">DISCARD</div>
          <div class="discard-pile">
            <div v-if="discardPile.length" class="discard-top">
              {{ discardPile.length }}
            </div>
            <div v-else class="discard-empty">—</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hand -->
    <div class="hand-section">
      <div class="hand-header">
        <span class="hand-label">YOUR HAND</span>
        <span class="hand-count">{{ hand.length }} cards</span>
      </div>
      <div class="hand-cards">
        <div 
          v-for="card in hand" 
          :key="card.uniqueId"
          class="hand-card"
          :class="[card.type, card.element, card.category]"
          @click="$emit('playCard', card)"
        >
          <template v-if="card.type === 'pokemon'">
            <img 
              :src="getPokemonSprite(card.name)" 
              :alt="card.name"
              class="hc-pokemon-image"
              @error="handleImageError"
            />
            <div class="hc-name">{{ card.name }}</div>
            <div class="hc-hp">{{ card.hp }} HP</div>
          </template>
          <template v-else-if="card.type === 'energy'">
            <div class="hc-energy">{{ getEmoji(card.element) }}</div>
          </template>
          <template v-else>
            <div class="hc-trainer">{{ card.name }}</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '../types'
import { getPokemonImageUrl, getPokemonSpriteUrl } from '../utils/pokemonImages'

const props = defineProps<{
  deck: Card[]
  hand: Card[]
  active: Card | null
  bank: Card[]
  energyZone: Card[]
  discardPile: Card[]
  prizeCards: Card[]
}>()

defineEmits<{
  (e: 'playCard', card: Card): void
  (e: 'attack', index: number): void
  (e: 'benchClick', card: Card): void
  (e: 'deckClick'): void
}>()

const hpPercent = computed(() => {
  if (!props.active || !props.active.hp) return 0
  return Math.max(0, ((props.active.currentHp || 0) / props.active.hp) * 100)
})

const hpClass = computed(() => {
  const pct = hpPercent.value
  if (pct > 60) return 'hp-high'
  if (pct > 30) return 'hp-medium'
  return 'hp-low'
})

const benchSlots = computed(() => {
  // Return array of 3 slots (card or null)
  return [
    props.bank[0] || null,
    props.bank[1] || null,
    props.bank[2] || null
  ]
})

function handleActiveClick() {
  // Could show detailed view
}

function getEmoji(element: string | undefined) {
  const emojis: Record<string, string> = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡'
  }
  return element ? emojis[element] || '❓' : '❓'
}

function getPokemonImage(name: string) {
  return getPokemonImageUrl(name)
}

function getPokemonSprite(name: string) {
  return getPokemonSpriteUrl(name)
}

function handleImageError(e: Event) {
  // Fallback if image fails to load
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped>
.active-board {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.play-area {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/* Side Columns */
.side-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100px;
}

.zone-stack {
  background: var(--bg-zone);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.zone-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.zone-count {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.7;
}

/* Deck */
.deck-visual {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back {
  width: 60px;
  height: 84px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Energy Pile */
.energy-pile {
  position: relative;
  height: 60px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mini-energy {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  position: absolute;
}

.mini-energy.fire { background: var(--fire-gradient); }
.mini-energy.water { background: var(--water-gradient); }
.mini-energy.grass { background: var(--grass-gradient); }
.mini-energy.electric { background: var(--electric-gradient); }

/* Prizes */
.prizes-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.prize-card {
  width: 40px;
  height: 28px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

/* Discard */
.discard-pile {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.discard-top {
  width: 50px;
  height: 70px;
  background: #333;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
}

.discard-empty {
  color: var(--text-secondary);
  font-size: 1.5rem;
}

/* Center Column */
.center-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Active Zone */
.active-zone {
  flex: 1;
  background: var(--bg-zone);
  border: 3px solid rgba(255, 215, 0, 0.4);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-active {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-style: italic;
}

.active-card-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.active-card {
  width: 200px;
  max-width: 100%;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 12px;
  border: 3px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.active-card.fire { border-color: var(--fire-primary); }
.active-card.water { border-color: var(--water-primary); }
.active-card.grass { border-color: var(--grass-primary); }
.active-card.electric { border-color: var(--electric-primary); }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-name {
  font-size: 1.1rem;
  font-weight: 700;
}

.card-hp {
  font-size: 0.9rem;
  font-weight: 600;
}

.card-hp.hp-high { color: #4ade80; }
.card-hp.hp-medium { color: #fbbf24; }
.card-hp.hp-low { color: #ef4444; }

.card-art {
  height: 120px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pokemon-image {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

.pokemon-emoji {
  font-size: 3rem;
}

.hp-bar-large {
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.hp-fill.hp-high { background: #4ade80; }
.hp-fill.hp-medium { background: #fbbf24; }
.hp-fill.hp-low { background: #ef4444; }

.attacks-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attack-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.attack-button:hover:not(.disabled) {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.attack-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.attack-name { font-weight: 600; }
.attack-cost { color: var(--electric-primary); }
.attack-damage { color: #ef4444; font-weight: 700; }

.attached-energy {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.attached-icon {
  font-size: 1rem;
}

/* Bench Zone */
.bench-zone {
  background: var(--bg-zone);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 10px;
}

.bench-slots {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 8px;
}

.bench-slot {
  width: 90px;
  height: 70px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bench-placeholder {
  width: 100%;
  height: 100%;
  border: 2px dashed rgba(255,255,255,0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.bench-card {
  width: 100%;
  height: 100%;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 2px solid var(--border-color);
}

.bench-card.fire { border-color: var(--fire-primary); }
.bench-card.water { border-color: var(--water-primary); }
.bench-card.grass { border-color: var(--grass-primary); }
.bench-card.electric { border-color: var(--electric-primary); }

.bench-pokemon-image {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.bench-name { font-size: 0.65rem; font-weight: 600; }
.bench-hp { font-size: 0.55rem; color: var(--text-secondary); }
.bench-emoji { font-size: 1.2rem; }

.bench-slot:hover .bench-card {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Hand Section */
.hand-section {
  background: var(--bg-dark);
  border-radius: 12px;
  padding: 12px;
  border: 2px solid var(--border-color);
}

.hand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.hand-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hand-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.hand-cards {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.hand-card {
  min-width: 70px;
  height: 100px;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 8px;
  border: 2px solid var(--border-color);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.hand-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
  z-index: 10;
}

.hand-card.pokemon.fire { border-color: var(--fire-primary); }
.hand-card.pokemon.water { border-color: var(--water-primary); }
.hand-card.pokemon.grass { border-color: var(--grass-primary); }
.hand-card.pokemon.electric { border-color: var(--electric-primary); }

.hand-card.energy.fire { background: var(--fire-gradient); }
.hand-card.energy.water { background: var(--water-gradient); }
.hand-card.energy.grass { background: var(--grass-gradient); }
.hand-card.energy.electric { background: var(--electric-gradient); }

.hand-card.trainer { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.hc-name { font-size: 0.65rem; font-weight: 600; text-align: center; }
.hc-emoji { font-size: 1.5rem; }
.hc-hp { font-size: 0.6rem; color: var(--text-secondary); }
.hc-energy { font-size: 2rem; }
.hc-trainer { font-size: 0.6rem; text-align: center; font-weight: 600; }
</style>
