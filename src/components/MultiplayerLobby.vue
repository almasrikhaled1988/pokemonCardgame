<template>
  <div class="lobby-screen">
    <div class="lobby-card">
      <h1 class="lobby-title">📡 Online Multiplayer</h1>
      <p class="lobby-subtitle">Join an open room or create your own</p>

      <!-- Lobby connection status -->
      <div class="lobby-status" :class="{ connected: lobbyConnected, disconnected: !lobbyConnected }">
        <span class="ls-dot"></span>
        <span>{{ lobbyConnected ? 'Lobby connected' : 'Connecting to lobby...' }}</span>
      </div>

      <!-- Available Rooms List -->
      <div v-if="!multiplayerStore.playerRole" class="rooms-section">
        <div class="rooms-header">
          <h2 class="rooms-title">🏠 Open Rooms</h2>
          <button class="btn-refresh" @click="refreshRooms" title="Refresh">🔄</button>
        </div>

        <div v-if="rooms.length === 0" class="no-rooms">
          <span class="no-rooms-icon">🕐</span>
          <span>No rooms available — create one!</span>
        </div>

        <div v-else class="rooms-list">
          <div
            v-for="room in rooms"
            :key="room.code"
            class="room-item"
            @click="handleJoinFromLobby(room.code)"
          >
            <div class="room-host">
              <span class="room-host-icon">👤</span>
              <span class="room-host-name">{{ room.hostName }}</span>
            </div>
            <div class="room-meta">
              <span class="room-code-mini">{{ room.code }}</span>
              <span class="room-time">{{ formatTime(room.createdAt) }}</span>
            </div>
            <button class="btn-join-room">Join →</button>
          </div>
        </div>

        <!-- Actions: Create Room or Manual Join -->
        <div class="lobby-actions">
          <button class="btn-create-room" @click="handleCreateRoom">
            <span>➕</span> Create Room
          </button>
          <button class="btn-manual-join" @click="showManualJoin = true" v-if="!showManualJoin">
            <span>🔗</span> Join by Code
          </button>
        </div>

        <!-- Manual code join fallback -->
        <div v-if="showManualJoin" class="join-input-section">
          <div class="input-wrapper">
            <input
              v-model="joinCode"
              type="text"
              placeholder="Enter room code (e.g. PK-A3F9)"
              class="room-input"
              maxlength="8"
              @keyup.enter="handleManualJoin"
              autofocus
            />
            <button class="btn-join" @click="handleManualJoin" :disabled="!joinCode.trim()">
              Join →
            </button>
          </div>
          <button class="btn-back-small" @click="showManualJoin = false">← Cancel</button>
        </div>
      </div>

      <!-- Host: Waiting for guest -->
      <div v-if="multiplayerStore.isHost && !multiplayerStore.isOnline" class="waiting-section">
        <div class="room-code-display">
          <span class="code-label">Your Room</span>
          <span class="code-value" @click="copyCode">{{ multiplayerStore.roomCode }}</span>
          <span class="code-copy-hint">{{ copied ? '✓ Copied!' : 'Visible in lobby • click to copy' }}</span>
        </div>
        <div class="waiting-indicator">
          <div class="spinner"></div>
          <span>Waiting for opponent to join...</span>
        </div>
        <button class="btn-cancel" @click="handleCancelRoom">Cancel</button>
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
        <span>Connecting to room...</span>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { lobbyService, type LobbyRoom } from '../services/lobbyService'

const multiplayerStore = useMultiplayerStore()

const emit = defineEmits<{
  (e: 'proceed'): void
  (e: 'back'): void
}>()

const showManualJoin = ref(false)
const joinCode = ref('')
const copied = ref(false)
const rooms = ref<LobbyRoom[]>([])
const lobbyConnected = ref(false)

// Determine the lobby WebSocket URL based on current location
function getLobbyUrl(): string {
  const loc = window.location
  // In production (HTTPS): use wss:// via /ws path (nginx proxies to lobby server)
  if (loc.protocol === 'https:') {
    return `wss://${loc.host}/ws`
  }
  // In development (HTTP): connect directly to lobby server on port 3001
  return `ws://${loc.hostname}:3001`
}

onMounted(() => {
  lobbyService.onRoomList = (list) => {
    console.log('[MultiplayerLobby] Received room list:', list.length, 'rooms')
    rooms.value = list
  }
  lobbyService.onConnected = () => {
    lobbyConnected.value = true
    console.log('[MultiplayerLobby] Lobby connected!')
  }
  lobbyService.onDisconnected = () => {
    lobbyConnected.value = false
  }
  lobbyService.onGuestJoining = (_data) => {
    // The PeerJS connection handles the actual connection notification
    // This is just an early heads-up from the lobby
  }
  lobbyService.onJoinSuccess = async (data) => {
    console.log('[MultiplayerLobby] Join success, connecting to PeerJS room:', data.code)
    // Guest received the room code from lobby — now connect via PeerJS
    await multiplayerStore.joinRoom(data.code)
  }
  lobbyService.onError = (message) => {
    console.error('[Lobby] Error:', message)
  }

  // Connect if not already connected
  if (!lobbyService.isConnected) {
    lobbyService.connect(getLobbyUrl())
  } else {
    lobbyConnected.value = true
  }
})

onUnmounted(() => {
  // Don't disconnect lobby on unmount — let it stay for the session
  // lobbyService.disconnect()
})

async function handleCreateRoom() {
  // Make sure lobby is connected
  if (!lobbyService.isConnected) {
    lobbyService.connect(getLobbyUrl())
    // Wait briefly for connection
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  // Create PeerJS room first
  await multiplayerStore.createRoom()
  // Then register it in the lobby so other players can see it (use the PeerJS room code)
  if (multiplayerStore.roomCode) {
    console.log('[MultiplayerLobby] Registering room in lobby:', multiplayerStore.roomCode, 'connected:', lobbyService.isConnected)
    lobbyService.createRoom('Player 1', multiplayerStore.roomCode)
  } else {
    console.error('[MultiplayerLobby] No room code after createRoom!')
  }
}

async function handleJoinFromLobby(code: string) {
  // Tell the lobby we're joining (removes room from list)
  lobbyService.joinRoom(code, 'Player 2')
  // The actual PeerJS connection happens in onJoinSuccess callback
}

async function handleManualJoin() {
  if (!joinCode.value.trim()) return
  await multiplayerStore.joinRoom(joinCode.value.trim())
}

function handleCancelRoom() {
  lobbyService.cancelRoom()
  multiplayerStore.disconnect()
}

function copyCode() {
  if (multiplayerStore.roomCode) {
    navigator.clipboard.writeText(multiplayerStore.roomCode)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

function refreshRooms() {
  // Reconnect briefly to get fresh list
  if (!lobbyService.isConnected) {
    lobbyService.connect(getLobbyUrl())
  }
}

function formatTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ago`
}

function handleRetry() {
  multiplayerStore.disconnect()
  showManualJoin.value = false
  joinCode.value = ''
}

function handleBack() {
  lobbyService.cancelRoom()
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
  background: #fef6e4;
}

.lobby-card {
  background: #fffaf0;
  border: 1px solid #f3d2a4;
  border-radius: 24px;
  padding: 32px;
  max-width: 520px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(45, 38, 32, 0.08);
}

.lobby-title {
  font-size: 1.8rem;
  font-weight: 900;
  background: linear-gradient(135deg, #f582ae, #5e548e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}

.lobby-subtitle {
  color: #8a7a6a;
  font-size: 0.85rem;
  margin-bottom: 20px;
  font-weight: 600;
}

/* Lobby status */
.lobby-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.lobby-status.connected {
  background: rgba(74, 222, 128, 0.1);
  color: #15803d;
}

.lobby-status.disconnected {
  background: rgba(251, 113, 133, 0.1);
  color: #be123c;
}

.ls-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.lobby-status.connected .ls-dot {
  background: #4ade80;
}

.lobby-status.disconnected .ls-dot {
  background: #fb7185;
  animation: pulse-dot 1.5s infinite;
}

/* Rooms section */
.rooms-section {
  margin-bottom: 16px;
}

.rooms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rooms-title {
  font-size: 1rem;
  font-weight: 800;
  color: #2d2620;
  margin: 0;
}

.btn-refresh {
  background: none;
  border: 1px solid #f3d2a4;
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: #fef0d4;
  transform: rotate(180deg);
}

/* No rooms */
.no-rooms {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  color: #8a7a6a;
  font-size: 0.85rem;
  font-weight: 600;
  background: #fef0d4;
  border-radius: 14px;
  border: 2px dashed #f3d2a4;
}

.no-rooms-icon {
  font-size: 1.8rem;
}

/* Rooms list */
.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 2px solid #f3d2a4;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.room-item:hover {
  border-color: #5e548e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(94, 84, 142, 0.15);
}

.room-host {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.room-host-icon {
  font-size: 1.1rem;
}

.room-host-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #2d2620;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.room-code-mini {
  font-size: 0.65rem;
  font-weight: 700;
  color: #5e548e;
  background: rgba(94, 84, 142, 0.08);
  padding: 2px 6px;
  border-radius: 6px;
}

.room-time {
  font-size: 0.6rem;
  color: #8a7a6a;
}

.btn-join-room {
  background: linear-gradient(135deg, #5e548e, #7c5cb0);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-join-room:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(94, 84, 142, 0.4);
}

/* Lobby actions */
.lobby-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 16px;
}

.btn-create-room {
  background: linear-gradient(135deg, #5e548e, #7c5cb0);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(94, 84, 142, 0.3);
}

.btn-create-room:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(94, 84, 142, 0.4);
}

.btn-manual-join {
  background: white;
  color: #5e548e;
  border: 2px solid #f3d2a4;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-manual-join:hover {
  border-color: #5e548e;
  transform: translateY(-1px);
}

/* Join Input */
.join-input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
}

.room-input {
  flex: 1;
  background: white;
  border: 2px solid #f3d2a4;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 1rem;
  font-weight: 700;
  color: #2d2620;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  outline: none;
  transition: border-color 0.2s;
}

.room-input:focus {
  border-color: #5e548e;
}

.room-input::placeholder {
  font-size: 0.7rem;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 400;
  color: #8a7a6a;
}

.btn-join {
  background: linear-gradient(135deg, #5e548e, #7c5cb0);
  border: none;
  color: white;
  padding: 12px 18px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-join:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(94, 84, 142, 0.4);
}

.btn-join:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-back-small {
  background: none;
  border: none;
  color: #8a7a6a;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px;
}

.btn-back-small:hover {
  color: #2d2620;
}

/* Room Code Display */
.waiting-section {
  margin-bottom: 20px;
}

.room-code-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
}

.code-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #8a7a6a;
}

.code-value {
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: 5px;
  background: linear-gradient(135deg, #5e548e, #f582ae);
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
  font-size: 0.65rem;
  color: #8a7a6a;
}

/* Cancel button */
.btn-cancel {
  background: none;
  border: 1px solid #f3d2a4;
  color: #8a7a6a;
  padding: 8px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 12px;
  transition: all 0.2s;
}

.btn-cancel:hover {
  border-color: #fb7185;
  color: #be123c;
}

/* Waiting indicator */
.waiting-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #8a7a6a;
  font-size: 0.85rem;
  font-weight: 600;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid #f3d2a4;
  border-top-color: #5e548e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.large {
  width: 28px;
  height: 28px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* Connected */
.connected-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.connected-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(74, 222, 128, 0.1);
  border: 2px solid rgba(74, 222, 128, 0.3);
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 700;
  color: #15803d;
  font-size: 0.9rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.connected {
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
}

.btn-start-match {
  background: linear-gradient(135deg, #5e548e, #7c5cb0);
  border: none;
  color: white;
  padding: 14px 36px;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(94, 84, 142, 0.4);
}

.btn-start-match:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(94, 84, 142, 0.5);
}

/* Connecting */
.connecting-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  color: #8a7a6a;
  font-weight: 600;
}

/* Error */
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.error-icon {
  font-size: 1.8rem;
}

.error-text {
  color: #be123c;
  font-weight: 700;
  font-size: 0.9rem;
}

.btn-retry {
  background: rgba(251, 113, 133, 0.1);
  border: 2px solid rgba(251, 113, 133, 0.3);
  color: #be123c;
  padding: 8px 20px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: rgba(251, 113, 133, 0.2);
}

/* Back */
.btn-back {
  background: none;
  border: 1px solid #f3d2a4;
  color: #8a7a6a;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-back:hover {
  border-color: #5e548e;
  color: #5e548e;
}

/* Responsive */
@media (max-width: 480px) {
  .lobby-card {
    padding: 20px 14px;
    border-radius: 18px;
  }

  .lobby-title {
    font-size: 1.4rem;
  }

  .code-value {
    font-size: 1.6rem;
    letter-spacing: 3px;
  }

  .lobby-actions {
    flex-direction: column;
  }

  .room-item {
    padding: 10px 12px;
  }
}
</style>
