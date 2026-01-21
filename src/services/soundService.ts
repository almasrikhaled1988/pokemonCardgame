export class SoundService {
    private sounds: Record<string, HTMLAudioElement> = {}
    private muted: boolean = false

    constructor() {
        this.preloadSounds()
    }

    private preloadSounds() {
        const soundFiles: Record<string, string> = {
            'attack-normal': '/sounds/attack-normal.mp3',
            'attack-fire': '/sounds/attack-fire.mp3',
            'attack-water': '/sounds/attack-water.mp3',
            'attack-grass': '/sounds/attack-grass.mp3',
            'attack-electric': '/sounds/attack-electric.mp3',
            'attack-psychic': '/sounds/attack-psychic.mp3',
            'attack-fighting': '/sounds/attack-fighting.mp3',
            'draw': '/sounds/draw.mp3',
            'play-card': '/sounds/play-card.mp3',
            'evolve': '/sounds/evolve.mp3',
            'victory': '/sounds/victory.mp3',
            'defeat': '/sounds/defeat.mp3'
        }

        for (const [key, path] of Object.entries(soundFiles)) {
            this.sounds[key] = new Audio(path)
            this.sounds[key].volume = 0.4 // Default volume
        }
    }

    play(soundKey: string) {
        if (this.muted) return
        const sound = this.sounds[soundKey]
        if (sound) {
            sound.currentTime = 0
            sound.play().catch(e => {
                // Ignore auto-play policy errors or missing files
                // console.warn('Audio play failed', e)
            })
        }
    }

    playAttack(element: string) {
        const key = `attack-${element}`
        if (this.sounds[key]) {
            this.play(key)
        } else {
            this.play('attack-normal')
        }
    }

    toggleMute() {
        this.muted = !this.muted
        return this.muted
    }

    isMuted() {
        return this.muted
    }
}

export const soundService = new SoundService()
