<template>
  <div class="deck-editor">
    <div class="editor-header">
      <h2>{{ playerLabel }}, Build Your Deck</h2>
      <p class="subtitle">Select exactly {{ maxSelection }} Pokémon from your element pool</p>
      <div class="selection-counter" :class="{ complete: selectedCount === maxSelection }">
        {{ selectedCount }} / {{ maxSelection }} Selected
      </div>
    </div>

    <div class="pokemon-grid">
      <div 
        v-for="pokemon in availablePokemon" 
        :key="pokemon.id"
        class="pokemon-item"
        :class="[pokemon.element, { selected: isSelected(pokemon) }]"
        @click="togglePokemon(pokemon)"
      >
        <div class="item-selection-indicator">
          <span v-if="isSelected(pokemon)">✓</span>
        </div>
        <img :src="getPokemonSprite(pokemon.name)" :alt="pokemon.name" class="item-sprite" />
        <div class="item-info">
          <span class="item-name">{{ pokemon.name }}</span>
          <div class="item-meta">
            <span class="item-hp">{{ pokemon.hp }} HP</span>
            <span v-if="pokemon.stage && pokemon.stage !== 'basic'" class="item-stage">
              {{ pokemon.stage }} (from {{ pokemon.evolvesFrom }})
            </span>
          </div>
        </div>
        <div class="item-attacks">
          <div v-for="atk in pokemon.attacks" :key="atk.name" class="mini-attack">
            {{ atk.name }} ({{ atk.damage }})
          </div>
        </div>
      </div>
    </div>

    <div class="editor-footer">
      <button 
        class="btn btn-primary" 
        :disabled="selectedCount !== maxSelection"
        @click="handleConfirm"
      >
        Confirm Deck
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { POKEMON_DATA } from '../data/cards'
import { getPokemonSpriteUrl } from '../utils/pokemonImages'
import type { Card, ElementType } from '../types'

const props = defineProps<{
  playerNum: number
  playerLabel: string
  element: ElementType
}>()

const emit = defineEmits<{
  (e: 'confirm', selection: Card[]): void
}>()

const maxSelection = 6
const selectedPokemon = ref<Card[]>([])

const availablePokemon = computed(() => {
  // Return all pokemon of this element from data
  return (POKEMON_DATA as any)[props.element] || []
})

const selectedCount = computed(() => selectedPokemon.value.length)

function isSelected(pokemon: Card) {
  return selectedPokemon.value.some(p => p.id === pokemon.id)
}

function togglePokemon(pokemon: Card) {
  const index = selectedPokemon.value.findIndex(p => p.id === pokemon.id)
  if (index >= 0) {
    selectedPokemon.value.splice(index, 1)
  } else {
    if (selectedCount.value < maxSelection) {
      selectedPokemon.value.push(pokemon)
    }
  }
}

function getPokemonSprite(name: string) {
  return getPokemonSpriteUrl(name)
}

function handleConfirm() {
  if (selectedCount.value === maxSelection) {
    emit('confirm', [...selectedPokemon.value])
  }
}
</script>

<style scoped>
.deck-editor {
  background: var(--bg-dark);
  border-radius: 20px;
  border: 2px solid var(--border-color);
  padding: 30px;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.editor-header {
  text-align: center;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 4px;
}

.selection-counter {
  margin-top: 12px;
  font-weight: 700;
  font-size: 1.1rem;
  color: #ef4444;
  transition: color 0.3s ease;
}

.selection-counter.complete {
  color: #4ade80;
}

.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 10px;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
}

.pokemon-item {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pokemon-item:hover {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.4);
}

.pokemon-item.selected {
  border-color: #4ade80;
  box-shadow: 0 0 15px rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.05);
}

.item-selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.selected .item-selection-indicator {
  background: #4ade80;
  border-color: #4ade80;
  color: #333;
}

.item-sprite {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.item-info {
  text-align: center;
}

.item-name {
  display: block;
  font-weight: 700;
  font-size: 0.9rem;
}

.item-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.item-hp {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.item-stage {
  font-size: 0.6rem;
  font-weight: 800;
  color: #fbbf24;
  text-transform: uppercase;
}

.item-attacks {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-attack {
  font-size: 0.65rem;
  background: rgba(255,255,255,0.05);
  padding: 2px 6px;
  border-radius: 4px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-footer {
  display: flex;
  justify-content: center;
  padding-top: 10px;
}

/* Element specific borders on items */
.pokemon-item.fire.selected { border-color: var(--fire-primary); box-shadow: 0 0 15px var(--fire-primary); }
.pokemon-item.water.selected { border-color: var(--water-primary); box-shadow: 0 0 15px var(--water-primary); }
.pokemon-item.grass.selected { border-color: var(--grass-primary); box-shadow: 0 0 15px var(--grass-primary); }
.pokemon-item.electric.selected { border-color: var(--electric-primary); box-shadow: 0 0 15px var(--electric-primary); }

/* Custom Scrollbar */
.pokemon-grid::-webkit-scrollbar {
  width: 8px;
}
.pokemon-grid::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.1);
}
.pokemon-grid::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}
</style>
