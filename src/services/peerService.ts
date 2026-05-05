import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { GameMessage } from '../types/gameMessages'

type MessageHandler = (msg: GameMessage) => void
type StatusHandler = () => void
type ErrorHandler = (err: Error) => void

/**
 * PeerService — manages WebRTC P2P connections via PeerJS.
 * 
 * Host creates a room (gets a code).
 * Guest joins with the code.
 * Messages flow directly P2P after the signaling handshake.
 */
export class PeerService {
  private peer: Peer | null = null
  private connection: DataConnection | null = null
  private messageHandlers: MessageHandler[] = []
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  // Public state
  isConnected = false
  isHost = false
  roomCode: string | null = null

  // Event callbacks
  onConnected: StatusHandler = () => {}
  onDisconnected: StatusHandler = () => {}
  onError: ErrorHandler = () => {}

  /**
   * Generate a short, human-friendly room code from a PeerJS ID.
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I/O/0/1 to avoid confusion
    let code = ''
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return `PK-${code}`
  }

  /**
   * HOST: Create a room and wait for a guest to connect.
   * Returns the room code.
   */
  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      const code = this.generateRoomCode()
      
      // Use the room code as the Peer ID so guest can connect directly
      this.peer = new Peer(code, {
        debug: 1
      })

      this.peer.on('open', (id) => {
        console.log('[PeerService] Host room created:', id)
        this.isHost = true
        this.roomCode = code
        resolve(code)
      })

      this.peer.on('connection', (conn) => {
        console.log('[PeerService] Guest connected!')
        this.connection = conn
        this.setupConnection(conn)
      })

      this.peer.on('error', (err) => {
        console.error('[PeerService] Peer error:', err)
        if (err.type === 'unavailable-id') {
          // Room code collision, try again
          this.peer?.destroy()
          this.createRoom().then(resolve).catch(reject)
        } else {
          this.onError(err)
          reject(err)
        }
      })

      this.peer.on('disconnected', () => {
        console.log('[PeerService] Disconnected from signaling server')
      })
    })
  }

  /**
   * GUEST: Join a room by its code.
   */
  joinRoom(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const normalizedCode = code.toUpperCase().trim()
      
      this.peer = new Peer({
        debug: 1
      })

      this.peer.on('open', () => {
        console.log('[PeerService] Guest connecting to room:', normalizedCode)
        const conn = this.peer!.connect(normalizedCode, {
          reliable: true
        })

        conn.on('open', () => {
          console.log('[PeerService] Connected to host!')
          this.connection = conn
          this.isHost = false
          this.roomCode = normalizedCode
          this.setupConnection(conn)
          resolve()
        })

        conn.on('error', (err) => {
          console.error('[PeerService] Connection error:', err)
          this.onError(err)
          reject(err)
        })

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout — room not found'))
            this.disconnect()
          }
        }, 10000)
      })

      this.peer.on('error', (err) => {
        console.error('[PeerService] Peer error:', err)
        this.onError(err)
        reject(err)
      })
    })
  }

  /**
   * Setup connection event handlers.
   */
  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.isConnected = true
      this.onConnected()
      this.startHeartbeat()
    })

    // If connection was already open (host side), trigger immediately
    if (conn.open) {
      this.isConnected = true
      this.onConnected()
      this.startHeartbeat()
    }

    conn.on('data', (data) => {
      try {
        const msg = data as GameMessage
        // Handle heartbeat internally
        if (msg.type === 'PING') {
          this.send({ type: 'PONG', payload: { timestamp: msg.payload.timestamp } })
          return
        }
        if (msg.type === 'PONG') {
          // Could track latency here if needed
          return
        }
        // Forward to all registered handlers
        this.messageHandlers.forEach(handler => handler(msg))
      } catch (e) {
        console.error('[PeerService] Failed to process message:', e)
      }
    })

    conn.on('close', () => {
      console.log('[PeerService] Connection closed')
      this.isConnected = false
      this.stopHeartbeat()
      this.onDisconnected()
    })

    conn.on('error', (err) => {
      console.error('[PeerService] Connection error:', err)
      this.onError(err)
    })
  }

  /**
   * Send a message to the connected peer.
   */
  send(message: GameMessage): void {
    if (!this.connection || !this.connection.open) {
      console.warn('[PeerService] Cannot send — not connected')
      return
    }
    this.connection.send(message)
  }

  /**
   * Register a message handler.
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler)
  }

  /**
   * Remove all message handlers.
   */
  clearHandlers(): void {
    this.messageHandlers = []
  }

  /**
   * Heartbeat to detect dead connections.
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'PING', payload: { timestamp: Date.now() } })
      }
    }, 5000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Disconnect and clean up everything.
   */
  disconnect(): void {
    this.stopHeartbeat()
    this.connection?.close()
    this.connection = null
    this.peer?.destroy()
    this.peer = null
    this.isConnected = false
    this.isHost = false
    this.roomCode = null
    this.messageHandlers = []
  }
}

// Singleton instance
export const peerService = new PeerService()
