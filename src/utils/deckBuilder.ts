import { POKEMON_DATA, TRAINER_CARDS } from '../data/cards'
import type { Card, ElementType } from '../types'

// Starter Pokemon for each element
const STARTERS: Record<ElementType, { id: string; name: string; hp: number; attacks: { name: string; damage: number; energyCost: number; description?: string }[] }> = {
    fire: { id: 'starter-fire', name: 'Charmander', hp: 50, attacks: [{ name: 'Scratch', damage: 10, energyCost: 1, description: 'Slices with sharp claws.' }, { name: 'Ember', damage: 30, energyCost: 2, description: 'A small fire attack.' }] },
    water: { id: 'starter-water', name: 'Squirtle', hp: 60, attacks: [{ name: 'Tackle', damage: 10, energyCost: 1, description: 'Charges the opponent.' }, { name: 'Water Gun', damage: 20, energyCost: 2, description: 'Squirts water at high pressure.' }] },
    grass: { id: 'starter-grass', name: 'Bulbasaur', hp: 60, attacks: [{ name: 'Tackle', damage: 10, energyCost: 1, description: 'Charges the opponent.' }, { name: 'Vine Whip', damage: 30, energyCost: 2, description: 'Strikes with vines.' }] },
    electric: { id: 'starter-electric', name: 'Pikachu', hp: 50, attacks: [{ name: 'Quick Attack', damage: 10, energyCost: 1, description: 'Strikes with lightning speed.' }, { name: 'Thunderbolt', damage: 40, energyCost: 3, description: 'A powerful blast of electricity.' }] },
    psychic: { id: 'starter-psychic', name: 'Abra', hp: 40, attacks: [{ name: 'Teleport', damage: 0, energyCost: 1, description: 'Teleports away to safety.' }] },
    fighting: { id: 'starter-fighting', name: 'Machop', hp: 60, attacks: [{ name: 'Kick', damage: 20, energyCost: 1, description: 'A swift kick.' }, { name: 'Low Kick', damage: 30, energyCost: 2, description: 'A low sweeping kick.' }] }
}

export function createStarterPokemon(element: ElementType): Card {
    const starter = STARTERS[element]
    return {
        id: starter.id,
        uniqueId: Math.random().toString(36).substr(2, 9),
        name: starter.name,
        type: 'pokemon',
        element: element,
        hp: starter.hp,
        currentHp: starter.hp,
        attacks: [...starter.attacks],
        attachedEnergy: [],
        stage: 'basic'
    }
}

export function createStarterEnergy(element: ElementType): Card {
    return {
        id: `starter-energy-${element}`,
        uniqueId: Math.random().toString(36).substr(2, 9),
        name: `Starting ${capitalize(element)} Energy`,
        element: element,
        type: 'energy'
    }
}

export function createDeck(element: string, customPokemon?: Card[]): Card[] {
    const deck: Card[] = []

    if (customPokemon && customPokemon.length > 0) {
        // Use custom selected Pokemon
        customPokemon.forEach(card => {
            // Use JSON parse/stringify for safer cloning of Vue proxies
            const newCard = JSON.parse(JSON.stringify(card))
            newCard.type = 'pokemon'
            newCard.currentHp = newCard.hp
            newCard.attachedEnergy = []
            newCard.uniqueId = Math.random().toString(36).substr(2, 9)
            deck.push(newCard)
        })
    } else {
        // Get Pokemon for this element (excluding the starter to avoid duplicates)
        const pokemons = JSON.parse(JSON.stringify((POKEMON_DATA as Record<string, unknown[]>)[element])) as Card[]
        if (pokemons) {
            const starterName = STARTERS[element as ElementType]?.name
            pokemons.forEach(card => {
                if (card.name === starterName) return

                card.type = 'pokemon'
                card.currentHp = card.hp
                card.attachedEnergy = []
                card.uniqueId = Math.random().toString(36).substr(2, 9)
                deck.push(card)
            })
        }
    }

    // Add exactly 3 energy cards to the deck (total 4 per player including the starter)
    for (let i = 0; i < 3; i++) {
        deck.push({
            id: `energy-${element}-${i}`,
            uniqueId: Math.random().toString(36).substr(2, 9),
            name: `${capitalize(element)} Energy`,
            element: element,
            type: 'energy'
        })
    }

    // Add trainer cards
    const trainers = JSON.parse(JSON.stringify(TRAINER_CARDS)) as Card[]
    trainers.forEach((card) => {
        card.uniqueId = Math.random().toString(36).substr(2, 9)
        card.category = 'trainer'
        deck.push(card)
    })

    return shuffle(deck)
}

export function shuffle(deck: Card[]): Card[] {
    const newDeck = [...deck]
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = newDeck[i]!
        newDeck[i] = newDeck[j]!
        newDeck[j] = temp
    }
    return newDeck
}

export function createPrizePool(element: string, excludedCards: Card[]): Card[] {
    const prizes: Card[] = []
    const excludedIds = new Set(excludedCards.map(c => c.id))

    // Get all pokemon for this element
    const allPokemons = JSON.parse(JSON.stringify((POKEMON_DATA as Record<string, unknown[]>)[element])) as Card[]

    if (allPokemons) {
        // Filter out the ones already in the selected deck
        const availableForPrizes = allPokemons.filter(p => !excludedIds.has(p.id))

        // Shuffle and take 3
        const shuffled = shuffle(availableForPrizes)
        const selected = shuffled.slice(0, 3)

        selected.forEach(card => {
            card.type = 'pokemon'
            card.currentHp = card.hp
            card.attachedEnergy = []
            card.uniqueId = Math.random().toString(36).substr(2, 9)
            prizes.push(card)
        })
    }

    return prizes
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}
