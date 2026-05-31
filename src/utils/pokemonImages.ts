// Pokemon sprite URL helper using PokeAPI
// The PokeAPI provides sprites at predictable URLs based on Pokemon ID

// Map of Pokemon names to their Pokedex IDs
const POKEMON_IDS: Record<string, number> = {
    // Fire
    charmander: 4,
    charmeleon: 5,
    charizard: 6,
    vulpix: 37,
    ninetales: 38,
    growlithe: 58,
    arcanine: 59,
    ponyta: 77,
    rapidash: 78,
    magby: 240,
    magmar: 126,
    cyndaquil: 155,
    quilava: 156,
    typhlosion: 157,
    entei: 244,
    torchic: 255,
    combusken: 256,
    blaziken: 257,
    litten: 725,

    // Water
    squirtle: 7,
    wartortle: 8,
    blastoise: 9,
    psyduck: 54,
    golduck: 55,
    magikarp: 129,
    gyarados: 130,
    poliwag: 60,
    poliwhirl: 61,
    poliwrath: 62,
    seel: 86,
    dewgong: 87,
    lapras: 131,
    totodile: 158,
    croconaw: 159,
    feraligatr: 160,
    chinchou: 170,
    lanturn: 171,

    // Grass
    bulbasaur: 1,
    ivysaur: 2,
    venusaur: 3,
    oddish: 43,
    gloom: 44,
    vileplume: 45,
    bellsprout: 69,
    weepinbell: 70,
    victreebel: 71,
    exeggcute: 102,
    exeggutor: 103,
    tangela: 114,
    tangrowth: 465,
    celebi: 251,
    chikorita: 152,
    bayleef: 153,
    meganium: 154,

    // Electric
    pikachu: 25,
    raichu: 26,
    magnemite: 81,
    magneton: 82,
    voltorb: 100,
    electrode: 101,
    mareep: 179,
    flaaffy: 180,
    ampharos: 181,
    elekid: 239,
    electabuzz: 125,
    electivire: 466,
    raikou: 243,
    shinx: 403,
    luxio: 404,
    luxray: 405,
    pachirisu: 417,

    // Psychic
    abra: 63,
    kadabra: 64,
    alakazam: 65,
    gastly: 92,
    haunter: 93,
    gengar: 94,
    mewtwo: 150,
    mew: 151,
    drowzee: 96,
    hypno: 97,
    ralts: 280,
    kirlia: 281,
    gardevoir: 282,
    espeon: 196,
    slowpoke: 79,
    slowbro: 80,

    // Fighting
    machop: 66,
    machoke: 67,
    machamp: 68,
    mankey: 56,
    primeape: 57,
    onix: 95,
    geodude: 74,
    graveler: 75,
    golem: 76,
    hitmonlee: 106,
    hitmonchan: 107,
    tyrogue: 236,
    hitmontop: 237,
    riolu: 447,
    lucario: 448,
    cubone: 104,
    marowak: 105
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
