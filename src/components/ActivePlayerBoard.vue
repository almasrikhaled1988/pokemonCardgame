<template>
  <div class="active-board" :class="{ 'evolution-mode': pendingEvolution }">
    <!-- Evolution Overlay Banner -->
    <div v-if="pendingEvolution" class="evolution-banner">
      <div class="banner-content">
        <span class="pulse-text">✨ Select Pokémon to evolve into <strong>{{ pendingEvolution.name }}</strong></span>
        <button class="btn-cancel-evo" @click="$emit('cancelEvolution')">Cancel</button>
      </div>
    </div>
    <!-- Main Play Area -->
    <div class="play-area">
      <!-- Center: Focus everything here -->
      <div class="center-column">
        <!-- Player Info (Moved from App.vue) -->
        <div class="player-info-integrated">
          <div class="pi-left">
            <span class="pi-your-turn">Your Turn</span>
            <span class="pi-name">{{ name }}</span>
          </div>
          <div class="pi-center">
            <span class="pi-turn-number">Turn {{ turnNumber }}</span>
          </div>
          <div class="pi-right">
            <span class="pi-score">Score: {{ score }}/3</span>
            <button class="pi-end-turn" @click="$emit('endTurn')" :disabled="isBotTurn">
              End Turn
            </button>
          </div>
        </div>

        <div class="active-zone" @click="handleActiveClick">
          <!-- Integrated Zones -->
          <div class="integrated-zones-left">
            <div class="zone-stack deck-zone mini" @click="$emit('deckClick')">
              
              <div class="card-back mini">{{ deck.length }}</div>
            </div>
            
            <div class="zone-stack energy-zone mini">
              
              <div class="energy-pile mini">
                <div 
                  v-for="(energy, i) in energyZone.slice(0, 3)" 
                  :key="energy.uniqueId"
                  class="mini-icon"
                  :class="energy.element"
                >
                  {{ getEmoji(energy.element) }}
                </div>
              </div>
              <div class="zone-count mini">{{ energyZone.length }}</div>
            </div>
          </div>

          <div class="active-card-only-container">
            <div v-if="active" class="active-card-container">
              <!-- Combat VFX Overlay -->
              <div 
                v-if="activeVfx && activeVfx.target === 'player' + playerId" 
                class="combat-vfx-overlay" 
                :class="activeVfx.type"
                :key="activeVfx.timestamp"
              ></div>

              <!-- Large Active Card -->
              <div class="active-card" :class="active.element">
                <div class="card-top">
                  <div class="card-name-group">
                    <span class="card-name">{{ active.name }}</span>
                    <span v-if="active.stage" class="card-stage-label">{{ active.stage }}</span>
                  </div>
                  <span class="card-hp" :class="hpClass">{{ active.currentHp }}/{{ active.hp }} HP</span>
                </div>
                
                <div class="card-art">
                  <div v-if="active.statusEffects?.length" class="status-effects-overlay">
                    <span v-for="effect in active.statusEffects" :key="effect" class="status-badge" :class="effect">
                      <span v-if="effect === 'poisoned'">☠️</span>
                      <span v-else-if="effect === 'burned'">🔥</span>
                      <span v-else-if="effect === 'paralyzed'">⚡</span>
                      <span v-else-if="effect === 'asleep'">💤</span>
                      {{ effect }}
                    </span>
                  </div>
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

          <div class="integrated-zones-right">
            <div class="zone-stack prizes-zone mini">
              <div class="prizes-stack mini">
                <div v-for="(p, i) in prizeCards" :key="i" class="prize-card mini">🎁</div>
              </div>
              <div class="zone-count mini">{{ prizeCards.length }}/3</div>
            </div>
            
            <div class="zone-stack discard-zone mini">
              <div class="discard-pile mini">
                <div v-if="discardPile.length" class="discard-top mini">
                  {{ discardPile.length }}
                </div>
                <div v-else class="discard-empty mini">—</div>
              </div>
            </div>
          </div>

          <div class="battle-log-integrated">
            <BattleLog :logs="logs" />
          </div>
        </div>
        
        <!-- Bench (Moved below side zones) -->
        <div class="bench-zone integrated">
          
          <div class="bench-slots mini">
            <div 
              v-for="(slot, idx) in benchSlots" 
              :key="idx" 
              class="bench-slot mini"
              :class="{ filled: slot, 'evo-target': pendingEvolution && slot }"
              @click="handleBenchSlotClick(slot)"
            >
              <div v-if="slot" class="active-card bench-version" :class="slot.element">
                <div class="card-top">
                  <div class="card-name-group">
                    <span class="card-name">{{ slot.name }}</span>
                  </div>
                  <span class="card-hp" :class="getCardHpClass(slot)">{{ slot.currentHp }}/{{ slot.hp }}</span>
                </div>
                <div class="card-art">
                  <div v-if="slot.statusEffects?.length" class="status-effects-overlay mini">
                    <span v-for="effect in slot.statusEffects" :key="effect" class="status-badge mini" :class="effect">
                      <span v-if="effect === 'poisoned'">☠️</span>
                      <span v-else-if="effect === 'burned'">🔥</span>
                      <span v-else-if="effect === 'paralyzed'">⚡</span>
                      <span v-else-if="effect === 'asleep'">💤</span>
                    </span>
                  </div>
                  <img :src="getPokemonSprite(slot.name)" :alt="slot.name" class="pokemon-image" @error="handleImageError" />
                </div>
                <div class="hp-bar-large">
                  <div class="hp-fill" :style="{ width: getCardHpPercent(slot) + '%' }" :class="getCardHpClass(slot)"></div>
                </div>
              </div>
              <div v-else class="bench-placeholder mini">
                <span>—</span>
              </div>
            </div>
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
          :class="[card.type, card.element, card.category, card.stage, { 'pending-source': pendingEvolution?.uniqueId === card.uniqueId }]"
          @click="$emit('playCard', card)"
        >
          <template v-if="card.type === 'pokemon'">
            <div class="active-card hand-version" :class="card.element">
              <div class="card-top">
                <div class="card-name-group">
                  <span class="card-name">{{ card.name }}</span>
                  <span v-if="card.stage" class="card-stage-label">{{ card.stage }}</span>
                </div>
                <span class="card-hp" :class="getCardHpClass(card)">{{ card.hp }} HP</span>
              </div>
              <div class="card-art">
                <img :src="getPokemonSprite(card.name)" :alt="card.name" class="pokemon-image" @error="handleImageError" />
              </div>
              <div class="hp-bar-large">
                <div class="hp-fill" style="width: 100%" :class="getCardHpClass(card)"></div>
              </div>
              <div class="attacks-section">
                <div v-for="(atk, idx) in card.attacks" :key="idx" class="attack-button mini disabled">
                  <span class="attack-name">{{ atk.name }}</span>
                  <span class="attack-cost">{{ atk.energyCost }}⚡</span>
                  <span class="attack-damage">{{ atk.damage }} DMG</span>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="card.type === 'energy'">
            <div class="hc-energy-card">
              <div class="hc-energy-icon">{{ getEmoji(card.element) }}</div>
              <div class="hc-energy-text">Energy</div>
            </div>
          </template>
          <template v-else>
            <div class="hc-trainer-card">
              <div class="hc-trainer-icon">📜</div>
              <div class="hc-trainer">{{ card.name }}</div>
            </div>
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
import BattleLog from './BattleLog.vue'

const props = defineProps<{
  deck: Card[]
  hand: Card[]
  active: Card | null
  bank: Card[]
  energyZone: Card[]
  discardPile: Card[]
  prizeCards: Card[]
  pendingEvolution: Card | null
  // Added props
  name: string
  score: number
  turnNumber: number
  isBotTurn: boolean
  logs: string[]
  playerId: number
  activeVfx: { type: string; target: string; timestamp: number } | null
}>()

const emit = defineEmits<{
  (e: 'playCard', card: Card): void
  (e: 'attack', index: number): void
  (e: 'benchClick', card: Card): void
  (e: 'deckClick'): void
  (e: 'evolve', target: Card): void
  (e: 'cancelEvolution'): void
  (e: 'endTurn'): void
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

function getCardHpPercent(card: Card) {
  if (!card || !card.hp) return 0
  const current = card.currentHp !== undefined ? card.currentHp : card.hp
  return Math.max(0, (current / card.hp) * 100)
}

function getCardHpClass(card: Card) {
  const pct = getCardHpPercent(card)
  if (pct > 60) return 'hp-high'
  if (pct > 30) return 'hp-medium'
  return 'hp-low'
}

const benchSlots = computed(() => {
  // Return array of 3 slots (card or null)
  return [
    props.bank[0] || null,
    props.bank[1] || null,
    props.bank[2] || null
  ]
})

function handleActiveClick() {
  if (props.pendingEvolution && props.active) {
    emit('evolve', props.active)
  }
}

function handleBenchSlotClick(card: Card | null) {
  if (props.pendingEvolution && card) {
    emit('evolve', card)
  } else if (card) {
    emit('benchClick', card)
  }
}

function getEmoji(element: string | undefined) {
  const emojis: Record<string, string> = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮', fighting: '🥊'
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
  gap: 4px;
  position: relative;
  overflow: hidden;
}

.play-area {
  display: flex;
  flex: 1;
  min-height: 0;
  justify-content: center;
}

/* Side Columns Removed from direct layout, moved inside center */

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
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0; /* Prevent flex overflow */
}

/* Player Info Integrated */
.player-info-integrated {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  background: rgba(0,0,0,0.4);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  flex-wrap: wrap;
  gap: 4px;
}

.pi-left, .pi-right { display: flex; align-items: center; gap: 12px; }
.pi-your-turn {
  background: var(--fire-gradient);
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 800;
  text-transform: uppercase;
}
.pi-name { font-weight: 700; font-size: 1.1rem; }
.pi-turn-number { font-size: 0.8rem; opacity: 0.6; font-weight: 800; }
.pi-score { font-weight: 700; color: #4ade80; }
.pi-end-turn {
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}
.pi-end-turn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Active Zone restructured */
.active-zone {
  flex: 1 1 0;
  background: var(--bg-zone);
  border: 2px solid rgba(255, 215, 0, 0.2);
  border-radius: 20px;
  padding: 4px;
  display: grid;
  grid-template-columns: auto 1fr auto minmax(150px, 200px);
  align-items: center;
  gap: 4px;
  position: relative;
  min-height: 0;
}

.battle-log-integrated {
  height: 100%;
  max-height: 380px; /* Match active card height roughly */
  display: flex;
}

.integrated-zones-left, .integrated-zones-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  justify-content: center;
}

.zone-stack.mini {
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(5px);
  transition: transform 0.2s ease;
}

.zone-stack.mini:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.card-back.mini {
  width: 44px;
  height: 62px;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  border: 1px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
}

.energy-pile.mini {
  display: flex;
  gap: -4px;
}

.mini-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mini-icon.fire { background: var(--fire-primary); }
.mini-icon.water { background: var(--water-primary); }
.mini-icon.grass { background: var(--grass-primary); }
.mini-icon.electric { background: var(--electric-primary); }

.prizes-stack.mini {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}

.prize-card.mini {
  width: 28px;
  height: 20px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 3px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
}

.discard-top.mini {
  width: 44px;
  height: 62px;
  background: #222;
  border: 1px dashed rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #888;
}

.empty-active {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

.center-play-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  min-height: 0;
  flex: 1;
  justify-content: center;
}

.active-card-only-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  flex: 1;
  justify-content: center;
}

/* Integrated Bench */
.bench-zone.integrated {
  background: rgba(0,0,0,0.3);
  width: 100%;
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(255,255,255,0.05);
  margin-top: 4px;
}

.bench-slots.mini {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
}

.bench-slot.mini {
  width: 80px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
}

.bench-card.mini {
  width: 100%;
  height: 100%;
  background: #222;
  display: flex;
  align-items: center;
  padding: 4px;
  gap: 6px;
  border: 1px solid rgba(255,255,255,0.1);
}

.bench-card.mini.fire { border-color: var(--fire-primary); }
.bench-card.mini.water { border-color: var(--water-primary); }
.bench-card.mini.grass { border-color: var(--grass-primary); }
.bench-card.mini.electric { border-color: var(--electric-primary); }

.bench-pokemon-image.mini {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.bench-info-mini {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .active-zone {
    grid-template-columns: auto 1fr auto;
    grid-template-rows: 1fr;
    padding: 8px 4px;
    gap: 4px;
  }

  .integrated-zones-left, 
  .integrated-zones-right {
    flex-direction: column;
    justify-content: center;
    height: 100%;
    width: auto;
    order: unset;
    padding: 0;
    border: none;
  }

  .active-card-only-container {
    padding: 0 4px;
  }

  .active-card {
    width: 120px;
    padding: 4px;
    gap: 2px;
  }
  
  .card-art { height: 60px; }
  .card-name { font-size: 0.75rem; }
  .attack-button { padding: 3px; font-size: 0.65rem; }

  .bench-zone.integrated {
    padding: 4px;
  }

  .bench-slot.mini {
    width: 50px;
    height: 100px;
  }

  .bench-pokemon-image.mini {
    width: 18px;
    height: 18px;
  }

  .hand-section {
    padding: 4px;
  }

  .hand-card {
    min-width: 75px;
    height: 100px;
  }
}

@media (max-width: 480px) {
  .pi-center { width: 100%; order: 3; text-align: center; }
  .pi-left { order: 1; }
  .pi-right { order: 2; }
  
  .active-card {
    max-width: 220px;
  }
  
  .hand-card {
    min-width: 80px;
    height: 225px;
    font-size: 0.8rem;
  }
}

.bench-placeholder.mini {
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
}

.active-card-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
}

.active-card {
  width: 180px;
  max-width: 100%;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 8px;
  border: 3px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.card-name-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.card-name {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
}

.card-stage-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--text-secondary);
  background: rgba(0,0,0,0.2);
  padding: 1px 6px;
  border-radius: 4px;
  margin-top: 2px;
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
  flex-shrink: 0; /* Never shrink the art */
}

.pokemon-image {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

.pokemon-emoji {
  font-size: 2.5rem;
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
  gap: 4px;
  min-height: 40px; /* Reserve space for at least 1-2 buttons */
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
  gap: 6px;
  justify-content: center;
  margin-top: 4px;
}

.bench-slot {
  width: 70px;
  height: 98px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
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

.bench-slot:hover .active-card.bench-version {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.active-card.bench-version {
  max-width: none;
  width: 100%;
  height: 100%;
  padding: 6px;
  gap: 2px;
  border-width: 2px;
  box-shadow: none;
  border-radius: 10px;
}

.bench-version .card-name { font-size: 0.65rem; }
.bench-version .card-hp { font-size: 0.55rem; }
.bench-version .card-art { height: 45px; background: rgba(0,0,0,0.1); flex-shrink: 0; }
.bench-version .hp-bar-large { height: 3px; }

.hand-section {
  background: rgba(0,0,0,0.6);
  border-radius: 16px;
  padding: 8px 12px;
  border: 2px solid rgba(255,255,255,0.05);
  backdrop-filter: blur(10px);
  flex-shrink: 0; /* Keep hand size stable */
}

.hand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.hand-label {
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #667eea;
}

.hand-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.hand-cards {
  display: flex;
  gap: 8px;
  padding: 4px 4px 12px;
  overflow-x: auto;
  perspective: 1000px;
}

.hand-card {
  min-width: 120px;
  height: 200px; /* Increased from 168px to fit 2 attacks + fixed art */
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  flex-shrink: 0;
  position: relative;
}

.hand-card:hover {
  transform: translateY(-30px) rotateX(10deg);
  border-color: #667eea;
  box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
}

/* Unified Hand Version */
.active-card.hand-version {
  max-width: none;
  width: 100%;
  height: 100%;
  padding: 8px;
  gap: 6px;
  border-width: 2px;
  box-shadow: none;
  background: var(--bg-card);
}

.hand-version .card-name { font-size: 0.85rem; }
.hand-version .card-hp { font-size: 0.75rem; }
.hand-version .card-art { height: 80px; background: rgba(255,255,255,0.03); flex-shrink: 0; }
.hand-version .hp-bar-large { height: 6px; }
.hand-version .attacks-section { min-height: 50px; }
.hand-version .attack-button.mini { 
  padding: 4px 8px; 
  font-size: 0.65rem; 
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
}

.hc-energy-card, .hc-trainer-card {
  width: 100%;
  height: 100%;
  background: var(--bg-card);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
}

.hc-energy-card.fire { border-color: var(--fire-primary); }
.hc-energy-card.water { border-color: var(--water-primary); }
.hc-energy-card.grass { border-color: var(--grass-primary); }
.hc-energy-card.electric { border-color: var(--electric-primary); }

.hc-trainer-card { border-color: #94a3b8; }

.hc-energy-icon { font-size: 3rem; }
.hc-energy-text { font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

.hc-trainer-icon { font-size: 2.5rem; }
.hc-trainer { font-size: 0.8rem; font-weight: 700; text-align: center; }

.hc-stage {
  position: absolute;
  top: 40px;
  right: 5px;
  font-size: 0.5rem;
  font-weight: 800;
  background: #fbbf24;
  color: #000;
  padding: 1px 4px;
  border-radius: 4px;
  z-index: 1;
}

/* Status Effects */
.status-effects-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.2);
}

.status-badge.poisoned { background: rgba(168, 85, 247, 0.8); }
.status-badge.burned { background: rgba(239, 68, 68, 0.8); }
.status-badge.paralyzed { background: rgba(234, 179, 8, 0.8); animation: pulseStatus 1s infinite alternate; }
.status-badge.asleep { background: rgba(59, 130, 246, 0.8); animation: pulseStatus 2s infinite alternate; }

@keyframes pulseStatus {
  from { opacity: 0.7; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.status-effects-overlay.mini {
  top: 2px;
  left: 2px;
  gap: 2px;
}

.status-badge.mini {
  padding: 1px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  justify-content: center;
}

/* Evolution Banner */
.evolution-banner {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
  color: #000;
  padding: 10px 24px;
  border-radius: 30px;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  border: 2px solid white;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
  font-weight: 700;
}

.pulse-text {
  animation: textPulse 1.5s infinite;
}

@keyframes textPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}

.btn-cancel-evo {
  background: #ef4444;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 700;
}

/* Evolution Target Highlighting */
.evolution-mode .active-card, 
.evolution-mode .bench-card {
  transition: all 0.3s ease;
}

.evo-target {
  position: relative;
}

.evo-target::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 4px dashed #fbbf24;
  border-radius: 12px;
  animation: borderDash 2s linear infinite;
  pointer-events: none;
}

@keyframes borderDash {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 20; }
}

.active-board.evolution-mode .active-card:hover,
.active-board.evolution-mode .bench-card:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px #fbbf24;
  cursor: pointer;
}

/* Stage Labels */
.hc-stage {
  font-size: 0.5rem;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(0,0,0,0.3);
  padding: 1px 4px;
  border-radius: 4px;
  margin-bottom: -4px;
}
/* Responsive Battle Log */
@media (max-width: 900px) {
  .battle-log-integrated {
    display: none;
  }
  .active-zone {
    grid-template-columns: auto 1fr auto;
  }
}
</style>
