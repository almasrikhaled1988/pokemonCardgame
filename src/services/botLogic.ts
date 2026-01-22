import type { useGameStore } from '../stores/gameStore'
import type { Card } from '../types'

type GameStore = ReturnType<typeof useGameStore>

export const playBotTurn = async (store: GameStore) => {
    console.log("Bot is thinking...")
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const p2 = store.player2
    const opp = store.player1

    // 1. Play "Bill" first if available (draw more options)
    const bill = p2.hand.find(c => c.name === 'Bill')
    if (bill) {
        await delay(1000)
        console.log("Bot plays Bill")
        store.playCardFromHand(bill)
    }

    // 2. Play Basic Pokemon to bench
    const pokemonToBench = p2.hand.filter(c => c.type === 'pokemon' && c.stage === 'basic' && p2.bank.length < 3)
    for (const card of pokemonToBench) {
        await delay(800)
        console.log(`Bot benches ${card.name}`)
        store.playCardFromHand(card)
    }

    // 3. Play Energy if not already attached
    if (!p2.energyAttachedThisTurn) {
        const energyCard = p2.hand.find(c => c.type === 'energy')
        if (energyCard) {
            await delay(800)
            console.log(`Bot attaches energy`)
            store.playCardFromHand(energyCard)
        }
    }

    // 4. Strategic Evolution
    const evolutions = p2.hand.filter(c => c.type === 'pokemon' && (c.stage === 'stage1' || c.stage === 'stage2'))
    for (const card of evolutions) {
        const target = [p2.active, ...p2.bank].find(p => p && p.name === card.evolvesFrom)
        if (target) {
            await delay(1000)
            console.log(`Bot evolving ${target.name} into ${card.name}`)
            store.playCardFromHand(card)
            store.evolvePokemon(target)
        }
    }

    // 5. Use Potion if Active is low
    const active = p2.active
    if (active && (active.currentHp || 0) < (active.hp || 0) - 20) {
        const potion = p2.hand.find(c => c.name === 'Potion')
        if (potion) {
            await delay(1000)
            console.log(`Bot heals ${active.name}`)
            store.playCardFromHand(potion)
        }
    }

    // 6. Strategic Switch
    // If active is low OR has bad status (asleep/paralyzed) AND bench has someone healthy
    if (active && p2.bank.length > 0) {
        const isDisabled = active.statusEffects?.some(s => s === 'asleep' || s === 'paralyzed')
        const isLow = (active.currentHp || 0) < 30
        const healthyBench = p2.bank.find(p => (p.currentHp || 0) > 50)

        if ((isDisabled || isLow) && healthyBench) {
            const switchCard = p2.hand.find(c => c.name === 'Switch')
            if (switchCard) {
                await delay(1000)
                console.log("Bot uses Switch")
                store.playCardFromHand(switchCard)
            }
        }
    }

    // 7. Use Professor's Research if hand is low
    if (p2.hand.length <= 2) {
        const research = p2.hand.find(c => c.name === "Professor's Research")
        if (research) {
            await delay(1000)
            console.log("Bot plays Professor's Research")
            store.playCardFromHand(research)
        }
    }

    // 8. Attack if possible
    const refreshedActive = p2.active
    if (refreshedActive && refreshedActive.attacks) {
        let bestAttackIndex = -1
        let maxDamage = -1

        // Check if we can KO opponent
        if (opp.active) {
            const oppHp = opp.active.currentHp || 0
            refreshedActive.attacks.forEach((atk, idx) => {
                if (p2.energyZone.length >= atk.energyCost) {
                    if (atk.damage >= oppHp) {
                        bestAttackIndex = idx // Lethal found!
                    } else if (atk.damage > maxDamage) {
                        maxDamage = atk.damage
                        bestAttackIndex = idx
                    }
                }
            })
        }

        if (bestAttackIndex !== -1) {
            const atk = refreshedActive.attacks[bestAttackIndex]
            if (atk) {
                await delay(1500)
                console.log(`Bot attacks with ${atk.name}`)
                store.attack(bestAttackIndex)
                return
            }
        }
    }

    // 9. End turn if no attack possible (due to status or energy)
    await delay(1000)
    console.log("Bot ends turn")
    store.endTurn()
}
