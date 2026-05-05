<template>
  <div id="app">
    <div class="game-container">
      <!-- Element Selection Screen -->
      <div v-if="gameStore.gamePhase === 'setup'" class="setup-screen">
        <h1 class="title">Pokémon Card Game</h1>
        <p class="subtitle">Choose your game mode</p>

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
            :class="{ selected: gameStore.gameMode === 'local' }"
            @click="gameStore.setGameMode('local')"
          >
            👥 Local Two Players
          </button>
          <button 
            class="btn mode-btn online-btn" 
            :class="{ selected: gameStore.gameMode === 'online' }"
            @click="handleOnlineMode"
          >
            📡 Online Multiplayer
          </button>
        </div>

        <!-- Element selection for local/single modes -->
        <template v-if="gameStore.gameMode !== 'online'">
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
            
            <div class="player-selection" :class="{ 'bot-selection': gameStore.gameMode === 'single' }">
              <h2>{{ gameStore.gameMode === 'single' ? 'Bot' : 'Player 2' }}</h2>
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
              <div v-if="gameStore.gameMode === 'single'" class="bot-hint">
                The bot will play with this element!
              </div>
            </div>
          </div>
          
          <button 
            class="btn btn-primary start-btn"
            :disabled="!player1Element || !player2Element"
            @click="goToDeckBuilding"
          >
            Next: Build Decks
          </button>
        </template>

        <!-- Element selection for ONLINE mode (each player picks their own) -->
        <template v-if="gameStore.gameMode === 'online'">
          <p class="subtitle">Choose your element</p>
          <div class="element-selection">
            <!-- Your element picker -->
            <div class="player-selection">
              <h2>{{ isHost ? '🏠 Your Element' : '🔗 Your Element' }}</h2>
              <div class="element-buttons">
                <button 
                  v-for="element in elements" 
                  :key="element"
                  class="btn element-btn"
                  :class="[`btn-${element}`, { selected: myOnlineElement === element }]"
                  @click="selectOnlineElement(element)"
                >
                  {{ getElementEmoji(element) }} {{ element }}
                </button>
              </div>
            </div>

            <div class="vs-divider">VS</div>

            <!-- Opponent status -->
            <div class="player-selection opponent-status">
              <h2>Opponent</h2>
              <div v-if="opponentOnlineElement" class="opponent-element-chosen">
                <span class="chosen-emoji">{{ getElementEmoji(opponentOnlineElement) }}</span>
                <span class="chosen-label">{{ opponentOnlineElement }}</span>
                <span class="chosen-check">✅ Ready</span>
              </div>
              <div v-else class="opponent-waiting">
                <div class="wait-spinner-small"></div>
                <span>Waiting for opponent...</span>
              </div>
            </div>
          </div>

          <button 
            class="btn btn-primary start-btn"
            :disabled="!myOnlineElement || !opponentOnlineElement"
            @click="goToDeckBuilding"
          >
            Next: Build Decks
          </button>
        </template>
      </div>

      <!-- Multiplayer Lobby -->
      <div v-else-if="gameStore.gamePhase === 'lobby'" class="lobby-view">
        <MultiplayerLobby 
          @proceed="handleLobbyProceed" 
          @back="handleLobbyBack" 
        />
      </div>

      <!-- Deck Building Phase -->
      <div v-else-if="gameStore.gamePhase === 'deckBuilding'" class="deck-building-view">
        <!-- Online mode: only build your own deck -->
        <template v-if="isOnline">
          <DeckEditor
            :player-num="isHost ? 1 : 2"
            :player-label="isHost ? 'Your Deck (Host)' : 'Your Deck'"
            :element="isHost ? player1Element! : player2Element!"
            @confirm="handleOnlineDeckConfirm"
          />
          <div v-if="myDeckConfirmed" class="waiting-for-opponent">
            <div class="wait-spinner"></div>
            <span>Waiting for opponent to finish building...</span>
          </div>
        </template>
        <!-- Local / Single -->
        <template v-else>
          <div v-if="buildingStep === 1">
            <DeckEditor
              :player-num="1"
              player-label="Player 1"
              :element="player1Element!"
              @confirm="handleDeckConfirm(1, $event)"
            />
          </div>
          <div v-else-if="buildingStep === 2">
            <DeckEditor
              :player-num="2"
              player-label="Player 2"
              :element="player2Element!"
              @confirm="handleDeckConfirm(2, $event)"
            />
          </div>
        </template>
      </div>
      
      <!-- Game Board -->
      <div v-else-if="gameStore.gamePhase === 'playing'" class="game-view">
        <!-- Connection status (online only) -->
        <div v-if="isOnline" class="connection-bar">
          <span class="conn-dot" :class="mpStore.connectionStatus"></span>
          <span class="conn-label">{{ isMyTurn ? '⚔️ Your Turn' : '⏳ Opponent\'s Turn' }}</span>
        </div>

        <!-- Opponent Summary Bar -->
        <OpponentSummary
          :name="displayOpponent.name"
          :element="displayOpponent.element"
          :active="displayOpponent.active"
          :deck-count="displayOpponent.deck.length"
          :hand-count="displayOpponent.hand.length"
          :bench-count="displayOpponent.bank.length"
          :prize-count="displayOpponent.prizeCards.length"
          :score="displayOpponent.score"
          :player-id="displayOpponent.id"
          :active-vfx="gameStore.activeVfx"
        />

        <!-- Bot Thinking Overlay -->
        <div v-if="gameStore.currentTurn === 2 && gameStore.player2.isBot" class="bot-thinking-overlay">
          <div class="thinking-content">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-text">Bot is thinking...</span>
          </div>
        </div>

        <!-- Opponent Turn Overlay (online) -->
        <div v-if="isOnline && !isMyTurn" class="opponent-turn-overlay">
          <div class="thinking-content">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-text">Opponent is playing...</span>
          </div>
        </div>

        <!-- Active Player's Full Board -->
        <ActivePlayerBoard
          :deck="displayMyPlayer.deck"
          :hand="displayMyPlayer.hand"
          :active="displayMyPlayer.active"
          :bank="displayMyPlayer.bank"
          :energy-zone="displayMyPlayer.energyZone"
          :discard-pile="displayMyPlayer.discardPile"
          :prize-cards="displayMyPlayer.prizeCards"
          :pending-evolution="gameStore.pendingEvolution"
          :name="displayMyPlayer.name"
          :score="displayMyPlayer.score"
          :player-id="displayMyPlayer.id"
          :active-vfx="gameStore.activeVfx"
          :turn-number="gameStore.turnNumber"
          :is-bot-turn="isBotThinking"
          :logs="gameStore.logs"
          @play-card="handlePlayCard"
          @attack="handleAttack"
          @evolve="handleEvolution"
          @cancel-evolution="handleCancelEvolution"
          @end-turn="handleEndTurn"
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
    <button class="mute-btn" @click="toggleMute" title="Toggle Sound">
      {{ isMuted ? '🔇' : '🔊' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useMultiplayerStore } from './stores/multiplayerStore'
import { playBotTurn } from './services/botLogic'
import { peerService } from './services/peerService'
import OpponentSummary from './components/OpponentSummary.vue'
import ActivePlayerBoard from './components/ActivePlayerBoard.vue'
import DeckEditor from './components/DeckEditor.vue'
import CardTooltip from './components/CardTooltip.vue'
import MultiplayerLobby from './components/MultiplayerLobby.vue'
import type { ElementType, Card } from './types'
import { getElementEmoji } from './utils/gameUtils'
import { soundService } from './services/soundService'

const gameStore = useGameStore()
const mpStore = useMultiplayerStore()
const isMuted = ref(soundService.isMuted())
const myDeckConfirmed = ref(false)

function toggleMute() {
  isMuted.value = soundService.toggleMute()
}

// Local state
const player1Element = ref<ElementType | null>(null)
const player2Element = ref<ElementType | null>(null)
const buildingStep = ref(1)

const elements: ElementType[] = ['fire', 'water', 'grass', 'electric']

const isOnline = computed(() => gameStore.gameMode === 'online')
const isHost = computed(() => mpStore.isHost)
const isMyTurn = computed(() => gameStore.isMyTurn)
const isBotThinking = computed(() => gameStore.currentTurn === 2 && gameStore.player2.isBot)

const winner = computed(() => gameStore.winner || 'Unknown')

// In online mode, always show "my" board, not "current turn" board
const displayMyPlayer = computed(() => {
  if (isOnline.value) return gameStore.myPlayer
  return gameStore.currentPlayer
})
const displayOpponent = computed(() => {
  if (isOnline.value) return gameStore.remotePlayer
  return gameStore.opponent
})

// --- Mode & Setup ---
function handleOnlineMode() {
  gameStore.setGameMode('online')
  gameStore.gamePhase = 'lobby'
}

function handleLobbyProceed() {
  // Host moves to setup and tells guest to do the same
  gameStore.gamePhase = 'setup'
  peerService.send({ type: 'DECK_PHASE', payload: { hostElement: '' as any } })
}

function handleLobbyBack() {
  gameStore.setGameMode('local')
  gameStore.gamePhase = 'setup'
}

// Online element picking
const myOnlineElement = computed(() => {
  return isHost.value ? player1Element.value : player2Element.value
})
const opponentOnlineElement = computed(() => {
  if (isHost.value) return mpStore.guestElement
  return mpStore.hostElement
})

function selectOnlineElement(element: ElementType) {
  if (isHost.value) {
    player1Element.value = element
    gameStore.setPlayerElement(1, element)
    // Notify guest of host's element
    peerService.send({ type: 'HOST_READY', payload: { element } } as any)
  } else {
    player2Element.value = element
    gameStore.setPlayerElement(2, element)
    // Send to host
    peerService.send({ type: 'SELECT_ELEMENT', payload: { element } })
  }
}

function selectElement(playerNum: number, element: ElementType) {
  if (playerNum === 1) {
    player1Element.value = element
    gameStore.setPlayerElement(1, element)
  } else {
    if (isOnline.value && mpStore.isGuest) {
      // Guest sends element choice to host
      player2Element.value = element
      peerService.send({ type: 'SELECT_ELEMENT', payload: { element } })
    } else {
      player2Element.value = element
      gameStore.setPlayerElement(2, element)
    }
  }
}

function goToDeckBuilding() {
  if (isOnline.value) {
    // Online mode: need myOnlineElement AND opponentOnlineElement
    if (!myOnlineElement.value || !opponentOnlineElement.value) return
    // Set both elements properly
    if (isHost.value) {
      player1Element.value = myOnlineElement.value
      player2Element.value = opponentOnlineElement.value
    }
    gameStore.gamePhase = 'deckBuilding'
    if (isHost.value) {
      peerService.send({ type: 'DECK_PHASE', payload: { phase: 'deckBuilding' } } as any)
    }
  } else {
    if (!player1Element.value || !player2Element.value) return
    gameStore.gamePhase = 'deckBuilding'
    buildingStep.value = 1
  }
}

function handleDeckConfirm(playerNum: number, selection: Card[]) {
  gameStore.setCustomDeck(playerNum, selection)
  if (playerNum === 1) {
    if (gameStore.gameMode === 'single') {
      gameStore.setCustomDeck(2, [])
      handleStartGame()
    } else {
      buildingStep.value = 2
    }
  } else {
    handleStartGame()
  }
}

function handleOnlineDeckConfirm(selection: Card[]) {
  myDeckConfirmed.value = true
  if (isHost.value) {
    gameStore.setCustomDeck(1, selection)
    mpStore.hostConfirmDeck()
  } else {
    peerService.send({ type: 'CONFIRM_DECK', payload: { pokemon: JSON.parse(JSON.stringify(selection)) } })
  }
}

function handleStartGame() {
  if (!player1Element.value || !player2Element.value) return
  gameStore.startGame()
}

// --- Game Actions (with online forwarding) ---
function handlePlayCard(card: Card) {
  if (isOnline.value && !isMyTurn.value) return
  if (isOnline.value && mpStore.isGuest) {
    // Evolution cards: handle the "pick a target" UI locally on the guest,
    // then send the completed EVOLVE message with both IDs
    if (card.type === 'pokemon' && (card.stage === 'stage1' || card.stage === 'stage2')) {
      gameStore.pendingEvolution = card
      return
    }
    peerService.send({ type: 'PLAY_CARD', payload: { cardUniqueId: card.uniqueId! } })
    return
  }
  gameStore.playCardFromHand(card)
  if (isOnline.value && isHost.value) mpStore.broadcastState()
}

function handleAttack(index: number) {
  if (isOnline.value && !isMyTurn.value) return
  if (isOnline.value && mpStore.isGuest) {
    peerService.send({ type: 'ATTACK', payload: { attackIndex: index } })
    return
  }
  gameStore.attack(index)
  if (isOnline.value && isHost.value) mpStore.broadcastState()
}

function handleEvolution(target: Card) {
  if (isOnline.value && !isMyTurn.value) return
  if (isOnline.value && mpStore.isGuest) {
    const evolver = gameStore.pendingEvolution
    if (evolver) {
      peerService.send({ type: 'EVOLVE', payload: { evolverUniqueId: evolver.uniqueId!, targetUniqueId: target.uniqueId! } })
      // Clear local pending evolution after sending
      gameStore.pendingEvolution = null
    }
    return
  }
  gameStore.evolvePokemon(target)
  if (isOnline.value && isHost.value) mpStore.broadcastState()
}

function handleCancelEvolution() {
  gameStore.cancelEvolution()
}

function handleEndTurn() {
  if (isOnline.value && !isMyTurn.value) return
  if (isOnline.value && mpStore.isGuest) {
    peerService.send({ type: 'END_TURN', payload: {} })
    return
  }
  gameStore.endTurn()
  if (isOnline.value && isHost.value) mpStore.broadcastState()
}

function resetGame() {
  mpStore.disconnect()
  player1Element.value = null
  player2Element.value = null
  myDeckConfirmed.value = false
  location.reload()
}

// Watch for bot turn
watch(() => [gameStore.currentTurn, gameStore.gamePhase], async ([turn, phase]) => {
  if (phase === 'playing' && turn === 2 && gameStore.player2.isBot && !gameStore.winner) {
    try {
      await playBotTurn(gameStore)
    } catch (e) {
      console.error('Bot turn error:', e)
    }
  }
}, { immediate: true })

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

.mute-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.mute-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

/* Online mode button */
.online-btn.selected {
  border-color: #22d3ee;
  background: rgba(34, 211, 238, 0.1);
  box-shadow: 0 0 15px rgba(34, 211, 238, 0.3);
}

/* Lobby View */
.lobby-view {
  min-height: 100vh;
}

/* Connection Bar */
.connection-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #888;
}

.conn-dot.connected {
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
}

.conn-dot.disconnected,
.conn-dot.error {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.conn-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
}

/* Opponent Turn Overlay */
.opponent-turn-overlay {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 20px;
  z-index: 100;
  border: 1px solid rgba(34, 211, 238, 0.3);
  backdrop-filter: blur(4px);
}

/* Waiting for opponent (deck building) */
.waiting-for-opponent {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin-top: 20px;
}

.wait-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: waitSpin 0.8s linear infinite;
}

@keyframes waitSpin {
  to { transform: rotate(360deg); }
}

/* Online opponent status in element picker */
.opponent-status {
  border-color: rgba(255, 255, 255, 0.15);
}

.opponent-element-chosen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
}

.chosen-emoji {
  font-size: 2.5rem;
}

.chosen-label {
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: capitalize;
}

.chosen-check {
  font-size: 0.85rem;
  color: #4ade80;
}

.opponent-waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
}

.wait-spinner-small {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: waitSpin 0.8s linear infinite;
}

/* Wrap mode buttons on smaller screens */
.game-mode-selection {
  flex-wrap: wrap;
}
</style>
