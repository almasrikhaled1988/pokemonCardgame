export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'fighting';

export interface Attack {
    name: string;
    damage: number;
    energyCost: number;
    effect?: StatusEffect;
    effectChance?: number; // 0 to 1
    description?: string;
}

export interface Ability {
    name: string;
    description: string;
    effect: 'draw' | 'heal' | 'damage' | 'status' | 'passive';
    value?: number;
}

export interface Card {
    id: string;
    uniqueId?: string;
    name: string;
    type: 'pokemon' | 'energy' | 'item' | 'supporter'; // normalized types
    element?: ElementType | string; // Trainer cards might not have element or use 'neutral'

    // Pokemon specific
    hp?: number;
    currentHp?: number;
    attacks?: Attack[];
    attachedEnergy?: Card[];
    stage?: 'basic' | 'stage1' | 'stage2';
    evolvesFrom?: string;
    weakness?: ElementType;
    resistance?: ElementType;
    statusEffects?: StatusEffect[];
    ability?: Ability;
    turnPlayed?: number; // The turn number when this card was placed on the board

    // Trainer specific
    description?: string;
    category?: 'trainer';
}

export type StatusEffect = 'burned' | 'paralyzed' | 'asleep' | 'poisoned';

export type GameMode = 'single' | 'local' | 'online'
export type PlayerRole = 'host' | 'guest' | null
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface Player {
    id: number;
    name: string;
    isBot: boolean;
    element: ElementType | null;
    deck: Card[];
    hand: Card[];
    active: Card | null;
    bank: Card[];
    energyZone: Card[];
    discardPile: Card[];
    prizeCards: Card[];
    energyAttachedThisTurn: boolean;
    evolutionsThisTurn: number; // Max 2 per turn
    score: number; // Points from knockouts, first to 3 wins
}
