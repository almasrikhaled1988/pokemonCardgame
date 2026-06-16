# Pokemon Card Game - Lobby Server

Lightweight WebSocket matchmaking server. Players see open rooms and join with one click.

## Run locally

```bash
cd server
npm install
npm start
```

Server runs on port 3001 by default. Set `PORT` env var to change.

## Deploy on your nginx + Cloudflare Tunnel

### 1. Run the server (use pm2 or systemd to keep it alive)

```bash
# With pm2
pm2 start lobby.js --name pokemon-lobby

# Or with systemd (create /etc/systemd/system/pokemon-lobby.service)
```

### 2. nginx config

Add this to your server block:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400;
}
```

### 3. Cloudflare Tunnel

No extra config needed — Cloudflare Tunnel supports WebSocket natively.
Just make sure your tunnel points to nginx and the `/ws` location block is in place.

## How it works

1. Host clicks "Create Room" → PeerJS room created + registered in lobby
2. All connected clients see the room appear in real-time
3. Guest clicks "Join" → lobby notifies both sides → PeerJS P2P connection established
4. Room disappears from lobby (it's full)
5. Game data flows directly P2P (server is NOT in the data path)

The server is stateless and uses ~5MB of RAM. It only handles matchmaking.
