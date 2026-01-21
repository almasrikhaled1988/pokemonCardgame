export function getElementEmoji(element: string) {
    const emojis: Record<string, string> = {
        fire: '🔥',
        water: '💧',
        grass: '🌿',
        electric: '⚡',
        psychic: '🔮',
        fighting: '👊',
        normal: '⚪'
    }
    return emojis[element] || '❓'
}
