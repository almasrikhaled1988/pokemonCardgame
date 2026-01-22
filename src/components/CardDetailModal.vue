<template>
  <Transition name="modal">
    <div v-if="selectedCard" class="modal-overlay" @click.self="close">
      <div class="modal-content" :class="selectedCard.element">
        <button class="close-btn" @click="close">×</button>
        
        <div class="card-detail-layout">
          <!-- Left: Large Card Visual -->
          <div class="card-visual-section">
            <div class="detail-card-frame" :class="selectedCard.element">
              <div class="frame-header">
                <span class="p-stage" v-if="selectedCard.stage">{{ selectedCard.stage }}</span>
                <span class="p-name">{{ selectedCard.name }}</span>
                <span class="p-hp" v-if="selectedCard.hp">{{ selectedCard.hp }} HP</span>
              </div>
              
              <div class="frame-art">
                <img :src="getPokemonImage(selectedCard.name)" :alt="selectedCard.name" />
                <div v-if="selectedCard.statusEffects?.length" class="status-overlay">
                   <span v-for="s in selectedCard.statusEffects" :key="s" class="status-badge" :class="s">{{ s }}</span>
                </div>
              </div>

              <div class="frame-info">
                <div class="info-row">
                  <span>HT: 2' 04"</span>
                  <span>WT: 13.2 lbs.</span>
                </div>
              </div>

              <div class="frame-attacks">
                <div v-for="atk in selectedCard.attacks" :key="atk.name" class="detail-attack">
                  <div class="atk-cost">
                    <span v-for="i in atk.energyCost" :key="i" class="energy-dot">⚡</span>
                  </div>
                  <div class="atk-body">
                    <span class="atk-name">{{ atk.name }}</span>
                    <p class="atk-desc">{{ atk.description || 'Deals damage to the opponent.' }}</p>
                  </div>
                  <div class="atk-damage">{{ atk.damage }}</div>
                </div>
              </div>

              <div class="frame-footer">
                <div class="footer-stat">
                  <span class="label">weakness</span>
                  <span class="value" v-if="selectedCard.weakness">{{ getSymbol(selectedCard.weakness) }} x2</span>
                  <span class="value" v-else>None</span>
                </div>
                <div class="footer-stat">
                  <span class="label">resistance</span>
                  <span class="value" v-if="selectedCard.resistance">{{ getSymbol(selectedCard.resistance) }} -20</span>
                  <span class="value" v-else>None</span>
                </div>
                <div class="footer-stat">
                  <span class="label">retreat</span>
                  <span class="value">⚡</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Card Metadata & Context -->
          <div class="card-data-section">
            <h2 class="section-title">Card Details</h2>
            
            <div class="data-grid">
              <div class="data-item">
                <span class="label">Type</span>
                <span class="value">{{ selectedCard.type }}</span>
              </div>
              <div class="data-item">
                <span class="label">Element</span>
                <span class="value capitalize">{{ selectedCard.element }}</span>
              </div>
              <div v-if="selectedCard.evolvesFrom" class="data-item full">
                <span class="label">Evolves From</span>
                <span class="value">{{ selectedCard.evolvesFrom }}</span>
              </div>
              <div v-if="selectedCard.description" class="data-item full">
                <span class="label">Flavor Text</span>
                <span class="value italic">"{{ selectedCard.description }}"</span>
              </div>
            </div>

            <div class="card-status-info" v-if="selectedCard.type === 'pokemon'">
              <h3 class="subsection-title">Current Status</h3>
              <div class="status-bar" v-if="selectedCard.currentHp !== undefined && selectedCard.hp">
                <div class="status-hp-label">HP: {{ selectedCard.currentHp }} / {{ selectedCard.hp }}</div>
                <div class="hp-track">
                  <div class="hp-fill" :style="{ width: (selectedCard.currentHp / selectedCard.hp * 100) + '%' }"></div>
                </div>
              </div>
              <div class="attached-energy-detail" v-if="selectedCard.attachedEnergy?.length">
                <h4 class="mini-title">Attached Energy</h4>
                <div class="energy-icons">
                  <span v-for="(e, i) in selectedCard.attachedEnergy" :key="i" class="energy-tag" :class="e.element">
                    {{ getSymbol(e.element || 'neutral') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/gameStore'
import { getPokemonImageUrl } from '../utils/pokemonImages'

const store = useGameStore()
const { selectedCard } = storeToRefs(store)

function close() {
  selectedCard.value = null
}

function getPokemonImage(name: string) {
  return getPokemonImageUrl(name)
}

function getSymbol(element: string) {
  const symbols: Record<string, string> = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮', fighting: '🥊', neutral: '⚪'
  }
  return symbols[element] || element
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: #1a1a24;
  width: 100%;
  max-width: 900px;
  border-radius: 20px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.card-detail-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  min-height: 600px;
}

/* Visual Section (The Card) */
.card-visual-section {
  padding: 40px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-card-frame {
  width: 320px;
  height: 450px;
  background: #f1d354; /* Generic gold border */
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  color: #333;
  box-shadow: 0 15px 35px rgba(0,0,0,0.4);
}

.detail-card-frame.fire { background: #f87171; }
.detail-card-frame.water { background: #60a5fa; }
.detail-card-frame.grass { background: #34d399; }
.detail-card-frame.electric { background: #fbbf24; }
.detail-card-frame.psychic { background: #a78bfa; }
.detail-card-frame.fighting { background: #d97706; }

.frame-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.p-stage { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }
.p-name { font-size: 1.2rem; font-weight: 900; }
.p-hp { font-size: 1rem; font-weight: 800; color: #cc0000; }

.frame-art {
  height: 180px;
  background: #fff;
  border: 4px solid #666;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.frame-art img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: linear-gradient(to bottom, #eee, #fff);
}

.status-overlay {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.status-badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  color: white;
}

.status-badge.poisoned { background: #a855f7; }
.status-badge.burned { background: #ef4444; }
.status-badge.paralyzed { background: #eab308; }
.status-badge.asleep { background: #6366f1; }

.frame-info {
  background: #ceae33;
  font-size: 0.5rem;
  font-style: italic;
  font-weight: 800;
  padding: 2px 10px;
  margin: 4px 0;
  text-align: center;
}

.frame-attacks {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.detail-attack {
  display: grid;
  grid-template-columns: 60px 1fr 40px;
  align-items: start;
  gap: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  padding-bottom: 4px;
}

.atk-cost { display: flex; gap: 2px; }
.atk-name { font-weight: 800; font-size: 0.85rem; }
.atk-desc { font-size: 0.65rem; line-height: 1.2; opacity: 0.8; }
.atk-damage { font-weight: 900; font-size: 1.1rem; text-align: right; }

.frame-footer {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  font-size: 0.55rem;
  border-top: 1px solid rgba(0,0,0,0.2);
  padding-top: 6px;
}

.footer-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-stat .label { font-weight: 800; text-transform: uppercase; opacity: 0.7; }
.footer-stat .value { font-weight: 800; font-size: 0.7rem; }

/* Data Section */
.card-data-section {
  padding: 40px;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 24px;
  color: #fff;
}

.data-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 40px;
}

.data-item {
  flex: 1 1 150px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.data-item.full { flex-basis: 100%; }

.data-item .label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.data-item .value {
  font-size: 1.1rem;
  color: #f1f5f9;
}

.capitalize { text-transform: capitalize; }
.italic { font-style: italic; color: #94a3b8; }

.card-status-info {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
}

.subsection-title {
  font-size: 1.2rem;
  margin-bottom: 16px;
}

.status-bar {
  margin-bottom: 20px;
}

.status-hp-label {
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
}

.hp-track {
  height: 12px;
  background: rgba(0,0,0,0.4);
  border-radius: 6px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(to right, #ef4444, #4ade80);
  transition: width 0.4s ease-out;
}

.mini-title {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 8px;
}

.energy-icons {
  display: flex;
  gap: 8px;
}

.energy-tag {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
}

.energy-tag.fire { background: #ef4444; }
.energy-tag.water { background: #3b82f6; }
.energy-tag.grass { background: #10b981; }
.energy-tag.electric { background: #f59e0b; }

/* Transitions */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-content {
  transition: transform 0.2s ease-in;
}

.modal-enter-from .modal-content {
  transform: scale(0.9) translateY(20px);
}

.modal-leave-to .modal-content {
  transform: scale(0.95);
}

@media (max-width: 850px) {
  .card-detail-layout {
    grid-template-columns: 1fr;
  }
  .card-visual-section {
    padding: 20px;
  }
  .card-data-section {
    padding: 20px;
  }
}
</style>
