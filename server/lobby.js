const { WebSocketServer } = require('ws')

const PORT = process.env.PORT || 3001
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' })

// Room storage: Map<roomCode, { host, hostName, element, createdAt }>
const rooms = new Map()

// All connected clients
const clients = new Set()

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `PK-${code}`
}

function broadcastRoomList() {
  const roomList = []
  for (const [code, room] of rooms) {
    roomList.push({
      code,
      hostName: room.hostName,
      element: room.element,
      createdAt: room.createdAt
    })
  }
  const msg = JSON.stringify({ type: 'ROOM_LIST', payload: roomList })
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(msg)
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws)
  console.log(`[Lobby] Client connected. Total: ${clients.size}`)

  // Send current room list on connect
  const roomList = []
  for (const [code, room] of rooms) {
    roomList.push({
      code,
      hostName: room.hostName,
      element: room.element,
      createdAt: room.createdAt
    })
  }
  ws.send(JSON.stringify({ type: 'ROOM_LIST', payload: roomList }))

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())

      switch (msg.type) {
        case 'CREATE_ROOM': {
          // Use the PeerJS room code provided by the host
          const code = msg.payload.roomCode || generateCode()
          rooms.set(code, {
            host: ws,
            hostName: msg.payload.hostName || 'Player 1',
            element: msg.payload.element || null,
            createdAt: Date.now()
          })
          ws._roomCode = code
          ws.send(JSON.stringify({ type: 'ROOM_CREATED', payload: { code } }))
          broadcastRoomList()
          console.log(`[Lobby] Room created: ${code} by ${msg.payload.hostName}`)
          break
        }

        case 'JOIN_ROOM': {
          const code = msg.payload.code
          const room = rooms.get(code)
          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }))
            break
          }
          // Notify the host that someone wants to join
          if (room.host.readyState === 1) {
            room.host.send(JSON.stringify({
              type: 'GUEST_JOINING',
              payload: { guestName: msg.payload.guestName || 'Player 2' }
            }))
          }
          // Notify the guest with the room code to use for PeerJS
          ws.send(JSON.stringify({
            type: 'JOIN_SUCCESS',
            payload: { code, hostName: room.hostName }
          }))
          // Remove room from lobby (it's now full)
          rooms.delete(code)
          broadcastRoomList()
          console.log(`[Lobby] ${msg.payload.guestName} joined room ${code}`)
          break
        }

        case 'CANCEL_ROOM': {
          const code = ws._roomCode
          if (code && rooms.has(code)) {
            rooms.delete(code)
            broadcastRoomList()
            console.log(`[Lobby] Room cancelled: ${code}`)
          }
          break
        }

        default:
          console.log(`[Lobby] Unknown message type: ${msg.type}`)
      }
    } catch (e) {
      console.error('[Lobby] Failed to parse message:', e)
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    // If this client was hosting a room, remove it
    if (ws._roomCode && rooms.has(ws._roomCode)) {
      rooms.delete(ws._roomCode)
      broadcastRoomList()
      console.log(`[Lobby] Room removed (host disconnected): ${ws._roomCode}`)
    }
    console.log(`[Lobby] Client disconnected. Total: ${clients.size}`)
  })

  ws.on('error', (err) => {
    console.error('[Lobby] WebSocket error:', err.message)
  })
})

// Clean up stale rooms every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    if (now - room.createdAt > 10 * 60 * 1000) {
      rooms.delete(code)
      console.log(`[Lobby] Stale room removed: ${code}`)
    }
  }
  if (rooms.size > 0) broadcastRoomList()
}, 5 * 60 * 1000)

console.log(`[Lobby] WebSocket server running on port ${PORT}`)
