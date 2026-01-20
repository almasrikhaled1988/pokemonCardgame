# Pokémon Card Game Implementation Plan

## Phase 1: Static Board Layout (Completed)
- [x] Create Vue 3 project with Vite
- [x] Implement global CSS variables and design system
- [x] Create `PlayerBoard` component with CSS Grid layout
- [x] Create `Zone` component for different game areas
- [x] Create `Card` component for visual representation
- [x] Implement responsive layout for mobile and desktop
- [x] Add player 2 board rotation (mirroring)

## Phase 2: Card Models & Decks (Completed)
- [x] Define TypeScript interfaces for `Card`, `Player`, `Attack`, etc.
- [x] Create `cards.ts` with data for Fire, Water, Grass, Electric decks
- [x] Implement `deckBuilder.ts` utility to generate complete decks
- [x] Create Pinia `gameStore` to manage state
- [x] Implement `startGame` action to initialization decks and hands
- [x] Update components to use real data types

## Phase 3: Turn System and Game Logic (Next)
- [ ] Implement `drawCard` logic (one per turn start)
- [ ] Implement Energy attachment logic (once per turn)
  - [ ] Validations: Only to Pokemon, only one per turn
- [ ] Implement Bench logic
  - [ ] Move from Hand to Active (if empty)
  - [ ] Move from Hand to Bench (max 3)
- [ ] Implement Attack logic
  - [ ] Validate energy cost
  - [ ] Calculate damage (including Weakness/Resistance)
  - [ ] Apply damage to opponent Active HP
  - [ ] Handle Knockout (Reduce HP <= 0)
- [ ] Implement Prize Card logic (Take prize when opponent KO)
- [ ] Implement Win Conditions
  - [ ] All prizes taken
  - [ ] Opponent has no pokemon in play
  - [ ] Opponent deck empty (Decking out)

## Phase 4: Drag & Drop
- [ ] Implement HTML5 Drag & Drop API or use `@use-gesture`
- [ ] Make cards in Hand draggable
- [ ] Make Active and Bench zones drop targets
- [ ] Make Energy cards draggable to Pokemon
- [ ] Implement visual feedback for valid drop zones
- [ ] Handle logic updates on successful drop

## Phase 5: Animations and Polish
- [ ] Add transition groups for drawing cards
- [ ] Add attack animations (particle effects or simple CSS animations)
- [ ] Add damage number popups
- [ ] Add sound effects (optional)
- [ ] Polish UI (hover states, turn indicators, winner screen)
