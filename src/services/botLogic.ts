import type { useGameStore } from '../stores/gameStore'
import type { Card } from '../types'

type GameStore = ReturnType<typeof useGameStore>

export const playBotTurn = async (store: GameStore) => {
    console.log("Bot is thinking...")
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // 1. Play Basic Pokemon to bench
    const p2 = store.player2
    const hand = [...p2.hand]
    for (const card of hand) {
        if (card.type === 'pokemon' && card.stage === 'basic' && p2.bank.length < 3) {
            await delay(1000)
            console.log(`Bot plays ${card.name} to bench`)
            store.playCardFromHand(card)
        }
    }

    // 2. Play Energy
    const energyCard = p2.hand.find(c => c.type === 'energy')
    if (energyCard && !p2.energyAttachedThisTurn) {
        await delay(1000)
        console.log(`Bot attaches energy`)
        store.playCardFromHand(energyCard)
    }

    // 3. Check for evolutions
    for (const card of p2.hand) {
        if (card.type === 'pokemon' && (card.stage === 'stage1' || card.stage === 'stage2')) {
            // Find target on board
            const target = [p2.active, ...p2.bank].find(p => p && p.name === card.evolvesFrom)
            if (target) {
                const targetName = target.name
                await delay(1000)
                console.log(`Bot evolving ${targetName} into ${card.name}`)
                store.playCardFromHand(card) // This sets pendingEvolution
                store.evolvePokemon(target)
            }
        }
    }

    // 4. Play Trainer cards (Potion if active is damaged)
    const potion = p2.hand.find(c => c.name === 'Potion')
    const activeAtPotion = p2.active
    if (potion && activeAtPotion && (activeAtPotion.currentHp || 0) < (activeAtPotion.hp || 0)) {
        const targetName = activeAtPotion.name
        await delay(1000)
        console.log(`Bot uses Potion on ${targetName}`)
        store.playCardFromHand(potion)
    }

    // 5. Attack if possible
    const activeAtAttack = p2.active
    if (activeAtAttack && activeAtAttack.attacks) {
        // Find best affordable attack
        let bestAttackIndex = -1
        let maxDamage = -1

        activeAtAttack.attacks.forEach((attack, index) => {
            if (p2.energyZone.length >= attack.energyCost) {
                if (attack.damage > maxDamage) {
                    maxDamage = attack.damage
                    bestAttackIndex = index
                }
            }
        })

        const attacks = activeAtAttack.attacks
        if (bestAttackIndex !== -1 && attacks) {
            const selectedAttack = attacks[bestAttackIndex]
            if (selectedAttack) {
                const attackName = selectedAttack.name
                await delay(1500)
                console.log(`Bot attacks with ${attackName}`)
                store.attack(bestAttackIndex)
                return // attack() already calls endTurn()
            }
        }
    }

    // 6. End turn if no attack was made
    await delay(1000)
    console.log("Bot ends turn")
    store.endTurn()
}
