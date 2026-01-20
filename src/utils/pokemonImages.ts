// Pokemon sprite URL helper using PokeAPI
// The PokeAPI provides sprites at predictable URLs based on Pokemon ID

// Map of Pokemon names to their Pokedex IDs
const POKEMON_IDS: Record<string, number> = {
    // Fire
    charmander: 4,
    vulpix: 37,
    growlithe: 58,
    ponyta: 77,
    magmar: 126,
    flareon: 136,
    cyndaquil: 155,
    torchic: 255,
    chimchar: 390,
    litten: 725,

    // Water
    squirtle: 7,
    psyduck: 54,
    magikarp: 129,
    poliwag: 60,
    tentacool: 72,
    seel: 86,
    krabby: 98,
    horsea: 116,
    staryu: 120,
    totodile: 158,

    // Grass
    bulbasaur: 1,
    oddish: 43,
    bellsprout: 69,
    exeggcute: 102,
    tangela: 114,
    chikorita: 152,
    treecko: 252,
    turtwig: 387,
    snivy: 495,
    chespin: 650,

    // Electric
    pikachu: 25,
    magnemite: 81,
    voltorb: 100,
    electabuzz: 125,
    jolteon: 135,
    zapdos: 145,
    mareep: 179,
    elekid: 239,
    plusle: 311,
    pachirisu: 417
}

/**
 * Get the official artwork URL for a Pokemon
 * Uses the PokeAPI's raw GitHub sprites repository
 */
export function getPokemonImageUrl(name: string): string {
    const pokemonId = POKEMON_IDS[name.toLowerCase()]

    if (!pokemonId) {
        console.warn(`Pokemon ID not found for: ${name}`)
        return ''
    }

    // Official artwork (higher quality, larger images)
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
}

/**
 * Get the sprite URL for a Pokemon (smaller, pixel art style)
 */
export function getPokemonSpriteUrl(name: string): string {
    const pokemonId = POKEMON_IDS[name.toLowerCase()]

    if (!pokemonId) {
        console.warn(`Pokemon ID not found for: ${name}`)
        return ''
    }

    // Regular front sprite
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`
}

/**
 * Get the animated sprite URL for a Pokemon (if available)
 */
export function getPokemonAnimatedSpriteUrl(name: string): string {
    const pokemonId = POKEMON_IDS[name.toLowerCase()]

    if (!pokemonId) {
        return ''
    }

    // Animated GIF sprites (Gen 5 style)
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`
}
