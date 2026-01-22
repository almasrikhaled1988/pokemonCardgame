<template>
  <div id="app">
    <div class="game-container">
      <!-- Element Selection Screen -->
      <div v-if="gameStore.gamePhase === 'setup'" class="setup-screen">
        <h1 class="title">{{ t('title') }}</h1>
        <div class="lang-switch">
          <button class="btn lang-btn" :class="{ active: locale === 'en' }" @click="locale = 'en'">🇺🇸 EN</button>
          <button class="btn lang-btn" :class="{ active: locale === 'de' }" @click="locale = 'de'">🇩🇪 DE</button>
          <button class="btn lang-btn" :class="{ active: locale === 'ar' }" @click="locale = 'ar'">🇸🇦 AR</button>
        </div>
        <p class="subtitle">{{ t('chooseElement') }}</p>

        <div class="game-mode-selection">
          <button 
            class="btn mode-btn" 
            :class="{ selected: gameStore.gameMode === 'single' }"
            @click="gameStore.setGameMode('single')"
          >
            {{ t('singlePlayer') }}
          </button>
          <button 
            class="btn mode-btn" 
            :class="{ selected: gameStore.gameMode === 'multi' }"
            @click="gameStore.setGameMode('multi')"
          >
            {{ t('twoPlayers') }}
          </button>
        </div>
        
        <div class="element-selection">
          <div class="player-selection">
            <h2>{{ t('player1') }}</h2>
            <div class="element-buttons">
              <button 
                v-for="element in elements" 
                :key="element"
                class="btn element-btn"
                :class="[`btn-${element}`, { selected: player1Element === element }]"
                @click="selectElement(1, element)"
              >
                {{ getElementEmoji(element) }} {{ t(`elements.${element}`) }}
              </button>
            </div>
          </div>
          
          <div class="vs-divider">{{ t('vs') }}</div>
          
          <div class="player-selection" :class="{ 'bot-selection': gameStore.gameMode === 'single' }">
            <h2>{{ gameStore.gameMode === 'single' ? t('bot') : t('player2') }}</h2>
            <div class="element-buttons">
              <button 
                v-for="element in elements" 
                :key="element"
                class="btn element-btn"
                :class="[`btn-${element}`, { selected: player2Element === element }]"
                @click="selectElement(2, element)"
              >
                {{ getElementEmoji(element) }} {{ t(`elements.${element}`) }}
              </button>
            </div>
            <div v-if="gameStore.gameMode === 'single'" class="bot-hint">
              {{ t('botHint') }}
            </div>
          </div>
        </div>
        
        <button 
          class="btn btn-primary start-btn"
          :disabled="!player1Element || !player2Element"
          @click="goToDeckBuilding"
        >
          {{ t('nextBuildDecks') }}
        </button>
      </div>

      <!-- Deck Building Phase -->
      <div v-else-if="gameStore.gamePhase === 'deckBuilding'" class="deck-building-view">
        <div v-if="buildingStep === 1">
          <DeckEditor
            :player-num="1"
            :player-label="t('player1')"
            :element="player1Element!"
            @confirm="handleDeckConfirm(1, $event)"
          />
        </div>
        <div v-else-if="buildingStep === 2">
          <DeckEditor
            :player-num="2"
            :player-label="t('player2')"
            :element="player2Element!"
            @confirm="handleDeckConfirm(2, $event)"
          />
        </div>
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
          :player-id="gameStore.opponent.id"
          :active-vfx="gameStore.activeVfx"
        />

        <!-- (Header moved inside ActivePlayerBoard) -->

        <!-- Bot Thinking Overlay -->
        <div v-if="gameStore.currentTurn === 2 && gameStore.player2.isBot" class="bot-thinking-overlay">
          <div class="thinking-content">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-text">{{ t('thinking') }}</span>
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
          :pending-evolution="gameStore.pendingEvolution"
          :name="gameStore.currentPlayer.name"
          :score="gameStore.currentPlayer.score"
          :player-id="gameStore.currentPlayer.id"
          :active-vfx="gameStore.activeVfx"
          :turn-number="gameStore.turnNumber"
          :is-bot-turn="gameStore.currentTurn === 2 && gameStore.player2.isBot"
          :logs="gameStore.logs"
          @play-card="handlePlayCard"
          @attack="handleAttack"
          @evolve="handleEvolution"
          @cancel-evolution="handleCancelEvolution"
          @end-turn="gameStore.endTurn"
        />
      </div>

      <!-- Game Over Screen -->
      <div v-else class="game-over-screen">
        <h1>🏆 {{ t('gameOver') }}</h1>
        <p class="winner-text">{{ t('wins', { winner }) }}</p>
        <button class="btn btn-primary" @click="resetGame">{{ t('playAgain') }}</button>
      </div>
    </div>
    <CardTooltip />
    <CardDetailModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import { playBotTurn } from './services/botLogic'
import OpponentSummary from './components/OpponentSummary.vue'
import ActivePlayerBoard from './components/ActivePlayerBoard.vue'
import DeckEditor from './components/DeckEditor.vue'
import CardTooltip from './components/CardTooltip.vue'
import CardDetailModal from './components/CardDetailModal.vue'
import { useI18n } from 'vue-i18n'
import type { ElementType, Card } from './types'

const gameStore = useGameStore()
const { t, locale } = useI18n()

// Watch for locale changes to set document direction
watch(locale, (newLocale) => {
  if (newLocale === 'ar') {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
  } else {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = newLocale
  }
}, { immediate: true })

// Local state for setup selection
const player1Element = ref<ElementType | null>(null)
const player2Element = ref<ElementType | null>(null)
const buildingStep = ref(1) // 1 for Player 1, 2 for Player 2

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

function goToDeckBuilding() {
  if (!player1Element.value || !player2Element.value) return
  gameStore.gamePhase = 'deckBuilding'
  buildingStep.value = 1
}

function handleDeckConfirm(playerNum: number, selection: Card[]) {
  gameStore.setCustomDeck(playerNum, selection)
  
  if (playerNum === 1) {
    if (gameStore.gameMode === 'single') {
      // Auto-confirm bot deck with same selection or empty (store handles random if empty)
      gameStore.setCustomDeck(2, []) 
      handleStartGame()
    } else {
      buildingStep.value = 2
    }
  } else {
    handleStartGame()
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

function handleEvolution(target: Card) {
  gameStore.evolvePokemon(target)
}

function handleCancelEvolution() {
  gameStore.cancelEvolution()
}

function resetGame() {
  // Reset store and local state
  player1Element.value = null
  player2Element.value = null
  location.reload() // Simple reset for now
}

// Watch for bot turn
watch(() => [gameStore.currentTurn, gameStore.gamePhase], async ([turn, phase]) => {
  if (phase === 'playing' && turn === 2 && gameStore.player2.isBot && !gameStore.winner) {
    await playBotTurn(gameStore)
  }
}, { immediate: true })

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
  padding: 20px;
  text-align: center;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto; /* Allow scrolling here specifically */
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
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.lang-switch {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 32px;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: 30px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  border: 1px solid var(--border-color);
}

.lang-btn {
  background: transparent;
  border: none;
  padding: 8px 16px;
  font-size: 1rem;
  opacity: 0.6;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 20px;
  color: var(--text-secondary);
  font-family: 'Cairo', 'Inter', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-btn:hover {
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-1px);
}

.lang-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  opacity: 1;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(118, 75, 162, 0.4);
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

.game-mode-selection {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.mode-btn {
  background: var(--bg-dark);
  border: 2px solid var(--border-color);
  padding: 12px 24px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.mode-btn.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
}

.bot-selection {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.bot-hint {
  margin-top: 15px;
  font-size: 0.85rem;
  color: #ef4444;
  font-style: italic;
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

/* Deck Building View */
.deck-building-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

/* Game View */
.game-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  padding: 8px;
  gap: 8px;
  overflow: hidden;
  background: radial-gradient(circle at center, #1a1a2e 0%, #06060c 100%);
  position: relative;
}

.game-view::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 50% 50%, rgba(74, 144, 226, 0.03) 0%, transparent 60%);
  animation: bgRotate 30s linear infinite;
  pointer-events: none;
}

@keyframes bgRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  .game-view {
    padding: 4px;
    gap: 4px;
  }

  .setup-screen {
    padding: 10px;
    height: 100dvh;
    overflow-y: auto;
  }
  
  .element-selection {
    flex-direction: column;
    gap: 10px;
  }

  .element-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .element-btn {
    padding: 8px 12px;
    font-size: 0.9rem;
  }

  .player-selection {
    padding: 12px;
    min-width: unset;
    width: 100%;
  }

  .title {
    font-size: 1.8rem;
  }

  .vs-divider {
    transform: rotate(90deg);
    margin: 10px 0;
  }
}

/* Bot Thinking */
.bot-thinking-overlay {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 20px;
  z-index: 100;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(4px);
}

.thinking-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-text {
  font-weight: 600;
  font-size: 0.9rem;
  color: #fff;
}

.thinking-dot {
  width: 6px;
  height: 6px;
  background: #667eea;
  border-radius: 50%;
  animation: thinkingBounce 1s infinite alternate;
}

.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinkingBounce {
  from { transform: translateY(0); opacity: 0.4; }
  to { transform: translateY(-4px); opacity: 1; }
}
</style>
