import type { Card, ElementType } from '../types'

// ===== Sanitized types (hidden info stripped) =====

export interface SanitizedPlayer {
  id: number
  name: string
  isBot: boolean
  element: ElementType | null
  active: Card | null
  bank: Card[]
  energyZone: Card[]
  discardPile: Card[]
  score: number
  energyAttachedThisTurn: boolean
  // Hidden info replaced by counts
  handCount: number
  deckCount: number
  prizeCount: number
  // Full data only for "my" side
  hand?: Card[]
  deck?: Card[]
  prizeCards?: Card[]
}

export interface SanitizedGameState {
  currentTurn: 1 | 2
  turnNumber: number
  gamePhase: 'setup' | 'deckBuilding' | 'lobby' | 'playing' | 'ended'
  winner: string | null
  player1: SanitizedPlayer
  player2: SanitizedPlayer
  logs: string[]
}

// ===== Host → Guest messages =====

export interface GameStateUpdateMessage {
  type: 'GAME_STATE_UPDATE'
  payload: SanitizedGameState
}

export interface GameStartedMessage {
  type: 'GAME_STARTED'
  payload: SanitizedGameState
}

export interface GameOverMessage {
  type: 'GAME_OVER'
  payload: { winner: string }
}

export interface YourTurnMessage {
  type: 'YOUR_TURN'
  payload: { turnNumber: number }
}

export interface WaitTurnMessage {
  type: 'WAIT_TURN'
  payload: Record<string, never>
}

export interface DeckPhaseMessage {
  type: 'DECK_PHASE'
  payload: { hostElement: ElementType }
}

export interface HostReadyMessage {
  type: 'HOST_READY'
  payload: Record<string, never>
}

export interface LogEntryMessage {
  type: 'LOG_ENTRY'
  payload: { message: string }
}

export interface VfxTriggerMessage {
  type: 'VFX_TRIGGER'
  payload: { type: string; target: string; timestamp: number }
}

export interface ErrorMessage {
  type: 'ERROR'
  payload: { message: string }
}

export interface PingMessage {
  type: 'PING'
  payload: { timestamp: number }
}

export interface PongMessage {
  type: 'PONG'
  payload: { timestamp: number }
}

// ===== Guest → Host messages =====

export interface SelectElementMessage {
  type: 'SELECT_ELEMENT'
  payload: { element: ElementType }
}

export interface ConfirmDeckMessage {
  type: 'CONFIRM_DECK'
  payload: { pokemon: Card[] }
}

export interface PlayCardMessage {
  type: 'PLAY_CARD'
  payload: { cardUniqueId: string }
}

export interface AttackMessage {
  type: 'ATTACK'
  payload: { attackIndex: number }
}

export interface EvolveMessage {
  type: 'EVOLVE'
  payload: { evolverUniqueId: string; targetUniqueId: string }
}

export interface EndTurnMessage {
  type: 'END_TURN'
  payload: Record<string, never>
}

export interface PromoteBenchMessage {
  type: 'PROMOTE_BENCH'
  payload: { cardUniqueId: string }
}

export interface GuestReadyMessage {
  type: 'GUEST_READY'
  payload: { name: string }
}

export interface GuestDeckReadyMessage {
  type: 'GUEST_DECK_READY'
  payload: Record<string, never>
}

// ===== Union type =====

export type HostMessage =
  | GameStateUpdateMessage
  | GameStartedMessage
  | GameOverMessage
  | YourTurnMessage
  | WaitTurnMessage
  | DeckPhaseMessage
  | HostReadyMessage
  | LogEntryMessage
  | VfxTriggerMessage
  | ErrorMessage
  | PingMessage
  | PongMessage

export type GuestMessage =
  | SelectElementMessage
  | ConfirmDeckMessage
  | PlayCardMessage
  | AttackMessage
  | EvolveMessage
  | EndTurnMessage
  | PromoteBenchMessage
  | GuestReadyMessage
  | GuestDeckReadyMessage
  | PingMessage
  | PongMessage

export type GameMessage = HostMessage | GuestMessage
