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
          applyRemoteState(msg.payload)
        }
        break

      case 'GAME_STARTED':
        if (isGuest.value) {
          gameStore.gamePhase = 'playing'
          applyRemoteState(msg.payload)
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
   * GUEST: Apply sanitized state from host.
   */
  function applyRemoteState(state: SanitizedGameState) {
    const gameStore = useGameStore()

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
    // Use counts for hidden zones — create placeholder arrays
    p1.hand = new Array(state.player1.handCount).fill(null) as any
    p1.deck = new Array(state.player1.deckCount).fill(null) as any
    p1.prizeCards = new Array(state.player1.prizeCount).fill(null) as any

    // Update Player 2 (guest = self) — full data
    const p2 = gameStore.player2
    p2.active = state.player2.active
    p2.bank = state.player2.bank
    p2.energyZone = state.player2.energyZone
    p2.discardPile = state.player2.discardPile
    p2.score = state.player2.score
    p2.energyAttachedThisTurn = state.player2.energyAttachedThisTurn
    if (state.player2.hand) p2.hand = state.player2.hand
    if (state.player2.deck) p2.deck = state.player2.deck
    if (state.player2.prizeCards) p2.prizeCards = state.player2.prizeCards
  }

  /**
   * HOST: Start the online game after both players confirmed decks.
   */
  function startOnlineGame() {
    const gameStore = useGameStore()
    gameStore.startGame()

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
      type: 'GAME_STARTED',
      payload: sanitized
    })
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
    handleMessage
  }
})
