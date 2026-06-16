<template>
  <div class="bento" :class="{ 'evolution-mode': pendingEvolution }">
    <!-- Evolution overlay banner -->
    <div v-if="pendingEvolution" class="evolution-banner">
      <span class="pulse-text">{{ t('selectEvolution') }} <strong>{{ pendingEvolution.name }}</strong></span>
      <button class="btn-cancel-evo" @click="$emit('cancelEvolution')">{{ t('cancel') }}</button>
    </div>

    <!-- Header -->
    <div class="header">
      <div class="game-title">
        <span class="title-emoji">🎴</span>
        <span class="title-text">{{ name }}</span>
      </div>
      <div class="turn-pill">
        <span>⚔️</span>
        <span>{{ t('turn') }} {{ turnNumber }}</span>
      </div>
      <div class="scoreline">
        <div class="scoreline-item">
          <span class="sl-label">{{ t('yourTurn') }}</span>
          <div class="score-dots">
            <div
              v-for="i in 3"
              :key="'you-'+i"
              class="score-dot"
              :class="{ 'filled': i <= score, 'you': i <= score }"
            ></div>
          </div>
        </div>
        <div class="scoreline-item">
          <div class="score-dots">
            <div
              v-for="i in 3"
              :key="'opp-'+i"
              class="score-dot"
              :class="{ 'filled': i <= (opponent?.score || 0), 'opp': i <= (opponent?.score || 0) }"
            ></div>
          </div>
          <span class="sl-label">{{ opponent?.name || 'Opp' }}</span>
        </div>
        <button class="pi-mute" @click="toggleMute" :title="isMuted ? t('unmute') : t('mute')">
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
        <button class="end-turn-cozy" @click="$emit('endTurn')" :disabled="isBotTurn">
          {{ t('endTurn') }} →
        </button>
      </div>
    </div>

    <!-- Opponent box -->
    <div class="bento-box opponent-box">
      <div class="opp-tag">
        <span>{{ getEmoji(opponent?.element) }}</span>
        <span>{{ opponent?.name || 'Opponent' }}</span>
      </div>

      <!-- Mobile-only inline opponent bench -->
      <div class="opp-inline-bench">
        <div
          v-for="benchCard in (opponent?.bank || []).slice(0, 3)"
          :key="benchCard.uniqueId"
          class="inline-bench-mini"
          @mouseenter="handleMouseEnter($event, benchCard)"
          @mouseleave="handleMouseLeave"
        >
          <img :src="getPokemonSprite(benchCard.name)" :alt="benchCard.name" @error="handleImageError" />
        </div>
      </div>

      <!-- Active VFX -->
      <div
        v-if="activeVfx && activeVfx.target === 'player' + (opponent?.id || 2)"
        class="combat-vfx-overlay"
        :class="[activeVfx.type, 'shake']"
        :key="activeVfx.timestamp"
      ></div>

      <!-- Floating damage numbers -->
      <div class="damage-numbers-layer">
        <div
          v-for="dn in oppDamageNumbers"
          :key="dn.id"
          class="damage-number"
          :class="dn.type"
        >
          {{ dn.type === 'heal' ? '+' : '-' }}{{ dn.value }}
        </div>
      </div>

      <template v-if="opponent?.active">
        <img
          class="opp-poke-img"
          :src="getPokemonImage(opponent.active.name)"
          :alt="opponent.active.name"
          @error="handleImageError"
          @mouseenter="handleMouseEnter($event, opponent.active)"
          @mouseleave="handleMouseLeave"
        />
        <div class="opp-poke-name">{{ opponent.active.name }}</div>
        <div v-if="opponent.active.statusEffects?.length" class="status-effects-row">
          <span
            v-for="effect in opponent.active.statusEffects"
            :key="effect"
            class="status-badge"
            :class="effect"
          >
            <span v-if="effect === 'poisoned'">☠️</span>
            <span v-else-if="effect === 'burned'">🔥</span>
            <span v-else-if="effect === 'paralyzed'">⚡</span>
            <span v-else-if="effect === 'asleep'">💤</span>
          </span>
        </div>
        <div class="opp-poke-hp">
          <div class="hp-text-cozy">
            <span>HP</span>
            <span>{{ opponent.active.currentHp }} / {{ opponent.active.hp }}</span>
          </div>
          <div class="hp-track-cozy">
            <div
              class="hp-fill-cozy"
              :class="getCardHpClass(opponent.active)"
              :style="{ width: getCardHpPercent(opponent.active) + '%' }"
            ></div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="empty-active-cozy">{{ t('noActivePokemon') }}</div>
      </template>

      <div class="opp-resources-mini">
        <span title="Hand">✋ {{ opponent?.hand?.length || 0 }}</span>
        <span title="Deck">🃏 {{ opponent?.deck?.length || 0 }}</span>
        <span title="Prizes">🎁 {{ opponent?.prizeCards?.length || 0 }}</span>
      </div>
    </div>

    <!-- Opponent bench (tablet+) -->
    <div class="bento-box opp-bench-box">
      <div class="bench-title">🏕️ Their Bench</div>
      <div class="bench-grid">
        <div
          v-for="(slot, idx) in oppBenchSlots"
          :key="'oppbench-'+idx"
          class="bench-tile"
          :class="{ empty: !slot }"
        >
          <template v-if="slot">
            <img
              :src="getPokemonSprite(slot.name)"
              :alt="slot.name"
              @error="handleImageError"
              @mouseenter="handleMouseEnter($event, slot)"
              @mouseleave="handleMouseLeave"
            />
            <span class="bt-name">{{ slot.name }}</span>
            <span class="bt-hp">{{ slot.currentHp }}/{{ slot.hp }}</span>
          </template>
          <span v-else>+</span>
        </div>
      </div>
    </div>

    <!-- Player active -->
    <div
      class="bento-box player-box"
      :class="{ 'drag-target': dragOverActive }"
      @click="handleActiveClick"
      @dragover.prevent="onDragOverActive"
      @dragleave="onDragLeaveZone"
      @drop.prevent="onDropOnActive"
    >
      <div class="you-tag">
        <span>{{ getEmoji(playerElement) }}</span>
        <span>{{ name }}</span>
      </div>

      <!-- Mobile-only inline player bench -->
      <div class="player-inline-bench">
        <div
          v-for="benchCard in bank.slice(0, 3)"
          :key="benchCard.uniqueId"
          class="inline-bench-mini"
          :class="{ 'evo-target': pendingEvolution }"
          @click.stop="handleBenchSlotClick(benchCard)"
          @mouseenter="handleMouseEnter($event, benchCard)"
          @mouseleave="handleMouseLeave"
        >
          <img :src="getPokemonSprite(benchCard.name)" :alt="benchCard.name" @error="handleImageError" />
        </div>
      </div>

      <!-- Active VFX -->
      <div
        v-if="activeVfx && activeVfx.target === 'player' + playerId"
        class="combat-vfx-overlay"
        :class="[activeVfx.type, 'shake']"
        :key="activeVfx.timestamp"
      ></div>

      <!-- Floating damage numbers -->
      <div class="damage-numbers-layer">
        <div
          v-for="dn in playerDamageNumbers"
          :key="dn.id"
          class="damage-number"
          :class="dn.type"
        >
          {{ dn.type === 'heal' ? '+' : '-' }}{{ dn.value }}
        </div>
      </div>

      <template v-if="active">
        <div class="player-active-area">
          <img
            class="player-poke-img"
            :src="getPokemonImage(active.name)"
            :alt="active.name"
            @error="handleImageError"
            @mouseenter="handleMouseEnter($event, active)"
            @mouseleave="handleMouseLeave"
          />
          <div class="player-poke-info">
            <div class="player-poke-name">{{ active.name }}</div>
            <div class="player-poke-stage">
              {{ active.stage || 'basic' }} · {{ active.element }}
            </div>

            <div v-if="active.statusEffects?.length" class="status-effects-row left">
              <span
                v-for="effect in active.statusEffects"
                :key="effect"
                class="status-badge"
                :class="effect"
              >
                <span v-if="effect === 'poisoned'">☠️</span>
                <span v-else-if="effect === 'burned'">🔥</span>
                <span v-else-if="effect === 'paralyzed'">⚡</span>
                <span v-else-if="effect === 'asleep'">💤</span>
              </span>
            </div>

            <div class="hp-text-cozy">
              <span>HP</span>
              <span>{{ active.currentHp }} / {{ active.hp }}</span>
            </div>
            <div class="hp-track-cozy">
              <div
                class="hp-fill-cozy water"
                :class="hpClass"
                :style="{ width: hpPercent + '%' }"
              ></div>
            </div>

            <div v-if="active.attachedEnergy?.length" class="attached-energy-row">
              <span v-for="e in active.attachedEnergy" :key="e.uniqueId" class="energy-pip">
                {{ getEmoji(e.element) }}
              </span>
            </div>

            <div class="attack-stack-cozy">
              <button
                v-for="(attack, index) in active.attacks"
                :key="index"
                class="cozy-attack"
                :class="{ disabled: energyZone.length < attack.energyCost }"
                @click.stop="handleAttackClick(attack, index)"
              >
                <span class="ck-name">{{ attack.name }}</span>
                <span class="ck-cost">{{ attack.energyCost }}⚡</span>
                <span class="ck-dmg">{{ attack.damage }} DMG</span>
              </button>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="empty-active-cozy">{{ t('playPokemonFromHand') }}</div>
      </template>

      <div class="you-resources-mini">
        <span title="Deck">🃏 {{ deck.length }}</span>
        <span title="Energy">⚡ {{ energyZone.length }}</span>
        <span title="Prizes">🎁 {{ prizeCards.length }}/3</span>
        <span title="Discard">🗑️ {{ discardPile.length }}</span>
      </div>
    </div>

    <!-- Player bench (tablet+) -->
    <div
      class="bento-box player-bench-box"
      :class="{ 'drag-target': dragOverBench }"
      @dragover.prevent="onDragOverBench"
      @dragleave="onDragLeaveZone"
      @drop.prevent="onDropOnBench"
    >
      <div class="bench-title">🏕️ {{ t('player1') === 'Player 1' ? 'Your Bench' : 'Bench' }}</div>
      <div class="bench-grid">
        <div
          v-for="(slot, idx) in playerBenchSlots"
          :key="'bench-'+idx"
          class="bench-tile"
          :class="{ empty: !slot, 'evo-target': pendingEvolution && slot }"
          @click="handleBenchSlotClick(slot)"
        >
          <template v-if="slot">
            <img
              :src="getPokemonSprite(slot.name)"
              :alt="slot.name"
              @error="handleImageError"
              @mouseenter="handleMouseEnter($event, slot)"
              @mouseleave="handleMouseLeave"
              @contextmenu.prevent="handleRightClick($event, slot)"
            />
            <span class="bt-name">{{ slot.name }}</span>
            <span class="bt-hp">{{ slot.currentHp }}/{{ slot.hp }}</span>
          </template>
          <span v-else>+</span>
        </div>
      </div>
    </div>

    <!-- Hand -->
    <div class="bento-box hand-box">
      <div class="hand-header">
        <div class="hand-title">
          <span class="hand-emoji">🃏</span>
          <span>{{ t('yourHand') }}</span>
        </div>
        <span class="hand-meta">{{ hand.length }} {{ t('cards') }} · tap to play</span>
      </div>
      <div class="hand-row">
        <div
          v-for="card in hand"
          :key="card.uniqueId"
          class="cozy-card"
          :class="[card.type, card.element, { 'pending-source': pendingEvolution?.uniqueId === card.uniqueId, 'dragging': draggingCard?.uniqueId === card.uniqueId }]"
          draggable="true"
          @click="$emit('playCard', card)"
          @contextmenu.prevent="handleRightClick($event, card)"
          @mouseenter="handleMouseEnter($event, card)"
          @mouseleave="handleMouseLeave"
          @dragstart="onDragStart($event, card)"
          @dragend="onDragEnd"
        >
          <span class="cz-tag" :class="{ 'cz-tag-v': card.isV }">
            <template v-if="card.isV && card.stage === 'VMAX'">VX</template>
            <template v-else-if="card.isV">V</template>
            <template v-else-if="card.type === 'pokemon'">P</template>
            <template v-else-if="card.type === 'energy'">⚡</template>
            <template v-else>T</template>
          </span>
          <div class="cz-art">
            <img
              v-if="card.type === 'pokemon'"
              :src="getPokemonImage(card.name)"
              :alt="card.name"
              @error="handleImageError"
            />
            <span v-else-if="card.type === 'energy'" class="cz-emoji-only">{{ getEmoji(card.element) }}</span>
            <span v-else class="cz-emoji-only">📜</span>
          </div>
          <span class="cz-name">{{ card.name }}</span>
          <span class="cz-meta">
            <template v-if="card.type === 'pokemon'">
              {{ card.stage === 'V' ? 'V' : card.stage === 'VMAX' ? 'VMAX' : (card.stage || 'basic') }} · {{ card.hp }}HP
              <span v-if="card.evolvesFrom" class="cz-evo-hint">↑ {{ card.evolvesFrom }}</span>
              <span v-if="card.isV" class="cz-v-warning">⚠️ 2pts on KO</span>
            </template>
            <template v-else-if="card.type === 'energy'">
              +1⚡
            </template>
            <template v-else>
              {{ card.description || card.name }}
            </template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Card, Player, ElementType } from '../types'
import { getPokemonImageUrl, getPokemonSpriteUrl } from '../utils/pokemonImages'
import { soundService } from '../services/soundService'
import { useGameStore } from '../stores/gameStore'

const { t } = useI18n()

const props = defineProps<{
  deck: Card[]
  hand: Card[]
  active: Card | null
  bank: Card[]
  energyZone: Card[]
  discardPile: Card[]
  prizeCards: Card[]
  pendingEvolution: Card | null
  name: string
  score: number
  turnNumber: number
  isBotTurn: boolean
  logs: string[]
  playerId: number
  playerElement: ElementType | null
  opponent: Player | null
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

const store = useGameStore()
const isMuted = ref(soundService.isMuted())

function toggleMute() {
  isMuted.value = soundService.toggleMute()
}

function handleMouseEnter(event: MouseEvent, card: Card) {
  store.hoveredCard = card
  store.hoveredCardPosition = { x: event.clientX, y: event.clientY }
}

function handleMouseLeave() {
  store.hoveredCard = null
  store.hoveredCardPosition = null
}

function handleRightClick(_event: MouseEvent, card: Card) {
  store.selectedCard = card
}

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

function getCardHpPercent(card: Card | null) {
  if (!card || !card.hp) return 0
  const current = card.currentHp !== undefined ? card.currentHp : card.hp
  return Math.max(0, (current / card.hp) * 100)
}

function getCardHpClass(card: Card | null) {
  const pct = getCardHpPercent(card)
  if (pct > 60) return 'hp-high'
  if (pct > 30) return 'hp-medium'
  return 'hp-low'
}

function handleActiveClick() {
  if (props.pendingEvolution && props.active) {
    emit('evolve', props.active)
  }
}

// ===== Drag and drop =====
const draggingCard = ref<Card | null>(null)
const dragOverActive = ref(false)
const dragOverBench = ref(false)

function onDragStart(event: DragEvent, card: Card) {
  draggingCard.value = card
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', card.uniqueId || '')
  }
}

function onDragEnd() {
  draggingCard.value = null
  dragOverActive.value = false
  dragOverBench.value = false
}

function onDragOverActive(event: DragEvent) {
  if (!draggingCard.value) return
  // Only highlight if it's a valid drop (pokemon, energy, or trainer)
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragOverActive.value = true
}

function onDragOverBench(event: DragEvent) {
  if (!draggingCard.value) return
  // Only highlight if it's a basic Pokémon being dragged
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  if (draggingCard.value.type === 'pokemon' && (draggingCard.value.stage === 'basic' || !draggingCard.value.stage)) {
    dragOverBench.value = true
  }
}

function onDragLeaveZone() {
  dragOverActive.value = false
  dragOverBench.value = false
}

function onDropOnActive() {
  if (!draggingCard.value) return
  const card = draggingCard.value
  // Just call playCard — the store handles routing (energy attaches, trainers fire, pokemon become active if no active)
  emit('playCard', card)
  draggingCard.value = null
  dragOverActive.value = false
  dragOverBench.value = false
}

function onDropOnBench() {
  if (!draggingCard.value) return
  const card = draggingCard.value
  // Only allow basic pokemon to bench, otherwise fall through to playCard
  if (card.type === 'pokemon' && (card.stage === 'basic' || !card.stage)) {
    emit('playCard', card)
  } else if (card.type !== 'pokemon') {
    // Non-pokemon cards still trigger their effect
    emit('playCard', card)
  } else {
    soundService.play('error')
  }
  draggingCard.value = null
  dragOverActive.value = false
  dragOverBench.value = false
}

function handleAttackClick(attack: { energyCost: number }, index: number) {
  if (props.energyZone.length < attack.energyCost) {
    soundService.play('error')
    return
  }
  emit('attack', index)
}

function handleBenchSlotClick(card: Card | null) {
  if (props.pendingEvolution && card) {
    emit('evolve', card)
  } else if (card) {
    emit('benchClick', card)
  }
}

const playerBenchSlots = computed<(Card | null)[]>(() => [
  props.bank[0] || null,
  props.bank[1] || null,
  props.bank[2] || null,
])

const oppBenchSlots = computed<(Card | null)[]>(() => {
  const bank = props.opponent?.bank || []
  return [bank[0] || null, bank[1] || null, bank[2] || null]
})

// Floating damage numbers (filtered by side)
const playerDamageNumbers = computed(() =>
  store.damageNumbers.filter(d => d.target === ('player' + props.playerId))
)

const oppDamageNumbers = computed(() => {
  const oppId = props.opponent?.id
  if (!oppId) return []
  return store.damageNumbers.filter(d => d.target === ('player' + oppId))
})

function getEmoji(element: string | undefined | null) {
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
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}
</script>


<style scoped>
/* ===== Cozy Bento Theme (light) ===== */
.bento {
  --cb-fire: #fb7185;
  --cb-water: #60a5fa;
  --cb-grass: #86efac;
  --cb-electric: #fde047;
  --cb-bg: #fef6e4;
  --cb-bg-card: #fffaf0;
  --cb-bg-soft: #fef0d4;
  --cb-border: #f3d2a4;
  --cb-text: #2d2620;
  --cb-text-soft: #8a7a6a;
  --cb-accent: #f582ae;
  --cb-plum: #5e548e;
  --cb-shadow: rgba(45,38,32,0.08);
  --cb-shadow-lg: rgba(45,38,32,0.15);

  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr 1fr auto;
  gap: 10px;
  padding: 10px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  height: 100dvh;
  height: 100vh;
  background: var(--cb-bg);
  color: var(--cb-text);
  grid-template-areas:
    "header"
    "opponent"
    "player"
    "hand";
  position: relative;
  overflow: hidden;
}

/* Soft background dots */
.bento::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(245,130,174,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}

/* Tablet & up */
@media (min-width: 720px) {
  .bento {
    grid-template-columns: 1fr 200px;
    grid-template-rows: auto 1fr 1fr auto;
    grid-template-areas:
      "header header"
      "opponent opp-bench"
      "player player-bench"
      "hand hand";
  }
}

.bento-box {
  background: var(--cb-bg-card);
  border-radius: 18px;
  padding: 12px;
  box-shadow:
    0 1px 3px var(--cb-shadow),
    0 4px 12px var(--cb-shadow);
  border: 1px solid var(--cb-border);
  position: relative;
  overflow: hidden;
  min-width: 0;
}


/* ---------- Header ---------- */
.header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--cb-bg-card);
  border-radius: 14px;
  border: 1px solid var(--cb-border);
  box-shadow: 0 1px 3px var(--cb-shadow);
  flex-wrap: wrap;
}

.game-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--cb-text);
}

.title-emoji { font-size: 1.2rem; }
.title-text { color: var(--cb-text); }

.turn-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--cb-accent);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(245,130,174,0.4);
  white-space: nowrap;
}

.scoreline {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.scoreline-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--cb-text);
}

.sl-label {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-dots { display: flex; gap: 3px; }

.score-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--cb-border);
  transition: background 0.3s;
}

.score-dot.filled.you { background: var(--cb-water); }
.score-dot.filled.opp { background: var(--cb-fire); }

.pi-mute {
  background: var(--cb-bg-soft);
  border: 1px solid var(--cb-border);
  color: var(--cb-text);
  padding: 5px 9px;
  border-radius: 14px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pi-mute:hover { background: var(--cb-border); }

.end-turn-cozy {
  background: var(--cb-plum);
  color: white;
  border: none;
  padding: 7px 14px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(94,84,142,0.4);
  transition: all 0.2s;
  white-space: nowrap;
}

.end-turn-cozy:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(94,84,142,0.5);
}

.end-turn-cozy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.end-turn-cozy:active:not(:disabled) { transform: translateY(0); }


/* ---------- Opponent Box ---------- */
.opponent-box {
  grid-area: opponent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border-color: rgba(251,113,133,0.3);
  position: relative;
  min-height: 150px;
}

@media (min-width: 720px) {
  .opponent-box {
    gap: 6px;
    min-height: 200px;
  }
}

.opp-tag {
  position: absolute;
  top: 10px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--cb-fire);
  background: rgba(251,113,133,0.12);
  padding: 4px 10px;
  border-radius: 12px;
  z-index: 2;
}

/* Mobile inline opponent bench in top-right */
.opp-inline-bench {
  position: absolute;
  top: 10px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 2;
}

@media (min-width: 720px) {
  .opp-inline-bench { display: none; }
}

.inline-bench-mini {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: white;
  border: 1px solid rgba(251,113,133,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.inline-bench-mini:hover {
  transform: scale(1.1);
}

.inline-bench-mini img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.opp-poke-img {
  width: 90px;
  height: 90px;
  object-fit: contain;
  filter: drop-shadow(0 4px 16px rgba(251,113,133,0.3));
  transform: scaleX(-1);
}

@media (min-width: 720px) {
  .opp-poke-img { width: 140px; height: 140px; }
}

.opp-poke-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--cb-text);
}

.opp-poke-hp {
  width: min(80%, 240px);
}

.opp-resources-mini {
  display: flex;
  gap: 12px;
  font-size: 0.7rem;
  color: var(--cb-text-soft);
  font-weight: 600;
  margin-top: 4px;
}

.empty-active-cozy {
  color: var(--cb-text-soft);
  font-style: italic;
  font-size: 0.85rem;
  padding: 30px 0;
}


/* HP bars */
.hp-track-cozy {
  height: 8px;
  background: rgba(45,38,32,0.06);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 4px;
}

.hp-fill-cozy {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--cb-fire), #fda4af);
  transition: width 0.3s;
}

.hp-fill-cozy.water {
  background: linear-gradient(90deg, var(--cb-water), #93c5fd);
}

.hp-fill-cozy.hp-high { background: linear-gradient(90deg, #4ade80, #86efac); }
.hp-fill-cozy.hp-medium { background: linear-gradient(90deg, #fbbf24, #fde68a); }
.hp-fill-cozy.hp-low { background: linear-gradient(90deg, #ef4444, #fda4af); }

.hp-text-cozy {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--cb-text-soft);
  font-weight: 600;
}

/* Status effects */
.status-effects-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.status-effects-row.left { justify-content: flex-start; }

.status-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(255,255,255,0.7);
  border: 1px solid var(--cb-border);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.status-badge.poisoned { color: #a855f7; border-color: rgba(168,85,247,0.3); }
.status-badge.burned { color: var(--cb-fire); border-color: rgba(251,113,133,0.3); }
.status-badge.paralyzed { color: #ca8a04; border-color: rgba(202,138,4,0.3); }
.status-badge.asleep { color: var(--cb-text-soft); }

/* ---------- Bench Boxes (tablet+ only) ---------- */
.opp-bench-box,
.player-bench-box {
  display: none;
}

@media (min-width: 720px) {
  .opp-bench-box {
    grid-area: opp-bench;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .player-bench-box {
    grid-area: player-bench;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
}

.bench-title {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--cb-text-soft);
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
  margin-bottom: 2px;
}

.bench-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex: 1;
}

.bench-tile {
  background: var(--cb-bg-soft);
  border-radius: 10px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 70px;
  border: 2px solid transparent;
}

.bench-tile:hover:not(.empty) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--cb-shadow);
}

.bench-tile.evo-target {
  border-color: var(--cb-accent);
  animation: pulse-cozy 1.5s infinite;
}

@keyframes pulse-cozy {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,130,174,0.5); }
  50% { box-shadow: 0 0 0 6px rgba(245,130,174,0); }
}

.bench-tile img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.bench-tile .bt-name {
  font-size: 0.55rem;
  font-weight: 700;
  text-align: center;
  line-height: 1.1;
  color: var(--cb-text);
}

.bench-tile .bt-hp {
  font-size: 0.5rem;
  color: var(--cb-text-soft);
}

.bench-tile.empty {
  border: 2px dashed var(--cb-border);
  background: transparent;
  color: var(--cb-text-soft);
}

.bench-tile.empty span {
  font-size: 1.2rem;
}


/* ---------- Player Box ---------- */
.player-box {
  grid-area: player;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: linear-gradient(135deg, #f0f7ff 0%, #dbeafe 100%);
  border-color: rgba(96,165,250,0.3);
  position: relative;
  min-height: 170px;
}

@media (min-width: 720px) {
  .player-box {
    gap: 8px;
    min-height: 220px;
  }
}

.you-tag {
  position: absolute;
  top: 10px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--cb-water);
  background: rgba(96,165,250,0.12);
  padding: 4px 10px;
  border-radius: 12px;
  z-index: 2;
}

.player-inline-bench {
  position: absolute;
  top: 10px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 2;
}

@media (min-width: 720px) {
  .player-inline-bench { display: none; }
}

.player-inline-bench .inline-bench-mini {
  border-color: rgba(96,165,250,0.3);
}

.player-inline-bench .inline-bench-mini.evo-target {
  border-color: var(--cb-accent);
  animation: pulse-cozy 1.5s infinite;
}

.player-active-area {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  width: 100%;
}

@media (min-width: 720px) {
  .player-active-area {
    gap: 16px;
    padding: 12px;
  }
}

.player-poke-img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  filter: drop-shadow(0 4px 16px rgba(96,165,250,0.3));
  flex-shrink: 0;
}

@media (min-width: 720px) {
  .player-poke-img { width: 130px; height: 130px; }
}

.player-poke-info {
  flex: 1;
  width: 100%;
  max-width: 380px;
  min-width: 0;
}

.player-poke-name {
  font-size: 1rem;
  font-weight: 800;
  text-align: left;
  color: var(--cb-text);
}

@media (min-width: 720px) {
  .player-poke-name {
    text-align: left;
    font-size: 1.15rem;
  }
}

.player-poke-stage {
  font-size: 0.6rem;
  color: var(--cb-text-soft);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
  text-align: left;
}

@media (min-width: 720px) {
  .player-poke-stage { text-align: left; margin-bottom: 6px; }
}

.attached-energy-row {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.energy-pip {
  font-size: 0.85rem;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--cb-border);
}

.you-resources-mini {
  display: flex;
  gap: 12px;
  font-size: 0.7rem;
  color: var(--cb-text-soft);
  font-weight: 600;
  flex-wrap: wrap;
  justify-content: center;
}


/* Attack buttons */
.attack-stack-cozy {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (min-width: 720px) {
  .attack-stack-cozy {
    margin-top: 10px;
    gap: 6px;
  }
}

.cozy-attack {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(96,165,250,0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.7rem;
  transition: all 0.2s;
  color: var(--cb-text);
  gap: 6px;
  font-family: inherit;
}

@media (min-width: 720px) {
  .cozy-attack {
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 0.75rem;
    gap: 8px;
  }
}

.cozy-attack:hover:not(.disabled) {
  background: white;
  border-color: var(--cb-water);
  transform: translateX(2px);
  box-shadow: 0 4px 12px rgba(96,165,250,0.15);
}

.cozy-attack.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cozy-attack .ck-name { font-weight: 700; }
.cozy-attack .ck-cost { color: #ca8a04; font-size: 0.7rem; }
.cozy-attack .ck-dmg { color: var(--cb-fire); font-weight: 800; }

/* ---------- Hand Box ---------- */
.hand-box {
  grid-area: hand;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(135deg, #fffaf0 0%, #fef0d4 100%);
  padding: 12px;
}

.hand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hand-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--cb-text);
}

.hand-emoji { font-size: 1rem; }

.hand-meta {
  font-size: 0.7rem;
  color: var(--cb-text-soft);
  font-weight: 600;
}

.hand-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: visible;
  padding: 6px 4px 16px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--cb-border) transparent;
}

.hand-row::-webkit-scrollbar { height: 6px; }
.hand-row::-webkit-scrollbar-thumb { background: var(--cb-border); border-radius: 3px; }
.hand-row::-webkit-scrollbar-track { background: transparent; }


/* Hand cards */
.cozy-card {
  flex-shrink: 0;
  width: 110px;
  min-height: 160px;
  background: white;
  border: 2px solid var(--cb-border);
  border-radius: 14px;
  padding: 10px 8px;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.25s ease,
              border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  scroll-snap-align: start;
}

.cozy-card:hover {
  transform: translateY(-10px) rotate(-1.5deg);
  box-shadow: 0 14px 28px var(--cb-shadow-lg);
  border-color: var(--cb-accent);
}

.cozy-card:active {
  transform: translateY(-4px) scale(0.98);
}

.cozy-card.pokemon { border-color: rgba(96,165,250,0.4); background: linear-gradient(180deg, white, #f0f7ff); }
.cozy-card.energy { border-color: rgba(253,224,71,0.55); background: linear-gradient(180deg, white, #fefce8); }
.cozy-card.item, .cozy-card.supporter { border-color: rgba(245,130,174,0.4); background: linear-gradient(180deg, white, #fdf2f8); }

.cozy-card.pending-source {
  border-color: var(--cb-accent);
  box-shadow: 0 0 0 3px rgba(245,130,174,0.3);
  animation: pulse-cozy 1.2s infinite;
}

.cozy-card .cz-tag {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.cozy-card.pokemon .cz-tag { background: var(--cb-water); }
.cozy-card.energy .cz-tag { background: var(--cb-electric); color: var(--cb-text); }
.cozy-card.item .cz-tag,
.cozy-card.supporter .cz-tag { background: var(--cb-accent); }

/* V / VMAX badge — gold/rainbow gradient */
.cozy-card .cz-tag.cz-tag-v {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #2d2620;
  font-weight: 900;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
  width: 20px;
  height: 20px;
  font-size: 0.55rem;
}

.cozy-card .cz-art {
  width: 100%;
  height: 80px;
  background: rgba(45,38,32,0.04);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cozy-card .cz-art img {
  max-height: 76px;
  max-width: 90%;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(45,38,32,0.15));
}

.cozy-card .cz-art .cz-emoji-only {
  font-size: 2.6rem;
}

.cozy-card .cz-name {
  font-size: 0.7rem;
  font-weight: 800;
  text-align: center;
  line-height: 1.15;
  color: var(--cb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.cozy-card .cz-meta {
  font-size: 0.55rem;
  color: var(--cb-text-soft);
  font-weight: 600;
  text-align: center;
  text-transform: capitalize;
}

.cozy-card .cz-evo-hint {
  display: block;
  font-size: 0.5rem;
  color: var(--cb-accent);
  font-weight: 700;
  text-transform: none;
}

.cozy-card .cz-v-warning {
  display: block;
  font-size: 0.45rem;
  color: #f59e0b;
  font-weight: 700;
  text-transform: none;
}


/* ---------- Evolution Banner ---------- */
.evolution-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-plum));
  color: white;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 50;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: 0 4px 12px rgba(245,130,174,0.3);
}

.evolution-banner .pulse-text { animation: pulse-text 1.5s infinite; }

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.btn-cancel-evo {
  background: rgba(255,255,255,0.25);
  border: 1px solid rgba(255,255,255,0.4);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-evo:hover {
  background: rgba(255,255,255,0.4);
}

.bento.evolution-mode {
  padding-top: 50px;
}

/* ---------- Drag and Drop ---------- */
.cozy-card[draggable="true"] {
  -webkit-user-drag: element;
}

.cozy-card.dragging {
  opacity: 0.4;
  transform: scale(0.95);
  cursor: grabbing;
}

.bento-box.drag-target {
  border-color: var(--cb-accent) !important;
  box-shadow: 0 0 0 4px rgba(245,130,174,0.3), 0 8px 20px rgba(45,38,32,0.15) !important;
  transform: scale(1.01);
  transition: all 0.15s ease;
}

.bento-box.drag-target::after {
  content: "✨ Drop here";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  color: var(--cb-accent);
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(2px);
  border-radius: 18px;
  pointer-events: none;
  z-index: 5;
}

/* ---------- Combat VFX (preserve existing classes) ---------- */
.combat-vfx-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  border-radius: 18px;
  overflow: hidden;
}

/* Shake the entire box on hit */
.opponent-box,
.player-box {
  transition: transform 0.1s;
}

.opponent-box:has(.combat-vfx-overlay.shake),
.player-box:has(.combat-vfx-overlay.shake) {
  animation: hit-shake 0.4s ease-in-out;
}

@keyframes hit-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px) rotate(-0.5deg); }
  40% { transform: translateX(6px) rotate(0.5deg); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* ---------- Floating Damage Numbers ---------- */
.damage-numbers-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.damage-number {
  position: absolute;
  font-size: 2rem;
  font-weight: 900;
  color: white;
  text-shadow:
    0 2px 0 #2d2620,
    0 4px 8px rgba(45,38,32,0.5),
    0 0 12px currentColor;
  pointer-events: none;
  animation: dmg-float 1.4s cubic-bezier(0.2, 0.6, 0.4, 1) forwards;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.02em;
}

.damage-number.damage {
  color: #fb7185;
}

.damage-number.heal {
  color: #4ade80;
}

@keyframes dmg-float {
  0% {
    transform: scale(0.4) translateY(0);
    opacity: 0;
  }
  15% {
    transform: scale(1.4) translateY(-8px);
    opacity: 1;
  }
  30% {
    transform: scale(1) translateY(-16px);
    opacity: 1;
  }
  100% {
    transform: scale(0.9) translateY(-80px);
    opacity: 0;
  }
}

/* Mobile small breakpoint refinements */
@media (max-width: 480px) {
  .bento {
    gap: 6px;
    padding: 6px;
  }

  .header {
    padding: 6px 10px;
    gap: 6px;
  }

  .game-title { font-size: 0.75rem; }
  .title-emoji { font-size: 1rem; }
  .turn-pill { font-size: 0.6rem; padding: 4px 8px; }
  .scoreline { gap: 6px; }
  .sl-label { display: none; }
  .pi-mute { padding: 4px 7px; font-size: 0.75rem; }
  .end-turn-cozy { padding: 5px 10px; font-size: 0.7rem; }

  .opponent-box,
  .player-box {
    padding: 8px;
    border-radius: 14px;
  }

  .opponent-box { min-height: 130px; gap: 2px; }
  .player-box { min-height: 150px; }

  .opp-tag, .you-tag {
    font-size: 0.6rem;
    padding: 3px 8px;
    top: 6px;
    left: 8px;
  }

  .opp-inline-bench, .player-inline-bench {
    top: 6px;
    right: 8px;
    gap: 3px;
  }

  .inline-bench-mini {
    width: 28px;
    height: 28px;
    border-radius: 7px;
  }

  .inline-bench-mini img {
    width: 22px;
    height: 22px;
  }

  .opp-poke-img { width: 72px; height: 72px; }
  .player-poke-img { width: 84px; height: 84px; }

  .opp-poke-name { font-size: 0.85rem; }
  .player-poke-name { font-size: 0.9rem; }
  .player-poke-stage { font-size: 0.55rem; margin-bottom: 2px; }

  .hp-text-cozy { font-size: 0.6rem; }
  .hp-track-cozy { height: 6px; }

  .player-active-area {
    padding: 4px 8px;
    gap: 8px;
  }

  .opp-poke-hp { width: 90%; }

  .cozy-attack {
    padding: 5px 8px;
    font-size: 0.65rem;
    border-radius: 7px;
  }

  .cozy-attack .ck-cost { font-size: 0.6rem; }

  /* Hand */
  .hand-box { padding: 8px; }

  .hand-title { font-size: 0.75rem; }
  .hand-meta { font-size: 0.6rem; }

  .cozy-card {
    width: 88px;
    min-height: 138px;
    padding: 8px 6px;
    border-radius: 12px;
  }

  .cozy-card .cz-art {
    height: 60px;
    border-radius: 8px;
  }

  .cozy-card .cz-art img { max-height: 56px; }
  .cozy-card .cz-art .cz-emoji-only { font-size: 2rem; }

  .cozy-card .cz-name { font-size: 0.65rem; }
  .cozy-card .cz-meta { font-size: 0.5rem; }

  .cozy-card .cz-tag {
    width: 16px;
    height: 16px;
    font-size: 0.55rem;
    top: 5px;
    right: 5px;
  }

  .you-resources-mini, .opp-resources-mini {
    gap: 8px;
    font-size: 0.6rem;
    margin-top: 2px;
  }

  /* Energy pip slimmer */
  .energy-pip {
    font-size: 0.7rem;
    width: 18px;
    height: 18px;
  }
}
</style>
