class SoundManager {
    private sounds: Record<string, HTMLAudioElement> = {}
    private enabled: boolean = true

    constructor() {
        this.loadSounds()
    }

    private loadSounds() {
        const soundAssets: Record<string, string> = {
            draw: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Simple card draw
            attack: 'https://assets.mixkit.co/active_storage/sfx/2747/2747-preview.mp3', // Hit sound
            evolve: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Sparkle/Magic
            ko: 'https://assets.mixkit.co/active_storage/sfx/2534/2534-preview.mp3', // Defeat/Thud
            click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Menu click
            start: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3', // Achievement/Start
            fire: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Fire whoosh
            water: 'https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3', // Water splash
            grass: 'https://assets.mixkit.co/active_storage/sfx/2026/2026-preview.mp3', // Rustle
            electric: 'https://assets.mixkit.co/active_storage/sfx/2741/2741-preview.mp3', // Zap
            psychic: 'https://assets.mixkit.co/active_storage/sfx/2550/2550-preview.mp3', // Ethereal
            fighting: 'https://assets.mixkit.co/active_storage/sfx/2535/2535-preview.mp3' // Punch
        }

        for (const [key, url] of Object.entries(soundAssets)) {
            const audio = new Audio(url)
            audio.preload = 'auto'
            this.sounds[key] = audio
        }
    }

    play(soundName: string) {
        if (!this.enabled) return
        const sound = this.sounds[soundName]
        if (sound) {
            sound.currentTime = 0
            sound.play().catch(e => console.warn(`Sound play blocked: ${soundName}`, e))
        }
    }

    toggle() {
        this.enabled = !this.enabled
        return this.enabled
    }

    isEnabled() {
        return this.enabled
    }
}

export const soundManager = new SoundManager()
