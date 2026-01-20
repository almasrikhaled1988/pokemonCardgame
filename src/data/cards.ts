export const POKEMON_DATA = {
    fire: [
        { id: 'f1', name: 'Charmander', hp: 50, element: 'fire', stage: 'basic', attacks: [{ name: 'Scratch', damage: 10, energyCost: 1 }, { name: 'Ember', damage: 30, energyCost: 2 }] },
        { id: 'f1-1', name: 'Charmeleon', hp: 80, element: 'fire', stage: 'stage1', evolvesFrom: 'Charmander', attacks: [{ name: 'Flamethrower', damage: 50, energyCost: 3 }] },
        { id: 'f1-2', name: 'Charizard', hp: 120, element: 'fire', stage: 'stage2', evolvesFrom: 'Charmeleon', attacks: [{ name: 'Fire Blast', damage: 100, energyCost: 4 }] },
        { id: 'f2', name: 'Vulpix', hp: 50, element: 'fire', stage: 'basic', attacks: [{ name: 'Tail Whip', damage: 0, energyCost: 1 }, { name: 'Flame Tail', damage: 20, energyCost: 2 }] },
        { id: 'f2-1', name: 'Ninetales', hp: 90, element: 'fire', stage: 'stage1', evolvesFrom: 'Vulpix', attacks: [{ name: 'Fire Blast', damage: 70, energyCost: 3 }] },
        { id: 'f3', name: 'Growlithe', hp: 60, element: 'fire', stage: 'basic', attacks: [{ name: 'Bite', damage: 20, energyCost: 1 }, { name: 'Flamethrower', damage: 50, energyCost: 3 }] },
        { id: 'f3-1', name: 'Arcanine', hp: 100, element: 'fire', stage: 'stage1', evolvesFrom: 'Growlithe', attacks: [{ name: 'Extreme Speed', damage: 80, energyCost: 3 }] },
        { id: 'f4', name: 'Ponyta', hp: 60, element: 'fire', stage: 'basic', attacks: [{ name: 'Stomp', damage: 20, energyCost: 2 }, { name: 'Fire Spin', damage: 40, energyCost: 3 }] }
    ],
    water: [
        { id: 'w1', name: 'Squirtle', hp: 60, element: 'water', stage: 'basic', attacks: [{ name: 'Tackle', damage: 10, energyCost: 1 }, { name: 'Water Gun', damage: 20, energyCost: 2 }] },
        { id: 'w1-1', name: 'Wartortle', hp: 80, element: 'water', stage: 'stage1', evolvesFrom: 'Squirtle', attacks: [{ name: 'Hydro Pump', damage: 40, energyCost: 3 }] },
        { id: 'w1-2', name: 'Blastoise', hp: 130, element: 'water', stage: 'stage2', evolvesFrom: 'Wartortle', attacks: [{ name: 'Hydro Cannon', damage: 90, energyCost: 4 }] },
        { id: 'w2', name: 'Psyduck', hp: 60, element: 'water', stage: 'basic', attacks: [{ name: 'Scratch', damage: 10, energyCost: 1 }, { name: 'Water Pulse', damage: 30, energyCost: 2 }] },
        { id: 'w2-1', name: 'Golduck', hp: 90, element: 'water', stage: 'stage1', evolvesFrom: 'Psyduck', attacks: [{ name: 'Hyper Beam', damage: 60, energyCost: 3 }] },
        { id: 'w3', name: 'Magikarp', hp: 30, element: 'water', stage: 'basic', attacks: [{ name: 'Splash', damage: 0, energyCost: 1 }, { name: 'Flail', damage: 10, energyCost: 1 }] },
        { id: 'w3-1', name: 'Gyarados', hp: 130, element: 'water', stage: 'stage1', evolvesFrom: 'Magikarp', attacks: [{ name: 'Dragon Rage', damage: 50, energyCost: 3 }, { name: 'Hydro Pump', damage: 100, energyCost: 4 }] },
        { id: 'w4', name: 'Poliwag', hp: 50, element: 'water', stage: 'basic', attacks: [{ name: 'Bubble', damage: 10, energyCost: 1 }, { name: 'Water Gun', damage: 20, energyCost: 2 }] }
    ],
    grass: [
        { id: 'g1', name: 'Bulbasaur', hp: 60, element: 'grass', stage: 'basic', attacks: [{ name: 'Tackle', damage: 10, energyCost: 1 }, { name: 'Vine Whip', damage: 30, energyCost: 2 }] },
        { id: 'g1-1', name: 'Ivysaur', hp: 80, element: 'grass', stage: 'stage1', evolvesFrom: 'Bulbasaur', attacks: [{ name: 'Solar Beam', damage: 60, energyCost: 3 }] },
        { id: 'g1-2', name: 'Venusaur', hp: 140, element: 'grass', stage: 'stage2', evolvesFrom: 'Ivysaur', attacks: [{ name: 'Frenzy Plant', damage: 100, energyCost: 4 }] },
        { id: 'g2', name: 'Oddish', hp: 50, element: 'grass', stage: 'basic', attacks: [{ name: 'Absorb', damage: 10, energyCost: 1 }, { name: 'Acid', damage: 20, energyCost: 2 }] },
        { id: 'g2-1', name: 'Gloom', hp: 80, element: 'grass', stage: 'stage1', evolvesFrom: 'Oddish', attacks: [{ name: 'Poison Powder', damage: 30, energyCost: 2 }] },
        { id: 'g3', name: 'Bellsprout', hp: 50, element: 'grass', stage: 'basic', attacks: [{ name: 'Vine Whip', damage: 10, energyCost: 1 }, { name: 'Razor Leaf', damage: 30, energyCost: 2 }] },
        { id: 'g3-1', name: 'Weepinbell', hp: 70, element: 'grass', stage: 'stage1', evolvesFrom: 'Bellsprout', attacks: [{ name: 'Acid', damage: 40, energyCost: 2 }] }
    ],
    electric: [
        { id: 'e1', name: 'Pikachu', hp: 50, element: 'electric', stage: 'basic', attacks: [{ name: 'Quick Attack', damage: 10, energyCost: 1 }, { name: 'Thunderbolt', damage: 40, energyCost: 3 }] },
        { id: 'e1-1', name: 'Raichu', hp: 90, element: 'electric', stage: 'stage1', evolvesFrom: 'Pikachu', attacks: [{ name: 'Thunder Bolt', damage: 60, energyCost: 3 }, { name: 'Thunder', damage: 100, energyCost: 4 }] },
        { id: 'e2', name: 'Magnemite', hp: 40, element: 'electric', stage: 'basic', attacks: [{ name: 'Thundershock', damage: 10, energyCost: 1 }, { name: 'Spark', damage: 20, energyCost: 2 }] },
        { id: 'e2-1', name: 'Magneton', hp: 80, element: 'electric', stage: 'stage1', evolvesFrom: 'Magnemite', attacks: [{ name: 'Tri-Attack', damage: 40, energyCost: 2 }, { name: 'Thunder', damage: 80, energyCost: 4 }] },
        { id: 'e3', name: 'Voltorb', hp: 50, element: 'electric', stage: 'basic', attacks: [{ name: 'Tackle', damage: 10, energyCost: 1 }, { name: 'Self Destruct', damage: 80, energyCost: 3 }] },
        { id: 'e3-1', name: 'Electrode', hp: 80, element: 'electric', stage: 'stage1', evolvesFrom: 'Voltorb', attacks: [{ name: 'Swift', damage: 30, energyCost: 2 }, { name: 'Explosion', damage: 100, energyCost: 4 }] }
    ]
}

export const TRAINER_CARDS = [
    { id: 't1', name: 'Potion', type: 'item', description: 'Heal 30 HP' },
    { id: 't2', name: 'Switch', type: 'item', description: 'Switch Active with Bench' }
]
