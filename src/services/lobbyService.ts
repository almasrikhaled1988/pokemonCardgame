/**
 * LobbyService — connects to the WebSocket matchmaking server
 * to list, create, and join rooms without manual code sharing.
 */

export interface LobbyRoom {
  code: string
  hostName: string
  element: string | null
  createdAt: number
}

type RoomListHandler = (rooms: LobbyRoom[]) => void
type JoinSuccessHandler = (data: { code: string; hostName: string }) => void
type GuestJoiningHandler = (data: { guestName: string }) => void
type ErrorHandler = (message: string) => void
type ConnectionHandler = () => void

export class LobbyService {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  // Event handlers
  onRoomList: RoomListHandler = () => {}
  onJoinSuccess: JoinSuccessHandler = () => {}
  onGuestJoining: GuestJoiningHandler = () => {}
  onError: ErrorHandler = () => {}
  onConnected: ConnectionHandler = () => {}
  onDisconnected: ConnectionHandler = () => {}

  isConnected = false

  /**
   * Connect to the lobby WebSocket server.
   * URL should be like ws://localhost:3001 or wss://yourdomain.com/ws
   */
  connect(url: string): void {
    this.url = url
    this.reconnectAttempts = 0
    this.doConnect()
  }

  private doConnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.onConnected()
        console.log('[LobbyService] Connected to lobby server')
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          this.handleMessage(msg)
        } catch (e) {
          console.error('[LobbyService] Failed to parse message:', e)
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false
        this.onDisconnected()
        console.log('[LobbyService] Disconnected from lobby server')
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        // Error is always followed by close, so we just log minimally
        console.warn('[LobbyService] Connection error (server may be offline)')
      }
    } catch (e) {
      console.error('[LobbyService] Failed to connect:', e)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[LobbyService] Max reconnect attempts reached. Stopping.')
      return
    }
    // Exponential backoff: 3s, 6s, 12s, 24s, 48s
    const delay = 3000 * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isConnected) {
        console.log(`[LobbyService] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`)
        this.doConnect()
      }
    }, delay)
  }

  private handleMessage(msg: { type: string; payload: any }): void {
    switch (msg.type) {
      case 'ROOM_LIST':
        this.onRoomList(msg.payload as LobbyRoom[])
        break
      case 'ROOM_CREATED':
        // Host receives their room code
        break
      case 'JOIN_SUCCESS':
        this.onJoinSuccess(msg.payload)
        break
      case 'GUEST_JOINING':
        this.onGuestJoining(msg.payload)
        break
      case 'ERROR':
        this.onError(msg.payload.message)
        break
      default:
        console.log('[LobbyService] Unknown message:', msg.type)
    }
  }

  /**
   * Create a room in the lobby.
   * Pass the PeerJS room code so the guest can connect directly.
   */
  createRoom(hostName: string, roomCode: string): void {
    this.send({ type: 'CREATE_ROOM', payload: { hostName, roomCode } })
  }

  /**
   * Join a room from the lobby list.
   */
  joinRoom(code: string, guestName: string): void {
    this.send({ type: 'JOIN_ROOM', payload: { code, guestName } })
  }

  /**
   * Cancel a room you created.
   */
  cancelRoom(): void {
    this.send({ type: 'CANCEL_ROOM', payload: {} })
  }

  private send(msg: { type: string; payload: any }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[LobbyService] Cannot send — not connected')
      return
    }
    this.ws.send(JSON.stringify(msg))
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent auto-reconnect
    if (this.ws) {
      this.ws.onclose = null // Prevent reconnect on intentional close
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }
}

// Singleton instance
export const lobbyService = new LobbyService()
