// Web Audio synthesized sound service - no asset files needed.
// Each sound is generated procedurally with oscillators, envelopes, and filters.

type SoundKey =
  | 'click' | 'hover' | 'select' | 'error'
  | 'draw' | 'play-card' | 'energy'
  | 'attack-fire' | 'attack-water' | 'attack-grass' | 'attack-electric' | 'attack-psychic' | 'attack-fighting' | 'attack-normal'
  | 'damage' | 'ko' | 'heal'
  | 'evolve' | 'prize' | 'turn-end'
  | 'victory' | 'defeat' | 'start'

class SoundService {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private muted = false
  private volume = 0.35
  private lastPlayTimes: Record<string, number> = {}

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      try {
        const Ctor = (window.AudioContext || (window as any).webkitAudioContext)
        this.ctx = new Ctor()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.value = this.volume
        this.masterGain.connect(this.ctx.destination)
      } catch (e) {
        return null
      }
    }
    // Resume on user gesture (browsers suspend until interaction)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  play(key: string) {
    if (this.muted) return
    const ctx = this.getCtx()
    if (!ctx || !this.masterGain) return

    // Throttle rapid-fire sounds (UI hover spam)
    const throttleable = ['hover', 'click']
    if (throttleable.includes(key)) {
      const last = this.lastPlayTimes[key] || 0
      if (ctx.currentTime - last < 0.06) return
      this.lastPlayTimes[key] = ctx.currentTime
    }

    const out = this.masterGain
    const now = ctx.currentTime

    switch (key as SoundKey) {
      case 'hover': this.tick(ctx, out, now, 1200, 0.04, 0.08); break
      case 'click': this.tick(ctx, out, now, 800, 0.08, 0.12); break
      case 'select': this.chord(ctx, out, now, [600, 900], 0.18, 0.18); break
      case 'error': this.errorBzz(ctx, out, now); break

      case 'draw': this.swoosh(ctx, out, now, 1600, 600, 0.18); break
      case 'play-card': this.tick(ctx, out, now, 500, 0.12, 0.14); break
      case 'energy': this.zap(ctx, out, now, 0.15, 'sine'); break

      case 'attack-fire': this.fireCrackle(ctx, out, now); break
      case 'attack-water': this.waterSplash(ctx, out, now); break
      case 'attack-grass': this.grassRustle(ctx, out, now); break
      case 'attack-electric': this.zap(ctx, out, now, 0.3, 'square'); break
      case 'attack-psychic': this.psychicWobble(ctx, out, now); break
      case 'attack-fighting': this.punch(ctx, out, now); break
      case 'attack-normal': this.punch(ctx, out, now, 200); break

      case 'damage': this.thud(ctx, out, now); break
      case 'ko': this.koTone(ctx, out, now); break
      case 'heal': this.heal(ctx, out, now); break

      case 'evolve': this.evolveSparkle(ctx, out, now); break
      case 'prize': this.prizeChime(ctx, out, now); break
      case 'turn-end': this.chord(ctx, out, now, [330, 440], 0.25, 0.22); break

      case 'start': this.fanfare(ctx, out, now, [440, 554, 659], 0.35); break
      case 'victory': this.fanfare(ctx, out, now, [523, 659, 784, 1047], 0.5); break
      case 'defeat': this.descendingTone(ctx, out, now); break
    }
  }

  playAttack(element: string) {
    this.play(`attack-${element}`)
  }


  // ===== Sound recipes =====

  // Quick UI tick
  private tick(ctx: AudioContext, out: GainNode, t: number, freq: number, dur: number, gain: number) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g).connect(out)
    osc.start(t); osc.stop(t + dur + 0.02)
  }

  private chord(ctx: AudioContext, out: GainNode, t: number, freqs: number[], dur: number, gain: number) {
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, t)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain / freqs.length, t + 0.02 + i * 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.connect(g).connect(out)
      osc.start(t); osc.stop(t + dur + 0.05)
    })
  }

  private errorBzz(ctx: AudioContext, out: GainNode, t: number) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, t)
    osc.frequency.linearRampToValueAtTime(140, t + 0.18)
    g.gain.setValueAtTime(0.18, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(g).connect(out)
    osc.start(t); osc.stop(t + 0.2)
  }

  // Whoosh: filtered noise sweep
  private swoosh(ctx: AudioContext, out: GainNode, t: number, fStart: number, fEnd: number, dur: number) {
    const noise = this.makeNoise(ctx, dur + 0.05)
    const filter = ctx.createBiquadFilter()
    const g = ctx.createGain()
    filter.type = 'bandpass'
    filter.Q.value = 4
    filter.frequency.setValueAtTime(fStart, t)
    filter.frequency.exponentialRampToValueAtTime(fEnd, t + dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.4, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    noise.connect(filter).connect(g).connect(out)
    noise.start(t); noise.stop(t + dur + 0.05)
  }

  // Electric zap: square wave with frequency modulation
  private zap(ctx: AudioContext, out: GainNode, t: number, dur: number, type: OscillatorType = 'square') {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(800, t)
    osc.frequency.linearRampToValueAtTime(2400, t + 0.04)
    osc.frequency.linearRampToValueAtTime(1600, t + dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.22, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g).connect(out)
    osc.start(t); osc.stop(t + dur + 0.02)
  }


  // Fire: low-pass filtered noise crackle
  private fireCrackle(ctx: AudioContext, out: GainNode, t: number) {
    const noise = this.makeNoise(ctx, 0.4)
    const filter = ctx.createBiquadFilter()
    const g = ctx.createGain()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1200, t)
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.4)
    filter.Q.value = 8
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.5, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    noise.connect(filter).connect(g).connect(out)
    noise.start(t); noise.stop(t + 0.42)
    // Add a low rumble
    const osc = ctx.createOscillator()
    const og = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(80, t)
    og.gain.setValueAtTime(0.1, t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(og).connect(out)
    osc.start(t); osc.stop(t + 0.32)
  }

  // Water: bandpass swoosh + bubble pop
  private waterSplash(ctx: AudioContext, out: GainNode, t: number) {
    const noise = this.makeNoise(ctx, 0.4)
    const filter = ctx.createBiquadFilter()
    const g = ctx.createGain()
    filter.type = 'bandpass'
    filter.Q.value = 5
    filter.frequency.setValueAtTime(2200, t)
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.35)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.5, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    noise.connect(filter).connect(g).connect(out)
    noise.start(t); noise.stop(t + 0.4)
  }

  // Grass: short rustle of mid-range noise
  private grassRustle(ctx: AudioContext, out: GainNode, t: number) {
    for (let i = 0; i < 3; i++) {
      const start = t + i * 0.05
      const noise = this.makeNoise(ctx, 0.15)
      const filter = ctx.createBiquadFilter()
      const g = ctx.createGain()
      filter.type = 'highpass'
      filter.frequency.value = 2000 + i * 400
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.2, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.13)
      noise.connect(filter).connect(g).connect(out)
      noise.start(start); noise.stop(start + 0.15)
    }
  }

  // Psychic: detuned wobbling sine pair
  private psychicWobble(ctx: AudioContext, out: GainNode, t: number) {
    const o1 = ctx.createOscillator()
    const o2 = ctx.createOscillator()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    const g = ctx.createGain()
    o1.type = 'sine'; o2.type = 'sine'; lfo.type = 'sine'
    o1.frequency.setValueAtTime(440, t)
    o2.frequency.setValueAtTime(556, t) // detuned
    lfo.frequency.setValueAtTime(8, t)
    lfoGain.gain.value = 60
    lfo.connect(lfoGain)
    lfoGain.connect(o1.frequency)
    lfoGain.connect(o2.frequency)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.18, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    o1.connect(g); o2.connect(g); g.connect(out)
    o1.start(t); o2.start(t); lfo.start(t)
    o1.stop(t + 0.5); o2.stop(t + 0.5); lfo.stop(t + 0.5)
  }

  // Fighting / punch: short snare-like burst
  private punch(ctx: AudioContext, out: GainNode, t: number, freq = 120) {
    const osc = ctx.createOscillator()
    const og = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    og.gain.setValueAtTime(0.4, t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(og).connect(out)
    osc.start(t); osc.stop(t + 0.14)
    // Crack burst
    const noise = this.makeNoise(ctx, 0.08)
    const ng = ctx.createGain()
    const nf = ctx.createBiquadFilter()
    nf.type = 'highpass'
    nf.frequency.value = 1200
    ng.gain.setValueAtTime(0.3, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    noise.connect(nf).connect(ng).connect(out)
    noise.start(t); noise.stop(t + 0.08)
  }


  // Generic damage thud
  private thud(ctx: AudioContext, out: GainNode, t: number) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15)
    g.gain.setValueAtTime(0.4, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(g).connect(out)
    osc.start(t); osc.stop(t + 0.2)
  }

  // KO descending tone
  private koTone(ctx: AudioContext, out: GainNode, t: number) {
    const notes = [440, 392, 330, 262]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const start = t + i * 0.09
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, start)
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.25, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.16)
      osc.connect(g).connect(out)
      osc.start(start); osc.stop(start + 0.18)
    })
  }

  // Heal: ascending shimmer
  private heal(ctx: AudioContext, out: GainNode, t: number) {
    const notes = [523, 659, 784]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const start = t + i * 0.06
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, start)
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.18, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.22)
      osc.connect(g).connect(out)
      osc.start(start); osc.stop(start + 0.24)
    })
  }

  // Evolution: rising sparkle arpeggio + shimmer
  private evolveSparkle(ctx: AudioContext, out: GainNode, t: number) {
    const notes = [523, 659, 784, 1047, 1318]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const start = t + i * 0.05
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, start)
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.2, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
      osc.connect(g).connect(out)
      osc.start(start); osc.stop(start + 0.55)
    })
    // Shimmery noise on top
    const noise = this.makeNoise(ctx, 0.45)
    const filter = ctx.createBiquadFilter()
    const g = ctx.createGain()
    filter.type = 'bandpass'
    filter.frequency.value = 4000
    filter.Q.value = 6
    g.gain.setValueAtTime(0.08, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    noise.connect(filter).connect(g).connect(out)
    noise.start(t + 0.05); noise.stop(t + 0.5)
  }

  // Prize chime: bell-like
  private prizeChime(ctx: AudioContext, out: GainNode, t: number) {
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'; osc2.type = 'sine'
    osc.frequency.setValueAtTime(880, t)
    osc2.frequency.setValueAtTime(1320, t) // perfect 5th
    g.gain.setValueAtTime(0.25, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(g); osc2.connect(g); g.connect(out)
    osc.start(t); osc2.start(t); osc.stop(t + 0.65); osc2.stop(t + 0.65)
  }

  // Fanfare: ascending notes
  private fanfare(ctx: AudioContext, out: GainNode, t: number, notes: number[], dur: number) {
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const start = t + i * (dur / notes.length / 1.5)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, start)
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.22, start + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.6)
      osc.connect(g).connect(out)
      osc.start(start); osc.stop(start + dur * 0.7)
    })
  }

  // Defeat: descending sad tone
  private descendingTone(ctx: AudioContext, out: GainNode, t: number) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523, t)
    osc.frequency.exponentialRampToValueAtTime(196, t + 0.8)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.25, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.85)
    osc.connect(g).connect(out)
    osc.start(t); osc.stop(t + 0.9)
  }


  // Build a noise buffer source
  private makeNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
    const sampleRate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    return src
  }

  toggleMute() {
    this.muted = !this.muted
    return this.muted
  }

  isMuted() {
    return this.muted
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.masterGain) this.masterGain.gain.value = this.volume
  }
}

export const soundService = new SoundService()
