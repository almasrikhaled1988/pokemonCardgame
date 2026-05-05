<template>
  <div class="lobby-screen">
    <div class="lobby-card">
      <h1 class="lobby-title">📡 Online Multiplayer</h1>
      <p class="lobby-subtitle">Connect with another player in real-time</p>

      <!-- Mode Selection: Host or Join -->
      <div v-if="!multiplayerStore.playerRole" class="lobby-choices">
        <button class="lobby-choice host-choice" @click="handleCreateRoom">
          <div class="choice-icon">🏠</div>
          <div class="choice-label">Create Room</div>
          <div class="choice-desc">Host a game and share the code</div>
        </button>
        <div class="choice-divider">OR</div>
        <button class="lobby-choice join-choice" @click="showJoinInput = true" v-if="!showJoinInput">
          <div class="choice-icon">🔗</div>
          <div class="choice-label">Join Room</div>
          <div class="choice-desc">Enter a room code to join</div>
        </button>
        <div v-if="showJoinInput" class="join-input-section">
          <div class="input-wrapper">
            <input 
              v-model="joinCode" 
              type="text" 
              placeholder="Enter room code (e.g. PK-A3F9)"
              class="room-input"
              maxlength="8"
              @keyup.enter="handleJoinRoom"
              autofocus
            />
            <button class="btn-join" @click="handleJoinRoom" :disabled="!joinCode.trim()">
              Join →
            </button>
          </div>
          <button class="btn-back-small" @click="showJoinInput = false">← Back</button>
        </div>
      </div>

      <!-- Host: Waiting for guest -->
      <div v-if="multiplayerStore.isHost && !multiplayerStore.isOnline" class="waiting-section">
        <div class="room-code-display">
          <span class="code-label">Room Code</span>
          <span class="code-value" @click="copyCode">{{ multiplayerStore.roomCode }}</span>
          <span class="code-copy-hint">{{ copied ? '✓ Copied!' : 'Click to copy' }}</span>
        </div>
        <div class="waiting-indicator">
          <div class="spinner"></div>
          <span>Waiting for opponent to join...</span>
        </div>
      </div>

      <!-- Host: Guest connected -->
      <div v-if="multiplayerStore.isHost && multiplayerStore.isOnline" class="connected-section">
        <div class="connected-badge">
          <span class="status-dot connected"></span>
          <span>{{ multiplayerStore.opponentName || 'Player 2' }} connected!</span>
        </div>
        <button class="btn-start-match" @click="$emit('proceed')">
          ⚔️ Proceed to Element Selection
        </button>
      </div>

      <!-- Guest: Connected, waiting -->
      <div v-if="multiplayerStore.isGuest && multiplayerStore.isOnline" class="connected-section">
        <div class="connected-badge">
          <span class="status-dot connected"></span>
          <span>Connected to host!</span>
        </div>
        <div class="waiting-indicator">
          <div class="spinner"></div>
          <span>Waiting for host to start...</span>
        </div>
      </div>

      <!-- Connecting state -->
      <div v-if="multiplayerStore.connectionStatus === 'connecting'" class="connecting-section">
        <div class="spinner large"></div>
        <span>Connecting...</span>
      </div>

      <!-- Error state -->
      <div v-if="multiplayerStore.connectionStatus === 'error'" class="error-section">
        <span class="error-icon">❌</span>
        <span class="error-text">{{ multiplayerStore.errorMessage || 'Connection failed' }}</span>
        <button class="btn-retry" @click="handleRetry">Try Again</button>
      </div>

      <!-- Back button -->
      <button class="btn-back" @click="handleBack">
        ← Back to Menu
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMultiplayerStore } from '../stores/multiplayerStore'

const multiplayerStore = useMultiplayerStore()

const emit = defineEmits<{
  (e: 'proceed'): void
  (e: 'back'): void
}>()

const showJoinInput = ref(false)
const joinCode = ref('')
const copied = ref(false)

async function handleCreateRoom() {
  await multiplayerStore.createRoom()
}

async function handleJoinRoom() {
  if (!joinCode.value.trim()) return
  await multiplayerStore.joinRoom(joinCode.value.trim())
}

function copyCode() {
  if (multiplayerStore.roomCode) {
    navigator.clipboard.writeText(multiplayerStore.roomCode)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

function handleRetry() {
  multiplayerStore.disconnect()
  showJoinInput.value = false
  joinCode.value = ''
}

function handleBack() {
  multiplayerStore.disconnect()
  emit('back')
}
</script>

<style scoped>
.lobby-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: radial-gradient(circle at 30% 50%, rgba(102, 126, 234, 0.08) 0%, transparent 60%),
              radial-gradient(circle at 70% 50%, rgba(118, 75, 162, 0.08) 0%, transparent 60%);
}

.lobby-card {
  background: rgba(20, 20, 35, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px;
  max-width: 520px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.lobby-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.lobby-subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  margin-bottom: 32px;
}

/* Choices */
.lobby-choices {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.lobby-choice {
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  color: white;
}

.lobby-choice:hover {
  border-color: rgba(102, 126, 234, 0.5);
  background: rgba(102, 126, 234, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.choice-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.choice-label {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.choice-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

.choice-divider {
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* Join Input */
.join-input-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
}

.room-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  outline: none;
  transition: border-color 0.2s;
}

.room-input:focus {
  border-color: #667eea;
}

.room-input::placeholder {
  font-size: 0.75rem;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.3);
}

.btn-join {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: white;
  padding: 14px 20px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-join:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.btn-join:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-back-small {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px;
}

.btn-back-small:hover {
  color: rgba(255, 255, 255, 0.7);
}

/* Room Code Display */
.waiting-section {
  margin-bottom: 24px;
}

.room-code-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.code-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.4);
}

.code-value {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 6px;
  background: linear-gradient(135deg, #4ade80, #22d3ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  cursor: pointer;
  transition: transform 0.2s;
  user-select: all;
}

.code-value:hover {
  transform: scale(1.05);
}

.code-copy-hint {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
}

/* Waiting indicator */
.waiting-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.large {
  width: 32px;
  height: 32px;
  border-width: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Connected */
.connected-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;
}

.connected-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  color: #4ade80;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse-dot 1.5s infinite;
}

.status-dot.connected {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.85); }
}

.btn-start-match {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: white;
  padding: 16px 40px;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.btn-start-match:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
}

/* Connecting */
.connecting-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  color: rgba(255, 255, 255, 0.5);
}

/* Error */
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.error-icon {
  font-size: 2rem;
}

.error-text {
  color: #ef4444;
  font-weight: 600;
}

.btn-retry {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* Back */
.btn-back {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-back:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.8);
}

/* Responsive */
@media (max-width: 480px) {
  .lobby-card {
    padding: 24px 16px;
    border-radius: 16px;
  }

  .lobby-title {
    font-size: 1.5rem;
  }

  .code-value {
    font-size: 1.8rem;
    letter-spacing: 4px;
  }

  .lobby-choice {
    padding: 16px;
  }

  .choice-icon {
    font-size: 2rem;
  }
}
</style>
