import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { peerService } from '../services/peerService'
import { useGameStore } from './gameStore'
import type { ConnectionStatus, PlayerRole, ElementType } from '../types'
import type { GameMessage, SanitizedGameState } from '../types/gameMessages'
import { sanitizeStateForGuest } from '../utils/stateSanitizer'

export const useMultiplayerStore = defineStore('multiplayer', () => {
  // Connection state
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const roomCode = ref<string | null>(null)
  const playerRole = ref<PlayerRole>(null)
  const opponentName = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)
  const guestElement = ref<ElementType | null>(null)
  const hostElement = ref<ElementType | null>(null)
  const guestDeckConfirmed = ref(false)
  const hostDeckConfirmed = ref(false)

  // Computed
  const isOnline = computed(() => connectionStatus.value === 'connected')
  const isHost = computed(() => playerRole.value === 'host')
  const isGuest = computed(() => playerRole.value === 'guest')

  /**
   * HOST: Create a room and wait for guest.
   */
  async function createRoom() {
    connectionStatus.value = 'connecting'
    errorMessage.value = null

    try {
      // Setup message handler before creating room
      peerService.clearHandlers()
      peerService.onMessage(handleMessage)
      peerService.onConnected = () => {
        connectionStatus.value = 'connected'
        console.log('[MultiplayerStore] Guest connected!')
      }
      peerService.onDisconnected = () => {
        connectionStatus.value = 'disconnected'
        handleDisconnect()
      }
      peerService.onError = (err) => {
        connectionStatus.value = 'error'
        errorMessage.value = err.message
      }

      const code = await peerService.createRoom()
      roomCode.value = code
      playerRole.value = 'host'
      // Sync to gameStore so isMyTurn works
      const gameStore = useGameStore()
      gameStore.playerRole = 'host'
      connectionStatus.value = 'disconnected' // Waiting for guest (not "connected" yet)
      console.log('[MultiplayerStore] Room created:', code)
    } catch (err: any) {
      connectionStatus.value = 'error'
      errorMessage.value = err.message || 'Failed to create room'
    }
  }

  /**
   * GUEST: Join a room by code.
   */
  async function joinRoom(code: string) {
    connectionStatus.value = 'connecting'
    errorMessage.value = null

    try {
      peerService.clearHandlers()
      peerService.onMessage(handleMessage)
      peerService.onConnected = () => {
        connectionStatus.value = 'connected'
      }
      peerService.onDisconnected = () => {
        connectionStatus.value = 'disconnected'
        handleDisconnect()
      }
      peerService.onError = (err) => {
        connectionStatus.value = 'error'
        errorMessage.value = err.message
      }

      await peerService.joinRoom(code)
      roomCode.value = code
      playerRole.value = 'guest'
      // Sync to gameStore so isMyTurn works
      const gameStore = useGameStore()
      gameStore.playerRole = 'guest'
      gameStore.setGameMode('online')
      connectionStatus.value = 'connected'

      // Tell host we're here
      peerService.send({
        type: 'GUEST_READY',
        payload: { name: 'Player 2' }
      })
    } catch (err: any) {
      connectionStatus.value = 'error'
      errorMessage.value = err.message || 'Failed to join room'
    }
  }

  /**
   * Handle incoming messages (both host and guest).
   */
  function handleMessage(msg: GameMessage) {
    const gameStore = useGameStore()

    switch (msg.type) {
      // === Guest receives from Host ===
      case 'GAME_STATE_UPDATE':
        if (isGuest.value) {
          // Make sure the guest is flagged as an online player so the
          // board picks the correct "my" side when rendering.
          if (gameStore.gameMode !== 'online') gameStore.setGameMode('online')
          applyRemoteState(msg.payload)
        }
        break

      case 'GAME_STARTED':
        if (isGuest.value) {
          console.log('[MultiplayerStore] GAME_STARTED received. Switching guest to playing board.')
          // Ensure game mode is set before applying state
          gameStore.setGameMode('online')
          gameStore.gamePhase = 'playing'
          applyRemoteState(msg.payload)
          console.log('[MultiplayerStore] After GAME_STARTED: phase=', gameStore.gamePhase, 'myActive=', gameStore.player2.active?.name, 'handCount=', gameStore.player2.hand.length)
        }
        break

      case 'GAME_OVER':
        if (isGuest.value) {
          gameStore.gamePhase = 'ended'
          gameStore.winner = msg.payload.winner
        }
        break

      case 'VFX_TRIGGER':
        if (isGuest.value) {
          gameStore.activeVfx = {
            type: msg.payload.type as any,
            target: msg.payload.target as any,
            timestamp: msg.payload.timestamp
          }
          setTimeout(() => {
            gameStore.activeVfx = null
          }, 1000)
        }
        break

      case 'DECK_PHASE': {
        if (isGuest.value) {
          // Check if payload has hostElement — means go to setup
          const payload = msg.payload as any
          if (payload.phase === 'deckBuilding') {
            // Move to deck building
            gameStore.gamePhase = 'deckBuilding'
          } else {
            // Move to setup (element selection)
            gameStore.setGameMode('online')
            gameStore.gamePhase = 'setup'
          }
        }
        break
      }

      // === Host receives from Guest ===
      case 'GUEST_READY':
        if (isHost.value) {
          opponentName.value = msg.payload.name
          connectionStatus.value = 'connected'
        }
        break

      case 'SELECT_ELEMENT':
        if (isHost.value) {
          guestElement.value = msg.payload.element
          gameStore.setPlayerElement(2, msg.payload.element)
        }
        break

      case 'HOST_READY': {
        // Host sent their element to guest
        const hrPayload = msg.payload as any
        if (isGuest.value && hrPayload && hrPayload.element) {
          hostElement.value = hrPayload.element as ElementType
          gameStore.setPlayerElement(1, hrPayload.element as ElementType)
        }
        break
      }

      case 'CONFIRM_DECK':
        if (isHost.value) {
          gameStore.setCustomDeck(2, msg.payload.pokemon)
          guestDeckConfirmed.value = true
          // If host is also ready, start the game
          if (hostDeckConfirmed.value) {
            startOnlineGame()
          }
        }
        break

      case 'PLAY_CARD':
        if (isHost.value && gameStore.currentTurn === 2) {
          const card = gameStore.player2.hand.find(
            c => c.uniqueId === msg.payload.cardUniqueId
          )
          if (card) {
            gameStore.playCardFromHand(card)
            broadcastState()
          }
        }
        break

      case 'ATTACK':
        if (isHost.value && gameStore.currentTurn === 2) {
          gameStore.attack(msg.payload.attackIndex)
          broadcastState()
        }
        break

      case 'END_TURN':
        if (isHost.value && gameStore.currentTurn === 2) {
          gameStore.endTurn()
          broadcastState()
        }
        break

      case 'EVOLVE':
        if (isHost.value && gameStore.currentTurn === 2) {
          // Find the evolver in hand and target on board
          const evolver = gameStore.player2.hand.find(
            c => c.uniqueId === msg.payload.evolverUniqueId
          )
          if (evolver) {
            // Set pending evolution
            gameStore.playCardFromHand(evolver)
            // Find target
            const allBoard = [
              gameStore.player2.active,
              ...gameStore.player2.bank
            ].filter(Boolean)
            const target = allBoard.find(
              c => c?.uniqueId === msg.payload.targetUniqueId
            )
            if (target) {
              gameStore.evolvePokemon(target)
            }
          }
          broadcastState()
        }
        break

      case 'PROMOTE_BENCH':
        if (isHost.value && gameStore.currentTurn === 2) {
          const benchCard = gameStore.player2.bank.find(
            c => c.uniqueId === msg.payload.cardUniqueId
          )
          if (benchCard) {
            gameStore.promoteBenchPokemon(benchCard)
          }
          broadcastState()
        }
        break

      case 'REMATCH_REQUEST':
        // Other side wants a rematch
        rematchPending.value = true
        break

      case 'REMATCH_ACCEPT':
        // Other side accepted our rematch request
        rematchRequested.value = false
        resetForRematch()
        break

      default:
        console.log('[MultiplayerStore] Unhandled message type:', (msg as any).type)
    }
  }

  /**
   * HOST: Broadcast sanitized state to guest.
   */
  function broadcastState() {
    if (!isHost.value) return
    const gameStore = useGameStore()

    const sanitized = sanitizeStateForGuest(
      gameStore.player1,
      gameStore.player2,
      gameStore.currentTurn,
      gameStore.turnNumber,
      gameStore.gamePhase as any,
      gameStore.winner,
      gameStore.logs
    )

    peerService.send({
      type: 'GAME_STATE_UPDATE',
      payload: sanitized
    })
  }

  /**
   * Build a safe "face-down" placeholder card. Used to represent the
   * opponent's hidden zones (hand/deck/prizes) by count without leaking
   * real card data — and without ever being `null`, so the UI can never
   * crash if it accidentally iterates one of these arrays.
   */
  function makeHiddenCards(count: number): any[] {
    const out: any[] = []
    for (let i = 0; i < count; i++) {
      out.push({
        id: `hidden-${i}`,
        uniqueId: `hidden-${i}-${Math.random().toString(36).slice(2, 8)}`,
        name: 'Hidden',
        type: 'pokemon',
        hp: 0,
        currentHp: 0,
        attacks: [],
        attachedEnergy: [],
        statusEffects: []
      })
    }
    return out
  }

  /**
   * GUEST: Apply sanitized state from host.
   */
  function applyRemoteState(state: SanitizedGameState) {
    const gameStore = useGameStore()

    // Defensive: make sure the guest is always flagged as an online guest
    // so the board renders "my" (player2) side rather than the opponent.
    if (gameStore.gameMode !== 'online') gameStore.setGameMode('online')
    if (gameStore.playerRole !== 'guest') gameStore.playerRole = 'guest'

    gameStore.currentTurn = state.currentTurn
    gameStore.turnNumber = state.turnNumber
    gameStore.gamePhase = state.gamePhase as any
    gameStore.winner = state.winner
    gameStore.logs = [...state.logs]

    // Update Player 1 (host = opponent for guest)
    const p1 = gameStore.player1
    p1.active = state.player1.active
    p1.bank = state.player1.bank
    p1.energyZone = state.player1.energyZone
    p1.discardPile = state.player1.discardPile
    p1.score = state.player1.score
    p1.energyAttachedThisTurn = state.player1.energyAttachedThisTurn
    p1.element = state.player1.element
    p1.name = state.player1.name
    // Hidden zones → safe face-down placeholders (count preserved, never null)
    p1.hand = makeHiddenCards(state.player1.handCount)
    p1.deck = makeHiddenCards(state.player1.deckCount)
    p1.prizeCards = makeHiddenCards(state.player1.prizeCount)

    // Update Player 2 (guest = self) — full data
    const p2 = gameStore.player2
    p2.active = state.player2.active
    p2.bank = state.player2.bank
    p2.energyZone = state.player2.energyZone
    p2.discardPile = state.player2.discardPile
    p2.score = state.player2.score
    p2.energyAttachedThisTurn = state.player2.energyAttachedThisTurn
    p2.element = state.player2.element
    p2.name = state.player2.name
    p2.hand = state.player2.hand ?? []
    p2.deck = state.player2.deck ?? []
    p2.prizeCards = state.player2.prizeCards ?? []
  }

  /**
   * HOST: Start the online game after both players confirmed decks.
   */
  function startOnlineGame() {
    const gameStore = useGameStore()
    gameStore.startGame()

    const buildSnapshot = () => sanitizeStateForGuest(
      gameStore.player1,
      gameStore.player2,
      gameStore.currentTurn,
      gameStore.turnNumber,
      gameStore.gamePhase as any,
      gameStore.winner,
      gameStore.logs
    )

    // Send the initial GAME_STARTED so the guest switches to the board.
    peerService.send({
      type: 'GAME_STARTED',
      payload: buildSnapshot()
    })

    // Safety net: the guest's board sometimes needs a fresh full-state
    // update to render (the same update a host turn would send). Send a
    // couple of follow-up snapshots so the guest never sits on a blank
    // screen waiting for the host to act.
    setTimeout(() => {
      peerService.send({ type: 'GAME_STATE_UPDATE', payload: buildSnapshot() })
    }, 300)
    setTimeout(() => {
      peerService.send({ type: 'GAME_STATE_UPDATE', payload: buildSnapshot() })
    }, 900)
  }

  /**
   * HOST: Mark host deck as confirmed, start if guest also ready.
   */
  function hostConfirmDeck() {
    hostDeckConfirmed.value = true
    if (guestDeckConfirmed.value) {
      startOnlineGame()
    }
  }

  /**
   * GUEST: Send action to host instead of modifying state locally.
   */
  function sendAction(msg: GameMessage) {
    if (!isGuest.value) return
    peerService.send(msg)
  }

  // Rematch state
  const rematchRequested = ref(false)
  const rematchPending = ref(false)

  /**
   * Request a rematch (either side can initiate).
   */
  function requestRematch() {
    rematchRequested.value = true
    peerService.send({ type: 'REMATCH_REQUEST', payload: {} })
  }

  /**
   * Accept a rematch request.
   */
  function acceptRematch() {
    rematchPending.value = false
    peerService.send({ type: 'REMATCH_ACCEPT', payload: {} })
    resetForRematch()
  }

  /**
   * Reset game state for a rematch while keeping the connection alive.
   */
  function resetForRematch() {
    const gameStore = useGameStore()
    // Reset game state but keep connection and roles
    gameStore.gamePhase = 'setup'
    gameStore.winner = null
    gameStore.currentTurn = 1
    gameStore.turnNumber = 1
    gameStore.logs = []
    gameStore.pendingEvolution = null
    gameStore.activeVfx = null

    // Reset player states (keep names and element as null for re-selection)
    const resetPlayer = (p: any) => {
      p.element = null
      p.deck = []
      p.hand = []
      p.active = null
      p.bank = []
      p.energyZone = []
      p.discardPile = []
      p.prizeCards = []
      p.energyAttachedThisTurn = false
      p.evolutionsThisTurn = 0
      p.score = 0
    }
    resetPlayer(gameStore.player1)
    resetPlayer(gameStore.player2)

    // Reset deck confirmed flags
    guestDeckConfirmed.value = false
    hostDeckConfirmed.value = false
    guestElement.value = null
    hostElement.value = null
    rematchRequested.value = false
    rematchPending.value = false
  }

  /**
   * Handle disconnection.
   */
  function handleDisconnect() {
    const gameStore = useGameStore()
    if (gameStore.gamePhase === 'playing') {
      // Game was in progress — end it
      gameStore.gamePhase = 'ended'
      gameStore.winner = 'Connection Lost'
    }
  }

  /**
   * Full cleanup.
   */
  function disconnect() {
    peerService.disconnect()
    connectionStatus.value = 'disconnected'
    roomCode.value = null
    playerRole.value = null
    opponentName.value = null
    errorMessage.value = null
    guestElement.value = null
    guestDeckConfirmed.value = false
    hostDeckConfirmed.value = false
    rematchRequested.value = false
    rematchPending.value = false
    // Also reset gameStore role
    const gameStore = useGameStore()
    gameStore.playerRole = null
  }

  return {
    // State
    connectionStatus,
    roomCode,
    playerRole,
    opponentName,
    errorMessage,
    guestElement,
    hostElement,
    guestDeckConfirmed,
    hostDeckConfirmed,
    rematchRequested,
    rematchPending,
    // Computed
    isOnline,
    isHost,
    isGuest,
    // Actions
    createRoom,
    joinRoom,
    disconnect,
    broadcastState,
    sendAction,
    hostConfirmDeck,
    startOnlineGame,
    handleMessage,
    requestRematch,
    acceptRematch,
    resetForRematch
  }
})
