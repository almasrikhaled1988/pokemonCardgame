<template>
  <div id="app">
    <div class="game-container">
      <!-- Element Selection Screen -->
      <div v-if="gameStore.gamePhase === 'setup'" class="setup-screen">
        <h1 class="title">Pokémon Card Game</h1>
        <p class="subtitle">Choose your element</p>
        
        <div class="element-selection">
          <div class="player-selection">
            <h2>Player 1</h2>
            <div class="element-buttons">
              <button 
                v-for="element in elements" 
                :key="element"
                class="btn element-btn"
                :class="[`btn-${element}`, { selected: player1Element === element }]"
                @click="selectElement(1, element)"
              >
                {{ getElementEmoji(element) }} {{ element }}
              </button>
            </div>
          </div>
          
          <div class="vs-divider">VS</div>
          
          <div class="player-selection">
            <h2>Player 2</h2>
            <div class="element-buttons">
              <button 
                v-for="element in elements" 
                :key="element"
                class="btn element-btn"
                :class="[`btn-${element}`, { selected: player2Element === element }]"
                @click="selectElement(2, element)"
              >
                {{ getElementEmoji(element) }} {{ element }}
              </button>
            </div>
          </div>
        </div>
        
        <button 
          class="btn btn-primary start-btn"
          :disabled="!player1Element || !player2Element"
          @click="handleStartGame"
        >
          Start Game
        </button>
      </div>
      
      <!-- Game Board (Single View) -->
      <div v-else-if="gameStore.gamePhase === 'playing'" class="game-view">
        <!-- Opponent Summary Bar -->
        <OpponentSummary
          :name="gameStore.opponent.name"
          :element="gameStore.opponent.element"
          :active="gameStore.opponent.active"
          :deck-count="gameStore.opponent.deck.length"
          :hand-count="gameStore.opponent.hand.length"
          :bench-count="gameStore.opponent.bank.length"
          :prize-count="gameStore.opponent.prizeCards.length"
          :score="gameStore.opponent.score"
        />

        <!-- Current Player Info -->
        <div class="current-player-header">
          <div class="player-info-display">
            <span class="your-turn">Your Turn</span>
            <span class="player-name-display">
              {{ gameStore.currentPlayer.name }}
              <span class="element-tag" :class="gameStore.currentPlayer.element">
                {{ getElementEmoji(gameStore.currentPlayer.element || '') }}
              </span>
            </span>
            <span class="score-display">Score: {{ gameStore.currentPlayer.score }}/3</span>
          </div>
          <div class="turn-info">
            <span class="turn-number">Turn {{ gameStore.turnNumber }}</span>
            <button class="btn btn-end-turn" @click="gameStore.endTurn()">
              End Turn
            </button>
          </div>
        </div>

        <!-- Active Player's Full Board -->
        <ActivePlayerBoard
          :deck="gameStore.currentPlayer.deck"
          :hand="gameStore.currentPlayer.hand"
          :active="gameStore.currentPlayer.active"
          :bank="gameStore.currentPlayer.bank"
          :energy-zone="gameStore.currentPlayer.energyZone"
          :discard-pile="gameStore.currentPlayer.discardPile"
          :prize-cards="gameStore.currentPlayer.prizeCards"
          @play-card="handlePlayCard"
          @attack="handleAttack"
        />
      </div>

      <!-- Game Over Screen -->
      <div v-else class="game-over-screen">
        <h1>🏆 Game Over!</h1>
        <p class="winner-text">{{ winner }} Wins!</p>
        <button class="btn btn-primary" @click="resetGame">Play Again</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from './stores/gameStore'
import OpponentSummary from './components/OpponentSummary.vue'
import ActivePlayerBoard from './components/ActivePlayerBoard.vue'
import type { ElementType, Card } from './types'

const gameStore = useGameStore()

// Local state for setup selection
const player1Element = ref<ElementType | null>(null)
const player2Element = ref<ElementType | null>(null)

const elements: ElementType[] = ['fire', 'water', 'grass', 'electric']

const winner = computed(() => {
  // Use winner from store
  return gameStore.winner || 'Unknown'
})

function selectElement(playerNum: number, element: ElementType) {
  if (playerNum === 1) {
    player1Element.value = element
    gameStore.setPlayerElement(1, element)
  } else {
    player2Element.value = element
    gameStore.setPlayerElement(2, element)
  }
}

function handleStartGame() {
  if (!player1Element.value || !player2Element.value) return
  gameStore.startGame()
}

function handlePlayCard(card: Card) {
  gameStore.playCardFromHand(card)
}

function handleAttack(index: number) {
  gameStore.attack(index)
}

function resetGame() {
  // Reset store and local state
  player1Element.value = null
  player2Element.value = null
  location.reload() // Simple reset for now
}

function getElementEmoji(element: string) {
  const emojis: Record<string, string> = {
    fire: '🔥',
    water: '💧',
    grass: '🌿',
    electric: '⚡'
  }
  return emojis[element] || ''
}
</script>

<style scoped>
/* Setup Screen */
.setup-screen {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
}

.title {
  font-size: 3rem;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.element-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  margin-bottom: 40px;
}

.vs-divider {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-secondary);
}

.player-selection {
  background: var(--bg-dark);
  padding: 24px;
  border-radius: 16px;
  border: 2px solid var(--border-color);
  min-width: 280px;
}

.player-selection h2 {
  margin-bottom: 16px;
}

.element-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.element-btn {
  width: 100%;
  font-size: 1.1rem;
  padding: 14px 20px;
  position: relative;
}

.element-btn.selected {
  border: 3px solid white;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
}

.element-btn.selected::after {
  content: '✓';
  position: absolute;
  right: 16px;
  font-size: 1.3rem;
}

.start-btn {
  font-size: 1.3rem;
  padding: 16px 48px;
}

/* Game View */
.game-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 12px;
  gap: 12px;
}

.current-player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: var(--bg-dark);
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

.player-info-display {
  display: flex;
  align-items: center;
  gap: 16px;
}

.your-turn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.player-name-display {
  font-size: 1.2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.element-tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 1rem;
}

.element-tag.fire { background: var(--fire-gradient); }
.element-tag.water { background: var(--water-gradient); }
.element-tag.grass { background: var(--grass-gradient); }
.element-tag.electric { background: var(--electric-gradient); }

.score-display {
  padding: 6px 14px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  margin-left: 12px;
}

.turn-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.turn-number {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.btn-end-turn {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  padding: 8px 20px;
}

.btn-end-turn:hover {
  background: rgba(255,255,255,0.1);
}

/* Game Over */
.game-over-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

.game-over-screen h1 {
  font-size: 3rem;
  margin-bottom: 16px;
}

.winner-text {
  font-size: 1.5rem;
  margin-bottom: 32px;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .element-selection {
    flex-direction: column;
  }
  
  .vs-divider {
    transform: rotate(90deg);
  }
  
  .title {
    font-size: 2rem;
  }
}
</style>
