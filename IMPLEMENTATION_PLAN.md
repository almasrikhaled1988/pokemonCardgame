# Pokémon Card Game Implementation Roadmap

This roadmap outlines the steps to enhance the game with deeper mechanics, visual polish, and improved AI.

## Phase 1: Game Engine Upgrades (Combat Depth)
- [x] **1. Type Advantages (Weakness/Resistance)**
    - Update `Card` interface in `types.ts`.
    - Add Weakness/Resistance data to `POKEMON_DATA`.
    - Implement bonus damage calculation in `gameStore.ts`.
- [x] **2. Status Effects (Burn, Paralyze, Sleep, Poison)**
    - Add `statusEffects` to `Card` interface.
    - Implement effect application in `attack` logic.
    - Implement effect checks at start/end of turns.
- [x] **3. Enhanced Trainer Cards & New Elements**
    - Add `Supporter` and more `Item` card logic.
    - Introduce **Psychic** and **Fighting** elements.

## Phase 2: User Interface & Visual Polish
- [x] **4. Battle Log (History of Moves)**
    - Create a `BattleLog` component.
    - Add `addLogEntry` action to `gameStore.ts`.
- [x] **5. Attack VFX (Element-themed animations)**
    - Implement CSS-based attack animations for different elements.
    - Add screen shake for heavy hits.
- [ ] **6. Hover Tooltips & Detail View**
    - Create a tooltip system for cards and attacks.
- [ ] **7. Sound System**
    - Add SFX for attacks, draws, and evolution.

## Phase 3: Advanced Features
- [ ] **8. Passive Abilities**
    - Implement unique per-card abilities that trigger on specific events.
- [ ] **9. Improved AI (Bot Logic)**
    - Smart benching and energy management.
    - Strategic evolution and switching.

---
*Progress: 55%*
