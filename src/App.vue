<template>
  <div id="app">
    <div class="game-container">
      <!-- Element Selection Screen -->
      <div v-if="gameStore.gamePhase === 'setup'" class="setup-screen cozy">
        <div class="setup-card">
          <!-- Header -->
          <div class="setup-header">
            <div class="setup-title-row">
              <span class="setup-emoji">🎴</span>
              <h1 class="setup-title">Pokémon Card Game</h1>
            </div>
            <p class="setup-tagline">Pick a mode and an element to start</p>
          </div>

          <!-- Resume game banner -->
          <div v-if="hasSave" class="resume-banner">
            <span class="rb-icon">💾</span>
            <span class="rb-text">You have a game in progress.</span>
            <button class="rb-btn" @click="resumeGame">Resume</button>
            <button class="rb-discard" @click="discardSave" title="Discard save">✕</button>
          </div>

          <!-- Mode tabs -->
          <div class="mode-tabs">
            <button
              class="mode-tab"
              :class="{ active: gameStore.gameMode === 'single' }"
              @click="handleSetMode('single')"
            >
              <span class="mt-icon">🤖</span>
              <span class="mt-label">vs Bot</span>
              <span class="mt-sub">Solo play</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: gameStore.gameMode === 'local' }"
              @click="handleSetMode('local')"
            >
              <span class="mt-icon">👥</span>
              <span class="mt-label">Local 2P</span>
              <span class="mt-sub">Same device</span>
            </button>
            <button
              class="mode-tab online-tab"
              :class="{ active: gameStore.gameMode === 'online' }"
              @click="handleOnlineMode"
            >
              <span class="mt-icon">📡</span>
              <span class="mt-label">Online</span>
              <span class="mt-sub">Multiplayer</span>
            </button>
          </div>

          <!-- Element selection for local/single -->
          <template v-if="gameStore.gameMode !== 'online'">
            <div class="element-section">
              <!-- Player 1 -->
              <div class="element-panel" :class="{ chosen: player1Element }" v-if="gameStore.gameMode === 'single' || localSelectionStep === 1 || (localSelectionStep === 2 && player1Element)">
                <div class="ep-header">
                  <span class="ep-tag">P1</span>
                  <span class="ep-name">Player 1</span>
                  <span v-if="player1Element" class="ep-chosen-mini">{{ getElementEmoji(player1Element) }}</span>
                </div>
                <!-- Show grid only if single mode OR it's player 1's turn to pick -->
                <div class="element-grid" v-if="gameStore.gameMode === 'single' || localSelectionStep === 1">
                  <button
                    v-for="element in elements"
                    :key="element"
                    class="element-card"
                    :class="[element, { selected: player1Element === element }]"
                    @click="selectElement(1, element)"
                  >
                    <span class="ec-icon">{{ getElementEmoji(element) }}</span>
                    <span class="ec-label">{{ t(`elements.${element}`) }}</span>
                  </button>
                </div>
                <!-- When it's P2's turn, show chosen as hidden -->
                <div v-if="gameStore.gameMode === 'local' && localSelectionStep === 2" class="element-hidden-badge">
                  <span>🔒 Element chosen</span>
                </div>
              </div>

              <!-- VS Badge -->
              <div class="vs-badge-cozy">VS</div>

              <!-- Player 2 / Bot -->
              <div class="element-panel" :class="{ chosen: player2Element, bot: gameStore.gameMode === 'single' }" v-if="gameStore.gameMode === 'single' || localSelectionStep === 2 || (localSelectionStep === 1 && false)">
                <div class="ep-header">
                  <span class="ep-tag" :class="{ bot: gameStore.gameMode === 'single' }">
                    {{ gameStore.gameMode === 'single' ? 'AI' : 'P2' }}
                  </span>
                  <span class="ep-name">{{ gameStore.gameMode === 'single' ? 'Bot' : 'Player 2' }}</span>
                  <span v-if="player2Element" class="ep-chosen-mini">{{ getElementEmoji(player2Element) }}</span>
                </div>
                <div class="element-grid" v-if="gameStore.gameMode === 'single' || localSelectionStep === 2">
                  <button
                    v-for="element in elements"
                    :key="element"
                    class="element-card"
                    :class="[element, { selected: player2Element === element }]"
                    @click="selectElement(2, element)"
                  >
                    <span class="ec-icon">{{ getElementEmoji(element) }}</span>
                    <span class="ec-label">{{ t(`elements.${element}`) }}</span>
                  </button>
                </div>
                <div v-if="gameStore.gameMode === 'single'" class="bot-hint-cozy">
                  💡 The bot will battle with this element
                </div>

                <!-- Bot difficulty picker (single-player only) -->
                <div v-if="gameStore.gameMode === 'single'" class="difficulty-picker">
                  <span class="dp-label">Difficulty</span>
                  <div class="dp-pills">
                    <button
                      v-for="diff in difficulties"
                      :key="diff.value"
                      class="dp-pill"
                      :class="[diff.value, { active: gameStore.botDifficulty === diff.value }]"
                      @click="setDifficulty(diff.value)"
                    >
                      <span class="dp-icon">{{ diff.icon }}</span>
                      <span>{{ diff.label }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pass device prompt for local 2P -->
            <div v-if="gameStore.gameMode === 'local' && localSelectionStep === 1 && player1Element" class="pass-device-prompt">
              <p>✅ Player 1 has chosen their element.</p>
              <button class="btn btn-primary pass-device-btn" @click="advanceToPlayer2Selection">
                👋 Pass to Player 2 →
              </button>
            </div>

            <button
              class="start-btn-cozy"
              :disabled="!player1Element || !player2Element"
              @click="goToDeckBuilding"
              v-if="gameStore.gameMode === 'single' || (gameStore.gameMode === 'local' && localSelectionStep === 2)"
            >
              <span v-if="player1Element && player2Element">Next: Build Decks →</span>
              <span v-else>Pick elements for both players</span>
            </button>
          </template>

          <!-- Element selection for ONLINE -->
          <template v-if="gameStore.gameMode === 'online'">
            <div class="element-section">
              <div class="element-panel" :class="{ chosen: myOnlineElement }">
                <div class="ep-header">
                  <span class="ep-tag">{{ isHost ? '🏠' : '🔗' }}</span>
                  <span class="ep-name">{{ isHost ? 'You (Host)' : 'You (Guest)' }}</span>
                  <span v-if="myOnlineElement" class="ep-chosen-mini">{{ getElementEmoji(myOnlineElement) }}</span>
                </div>
                <div class="element-grid">
                  <button
                    v-for="element in elements"
                    :key="element"
                    class="element-card"
                    :class="[element, { selected: myOnlineElement === element }]"
                    @click="selectOnlineElement(element)"
                  >
                    <span class="ec-icon">{{ getElementEmoji(element) }}</span>
                    <span class="ec-label">{{ t(`elements.${element}`) }}</span>
                  </button>
                </div>
              </div>

              <div class="vs-badge-cozy">VS</div>

              <div class="element-panel waiting" :class="{ chosen: opponentOnlineElement }">
                <div class="ep-header">
                  <span class="ep-tag">👤</span>
                  <span class="ep-name">Opponent</span>
                </div>
                <!-- Don't reveal WHICH element the opponent picked — only that they're ready -->
                <div v-if="opponentOnlineElement" class="opp-chosen">
                  <span class="opp-chosen-emoji">🎴</span>
                  <span class="opp-chosen-label">Element chosen</span>
                  <span class="opp-chosen-ready">✅ Ready</span>
                </div>
                <div v-else class="opp-waiting">
                  <div class="wait-spinner-small"></div>
                  <span>Waiting for opponent...</span>
                </div>
              </div>
            </div>

            <button
              class="start-btn-cozy"
              :disabled="!myOnlineElement || !opponentOnlineElement"
              @click="goToDeckBuilding"
            >
              <span v-if="myOnlineElement && opponentOnlineElement">Next: Build Decks →</span>
              <span v-else-if="!myOnlineElement">Pick your element</span>
              <span v-else>Waiting for opponent...</span>
            </button>
          </template>
        </div>
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
            v-if="!myDeckConfirmed"
            :player-num="isHost ? 1 : 2"
            :player-label="isHost ? 'Your Deck (Host)' : 'Your Deck'"
            :element="isHost ? player1Element! : player2Element!"
            @confirm="handleOnlineDeckConfirm"
          />
          <div v-if="myDeckConfirmed" class="waiting-for-opponent">
            <div class="wait-spinner"></div>
            <span>Waiting for opponent to finish building...</span>
            <span class="wait-hint">Game will start automatically once both players are ready</span>
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
        <!-- Mulligan banner -->
        <div v-if="canShowMulligan" class="mulligan-banner">
          <span class="mb-icon">🔄</span>
          <span class="mb-text">
            <strong>Mulligan available!</strong>
            No basic Pokémon in hand — redraw 5 cards?
          </span>
          <button class="mb-btn" @click="handleMulligan">Redraw</button>
        </div>

        <!-- Connection status (online only) -->
        <div v-if="isOnline" class="connection-bar">
          <span class="conn-dot" :class="mpStore.connectionStatus"></span>
          <span class="conn-label">{{ isMyTurn ? '⚔️ Your Turn' : '⏳ Opponent\'s Turn' }}</span>
        </div>

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
          :player-element="displayMyPlayer.element"
          :opponent="displayOpponent"
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

        <!-- Online mode: rematch flow -->
        <template v-if="isOnline && mpStore.isOnline">
          <div v-if="mpStore.rematchPending" class="rematch-section">
            <p class="rematch-info">🎮 Opponent wants a rematch!</p>
            <button class="btn btn-primary" @click="handleAcceptRematch">✅ Accept Rematch</button>
            <button class="btn btn-secondary" @click="resetGame">🚪 Leave</button>
          </div>
          <div v-else-if="mpStore.rematchRequested" class="rematch-section">
            <div class="waiting-indicator">
              <div class="wait-spinner"></div>
              <span>Waiting for opponent to accept...</span>
            </div>
            <button class="btn btn-secondary" @click="resetGame">🚪 Leave</button>
          </div>
          <div v-else class="rematch-section">
            <button class="btn btn-primary" @click="handleRequestRematch">🔄 Rematch</button>
            <button class="btn btn-secondary" @click="resetGame">🚪 Leave</button>
          </div>
        </template>

        <!-- Local/single mode: simple play again -->
        <template v-else>
          <button class="btn btn-primary" @click="resetGame">{{ t('playAgain') }}</button>
        </template>
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
import { useI18n } from 'vue-i18n'
import { useGameStore } from './stores/gameStore'
import { useMultiplayerStore } from './stores/multiplayerStore'
import { playBotTurn } from './services/botLogic'
import { peerService } from './services/peerService'
import ActivePlayerBoard from './components/ActivePlayerBoard.vue'
import DeckEditor from './components/DeckEditor.vue'
import CardTooltip from './components/CardTooltip.vue'
import MultiplayerLobby from './components/MultiplayerLobby.vue'
import type { ElementType, Card } from './types'
import { getElementEmoji } from './utils/gameUtils'
import { soundService } from './services/soundService'

const { t } = useI18n()
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
const localSelectionStep = ref(1) // For local 2P: 1 = P1 picks, 2 = P2 picks

const elements: ElementType[] = ['fire', 'water', 'grass', 'electric', 'psychic', 'fighting']

const difficulties = [
  { value: 'easy' as const, label: 'Easy', icon: '😊' },
  { value: 'medium' as const, label: 'Medium', icon: '🎯' },
  { value: 'hard' as const, label: 'Hard', icon: '🔥' },
]

function setDifficulty(level: 'easy' | 'medium' | 'hard') {
  gameStore.setBotDifficulty(level)
  soundService.play('click')
}

// Mulligan: only show on turn 1, only for player 1, and only if they can mulligan
const canShowMulligan = computed(() => {
  if (gameStore.gamePhase !== 'playing') return false
  if (gameStore.turnNumber !== 1) return false
  if (gameStore.currentTurn !== 1) return false
  return gameStore.canMulligan(gameStore.player1)
})

function handleMulligan() {
  soundService.play('click')
  gameStore.performMulligan(1)
}

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
  soundService.play('click')
  gameStore.setGameMode('online')
  gameStore.gamePhase = 'lobby'
}

function handleSetMode(mode: 'single' | 'local') {
  soundService.play('click')
  gameStore.setGameMode(mode)
  // Reset element selections when switching modes
  player1Element.value = null
  player2Element.value = null
  localSelectionStep.value = 1
}

function handleLobbyProceed() {
  // Host moves to setup and tells guest to do the same
  gameStore.gamePhase = 'setup'
  peerService.send({ type: 'DECK_PHASE', payload: { hostElement: '' as any } })
}

function handleLobbyBack() {
  gameStore.setGameMode('local')
  gameStore.gamePhase = 'setup'
  localSelectionStep.value = 1
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
  soundService.play('select')
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
  soundService.play('select')
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
  localSelectionStep.value = 1
  location.reload()
}

function handleRequestRematch() {
  mpStore.requestRematch()
}

function handleAcceptRematch() {
  mpStore.acceptRematch()
  // Reset local UI state for rematch
  player1Element.value = null
  player2Element.value = null
  myDeckConfirmed.value = false
}

// Watch for rematch reset (when remote side accepts our request)
watch(() => gameStore.gamePhase, (newPhase, oldPhase) => {
  if (oldPhase === 'ended' && newPhase === 'setup' && isOnline.value) {
    // Rematch was accepted, reset local UI
    player1Element.value = null
    player2Element.value = null
    myDeckConfirmed.value = false
  }
})

function advanceToPlayer2Selection() {
  localSelectionStep.value = 2
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

// ===== Persistence =====
const hasSave = ref(gameStore.hasSavedGame())

// Auto-save on every game state change
watch(
  () => [
    gameStore.gamePhase,
    gameStore.turnNumber,
    gameStore.currentTurn,
    gameStore.player1.hand.length,
    gameStore.player1.bank.length,
    gameStore.player1.deck.length,
    gameStore.player2.hand.length,
    gameStore.player2.deck.length,
    gameStore.player1.score,
    gameStore.player2.score,
  ],
  () => {
    if (gameStore.gamePhase === 'playing' && gameStore.gameMode !== 'online') {
      gameStore.saveGame()
    }
    if (gameStore.gamePhase === 'ended') {
      gameStore.clearSavedGame()
    }
  }
)

// Persist settings (difficulty)
watch(() => gameStore.botDifficulty, (val) => {
  gameStore.saveSettings({ difficulty: val })
})

// Persist mute state
watch(isMuted, (val) => {
  gameStore.saveSettings({ muted: val })
})

// Restore mute on load
const savedSettings = gameStore.loadSettings()
if (savedSettings.muted) {
  if (!soundService.isMuted()) soundService.toggleMute()
  isMuted.value = true
}

function resumeGame() {
  soundService.play('start')
  if (gameStore.loadGame()) {
    hasSave.value = false
  }
}

function discardSave() {
  soundService.play('click')
  gameStore.clearSavedGame()
  hasSave.value = false
}

</script>

<style scoped>
/* ===== Setup Screen — Cozy Bento ===== */
.setup-screen.cozy {
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
  --de-psychic: #d8b4fe;
  --de-fighting: #fdba74;
  --de-shadow: rgba(45,38,32,0.08);
  --de-shadow-lg: rgba(45,38,32,0.15);

  background: var(--de-bg);
  color: var(--de-text);
  height: 100vh;
  height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow-y: auto;
  position: relative;
}

.setup-screen.cozy::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: radial-gradient(circle, rgba(245,130,174,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}

.setup-card {
  background: var(--de-bg-card);
  border: 1px solid var(--de-border);
  border-radius: 24px;
  padding: 24px;
  width: 100%;
  max-width: 980px;
  box-shadow: 0 4px 24px var(--de-shadow);
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}

/* Header */
.setup-header {
  text-align: center;
}

.setup-title-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.setup-emoji { font-size: 2rem; }

.setup-title {
  font-size: 1.6rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--de-accent), var(--de-plum));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.setup-tagline {
  font-size: 0.85rem;
  color: var(--de-text-soft);
  font-weight: 600;
}

/* Mode Tabs */
.mode-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: var(--de-bg-soft);
  padding: 8px;
  border-radius: 16px;
  border: 1px solid var(--de-border);
}

.mode-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 12px 8px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  color: var(--de-text);
  transition: all 0.2s;
}

.mode-tab:hover {
  background: rgba(255,255,255,0.5);
}

.mode-tab.active {
  background: white;
  border-color: var(--de-plum);
  box-shadow: 0 2px 8px var(--de-shadow);
}

.mode-tab.online-tab.active {
  border-color: var(--de-water);
}

.mt-icon { font-size: 1.4rem; }
.mt-label { font-size: 0.85rem; font-weight: 800; }
.mt-sub { font-size: 0.65rem; color: var(--de-text-soft); }

/* Resume banner */
.resume-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fef0d4, #fffaf0);
  border: 2px solid var(--de-accent);
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(245,130,174,0.2);
}

.resume-banner .rb-icon { font-size: 1.4rem; }

.resume-banner .rb-text {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--de-text);
}

.resume-banner .rb-btn {
  background: var(--de-plum);
  color: white;
  border: none;
  padding: 7px 16px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(94,84,142,0.4);
  transition: transform 0.15s;
}

.resume-banner .rb-btn:hover { transform: translateY(-1px); }

.resume-banner .rb-discard {
  background: transparent;
  border: 1px solid var(--de-border);
  color: var(--de-text-soft);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 800;
  font-family: inherit;
  transition: all 0.15s;
}

.resume-banner .rb-discard:hover {
  background: var(--de-border);
  color: var(--de-text);
}

@media (max-width: 480px) {
  .resume-banner { padding: 8px 10px; gap: 6px; }
  .resume-banner .rb-text { font-size: 0.75rem; }
  .resume-banner .rb-btn { padding: 6px 12px; font-size: 0.75rem; }
}

/* Element Section */
.element-section {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: stretch;
}

.element-panel {
  background: var(--de-bg-soft);
  border: 2px solid var(--de-border);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.25s;
  min-width: 0;
}

.element-panel.chosen {
  background: white;
  border-color: var(--de-water);
  box-shadow: 0 0 0 3px rgba(96,165,250,0.15);
}

.element-panel.chosen.bot {
  border-color: var(--de-fire);
  box-shadow: 0 0 0 3px rgba(251,113,133,0.15);
}

.element-panel.waiting {
  background: rgba(255,255,255,0.5);
  border-style: dashed;
}

.ep-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--de-border);
}

.ep-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 8px;
  background: var(--de-water);
  color: white;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.ep-tag.bot { background: var(--de-fire); }

.ep-name {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--de-text);
  flex: 1;
}

.ep-chosen-mini {
  font-size: 1.2rem;
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop-in {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

/* Element grid */
.element-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.element-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 6px;
  background: white;
  border: 2px solid var(--de-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  color: var(--de-text);
  position: relative;
  min-height: 68px;
}

.element-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--de-shadow);
}

.element-card .ec-icon {
  font-size: 1.5rem;
  transition: transform 0.2s;
}

.element-card:hover .ec-icon { transform: scale(1.15); }

.element-card .ec-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: capitalize;
  color: var(--de-text-soft);
}

/* Element-specific accent on hover */
.element-card.fire:hover { border-color: var(--de-fire); background: linear-gradient(180deg, white, #fff5f5); }
.element-card.water:hover { border-color: var(--de-water); background: linear-gradient(180deg, white, #f0f7ff); }
.element-card.grass:hover { border-color: var(--de-grass); background: linear-gradient(180deg, white, #f0fdf4); }
.element-card.electric:hover { border-color: var(--de-electric); background: linear-gradient(180deg, white, #fefce8); }
.element-card.psychic:hover { border-color: var(--de-psychic); background: linear-gradient(180deg, white, #faf5ff); }
.element-card.fighting:hover { border-color: var(--de-fighting); background: linear-gradient(180deg, white, #fff7ed); }

/* Selected state */
.element-card.selected {
  border-width: 2px;
}

.element-card.fire.selected { border-color: var(--de-fire); background: linear-gradient(180deg, #fff5f5, #ffe4e6); box-shadow: 0 0 0 3px rgba(251,113,133,0.2); }
.element-card.water.selected { border-color: var(--de-water); background: linear-gradient(180deg, #f0f7ff, #dbeafe); box-shadow: 0 0 0 3px rgba(96,165,250,0.2); }
.element-card.grass.selected { border-color: var(--de-grass); background: linear-gradient(180deg, #f0fdf4, #dcfce7); box-shadow: 0 0 0 3px rgba(134,239,172,0.3); }
.element-card.electric.selected { border-color: #facc15; background: linear-gradient(180deg, #fefce8, #fef9c3); box-shadow: 0 0 0 3px rgba(253,224,71,0.3); }
.element-card.psychic.selected { border-color: var(--de-psychic); background: linear-gradient(180deg, #faf5ff, #f3e8ff); box-shadow: 0 0 0 3px rgba(216,180,254,0.3); }
.element-card.fighting.selected { border-color: var(--de-fighting); background: linear-gradient(180deg, #fff7ed, #ffedd5); box-shadow: 0 0 0 3px rgba(253,186,116,0.3); }

.element-card.selected::after {
  content: "✓";
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  background: var(--de-text);
  color: white;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.element-card.selected .ec-label { color: var(--de-text); font-weight: 800; }

/* VS Badge */
.vs-badge-cozy {
  align-self: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--de-accent), var(--de-plum));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1rem;
  box-shadow: 0 4px 16px rgba(94,84,142,0.4);
  letter-spacing: 1px;
}

/* Bot hint */
.bot-hint-cozy {
  font-size: 0.7rem;
  color: var(--de-fire);
  background: rgba(251,113,133,0.1);
  padding: 6px 10px;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
}

/* Difficulty picker */
.difficulty-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--de-border);
}

.dp-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--de-text-soft);
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
}

.dp-pills {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.dp-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  background: white;
  border: 2px solid var(--de-border);
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--de-text);
  transition: all 0.2s;
}

.dp-pill:hover { transform: translateY(-1px); }

.dp-pill.easy.active { background: #f0fdf4; border-color: var(--de-grass); color: #15803d; }
.dp-pill.medium.active { background: #fefce8; border-color: #facc15; color: #a16207; }
.dp-pill.hard.active { background: #fff5f5; border-color: var(--de-fire); color: #be123c; box-shadow: 0 0 0 2px rgba(251,113,133,0.2); }

.dp-icon { font-size: 0.85rem; }

/* Online opponent */
.opp-chosen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
}

.opp-chosen-emoji { font-size: 2.4rem; }
.opp-chosen-label { font-size: 0.95rem; font-weight: 800; text-transform: capitalize; }
.opp-chosen-ready { font-size: 0.7rem; color: var(--de-grass); font-weight: 700; }

.opp-waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 8px;
  color: var(--de-text-soft);
  font-size: 0.75rem;
}

/* Start button */
.start-btn-cozy {
  background: linear-gradient(135deg, var(--de-plum), #7c5cb0);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 16px;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 16px rgba(94,84,142,0.4);
  transition: all 0.25s;
  align-self: center;
  min-width: 280px;
}

.start-btn-cozy:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(94,84,142,0.5);
}

.start-btn-cozy:active:not(:disabled) { transform: translateY(0); }

.start-btn-cozy:disabled {
  background: var(--de-bg-soft);
  color: var(--de-text-soft);
  box-shadow: none;
  cursor: not-allowed;
}

/* Mobile setup screen */
@media (max-width: 720px) {
  .setup-card {
    padding: 14px;
    border-radius: 18px;
    gap: 14px;
  }

  .setup-title { font-size: 1.2rem; }
  .setup-emoji { font-size: 1.5rem; }
  .setup-tagline { font-size: 0.75rem; }

  .mode-tab { padding: 8px 4px; }
  .mt-icon { font-size: 1.1rem; }
  .mt-label { font-size: 0.75rem; }
  .mt-sub { font-size: 0.55rem; }

  .element-section {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .vs-badge-cozy {
    width: 38px;
    height: 38px;
    font-size: 0.8rem;
    margin: 0 auto;
  }

  .element-panel {
    padding: 10px;
  }

  .element-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
  }

  .element-card {
    min-height: 58px;
    padding: 8px 4px;
  }

  .element-card .ec-icon { font-size: 1.2rem; }
  .element-card .ec-label { font-size: 0.55rem; }

  .start-btn-cozy {
    padding: 12px 24px;
    font-size: 0.9rem;
    min-width: auto;
    width: 100%;
  }
}

@media (max-width: 380px) {
  .element-grid { grid-template-columns: repeat(2, 1fr); }
}


/* Deck Building View */
.deck-building-view {
  display: flex;
  align-items: stretch;
  justify-content: center;
  height: 100vh;
  height: 100dvh;
  padding: 0;
  background: #fef6e4;
  overflow: hidden;
}

.deck-building-view > * {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Game View */
.game-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  position: relative;
}

/* Game Over */
.game-over-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  height: 100dvh;
  text-align: center;
  background: #fef6e4;
  color: #2d2620;
  gap: 16px;
  padding: 24px;
}

.game-over-screen h1 {
  font-size: 2.4rem;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #f582ae, #5e548e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.winner-text {
  font-size: 1.1rem;
  color: #8a7a6a;
  margin-bottom: 24px;
  font-weight: 600;
}

.game-over-screen .btn-primary {
  background: linear-gradient(135deg, #5e548e, #7c5cb0);
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 16px;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(94,84,142,0.4);
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
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #f3d2a4;
  color: #2d2620;
  font-size: 1.1rem;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(45,38,32,0.1);
}

.mute-btn:hover {
  background: white;
  transform: scale(1.05);
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

/* Mulligan banner */
.mulligan-banner {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #fffaf0, #fef0d4);
  border: 2px solid #f582ae;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(245,130,174,0.3);
  z-index: 200;
  max-width: 90vw;
}

.mulligan-banner .mb-icon { font-size: 1.4rem; }

.mulligan-banner .mb-text {
  font-size: 0.8rem;
  color: #2d2620;
  line-height: 1.3;
}

.mulligan-banner .mb-btn {
  background: #f582ae;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(245,130,174,0.4);
  transition: transform 0.15s;
}

.mulligan-banner .mb-btn:hover { transform: translateY(-1px); }

@media (max-width: 480px) {
  .mulligan-banner {
    flex-direction: column;
    text-align: center;
    gap: 6px;
    padding: 8px 12px;
  }
  .mulligan-banner .mb-text { font-size: 0.7rem; }
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

/* Rematch section */
.rematch-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.rematch-info {
  font-size: 1rem;
  font-weight: 700;
  color: var(--de-text, #2d2620);
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.rematch-section .btn {
  padding: 12px 28px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.2s;
  min-width: 180px;
}

.rematch-section .btn-secondary {
  background: #f3d2a4;
  color: #2d2620;
}

.rematch-section .btn-secondary:hover {
  background: #eec48a;
  transform: translateY(-1px);
}

.rematch-section .waiting-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8a7a6a;
  font-size: 0.85rem;
}

/* Pass device prompt (local 2P) */
.pass-device-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 2px solid #86efac;
  border-radius: 16px;
  text-align: center;
}

.pass-device-prompt p {
  font-size: 0.9rem;
  font-weight: 700;
  color: #15803d;
  margin: 0;
}

.pass-device-btn {
  background: linear-gradient(135deg, #5e548e, #7c5cb0) !important;
  color: white !important;
  padding: 12px 24px !important;
  border-radius: 14px !important;
  font-weight: 800 !important;
  font-size: 0.9rem !important;
  border: none !important;
  cursor: pointer !important;
  box-shadow: 0 4px 16px rgba(94,84,142,0.4) !important;
  transition: all 0.2s !important;
}

.pass-device-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(94,84,142,0.5) !important;
}

/* Element hidden badge */
.element-hidden-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(94, 84, 142, 0.08);
  border-radius: 12px;
  color: #5e548e;
  font-weight: 700;
  font-size: 0.85rem;
}

/* Wait hint text */
.wait-hint {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  margin-top: 4px;
}
</style>
