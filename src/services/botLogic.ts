import type { useGameStore } from '../stores/gameStore'
import type { Card, ElementType } from '../types'

type GameStore = ReturnType<typeof useGameStore>

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Type advantage table
const ELEMENT_WEAKNESS: Record<string, string> = {
    fire: 'water',
    water: 'electric',
    grass: 'fire',
    electric: 'grass',
    psychic: 'psychic',
    fighting: 'psychic'
}

function bestAttackForActive(active: Card, energy: number, oppActive: Card | null) {
    if (!active.attacks) return { idx: -1, dmg: 0, attack: null as null | NonNullable<Card['attacks']>[0] }
    let bestIdx = -1
    let bestDmg = -1
    let bestAtk: NonNullable<Card['attacks']>[0] | null = null

    active.attacks.forEach((atk, idx) => {
        if (energy < atk.energyCost) return
        let dmg = atk.damage
        if (oppActive && active.element && oppActive.weakness === active.element) dmg *= 2
        else if (oppActive && active.element && oppActive.resistance === active.element) dmg = Math.max(0, dmg - 20)

        if (dmg > bestDmg) {
            bestDmg = dmg
            bestIdx = idx
            bestAtk = atk
        }
    })
    return { idx: bestIdx, dmg: bestDmg, attack: bestAtk }
}

export const playBotTurn = async (store: GameStore) => {
    const difficulty = store.botDifficulty
    const p2 = store.player2
    const opp = store.player1

    // EASY: random/sloppy. MEDIUM: standard play. HARD: optimized.
    const thinkDelay = difficulty === 'easy' ? 600 : difficulty === 'hard' ? 900 : 800

    // 0. Mulligan if no basic in hand (only on turn 1, hand will already be auto-mulliganed at game start)
    // Skip — auto-mulligan handled at game start

    // 1. Play Bill or Pokeball / Energy Search if low on resources (medium+ only)
    if (difficulty !== 'easy') {
        const bill = p2.hand.find(c => c.name === 'Bill')
        if (bill && p2.hand.length <= 4) {
            await delay(thinkDelay)
            store.playCardFromHand(bill)
        }
        const pokeball = p2.hand.find(c => c.name === 'Pokéball')
        if (pokeball) {
            await delay(thinkDelay)
            store.playCardFromHand(pokeball)
        }
    }

    // 2. If no active, promote best basic (highest HP) from hand
    if (!p2.active) {
        const basics = p2.hand.filter(c => c.type === 'pokemon' && (c.stage === 'basic' || !c.stage))
        if (basics.length > 0) {
            // Hard mode: pick basic that's strong vs opponent's element
            let chosen = basics[0]!
            if (difficulty === 'hard' && opp.active?.element) {
                const oppEl = opp.active.element as string
                const counter = basics.find(b =>
                    b.element && ELEMENT_WEAKNESS[b.element as string] === oppEl
                )
                if (counter) chosen = counter
                else chosen = [...basics].sort((a, b) => (b.hp || 0) - (a.hp || 0))[0]!
            } else if (difficulty === 'medium') {
                chosen = [...basics].sort((a, b) => (b.hp || 0) - (a.hp || 0))[0]!
            }
            // easy = first basic
            await delay(thinkDelay)
            store.playCardFromHand(chosen)
        }
    }

    // 3. Bench fill — re-check each iteration
    while (p2.bank.length < 3) {
        const candidate = p2.hand.find(c => c.type === 'pokemon' && (c.stage === 'basic' || !c.stage))
        if (!candidate) break

        // Easy: bench anything. Medium: only bench if HP > 40. Hard: only bench Pokémon useful for evolution chains
        if (difficulty === 'medium' && (candidate.hp || 0) < 40 && Math.random() < 0.5) {
            break // sometimes skip weak basics
        }
        if (difficulty === 'hard') {
            // Only bench if it can evolve into something we have, or if it's strong (>= 60 HP)
            const canEvolve = p2.hand.some(c => c.evolvesFrom === candidate.name)
            if (!canEvolve && (candidate.hp || 0) < 60 && p2.bank.length >= 1) break
        }

        await delay(thinkDelay)
        store.playCardFromHand(candidate)
    }

    // 4. Play Energy if not already attached
    if (!p2.energyAttachedThisTurn) {
        const energyCard = p2.hand.find(c => c.type === 'energy')
        if (energyCard) {
            await delay(thinkDelay)
            store.playCardFromHand(energyCard)
        } else if (difficulty !== 'easy') {
            // Medium/hard: search deck if Energy Search available
            const energySearch = p2.hand.find(c => c.name === 'Energy Search')
            if (energySearch) {
                await delay(thinkDelay)
                store.playCardFromHand(energySearch)
                // Then play the found energy if it ended up in hand
                const newEnergy = p2.hand.find(c => c.type === 'energy')
                if (newEnergy && !p2.energyAttachedThisTurn) {
                    await delay(400)
                    store.playCardFromHand(newEnergy)
                }
            }
        }
    }

    // 5. Strategic Evolution
    let safety = 10
    while (safety-- > 0) {
        // Max 2 evolutions per turn
        if (p2.evolutionsThisTurn >= 2) break

        const evoCard = p2.hand.find(c => {
            if (c.type !== 'pokemon') return false
            if (c.stage !== 'stage1' && c.stage !== 'stage2') return false
            return [p2.active, ...p2.bank].some(p => p && p.name === c.evolvesFrom)
        })
        if (!evoCard) break

        const target = [p2.active, ...p2.bank].find(p => p && p.name === evoCard.evolvesFrom)
        if (!target) break

        // Easy: 50% chance to skip evolution
        if (difficulty === 'easy' && Math.random() < 0.5) break

        await delay(thinkDelay)
        store.playCardFromHand(evoCard)
        store.evolvePokemon(target)
    }

    // 6. Use Potion / Super Potion / Full Heal if useful
    const active = p2.active
    if (active) {
        const hpMissing = (active.hp || 0) - (active.currentHp || 0)
        const superPotion = p2.hand.find(c => c.name === 'Super Potion')
        const potion = p2.hand.find(c => c.name === 'Potion')

        if (hpMissing >= 60 && superPotion) {
            await delay(thinkDelay)
            store.playCardFromHand(superPotion)
        } else if (hpMissing >= 30 && potion && difficulty !== 'easy') {
            // Easy bots waste potions, only use when really needed
            await delay(thinkDelay)
            store.playCardFromHand(potion)
        } else if (hpMissing >= 50 && potion && difficulty === 'easy') {
            await delay(thinkDelay)
            store.playCardFromHand(potion)
        }

        // Full Heal if status effects
        if (active.statusEffects && active.statusEffects.length > 0 && difficulty !== 'easy') {
            const fullHeal = p2.hand.find(c => c.name === 'Full Heal')
            if (fullHeal) {
                await delay(thinkDelay)
                store.playCardFromHand(fullHeal)
            }
        }
    }

    // 7. Hand-low: Professor's Research
    if (p2.hand.length <= 2) {
        const research = p2.hand.find(c => c.name === "Professor's Research")
        if (research) {
            await delay(thinkDelay)
            store.playCardFromHand(research)
        }
    }

    // 8. Switch active if low HP and stronger bench available (medium/hard)
    if (difficulty !== 'easy' && p2.active && p2.bank.length > 0) {
        const activeHpPct = (p2.active.currentHp || 0) / (p2.active.hp || 1)
        if (activeHpPct < 0.3) {
            const bestBench = [...p2.bank].sort((a, b) => (b.currentHp || 0) - (a.currentHp || 0))[0]
            if (bestBench && (bestBench.currentHp || 0) > (p2.active.currentHp || 0)) {
                const switchCard = p2.hand.find(c => c.name === 'Switch')
                if (switchCard) {
                    await delay(thinkDelay)
                    store.playCardFromHand(switchCard)
                }
            }
        }
    }

    // 9. Attack — find best damage move accounting for weakness/resistance
    const refreshedActive = p2.active
    if (refreshedActive && refreshedActive.attacks) {
        const oppActive = opp.active
        const { idx, dmg, attack } = bestAttackForActive(refreshedActive, p2.energyZone.length, oppActive)

        // Easy mode: 30% chance to pick a random attack instead
        let attackIdx = idx
        if (difficulty === 'easy' && Math.random() < 0.3) {
            const affordable = refreshedActive.attacks
                .map((a, i) => ({ a, i }))
                .filter(({ a }) => p2.energyZone.length >= a.energyCost)
            if (affordable.length > 0) {
                attackIdx = affordable[Math.floor(Math.random() * affordable.length)]!.i
            }
        }

        if (attackIdx !== -1 && attack) {
            // Hard mode: prefer lethal
            if (difficulty === 'hard' && oppActive) {
                const oppHp = oppActive.currentHp || 0
                const lethalIdx = refreshedActive.attacks.findIndex((atk) => {
                    if (p2.energyZone.length < atk.energyCost) return false
                    let d = atk.damage
                    if (refreshedActive.element && oppActive.weakness === refreshedActive.element) d *= 2
                    return d >= oppHp
                })
                if (lethalIdx !== -1) attackIdx = lethalIdx
            }

            await delay(thinkDelay + 400)
            store.attack(attackIdx)
            return
        }

        // Suppress unused variable warnings
        void dmg
    }

    // 10. End turn if no attack possible
    await delay(thinkDelay)
    store.endTurn()
}
