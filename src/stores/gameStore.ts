import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createDeck, createStarterPokemon, createStarterEnergy } from '../utils/deckBuilder'
import type { Player, ElementType, Card } from '../types'

export const useGameStore = defineStore('game', () => {
  // Game state
  const currentTurn = ref<1 | 2>(1)
  const gamePhase = ref<'setup' | 'deckBuilding' | 'playing' | 'ended'>('setup')
  const turnNumber = ref(1)
  const winner = ref<string | null>(null)
  const pendingEvolution = ref<Card | null>(null)

  // Player 1 state
  const player1 = ref<Player>({
    id: 1,
    name: 'Player 1',
    element: null,
    deck: [],
    hand: [],
    active: null,
    bank: [],
    energyZone: [],
    discardPile: [],
    prizeCards: [],
    energyAttachedThisTurn: false,
    score: 0
  })

  // Player 2 state
  const player2 = ref<Player>({
    id: 2,
    name: 'Player 2',
    element: null,
    deck: [],
    hand: [],
    active: null,
    bank: [],
    energyZone: [],
    discardPile: [],
    prizeCards: [],
    energyAttachedThisTurn: false,
    score: 0
  })

  // Get current player
  const currentPlayer = computed(() => {
    return currentTurn.value === 1 ? player1.value : player2.value
  })

  // Get opponent
  const opponent = computed(() => {
    return currentTurn.value === 1 ? player2.value : player1.value
  })

  // Custom Deck Selections
  const player1CustomPokemon = ref<Card[]>([])
  const player2CustomPokemon = ref<Card[]>([])

  // Actions
  function setPlayerElement(playerNum: number, element: ElementType) {
    if (playerNum === 1) {
      player1.value.element = element
    } else {
      player2.value.element = element
    }
  }

  function setCustomDeck(playerNum: number, pokemon: Card[]) {
    if (playerNum === 1) {
      player1CustomPokemon.value = pokemon
    } else {
      player2CustomPokemon.value = pokemon
    }
  }

  function drawCard(player: Player, count = 1) {
    for (let i = 0; i < count; i++) {
      if (player.deck.length > 0) {
        const card = player.deck.pop()
        if (card) player.hand.push(card)
      }
    }
  }

  function setupPrizeCards(player: Player) {
    // Prize cards are still set aside (won't be used for winning, but keeps deck smaller)
    for (let i = 0; i < 3; i++) {
      if (player.deck.length > 0) {
        const card = player.deck.pop()
        if (card) player.prizeCards.push(card)
      }
    }
  }

  function endTurn() {
    // Reset flags
    currentPlayer.value.energyAttachedThisTurn = false

    // Switch turn
    currentTurn.value = currentTurn.value === 1 ? 2 : 1
    if (currentTurn.value === 1) {
      turnNumber.value++
    }

    // Draw card for next player at start of turn
    drawCard(currentPlayer.value, 1)
  }

  function startGame() {
    if (!player1.value.element || !player2.value.element) return

    // Reset scores
    player1.value.score = 0
    player2.value.score = 0
    winner.value = null

    // Generate Decks using custom selections if available
    player1.value.deck = createDeck(player1.value.element, player1CustomPokemon.value)
    player2.value.deck = createDeck(player2.value.element, player2CustomPokemon.value)

    // Set Starter Pokémon in Active position
    player1.value.active = createStarterPokemon(player1.value.element)
    player2.value.active = createStarterPokemon(player2.value.element)

    // Start with 1 Energy in Energy Zone
    player1.value.energyZone = [createStarterEnergy(player1.value.element)]
    player2.value.energyZone = [createStarterEnergy(player2.value.element)]

    // Setup Prize Cards (3 cards set aside)
    setupPrizeCards(player1.value)
    setupPrizeCards(player2.value)

    // Draw Initial Hands (5 cards since we already have starter pokemon)
    drawCard(player1.value, 5)
    drawCard(player2.value, 5)

    gamePhase.value = 'playing'
    turnNumber.value = 1
    currentTurn.value = 1
  }

  // --- Game Logic Actions ---

  function playCardFromHand(card: Card) {
    if (gamePhase.value !== 'playing') return
    const player = currentPlayer.value

    // Find card index
    const cardIndex = player.hand.findIndex(c => c.uniqueId === card.uniqueId)
    if (cardIndex === -1) return

    // 1. Handle Pokemon
    if (card.type === 'pokemon') {
      // If it's an evolution card, set pending evolution
      if (card.stage === 'stage1' || card.stage === 'stage2') {
        pendingEvolution.value = card
        return
      }

      // If Active is empty, must go to Active
      if (!player.active) {
        // Set currentHp when placing
        card.currentHp = card.hp
        card.stage = card.stage || 'basic'
        player.active = card
        player.hand.splice(cardIndex, 1)
        return
      }

      // Otherwise go to Bank (max 3)
      if (player.bank.length < 3) {
        // Set currentHp when placing
        card.currentHp = card.hp
        card.stage = card.stage || 'basic'
        player.bank.push(card)
        player.hand.splice(cardIndex, 1)
        return
      }

      alert("Bench is full! (max 3 Pokémon)")
    }

    // 2. Handle Energy
    if (card.type === 'energy') {
      if (player.energyAttachedThisTurn) {
        alert("You can only play one Energy card per turn!")
        return
      }

      player.energyZone.push(card)
      player.hand.splice(cardIndex, 1)
      player.energyAttachedThisTurn = true
    }

    // 3. Handle Trainer
    if (card.category === 'trainer') {
      if (card.name === 'Potion') {
        if (!player.active) {
          alert("No active Pokémon to heal!")
          return
        }
        player.active.currentHp = Math.min(player.active.hp || 0, (player.active.currentHp || 0) + 30)
        console.log(`Healed ${player.active.name} for 30 HP`)
      } else if (card.name === 'Switch') {
        if (player.bank.length === 0) {
          alert("No Pokémon on bench to switch with!")
          return
        }
        if (!player.active) {
          // If no active, just promote the first benched one
          player.active = player.bank.shift() || null
        } else {
          // Swap active and first bench member
          const oldActive = player.active
          const benchMember = player.bank[0]
          if (benchMember) {
            player.active = benchMember
            player.bank[0] = oldActive
          }
        }
        console.log("Switched active Pokémon!")
      }

      // Discard the trainer card after use
      player.discardPile.push({ ...card })
      player.hand.splice(cardIndex, 1)
    }
  }

  function attack(attackIndex: number) {
    if (gamePhase.value !== 'playing') return
    const player = currentPlayer.value
    const opp = opponent.value
    const activePokemon = player.active

    if (!activePokemon || !activePokemon.attacks) return

    const selectedAttack = activePokemon.attacks[attackIndex]
    if (!selectedAttack) return

    // Check Energy Cost (Using Energy Zone Pool)
    if (player.energyZone.length < selectedAttack.energyCost) {
      alert(`Not enough energy! Need ${selectedAttack.energyCost}, have ${player.energyZone.length}`)
      return
    }

    // Deal Damage
    if (opp.active) {
      opp.active.currentHp = (opp.active.currentHp || 0) - selectedAttack.damage
      console.log(`${activePokemon.name} used ${selectedAttack.name} for ${selectedAttack.damage} damage!`)

      // Check KO
      if (opp.active.currentHp <= 0) {
        handleKnockout(opp)
      }
    } else {
      console.log("No opponent active pokemon to attack")
    }

    // Only end turn if game hasn't ended
    if (gamePhase.value === 'playing') {
      endTurn()
    }
  }

  function handleKnockout(victim: Player) {
    // 1. Move Active to Discard
    if (victim.active) {
      victim.active.currentHp = 0
      victim.discardPile.push(victim.active)
      victim.active = null
    }

    // 2. Attacker gains 1 point and draws a Prize Card
    const attacker = currentPlayer.value
    attacker.score += 1

    // Draw prize card
    if (attacker.prizeCards.length > 0) {
      const prizeCard = attacker.prizeCards.shift()
      if (prizeCard) {
        attacker.hand.push(prizeCard)
        console.log(`${attacker.name} drew a Prize Card: ${prizeCard.name}!`)
      }
    }

    console.log(`${attacker.name} scored! (${attacker.score}/3 points)`)

    // 3. Check Win Condition: First to 3 points wins
    if (attacker.score >= 3) {
      gamePhase.value = 'ended'
      winner.value = attacker.name
      return
    }

    // 4. Victim must promote Bench pokemon OR play from hand
    if (victim.bank.length > 0) {
      // Auto-promote first benched Pokémon
      const promoted = victim.bank.shift()
      if (promoted) {
        victim.active = promoted
        console.log(`${victim.name} promoted ${promoted.name} to active!`)
      }
    } else {
      // Check if victim has any Pokemon in hand they can play
      const hasPokemonInHand = victim.hand.some(card => card.type === 'pokemon')

      if (!hasPokemonInHand) {
        // No bench, no active, no Pokemon in hand = total loss
        gamePhase.value = 'ended'
        winner.value = attacker.name
        console.log(`${attacker.name} wins! ${victim.name} has no Pokemon left!`)
      } else {
        // Victim will need to play a Pokemon from hand on their next turn
        console.log(`${victim.name} must play a Pokemon from hand!`)
      }
    }
  }

  function promoteBenchPokemon(card: Card) {
    const player = currentPlayer.value
    if (player.active) {
      alert("You already have an active Pokémon!")
      return
    }

    const benchIndex = player.bank.findIndex(c => c.uniqueId === card.uniqueId)
    if (benchIndex === -1) return

    const benchCard = player.bank[benchIndex]
    if (benchCard) {
      player.active = benchCard
      player.bank.splice(benchIndex, 1)
    }
  }

  function evolvePokemon(targetCard: Card) {
    if (!pendingEvolution.value) return
    const player = currentPlayer.value
    const evolver = pendingEvolution.value

    // Check if target matches evolvesFrom
    if (targetCard.name !== evolver.evolvesFrom) {
      alert(`This card evolves from ${evolver.evolvesFrom}, not ${targetCard.name}!`)
      return
    }

    // Find where target is
    let onBoard = false
    let isBank = false
    let bankIndex = -1

    if (player.active?.uniqueId === targetCard.uniqueId) {
      onBoard = true
    } else {
      bankIndex = player.bank.findIndex(c => c.uniqueId === targetCard.uniqueId)
      if (bankIndex !== -1) {
        onBoard = true
        isBank = true
      }
    }

    if (!onBoard) {
      alert("Target Pokémon not found on board!")
      return
    }

    // Prepare the new evolved card
    const evolvedCard: Card = JSON.parse(JSON.stringify(evolver))
    evolvedCard.uniqueId = Math.random().toString(36).substr(2, 9)
    evolvedCard.attachedEnergy = targetCard.attachedEnergy || []

    // Calculate new currentHp (maintaining damage)
    const damage = (targetCard.hp || 0) - (targetCard.currentHp || 0)
    evolvedCard.currentHp = Math.max(0, (evolvedCard.hp || 0) - damage)

    // Replace on board
    if (!isBank) {
      player.active = evolvedCard
    } else {
      player.bank[bankIndex] = evolvedCard
    }

    // Remove evolver from hand
    const handIndex = player.hand.findIndex(c => c.uniqueId === evolver.uniqueId)
    if (handIndex !== -1) {
      player.hand.splice(handIndex, 1)
    }

    // Reset pending
    pendingEvolution.value = null
    console.log(`Evolved ${targetCard.name} into ${evolvedCard.name}!`)
  }

  function cancelEvolution() {
    pendingEvolution.value = null
  }

  return {
    currentTurn,
    gamePhase,
    turnNumber,
    winner,
    pendingEvolution,
    player1,
    player2,
    currentPlayer,
    opponent,
    setPlayerElement,
    setCustomDeck,
    endTurn,
    startGame,
    drawCard,
    playCardFromHand,
    attack,
    promoteBenchPokemon,
    evolvePokemon,
    cancelEvolution
  }
})
