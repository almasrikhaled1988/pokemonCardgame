<template>
  <div class="deck-editor cozy">
    <!-- Header -->
    <div class="editor-header">
      <div class="header-top">
        <div class="header-title">
          <span class="title-emoji">{{ getEmoji(element) }}</span>
          <div>
            <h2>{{ playerLabel }}</h2>
            <p class="subtitle">{{ t('selectExactly', { count: maxSelection }) }}</p>
          </div>
        </div>
        <div class="counter-pill" :class="{ complete: selectedCount === maxSelection }">
          <span class="counter-num">{{ selectedCount }}</span>
          <span class="counter-sep">/</span>
          <span class="counter-max">{{ maxSelection }}</span>
        </div>
      </div>

      <!-- Filter pills + Suggest button -->
      <div class="toolbar">
        <div class="filter-pills">
          <button
            v-for="f in filters"
            :key="f.value"
            class="filter-pill"
            :class="{ active: activeFilter === f.value }"
            @click="setFilter(f.value)"
          >
            <span>{{ f.label }}</span>
            <span class="filter-count">{{ filterCount(f.value) }}</span>
          </button>
        </div>
        <div class="toolbar-actions">
          <button class="action-btn ghost" @click="clearSelection" :disabled="selectedCount === 0">
            ✕ Clear
          </button>
          <button class="action-btn" @click="suggestDeck">
            ✨ Suggest
          </button>
        </div>
      </div>
    </div>

    <!-- Pokemon grid -->
    <div class="pokemon-grid">
      <div
        v-for="pokemon in filteredPokemon"
        :key="pokemon.id"
        class="poke-card"
        :class="[{ selected: isSelected(pokemon), locked: isLocked(pokemon) }]"
        @click="togglePokemon(pokemon)"
      >
        <!-- Selection check -->
        <div class="check-circle">
          <span v-if="isSelected(pokemon)">✓</span>
          <span v-else-if="isLocked(pokemon)" class="lock-icon">🔒</span>
        </div>

        <!-- Stage badge -->
        <div class="stage-chip" :class="pokemon.stage || 'basic'">
          {{ stageLabel(pokemon.stage) }}
        </div>

        <!-- Image -->
        <div class="poke-art">
          <img :src="getPokemonSprite(pokemon.name)" :alt="pokemon.name" @error="handleImageError" />
        </div>

        <!-- Info -->
        <div class="poke-info">
          <div class="poke-name">{{ pokemon.name }}</div>
          <div class="poke-stats">
            <span class="stat-hp">❤️ {{ pokemon.hp }}</span>
            <span v-if="pokemon.evolvesFrom" class="stat-from">↑ {{ pokemon.evolvesFrom }}</span>
          </div>
        </div>

        <!-- Attacks -->
        <div class="poke-attacks">
          <div v-for="atk in pokemon.attacks" :key="atk.name" class="atk-row">
            <span class="atk-cost">{{ atk.energyCost }}⚡</span>
            <span class="atk-name">{{ atk.name }}</span>
            <span class="atk-dmg">{{ atk.damage }}</span>
          </div>
        </div>

        <!-- Ability indicator -->
        <div v-if="pokemon.ability" class="ability-tag" :title="pokemon.ability.description">
          ⭐ {{ pokemon.ability.name }}
        </div>
      </div>
    </div>

    <!-- Selection tray -->
    <div class="selection-tray">
      <div class="tray-header">
        <span class="tray-title">🎒 Your Selection</span>
        <span class="tray-meta">{{ selectedCount }} of {{ maxSelection }}</span>
      </div>
      <div class="tray-row">
        <div
          v-for="(slot, i) in traySlots"
          :key="'slot-'+i"
          class="tray-slot"
          :class="{ filled: !!slot, 'has-evo-warning': hasEvoWarningForSlot(i) }"
          @click="slot && removeAtIndex(i)"
        >
          <template v-if="slot">
            <img
              :src="getPokemonSprite(slot.name)"
              :alt="slot.name"
              @error="handleImageError"
            />
            <span class="tray-x">×</span>
          </template>
          <span v-else class="tray-empty">{{ i + 1 }}</span>
        </div>
      </div>
      <p v-if="evoWarning" class="evo-warning">⚠️ {{ evoWarning }}</p>
    </div>

    <!-- Footer -->
    <div class="editor-footer">
      <button
        class="confirm-btn"
        :disabled="selectedCount !== maxSelection"
        @click="handleConfirm"
      >
        <span v-if="selectedCount === maxSelection">✓ {{ t('confirmDeck') }}</span>
        <span v-else>Pick {{ maxSelection - selectedCount }} more</span>
      </button>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { POKEMON_DATA } from '../data/cards'
import { getPokemonSpriteUrl } from '../utils/pokemonImages'
import { soundService } from '../services/soundService'
import type { Card, ElementType } from '../types'

const { t } = useI18n()

const props = defineProps<{
  playerNum: number
  playerLabel: string
  element: ElementType
}>()

const emit = defineEmits<{
  (e: 'confirm', selection: Card[]): void
}>()

const maxSelection = 12
const selectedPokemon = ref<Card[]>([])
const activeFilter = ref<'all' | 'basic' | 'stage1' | 'stage2'>('all')

const filters = [
  { value: 'all' as const, label: 'All' },
  { value: 'basic' as const, label: 'Basic' },
  { value: 'stage1' as const, label: 'Stage 1' },
  { value: 'stage2' as const, label: 'Stage 2' },
]

const availablePokemon = computed<Card[]>(() => {
  return (POKEMON_DATA as any)[props.element] || []
})

const filteredPokemon = computed<Card[]>(() => {
  if (activeFilter.value === 'all') return availablePokemon.value
  return availablePokemon.value.filter(p => (p.stage || 'basic') === activeFilter.value)
})

function filterCount(filter: typeof activeFilter.value): number {
  if (filter === 'all') return availablePokemon.value.length
  return availablePokemon.value.filter(p => (p.stage || 'basic') === filter).length
}

function setFilter(value: typeof activeFilter.value) {
  if (activeFilter.value === value) return
  activeFilter.value = value
  soundService.play('hover')
}

const selectedCount = computed(() => selectedPokemon.value.length)

const selectedNames = computed(() => new Set(selectedPokemon.value.map(p => p.name)))

const traySlots = computed<(Card | null)[]>(() => {
  const arr: (Card | null)[] = []
  for (let i = 0; i < maxSelection; i++) {
    arr.push(selectedPokemon.value[i] || null)
  }
  return arr
})

function isSelected(pokemon: Card) {
  return selectedPokemon.value.some(p => p.id === pokemon.id)
}

function isLocked(pokemon: Card) {
  // Locked when deck is full and this isn't already selected
  return !isSelected(pokemon) && selectedCount.value >= maxSelection
}

function togglePokemon(pokemon: Card) {
  const index = selectedPokemon.value.findIndex(p => p.id === pokemon.id)
  if (index >= 0) {
    selectedPokemon.value.splice(index, 1)
    soundService.play('click')
  } else if (selectedCount.value < maxSelection) {
    selectedPokemon.value.push(pokemon)
    soundService.play('select')
  } else {
    soundService.play('error')
  }
}

function removeAtIndex(index: number) {
  selectedPokemon.value.splice(index, 1)
  soundService.play('click')
}

function clearSelection() {
  selectedPokemon.value = []
  soundService.play('click')
}


// Suggest a balanced deck: ~6 basics, 4 stage 1s, 2 stage 2s if available
function suggestDeck() {
  const all = availablePokemon.value
  const basics = all.filter(p => (p.stage || 'basic') === 'basic')
  const stage1s = all.filter(p => p.stage === 'stage1')
  const stage2s = all.filter(p => p.stage === 'stage2')

  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

  const target = { basic: 6, stage1: 4, stage2: 2 }

  // Track what's been picked, prioritise evolution chains
  const picked: Card[] = []
  const pickedNames = new Set<string>()

  // Pick stage 2s first (rare), and ensure their basics + stage1s are present
  for (const s2 of shuffle(stage2s).slice(0, target.stage2)) {
    if (picked.length >= maxSelection) break
    const stage1 = stage1s.find(s1 => s1.name === s2.evolvesFrom)
    const basic = stage1 ? basics.find(b => b.name === stage1.evolvesFrom) : undefined
    if (basic && stage1 && !pickedNames.has(basic.name)) {
      picked.push(basic); pickedNames.add(basic.name)
    }
    if (stage1 && !pickedNames.has(stage1.name)) {
      picked.push(stage1); pickedNames.add(stage1.name)
    }
    if (!pickedNames.has(s2.name)) {
      picked.push(s2); pickedNames.add(s2.name)
    }
  }

  // Fill stage 1s — prefer ones whose basic is already picked or available
  for (const s1 of shuffle(stage1s)) {
    if (picked.filter(p => p.stage === 'stage1').length >= target.stage1) break
    if (picked.length >= maxSelection) break
    if (pickedNames.has(s1.name)) continue
    const basic = basics.find(b => b.name === s1.evolvesFrom)
    if (basic && !pickedNames.has(basic.name) && picked.length + 2 <= maxSelection) {
      picked.push(basic); pickedNames.add(basic.name)
    }
    picked.push(s1); pickedNames.add(s1.name)
  }

  // Fill remaining slots with random basics
  for (const b of shuffle(basics)) {
    if (picked.length >= maxSelection) break
    if (pickedNames.has(b.name)) continue
    picked.push(b); pickedNames.add(b.name)
  }

  // If still short (small pool), fill with anything left
  for (const p of shuffle(all)) {
    if (picked.length >= maxSelection) break
    if (pickedNames.has(p.name)) continue
    picked.push(p); pickedNames.add(p.name)
  }

  selectedPokemon.value = picked.slice(0, maxSelection)
  soundService.play('evolve')
}

// Detect evolution chain warnings (e.g., picking a Stage 2 without its basic/stage1)
const evoWarning = computed<string | null>(() => {
  const issues: string[] = []
  for (const p of selectedPokemon.value) {
    if (p.stage === 'stage1' && p.evolvesFrom && !selectedNames.value.has(p.evolvesFrom)) {
      issues.push(`${p.name} needs ${p.evolvesFrom}`)
    } else if (p.stage === 'stage2' && p.evolvesFrom) {
      const stage1 = availablePokemon.value.find(c => c.name === p.evolvesFrom)
      if (!selectedNames.value.has(p.evolvesFrom)) {
        issues.push(`${p.name} needs ${p.evolvesFrom}`)
      } else if (stage1?.evolvesFrom && !selectedNames.value.has(stage1.evolvesFrom)) {
        issues.push(`${p.name} chain needs ${stage1.evolvesFrom}`)
      }
    }
  }
  if (issues.length === 0) return null
  return issues.slice(0, 2).join(' · ')
})

function hasEvoWarningForSlot(index: number) {
  const p = selectedPokemon.value[index]
  if (!p) return false
  if (p.stage === 'stage1' && p.evolvesFrom && !selectedNames.value.has(p.evolvesFrom)) return true
  if (p.stage === 'stage2' && p.evolvesFrom && !selectedNames.value.has(p.evolvesFrom)) return true
  return false
}

function stageLabel(stage: string | undefined) {
  if (!stage || stage === 'basic') return 'Basic'
  if (stage === 'stage1') return 'Stage 1'
  if (stage === 'stage2') return 'Stage 2'
  return stage
}

function getEmoji(element: string) {
  const emojis: Record<string, string> = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮', fighting: '🥊'
  }
  return emojis[element] || '❓'
}

function getPokemonSprite(name: string) {
  return getPokemonSpriteUrl(name)
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.opacity = '0.3'
}

function handleConfirm() {
  if (selectedCount.value === maxSelection) {
    soundService.play('start')
    emit('confirm', [...selectedPokemon.value])
  } else {
    soundService.play('error')
  }
}
</script>


<style scoped>
.deck-editor.cozy {
  --de-bg: #fef6e4;
  --de-bg-card: #fffaf0;
  --de-bg-soft: #fef0d4;
  --de-border: #f3d2a4;
  --de-text: #2d2620;
  --de-text-soft: #8a7a6a;
  --de-accent: #f582ae;
  --de-plum: #5e548e;
  --de-water: #60a5fa;
  --de-fire: #fb7185;
  --de-grass: #86efac;
  --de-electric: #fde047;
  --de-success: #4ade80;
  --de-warn: #fbbf24;
  --de-shadow: rgba(45,38,32,0.08);
  --de-shadow-lg: rgba(45,38,32,0.15);

  background: var(--de-bg);
  border-radius: 20px;
  border: 1px solid var(--de-border);
  padding: 16px;
  max-width: 1100px;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
  color: var(--de-text);
  position: relative;
}

/* Soft dotted background */
.deck-editor.cozy::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(245,130,174,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  border-radius: 20px;
}

/* ---------- Header ---------- */
.editor-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--de-bg-card);
  border-radius: 14px;
  padding: 10px 14px;
  border: 1px solid var(--de-border);
  box-shadow: 0 1px 3px var(--de-shadow);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.title-emoji {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.header-title h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--de-text);
}

.subtitle {
  margin: 0;
  font-size: 0.7rem;
  color: var(--de-text-soft);
  font-weight: 600;
}

.counter-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--de-bg-soft);
  border: 2px solid var(--de-border);
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--de-text);
  transition: all 0.3s;
  flex-shrink: 0;
}

.counter-pill.complete {
  background: var(--de-success);
  border-color: var(--de-success);
  color: #052e16;
  box-shadow: 0 0 0 6px rgba(74,222,128,0.15);
}

.counter-num { font-size: 1.1rem; }
.counter-sep { opacity: 0.4; }
.counter-max { opacity: 0.7; font-size: 0.85rem; }


/* ---------- Toolbar ---------- */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--de-bg-card);
  border: 1px solid var(--de-border);
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--de-text);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.filter-pill:hover {
  background: var(--de-bg-soft);
  transform: translateY(-1px);
}

.filter-pill.active {
  background: var(--de-plum);
  border-color: var(--de-plum);
  color: white;
  box-shadow: 0 2px 8px rgba(94,84,142,0.3);
}

.filter-count {
  background: rgba(0,0,0,0.06);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 0.65rem;
}

.filter-pill.active .filter-count {
  background: rgba(255,255,255,0.25);
}

.toolbar-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 6px 12px;
  background: var(--de-accent);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(245,130,174,0.4);
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245,130,174,0.5);
}

.action-btn.ghost {
  background: var(--de-bg-card);
  color: var(--de-text-soft);
  border: 1px solid var(--de-border);
  box-shadow: none;
}

.action-btn.ghost:hover:not(:disabled) {
  background: var(--de-bg-soft);
  color: var(--de-text);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}


/* ---------- Pokemon Grid ---------- */
.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
  background: var(--de-bg-card);
  border: 1px solid var(--de-border);
  border-radius: 14px;
  position: relative;
  z-index: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--de-border) transparent;
}

.pokemon-grid::-webkit-scrollbar { width: 6px; }
.pokemon-grid::-webkit-scrollbar-thumb { background: var(--de-border); border-radius: 3px; }
.pokemon-grid::-webkit-scrollbar-track { background: transparent; }

.poke-card {
  background: white;
  border: 2px solid var(--de-border);
  border-radius: 12px;
  padding: 10px 8px 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.poke-card:hover:not(.locked) {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px var(--de-shadow-lg);
  border-color: var(--de-accent);
}

.poke-card.selected {
  border-color: var(--de-success);
  background: linear-gradient(180deg, white, #f0fdf4);
  box-shadow: 0 0 0 3px rgba(74,222,128,0.2);
}

.poke-card.locked {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.poke-card.locked:hover {
  transform: none;
}

/* Stage chip */
.stage-chip {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 0.55rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stage-chip.basic { background: rgba(96,165,250,0.15); color: var(--de-water); }
.stage-chip.stage1 { background: rgba(245,130,174,0.15); color: var(--de-accent); }
.stage-chip.stage2 { background: rgba(94,84,142,0.15); color: var(--de-plum); }

/* Check circle */
.check-circle {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border: 2px solid var(--de-border);
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--de-text-soft);
  transition: all 0.2s;
}

.poke-card.selected .check-circle {
  background: var(--de-success);
  border-color: var(--de-success);
  color: white;
}

.lock-icon {
  font-size: 0.7rem;
}

/* Art */
.poke-art {
  width: 100%;
  height: 70px;
  background: rgba(45,38,32,0.04);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-top: 8px;
}

.poke-art img {
  max-width: 90%;
  max-height: 65px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(45,38,32,0.15));
  transition: transform 0.2s;
}

.poke-card:hover:not(.locked) .poke-art img {
  transform: scale(1.1);
}


/* Info */
.poke-info {
  text-align: center;
  width: 100%;
}

.poke-name {
  font-weight: 800;
  font-size: 0.78rem;
  color: var(--de-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.poke-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 0.6rem;
  color: var(--de-text-soft);
  margin-top: 2px;
  flex-wrap: wrap;
}

.stat-hp { font-weight: 700; }
.stat-from {
  background: rgba(0,0,0,0.05);
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 0.55rem;
}

/* Attacks */
.poke-attacks {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.atk-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background: var(--de-bg-soft);
  border-radius: 6px;
  font-size: 0.6rem;
}

.atk-cost { color: #ca8a04; font-weight: 800; }
.atk-name {
  font-weight: 600;
  color: var(--de-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atk-dmg { color: var(--de-fire); font-weight: 800; }

/* Ability tag */
.ability-tag {
  width: 100%;
  font-size: 0.55rem;
  font-weight: 700;
  color: var(--de-plum);
  background: rgba(94,84,142,0.1);
  padding: 3px 6px;
  border-radius: 6px;
  text-align: center;
  text-transform: capitalize;
}


/* ---------- Selection Tray ---------- */
.selection-tray {
  background: var(--de-bg-card);
  border: 1px solid var(--de-border);
  border-radius: 14px;
  padding: 10px 12px;
  position: relative;
  z-index: 1;
  box-shadow: 0 1px 3px var(--de-shadow);
}

.tray-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tray-title {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--de-text);
}

.tray-meta {
  font-size: 0.7rem;
  color: var(--de-text-soft);
  font-weight: 600;
}

.tray-row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
}

.tray-slot {
  aspect-ratio: 1;
  background: var(--de-bg-soft);
  border: 2px dashed var(--de-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 0.65rem;
  color: var(--de-text-soft);
  font-weight: 700;
  transition: all 0.2s;
  overflow: hidden;
}

.tray-slot.filled {
  background: white;
  border: 2px solid var(--de-success);
  cursor: pointer;
}

.tray-slot.filled:hover {
  border-color: var(--de-fire);
  background: #fff5f5;
}

.tray-slot.has-evo-warning.filled {
  border-color: var(--de-warn);
  background: #fffbeb;
}

.tray-slot img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.tray-slot .tray-x {
  position: absolute;
  top: 0;
  right: 2px;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--de-fire);
  opacity: 0;
  transition: opacity 0.2s;
}

.tray-slot.filled:hover .tray-x {
  opacity: 1;
}

.tray-empty {
  color: var(--de-text-soft);
  opacity: 0.5;
}

.evo-warning {
  margin: 8px 0 0;
  padding: 6px 10px;
  background: rgba(251,191,36,0.12);
  border: 1px solid rgba(251,191,36,0.3);
  color: #92400e;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
}


/* ---------- Footer ---------- */
.editor-footer {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.confirm-btn {
  background: var(--de-plum);
  color: white;
  border: none;
  padding: 12px 36px;
  border-radius: 18px;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(94,84,142,0.4);
  transition: all 0.25s;
  font-family: inherit;
  letter-spacing: 0.5px;
  width: 100%;
  max-width: 360px;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(94,84,142,0.5);
}

.confirm-btn:active:not(:disabled) {
  transform: translateY(0);
}

.confirm-btn:disabled {
  background: var(--de-bg-soft);
  color: var(--de-text-soft);
  cursor: not-allowed;
  box-shadow: none;
}

/* ---------- Mobile ---------- */
@media (max-width: 720px) {
  .deck-editor.cozy {
    padding: 10px;
    gap: 10px;
    border-radius: 0;
    border: none;
  }

  .header-top {
    padding: 8px 10px;
  }

  .title-emoji { font-size: 1.4rem; }
  .header-title h2 { font-size: 0.95rem; }
  .subtitle { font-size: 0.6rem; }

  .counter-pill {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  .pokemon-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
    padding: 6px;
  }

  .poke-card {
    padding: 8px 6px 6px;
    gap: 4px;
  }

  .poke-art {
    height: 60px;
  }

  .poke-art img { max-height: 56px; }

  .poke-name { font-size: 0.7rem; }
  .stage-chip { font-size: 0.5rem; padding: 1px 5px; }
  .check-circle { width: 18px; height: 18px; font-size: 0.7rem; }

  .atk-row { font-size: 0.55rem; padding: 2px 5px; }
  .ability-tag { font-size: 0.5rem; padding: 2px 5px; }

  .tray-row {
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }

  .filter-pill {
    padding: 5px 10px;
    font-size: 0.7rem;
  }

  .action-btn {
    padding: 5px 10px;
    font-size: 0.7rem;
  }

  .confirm-btn {
    padding: 11px 24px;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .pokemon-grid {
    grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
  }

  .poke-card {
    padding: 6px 5px 5px;
  }

  .poke-art { height: 52px; }
  .poke-art img { max-height: 48px; }

  /* Hide attacks on very small to save vertical space */
  .poke-attacks { display: none; }
  .ability-tag { display: none; }

  .tray-slot { border-radius: 6px; }
}

/* ---------- Animations ---------- */
@keyframes slot-pop {
  from { transform: scale(0.7); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.tray-slot.filled img {
  animation: slot-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
