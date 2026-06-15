import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createDeck, createStarterPokemon, createStarterEnergy, createPrizePool } from '../utils/deckBuilder'
import type { Player, ElementType, Card, GameMode, PlayerRole } from '../types'
import { soundService } from '../services/soundService'

export const useGameStore = defineStore('game', () => {
  // Game state
  const currentTurn = ref<1 | 2>(1)
  const gamePhase = ref<'setup' | 'deckBuilding' | 'lobby' | 'playing' | 'ended'>('setup')
  const turnNumber = ref(1)
  const winner = ref<string | null>(null)
  const pendingEvolution = ref<Card | null>(null)
  const gameMode = ref<GameMode>('local')
  const playerRole = ref<PlayerRole>(null)
  const logs = ref<string[]>([])
  const activeVfx = ref<{ type: ElementType | 'neutral'; target: 'player1' | 'player2'; timestamp: number } | null>(null)
  const hoveredCard = ref<Card | null>(null)
  const hoveredCardPosition = ref<{ x: number, y: number } | null>(null)
  const selectedCard = ref<Card | null>(null)

  // Player 1 state
  const player1 = ref<Player>({
    id: 1,
    name: 'Player 1',
    isBot: false,
    element: null,
    deck: [],
    hand: [],
    active: null,
    bank: [],
    energyZone: [],
    discardPile: [],
    prizeCards: [],
    energyAttachedThisTurn: false,
    evolutionsThisTurn: 0,
    score: 0
  })

  // Player 2 state
  const player2 = ref<Player>({
    id: 2,
    name: 'Player 2',
    isBot: false,
    element: null,
    deck: [],
    hand: [],
    active: null,
    bank: [],
    energyZone: [],
    discardPile: [],
    prizeCards: [],
    energyAttachedThisTurn: false,
    evolutionsThisTurn: 0,
    score: 0
  })

  // Get current player (whose turn it is)
  const currentPlayer = computed(() => {
    return currentTurn.value === 1 ? player1.value : player2.value
  })

  // Get opponent (of the current turn player)
  const opponent = computed(() => {
    return currentTurn.value === 1 ? player2.value : player1.value
  })

  // Online mode: "my" player (based on role, not turn)
  const myPlayer = computed(() => {
    if (gameMode.value !== 'online') return currentPlayer.value
    return playerRole.value === 'host' ? player1.value : player2.value
  })

  // Online mode: "remote" player
  const remotePlayer = computed(() => {
    if (gameMode.value !== 'online') return opponent.value
    return playerRole.value === 'host' ? player2.value : player1.value
  })

  // Online mode: is it my turn?
  const isMyTurn = computed(() => {
    if (gameMode.value !== 'online') return true
    const myId = playerRole.value === 'host' ? 1 : 2
    return currentTurn.value === myId
  })

  // Custom Deck Selections
  const player1CustomPokemon = ref<Card[]>([])
  const player2CustomPokemon = ref<Card[]>([])

  // Bot difficulty
  type BotDifficulty = 'easy' | 'medium' | 'hard'
  const botDifficulty = ref<BotDifficulty>('medium')

  function setBotDifficulty(level: BotDifficulty) {
    botDifficulty.value = level
  }

  // Actions
  function triggerVfx(type: ElementType | 'neutral', target: 'player1' | 'player2') {
    activeVfx.value = { type, target, timestamp: Date.now() }
    setTimeout(() => {
      activeVfx.value = null
    }, 1000)
  }

  // Floating damage numbers
  const damageNumbers = ref<Array<{ id: string; target: 'player1' | 'player2'; value: number; type: 'damage' | 'heal'; timestamp: number }>>([])

  function pushDamageNumber(target: 'player1' | 'player2', value: number, type: 'damage' | 'heal' = 'damage') {
    const id = Math.random().toString(36).slice(2, 9)
    damageNumbers.value.push({ id, target, value, type, timestamp: Date.now() })
    setTimeout(() => {
      damageNumbers.value = damageNumbers.value.filter(d => d.id !== id)
    }, 1400)
  }

  function addLog(message: string) {
    const turnLabel = `[T${turnNumber.value}] `
    logs.value.unshift(turnLabel + message)
    if (logs.value.length > 50) logs.value.pop()
  }

  function setGameMode(mode: GameMode) {
    gameMode.value = mode
    if (mode === 'single') {
      player2.value.isBot = true
      player2.value.name = 'Bot'
    } else if (mode === 'online') {
      player2.value.isBot = false
      player2.value.name = 'Opponent'
    } else {
      player2.value.isBot = false
      player2.value.name = 'Player 2'
    }
  }

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
    if (count > 0) soundService.play('draw')
    for (let i = 0; i < count; i++) {
      if (player.deck.length > 0) {
        const card = player.deck.pop()
        if (card) {
          player.hand.push(card)
        }
      }
    }
  }



  function endTurn() {
    // 1. Process Status Effects for current player (who is ending their turn)
    const player = currentPlayer.value
    if (player.active && player.active.statusEffects) {
      applyFinalStatusDamage(player)
    }

    addLog(`${player.name} ended their turn.`)

    // Reset flags
    player.energyAttachedThisTurn = false
    player.evolutionsThisTurn = 0

    // Switch turn
    currentTurn.value = currentTurn.value === 1 ? 2 : 1
    if (currentTurn.value === 1) {
      turnNumber.value++
    }

    startTurn()
  }

  function startTurn() {
    const player = currentPlayer.value
    const opp = opponent.value

    addLog(`Start of ${player.name}'s turn.`)

    // 1. Trigger "Turn Start" Abilities
    if (player.active?.ability?.effect === 'heal') {
      const healAmount = player.active.ability.value || 0
      player.active.currentHp = Math.min(player.active.hp || 0, (player.active.currentHp || 0) + healAmount)
      addLog(`${player.active.name} used ${player.active.ability.name} and healed ${healAmount} HP.`)
    }

    // 2. Draw card for next player at start of turn
    drawCard(player, 1)
  }

  function triggerOnPlayAbility(card: Card) {
    if (!card.ability) return
    const player = currentPlayer.value
    const opp = opponent.value

    addLog(`${card.name} activated ${card.ability.name}!`)

    switch (card.ability.effect) {
      case 'damage':
        if (opp.active) {
          const dmg = card.ability.value || 0
          opp.active.currentHp = Math.max(0, (opp.active.currentHp || 0) - dmg)
          addLog(`${opp.active.name} took ${dmg} damage.`)
          if (opp.active.currentHp <= 0) handleKnockout(opp)
        }
        break
      case 'draw':
        drawCard(player, card.ability.value || 0)
        break
      case 'status':
        if (opp.active) {
          opp.active.statusEffects = opp.active.statusEffects || []
          if (!opp.active.statusEffects.includes('paralyzed')) {
            opp.active.statusEffects.push('paralyzed')
            addLog(`${opp.active.name} is paralyzed!`)
          }
        }
        break
    }
  }

  function applyFinalStatusDamage(player: Player) {
    if (!player.active || !player.active.statusEffects) return

    let totalPeriodicDamage = 0
    if (player.active.statusEffects.includes('poisoned')) {
      totalPeriodicDamage += 10
      console.log(`${player.active.name} took 10 Poison damage`)
    }
    if (player.active.statusEffects.includes('burned')) {
      totalPeriodicDamage += 20
      console.log(`${player.active.name} took 20 Burn damage`)
    }

    if (totalPeriodicDamage > 0) {
      player.active.currentHp = Math.max(0, (player.active.currentHp || 0) - totalPeriodicDamage)
      addLog(`${player.active.name} took ${totalPeriodicDamage} status damage.`)
      if (player.active.currentHp <= 0) {
        handleKnockout(player)
      }
    }

    // Clear one-turn effects
    player.active.statusEffects = player.active.statusEffects.filter(e => {
      if (e === 'paralyzed') return false // Paralyze lasts 1 opponent turn
      if (e === 'asleep') {
        // 50% chance to wake up
        return Math.random() < 0.5
      }
      return true
    })
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
    // Starters are placed at turn 0 (before turn 1), so they can be evolved on turn 1
    player1.value.active.turnPlayed = 0
    player2.value.active.turnPlayed = 0

    // Reset evolution counters
    player1.value.evolutionsThisTurn = 0
    player2.value.evolutionsThisTurn = 0

    // Start with 1 Energy in Energy Zone
    player1.value.energyZone = [createStarterEnergy(player1.value.element)]
    player2.value.energyZone = [createStarterEnergy(player2.value.element)]

    // Setup Prize Cards (3 EXTRA random Pokémon from the pool as rewards)
    player1.value.prizeCards = createPrizePool(player1.value.element!, player1CustomPokemon.value)
    player2.value.prizeCards = createPrizePool(player2.value.element!, player2CustomPokemon.value)

    // Draw Initial Hands (5 cards since we already have starter pokemon)
    drawCard(player1.value, 5)
    drawCard(player2.value, 5)

    // Auto-mulligan for the bot if no basic in hand
    if (gameMode.value === 'single') {
      player2.value.isBot = true
      player2.value.name = 'Bot'
      autoMulligan(player2.value)
    }

    gamePhase.value = 'playing'
    turnNumber.value = 1
    currentTurn.value = 1
    logs.value = []
    addLog("Game started!")
    soundService.play('start')
  }

  // Player can redraw if their hand has no basic Pokémon (and no useful active to evolve from)
  function canMulligan(player: Player): boolean {
    const hasBasic = player.hand.some(c => c.type === 'pokemon' && (c.stage === 'basic' || !c.stage))
    return !hasBasic
  }

  function performMulligan(playerNum: 1 | 2) {
    const player = playerNum === 1 ? player1.value : player2.value
    if (!canMulligan(player)) return false

    // Reshuffle hand back into deck
    player.deck.push(...player.hand)
    player.hand = []
    // Shuffle
    for (let i = player.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = player.deck[i]!
      player.deck[i] = player.deck[j]!
      player.deck[j] = tmp
    }
    // Redraw 5
    drawCard(player, 5)
    addLog(`${player.name} mulliganed (no basic Pokémon).`)
    soundService.play('draw')
    return true
  }

  function autoMulligan(player: Player, maxAttempts = 3) {
    let attempts = 0
    while (canMulligan(player) && attempts < maxAttempts) {
      player.deck.push(...player.hand)
      player.hand = []
      for (let i = player.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = player.deck[i]!
        player.deck[i] = player.deck[j]!
        player.deck[j] = tmp
      }
      drawCard(player, 5)
      attempts++
    }
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
      // If it's an evolution card, check if there's a valid target on the board first
      if (card.stage === 'stage1' || card.stage === 'stage2') {
        // Max 2 evolutions per turn
        if (player.evolutionsThisTurn >= 2) {
          addLog(`Already evolved 2 times this turn! (max 2 per turn)`)
          soundService.play('error')
          return
        }
        const allBoardPokemon = [
          player.active,
          ...player.bank
        ].filter(Boolean)
        const hasValidTarget = allBoardPokemon.some(
          boardCard => boardCard?.name === card.evolvesFrom
        )
        if (!hasValidTarget) {
          addLog(`Can't evolve! No ${card.evolvesFrom} on the board.`)
          soundService.play('error')
          return
        }
        // Check if at least one valid target was NOT played this turn
        const hasSettledTarget = allBoardPokemon.some(
          boardCard => boardCard?.name === card.evolvesFrom && boardCard?.turnPlayed !== turnNumber.value
        )
        if (!hasSettledTarget) {
          addLog(`Can't evolve! ${card.evolvesFrom} was just played this turn.`)
          soundService.play('error')
          return
        }
        pendingEvolution.value = card
        return
      }

      // If Active is empty, must go to Active
      if (!player.active) {
        // Set currentHp when placing
        card.currentHp = card.hp
        card.stage = card.stage || 'basic'
        card.turnPlayed = turnNumber.value
        player.active = card
        player.hand.splice(cardIndex, 1)
        addLog(`${player.name} played ${card.name} as active.`)
        soundService.play('play-card')
        return
      }

      // Otherwise go to Bank (max 3)
      if (player.bank.length < 3) {
        // Set currentHp when placing
        card.currentHp = card.hp
        card.stage = card.stage || 'basic'
        card.turnPlayed = turnNumber.value
        player.bank.push(card)
        player.hand.splice(cardIndex, 1)
        addLog(`${player.name} benched ${card.name}.`)
        soundService.play('play-card')
        return
      }

      // Bench is full — silently reject (UI/bot can check first)
      addLog(`${player.name}'s bench is full.`)
      return
    }

    // 2. Handle Energy
    if (card.type === 'energy') {
      if (player.energyAttachedThisTurn) {
        addLog(`${player.name} already attached an energy this turn.`)
        return
      }

      player.energyZone.push(card)
      player.hand.splice(cardIndex, 1)
      player.energyAttachedThisTurn = true
      addLog(`${player.name} added ${card.element} energy.`)
      soundService.play('play-card')
    }

    // 3. Handle Trainer (Item & Supporter)
    if (card.type === 'item' || card.type === 'supporter') {
      if (card.name === 'Potion') {
        if (!player.active) {
          addLog("No active Pokémon to heal!")
          soundService.play('error')
          return
        }
        const before = player.active.currentHp || 0
        player.active.currentHp = Math.min(player.active.hp || 0, before + 30)
        const healed = (player.active.currentHp || 0) - before
        addLog(`${player.name} used Potion. Healed ${healed} HP.`)
        const target = player.id === 1 ? 'player1' : 'player2'
        pushDamageNumber(target, healed, 'heal')
        soundService.play('heal')
      } else if (card.name === 'Super Potion') {
        if (!player.active) {
          addLog("No active Pokémon to heal!")
          soundService.play('error')
          return
        }
        const before = player.active.currentHp || 0
        player.active.currentHp = Math.min(player.active.hp || 0, before + 60)
        const healed = (player.active.currentHp || 0) - before
        addLog(`${player.name} used Super Potion. Healed ${healed} HP.`)
        const target = player.id === 1 ? 'player1' : 'player2'
        pushDamageNumber(target, healed, 'heal')
        soundService.play('heal')
      } else if (card.name === 'Full Heal') {
        if (!player.active) {
          addLog("No active Pokémon!")
          soundService.play('error')
          return
        }
        const removed = player.active.statusEffects?.length || 0
        player.active.statusEffects = []
        if (removed > 0) {
          addLog(`${player.name} used Full Heal. Removed ${removed} status effect(s).`)
        } else {
          addLog(`${player.name} used Full Heal. No status to remove.`)
        }
        soundService.play('heal')
      } else if (card.name === 'Switch') {
        if (player.bank.length === 0) {
          addLog("No Pokémon on bench to switch with!")
          soundService.play('error')
          return
        }
        if (!player.active) {
          player.active = player.bank.shift() || null
        } else {
          const oldActive = player.active
          const benchMember = player.bank[0]
          if (benchMember) {
            player.active = benchMember
            player.bank[0] = oldActive
          }
        }
        addLog(`${player.name} switched their active Pokémon.`)
      } else if (card.name === 'Gust of Wind') {
        // Force opponent to swap active with first bench
        const oppPlayer = opponent.value
        if (!oppPlayer.bank || oppPlayer.bank.length === 0) {
          addLog("Opponent has no benched Pokémon to switch.")
          soundService.play('error')
          return
        }
        if (oppPlayer.active && oppPlayer.bank[0]) {
          const oldActive = oppPlayer.active
          oppPlayer.active = oppPlayer.bank[0]
          oppPlayer.bank[0] = oldActive
          addLog(`${player.name} used Gust of Wind! ${oppPlayer.name}'s active was switched.`)
        }
      } else if (card.name === 'Professor\'s Research') {
        // Discard rest of hand, draw 5
        const handToDiscard = player.hand.filter(c => c.uniqueId !== card.uniqueId)
        player.discardPile.push(...handToDiscard)
        player.hand = [card]
        drawCard(player, 5)
        addLog(`${player.name} played Professor's Research. Drew 5 cards.`)
      } else if (card.name === 'Bill') {
        drawCard(player, 2)
        addLog(`${player.name} played Bill and drew 2 cards.`)
      } else if (card.name === 'Pokéball') {
        // Search deck for first basic Pokémon
        const idx = player.deck.findIndex(c => c.type === 'pokemon' && (c.stage === 'basic' || !c.stage))
        if (idx === -1) {
          addLog("No basic Pokémon in deck.")
          soundService.play('error')
        } else {
          const found = player.deck.splice(idx, 1)[0]
          if (found) {
            player.hand.push(found)
            addLog(`${player.name} found ${found.name} with Pokéball.`)
            // Reshuffle remaining deck for fairness
            for (let i = player.deck.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              const tmp = player.deck[i]!
              player.deck[i] = player.deck[j]!
              player.deck[j] = tmp
            }
          }
        }
      } else if (card.name === 'Energy Search') {
        const idx = player.deck.findIndex(c => c.type === 'energy')
        if (idx === -1) {
          addLog("No energy cards in deck.")
          soundService.play('error')
        } else {
          const found = player.deck.splice(idx, 1)[0]
          if (found) {
            player.hand.push(found)
            addLog(`${player.name} found ${found.name}.`)
            for (let i = player.deck.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              const tmp = player.deck[i]!
              player.deck[i] = player.deck[j]!
              player.deck[j] = tmp
            }
          }
        }
      } else if (card.name === 'Energy Boost') {
        const elementToAdd = (player.element || 'fire') as ElementType
        player.energyZone.push({
          id: `boost-energy-${Date.now()}`,
          uniqueId: Math.random().toString(36).substr(2, 9),
          name: `${elementToAdd} Energy`,
          element: elementToAdd,
          type: 'energy'
        })
        addLog(`${player.name} used Energy Boost. +1 ${elementToAdd} energy.`)
        soundService.play('energy')
      }

      // Discard the trainer card after use (find it again since hand might have changed)
      const finalHandIndex = player.hand.findIndex(c => c.uniqueId === card.uniqueId)
      if (finalHandIndex !== -1) {
        const playedCard = player.hand[finalHandIndex]
        if (playedCard) {
          player.discardPile.push(playedCard)
          player.hand.splice(finalHandIndex, 1)
        }
      }
      soundService.play('play-card')
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

    // 0. Check Status Effects
    if (activePokemon.statusEffects?.includes('paralyzed')) {
      addLog(`${activePokemon.name} is paralyzed and cannot attack!`)
      soundService.play('error')
      endTurn()
      return
    }
    if (activePokemon.statusEffects?.includes('asleep')) {
      addLog(`${activePokemon.name} is asleep and cannot attack!`)
      soundService.play('error')
      endTurn()
      return
    }

    // Check Energy Cost (Using Energy Zone Pool)
    if (player.energyZone.length < selectedAttack.energyCost) {
      addLog(`Not enough energy! Need ${selectedAttack.energyCost}, have ${player.energyZone.length}`)
      soundService.play('error')
      return
    }

    // Deal Damage
    if (opp.active) {
      let finalDamage = selectedAttack.damage

      // Apply Type Advantages
      if (activePokemon.element && opp.active.weakness === activePokemon.element) {
        finalDamage *= 2
        console.log(`Weakness! Damage doubled to ${finalDamage}`)
      } else if (activePokemon.element && opp.active.resistance === activePokemon.element) {
        finalDamage = Math.max(0, finalDamage - 20)
        console.log(`Resistance! Damage reduced to ${finalDamage}`)
      }

      opp.active.currentHp = Math.max(0, (opp.active.currentHp || 0) - finalDamage)
      addLog(`${activePokemon.name} used ${selectedAttack.name} for ${finalDamage} damage!`)

      // Trigger VFX
      const targetSide = opp.id === 1 ? 'player1' : 'player2'
      triggerVfx((activePokemon.element as ElementType) || 'neutral', targetSide)
      soundService.playAttack((activePokemon.element as string) || 'normal')

      // Floating damage number on the hit Pokémon
      pushDamageNumber(targetSide, finalDamage, 'damage')
      // Small thud after the element sound
      setTimeout(() => soundService.play('damage'), 80)

      // Apply Secondary Effects
      if (selectedAttack.effect && Math.random() < (selectedAttack.effectChance || 1)) {
        opp.active.statusEffects = opp.active.statusEffects || []
        if (!opp.active.statusEffects.includes(selectedAttack.effect)) {
          opp.active.statusEffects.push(selectedAttack.effect)
          addLog(`${opp.active.name} is now ${selectedAttack.effect}!`)
        }
      }

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
      addLog(`${victim.active.name} was knocked out!`)
      victim.active.currentHp = 0
      victim.discardPile.push(victim.active)
      victim.active = null
      soundService.play('ko')
    }

    // 2. Attacker gains 1 point and draws a Prize Card
    const attacker = currentPlayer.value
    attacker.score += 1

    // Draw prize card
    if (attacker.prizeCards.length > 0) {
      const prizeCard = attacker.prizeCards.shift()
      if (prizeCard) {
        attacker.hand.push(prizeCard)
        addLog(`${attacker.name} drew a Prize Card!`)
        soundService.play('prize')
      }
    }

    console.log(`${attacker.name} scored! (${attacker.score}/3 points)`)

    // 3. Check Win Condition: First to 3 points wins
    if (attacker.score >= 3) {
      gamePhase.value = 'ended'
      winner.value = attacker.name
      // Play victory if the user won, otherwise defeat
      const userIsAttacker = (gameMode.value === 'online' ? attacker.id === myPlayer.value.id : attacker.id === 1)
      soundService.play(userIsAttacker ? 'victory' : 'defeat')
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
        const userIsAttacker = (gameMode.value === 'online' ? attacker.id === myPlayer.value.id : attacker.id === 1)
        soundService.play(userIsAttacker ? 'victory' : 'defeat')
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
      addLog("You already have an active Pokémon!")
      soundService.play('error')
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
      addLog(`${evolver.name} evolves from ${evolver.evolvesFrom}, not ${targetCard.name}.`)
      soundService.play('error')
      return
    }

    // Can't evolve a Pokémon that was played this turn
    if (targetCard.turnPlayed === turnNumber.value) {
      addLog(`Can't evolve ${targetCard.name} — it was just played this turn!`)
      soundService.play('error')
      pendingEvolution.value = null
      return
    }

    // Max 2 evolutions per turn
    if (player.evolutionsThisTurn >= 2) {
      addLog(`Already evolved 2 times this turn! (max 2 per turn)`)
      soundService.play('error')
      pendingEvolution.value = null
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
      addLog("Target Pokémon not found on board.")
      soundService.play('error')
      return
    }

    // Prepare the new evolved card
    const evolvedCard: Card = JSON.parse(JSON.stringify(evolver))
    evolvedCard.uniqueId = Math.random().toString(36).substr(2, 9)
    evolvedCard.attachedEnergy = targetCard.attachedEnergy || []
    // Preserve the original turnPlayed so the evolution inherits the "settled" status
    evolvedCard.turnPlayed = targetCard.turnPlayed

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

    // Increment evolution counter for this turn
    player.evolutionsThisTurn++

    // Reset pending
    pendingEvolution.value = null
    console.log(`Evolved ${targetCard.name} into ${evolvedCard.name}!`)
    soundService.play('evolve')
  }

  function cancelEvolution() {
    pendingEvolution.value = null
  }

  // ===== Persistence =====
  const STORAGE_KEY = 'pokecg_save_v1'
  const SETTINGS_KEY = 'pokecg_settings_v1'

  function saveGame() {
    if (typeof localStorage === 'undefined') return
    // Only persist single-player or local games (online games have their own sync)
    if (gameMode.value === 'online') return
    if (gamePhase.value !== 'playing') return
    try {
      const snapshot = {
        version: 1,
        timestamp: Date.now(),
        currentTurn: currentTurn.value,
        gamePhase: gamePhase.value,
        turnNumber: turnNumber.value,
        winner: winner.value,
        gameMode: gameMode.value,
        botDifficulty: botDifficulty.value,
        player1: JSON.parse(JSON.stringify(player1.value)),
        player2: JSON.parse(JSON.stringify(player2.value)),
        logs: logs.value.slice(0, 30),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch (e) {
      console.warn('Failed to save game:', e)
    }
  }

  function hasSavedGame(): boolean {
    if (typeof localStorage === 'undefined') return false
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw)
      return data && data.gamePhase === 'playing' && Date.now() - (data.timestamp || 0) < 24 * 60 * 60 * 1000
    } catch {
      return false
    }
  }

  function loadGame(): boolean {
    if (typeof localStorage === 'undefined') return false
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw)
      if (!data || data.version !== 1) return false
      if (data.gamePhase !== 'playing') return false

      currentTurn.value = data.currentTurn
      gamePhase.value = data.gamePhase
      turnNumber.value = data.turnNumber
      winner.value = data.winner
      gameMode.value = data.gameMode
      botDifficulty.value = data.botDifficulty || 'medium'
      player1.value = data.player1
      player2.value = data.player2
      logs.value = data.logs || []
      addLog('Game resumed from save.')
      return true
    } catch (e) {
      console.warn('Failed to load game:', e)
      return false
    }
  }

  function clearSavedGame() {
    if (typeof localStorage === 'undefined') return
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  // Settings persistence (mute, volume, locale, last difficulty)
  function saveSettings(partial: { muted?: boolean; volume?: number; locale?: string; difficulty?: BotDifficulty }) {
    if (typeof localStorage === 'undefined') return
    try {
      const existing = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...existing, ...partial }))
    } catch {}
  }

  function loadSettings(): { muted?: boolean; volume?: number; locale?: string; difficulty?: BotDifficulty } {
    if (typeof localStorage === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    } catch {
      return {}
    }
  }

  // Auto-save on key actions (debounced via watcher in component)
  // Load saved difficulty preference on init
  const savedSettings = loadSettings()
  if (savedSettings.difficulty) botDifficulty.value = savedSettings.difficulty

  return {
    currentTurn,
    gamePhase,
    turnNumber,
    winner,
    pendingEvolution,
    gameMode,
    playerRole,
    logs,
    activeVfx,
    damageNumbers,
    pushDamageNumber,
    hoveredCard,
    hoveredCardPosition,
    selectedCard,
    player1,
    player2,
    currentPlayer,
    opponent,
    myPlayer,
    remotePlayer,
    isMyTurn,
    setGameMode,
    setPlayerElement,
    setCustomDeck,
    canMulligan,
    performMulligan,
    botDifficulty,
    setBotDifficulty,
    saveGame,
    loadGame,
    hasSavedGame,
    clearSavedGame,
    saveSettings,
    loadSettings,
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
