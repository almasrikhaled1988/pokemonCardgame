import type { Player } from '../types'
import type { SanitizedPlayer, SanitizedGameState } from '../types/gameMessages'

/**
 * Sanitize a player's state for sending to their OPPONENT.
 * Strips hand contents, deck order, and prize card details — sends only counts.
 */
function sanitizePlayerForOpponent(player: Player): SanitizedPlayer {
  return {
    id: player.id,
    name: player.name,
    isBot: player.isBot,
    element: player.element,
    active: player.active ? JSON.parse(JSON.stringify(player.active)) : null,
    bank: JSON.parse(JSON.stringify(player.bank)),
    energyZone: JSON.parse(JSON.stringify(player.energyZone)),
    discardPile: JSON.parse(JSON.stringify(player.discardPile)),
    score: player.score,
    energyAttachedThisTurn: player.energyAttachedThisTurn,
    // Hidden info → counts only
    handCount: player.hand.length,
    deckCount: player.deck.length,
    prizeCount: player.prizeCards.length
  }
}

/**
 * Sanitize a player's state for sending to THEMSELVES.
 * Includes full hand, deck, and prize cards.
 */
function sanitizePlayerForSelf(player: Player): SanitizedPlayer {
  return {
    id: player.id,
    name: player.name,
    isBot: player.isBot,
    element: player.element,
    active: player.active ? JSON.parse(JSON.stringify(player.active)) : null,
    bank: JSON.parse(JSON.stringify(player.bank)),
    energyZone: JSON.parse(JSON.stringify(player.energyZone)),
    discardPile: JSON.parse(JSON.stringify(player.discardPile)),
    score: player.score,
    energyAttachedThisTurn: player.energyAttachedThisTurn,
    handCount: player.hand.length,
    deckCount: player.deck.length,
    prizeCount: player.prizeCards.length,
    // Full data for self
    hand: JSON.parse(JSON.stringify(player.hand)),
    deck: JSON.parse(JSON.stringify(player.deck)),
    prizeCards: JSON.parse(JSON.stringify(player.prizeCards))
  }
}

/**
 * Create a sanitized game state snapshot to send to the GUEST (Player 2).
 * 
 * The guest sees:
 * - Their own full state (hand, deck, prizes)
 * - Host's public state only (active, bench, energy, discard, score + counts)
 */
export function sanitizeStateForGuest(
  player1: Player,
  player2: Player,
  currentTurn: 1 | 2,
  turnNumber: number,
  gamePhase: 'setup' | 'deckBuilding' | 'lobby' | 'playing' | 'ended',
  winner: string | null,
  logs: string[]
): SanitizedGameState {
  return {
    currentTurn,
    turnNumber,
    gamePhase,
    winner,
    player1: sanitizePlayerForOpponent(player1), // Host = opponent for guest
    player2: sanitizePlayerForSelf(player2),     // Guest = self
    logs: [...logs]
  }
}

/**
 * Create a sanitized game state for the HOST's own view.
 * Host sees their own full data, guest's data is stripped.
 * (Used for consistency if we need to hydrate from a snapshot.)
 */
export function sanitizeStateForHost(
  player1: Player,
  player2: Player,
  currentTurn: 1 | 2,
  turnNumber: number,
  gamePhase: 'setup' | 'deckBuilding' | 'lobby' | 'playing' | 'ended',
  winner: string | null,
  logs: string[]
): SanitizedGameState {
  return {
    currentTurn,
    turnNumber,
    gamePhase,
    winner,
    player1: sanitizePlayerForSelf(player1),       // Host = self
    player2: sanitizePlayerForOpponent(player2),   // Guest = opponent
    logs: [...logs]
  }
}
