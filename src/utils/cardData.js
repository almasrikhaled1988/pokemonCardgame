// Card data structures and deck generation

export const ELEMENTS = {
    FIRE: 'fire',
    WATER: 'water',
    GRASS: 'grass',
    ELECTRIC: 'electric'
}

// Pokemon data by element
export const POKEMON_DATA = {
    fire: [
        {
            name: 'Charmander', hp: 60, attacks: [
                { name: 'Scratch', damage: 10, energyCost: 1 },
                { name: 'Ember', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Vulpix', hp: 50, attacks: [
                { name: 'Tail Whip', damage: 10, energyCost: 1 },
                { name: 'Flamethrower', damage: 40, energyCost: 3 }
            ]
        },
        {
            name: 'Growlithe', hp: 70, attacks: [
                { name: 'Bite', damage: 20, energyCost: 1 },
                { name: 'Fire Fang', damage: 35, energyCost: 2 }
            ]
        },
        {
            name: 'Ponyta', hp: 60, attacks: [
                { name: 'Stomp', damage: 15, energyCost: 1 },
                { name: 'Flame Charge', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Magmar', hp: 80, attacks: [
                { name: 'Smog', damage: 20, energyCost: 1 },
                { name: 'Fire Punch', damage: 50, energyCost: 3 }
            ]
        },
        {
            name: 'Flareon', hp: 70, attacks: [
                { name: 'Quick Attack', damage: 15, energyCost: 1 },
                { name: 'Fire Blast', damage: 45, energyCost: 3 }
            ]
        },
        {
            name: 'Cyndaquil', hp: 50, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Flame Wheel', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Torchic', hp: 50, attacks: [
                { name: 'Peck', damage: 10, energyCost: 1 },
                { name: 'Fire Spin', damage: 35, energyCost: 2 }
            ]
        },
        {
            name: 'Chimchar', hp: 50, attacks: [
                { name: 'Scratch', damage: 10, energyCost: 1 },
                { name: 'Flare Blitz', damage: 40, energyCost: 3 }
            ]
        },
        {
            name: 'Tepig', hp: 60, attacks: [
                { name: 'Tackle', damage: 15, energyCost: 1 },
                { name: 'Heat Crash', damage: 35, energyCost: 2 }
            ]
        }
    ],
    water: [
        {
            name: 'Squirtle', hp: 60, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Water Gun', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Psyduck', hp: 60, attacks: [
                { name: 'Scratch', damage: 10, energyCost: 1 },
                { name: 'Confusion', damage: 25, energyCost: 2 }
            ]
        },
        {
            name: 'Magikarp', hp: 40, attacks: [
                { name: 'Splash', damage: 0, energyCost: 1 },
                { name: 'Tackle', damage: 20, energyCost: 2 }
            ]
        },
        {
            name: 'Staryu', hp: 50, attacks: [
                { name: 'Harden', damage: 10, energyCost: 1 },
                { name: 'Bubble Beam', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Lapras', hp: 90, attacks: [
                { name: 'Water Gun', damage: 20, energyCost: 1 },
                { name: 'Ice Beam', damage: 50, energyCost: 3 }
            ]
        },
        {
            name: 'Vaporeon', hp: 80, attacks: [
                { name: 'Quick Attack', damage: 15, energyCost: 1 },
                { name: 'Hydro Pump', damage: 45, energyCost: 3 }
            ]
        },
        {
            name: 'Totodile', hp: 60, attacks: [
                { name: 'Scratch', damage: 10, energyCost: 1 },
                { name: 'Aqua Tail', damage: 35, energyCost: 2 }
            ]
        },
        {
            name: 'Mudkip', hp: 50, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Water Pulse', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Piplup', hp: 60, attacks: [
                { name: 'Peck', damage: 10, energyCost: 1 },
                { name: 'Bubble', damage: 25, energyCost: 2 }
            ]
        },
        {
            name: 'Oshawott', hp: 60, attacks: [
                { name: 'Tackle', damage: 15, energyCost: 1 },
                { name: 'Razor Shell', damage: 35, energyCost: 2 }
            ]
        }
    ],
    grass: [
        {
            name: 'Bulbasaur', hp: 60, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Vine Whip', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Oddish', hp: 50, attacks: [
                { name: 'Absorb', damage: 10, energyCost: 1 },
                { name: 'Acid', damage: 25, energyCost: 2 }
            ]
        },
        {
            name: 'Bellsprout', hp: 50, attacks: [
                { name: 'Vine Whip', damage: 10, energyCost: 1 },
                { name: 'Razor Leaf', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Exeggcute', hp: 50, attacks: [
                { name: 'Barrage', damage: 15, energyCost: 1 },
                { name: 'Seed Bomb', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Tangela', hp: 70, attacks: [
                { name: 'Constrict', damage: 20, energyCost: 1 },
                { name: 'Power Whip', damage: 40, energyCost: 3 }
            ]
        },
        {
            name: 'Chikorita', hp: 60, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Razor Leaf', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Treecko', hp: 50, attacks: [
                { name: 'Pound', damage: 10, energyCost: 1 },
                { name: 'Energy Ball', damage: 35, energyCost: 2 }
            ]
        },
        {
            name: 'Turtwig', hp: 60, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Razor Leaf', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Snivy', hp: 50, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Leaf Tornado', damage: 35, energyCost: 2 }
            ]
        },
        {
            name: 'Leafeon', hp: 70, attacks: [
                { name: 'Quick Attack', damage: 15, energyCost: 1 },
                { name: 'Leaf Blade', damage: 45, energyCost: 3 }
            ]
        }
    ],
    electric: [
        {
            name: 'Pikachu', hp: 60, attacks: [
                { name: 'Thunder Shock', damage: 10, energyCost: 1 },
                { name: 'Thunderbolt', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Voltorb', hp: 50, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Spark', damage: 25, energyCost: 2 }
            ]
        },
        {
            name: 'Magnemite', hp: 50, attacks: [
                { name: 'Thunder Shock', damage: 10, energyCost: 1 },
                { name: 'Thunder Wave', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Electabuzz', hp: 70, attacks: [
                { name: 'Quick Attack', damage: 20, energyCost: 1 },
                { name: 'Thunder Punch', damage: 40, energyCost: 3 }
            ]
        },
        {
            name: 'Jolteon', hp: 70, attacks: [
                { name: 'Quick Attack', damage: 15, energyCost: 1 },
                { name: 'Thunder', damage: 45, energyCost: 3 }
            ]
        },
        {
            name: 'Zapdos', hp: 90, attacks: [
                { name: 'Peck', damage: 20, energyCost: 1 },
                { name: 'Thunder', damage: 50, energyCost: 3 }
            ]
        },
        {
            name: 'Mareep', hp: 50, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Thunder Shock', damage: 25, energyCost: 2 }
            ]
        },
        {
            name: 'Elekid', hp: 50, attacks: [
                { name: 'Quick Attack', damage: 10, energyCost: 1 },
                { name: 'Thunder Punch', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Shinx', hp: 50, attacks: [
                { name: 'Tackle', damage: 10, energyCost: 1 },
                { name: 'Spark', damage: 30, energyCost: 2 }
            ]
        },
        {
            name: 'Emolga', hp: 60, attacks: [
                { name: 'Quick Attack', damage: 15, energyCost: 1 },
                { name: 'Electro Ball', damage: 35, energyCost: 2 }
            ]
        }
    ]
}

// Trainer cards (same for all decks)
export const TRAINER_CARDS = [
    { name: 'Potion', effect: 'heal', value: 20 },
    { name: 'Switch', effect: 'switch', value: null },
    { name: 'Energy Search', effect: 'search-energy', value: 1 },
    { name: 'Professor\'s Research', effect: 'draw', value: 3 },
    { name: 'Great Ball', effect: 'search-pokemon', value: 1 }
]

// Generate a deck for a player
export function generateDeck(element) {
    const deck = []
    let cardId = 1

    // Add 10 Pokemon cards (random from the element's pool)
    const pokemonPool = [...POKEMON_DATA[element]]
    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * pokemonPool.length)
        const pokemon = pokemonPool[randomIndex]
        deck.push({
            id: `${element}-pokemon-${cardId++}`,
            type: 'pokemon',
            element: element,
            ...pokemon,
            currentHp: pokemon.hp,
            attachedEnergy: []
        })
    }

    // Add 10 Energy cards
    for (let i = 0; i < 10; i++) {
        deck.push({
            id: `${element}-energy-${cardId++}`,
            type: 'energy',
            element: element
        })
    }

    // Add 5 Trainer cards
    for (let i = 0; i < 5; i++) {
        const trainer = TRAINER_CARDS[i % TRAINER_CARDS.length]
        deck.push({
            id: `trainer-${cardId++}`,
            type: 'trainer',
            ...trainer
        })
    }

    return deck
}

// Shuffle deck
export function shuffleDeck(deck) {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

// Type advantage calculation
export function getTypeAdvantage(attackerElement, defenderElement) {
    const advantages = {
        fire: 'grass',
        grass: 'water',
        water: 'fire',
        electric: 'water'
    }

    return advantages[attackerElement] === defenderElement ? 20 : 0
}
