# Deployment Guide — Pokemon Card Game + Lobby Server

This app has two parts:
1. **Frontend** — Static files (Vue build output in `dist/`)
2. **Lobby Server** — A small Node.js WebSocket server for matchmaking (`server/lobby.js`)

Both run on the same machine behind nginx, exposed via Cloudflare Tunnel.

---

## Architecture

```
Internet → Cloudflare Tunnel → nginx (port 80/443)
                                  ├── /        → serves static files (dist/)
                                  └── /ws      → proxy to WebSocket lobby server (port 3001)
```

---

## Step 1: Build the Frontend

On your local machine or on the server:

```bash
cd /path/to/pokemonCardgame-1
npm install
npm run build
```

This creates the `dist/` folder with all static files.

---

## Step 2: Upload Files to Server

Copy these to your server:

```
/var/www/pokemon/          ← root for static files
├── dist/                  ← copy the contents of dist/ here (index.html, assets/, etc.)

/opt/pokemon-lobby/        ← lobby server
├── lobby.js
├── package.json
├── node_modules/          ← run npm install here
```

Or use any paths you prefer — just match them in the nginx config below.

---

## Step 3: Install and Run the Lobby Server

On the server:

```bash
# Install Node.js if not already installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Setup lobby server
mkdir -p /opt/pokemon-lobby
cp server/lobby.js server/package.json /opt/pokemon-lobby/
cd /opt/pokemon-lobby
npm install

# Test it works
node lobby.js
# Should print: [Lobby] WebSocket server running on port 3001
# Press Ctrl+C to stop
```

### Keep it running with pm2:

```bash
# Install pm2 globally
sudo npm install -g pm2

# Start the lobby server
cd /opt/pokemon-lobby
pm2 start lobby.js --name pokemon-lobby

# Make it auto-start on reboot
pm2 startup
pm2 save
```

### Or with systemd (alternative to pm2):

Create `/etc/systemd/system/pokemon-lobby.service`:

```ini
[Unit]
Description=Pokemon Card Game Lobby Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/pokemon-lobby
ExecStart=/usr/bin/node /opt/pokemon-lobby/lobby.js
Restart=always
RestartSec=5
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pokemon-lobby
sudo systemctl start pokemon-lobby
sudo systemctl status pokemon-lobby
```

---

## Step 4: Configure nginx

Create or edit your nginx site config, for example `/etc/nginx/sites-available/pokemon`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your actual domain

    # Serve the static frontend files
    root /var/www/pokemon/dist;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket proxy for the lobby server
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;  # Keep WebSocket alive for 24h
        proxy_send_timeout 86400;
    }

    # Cache static assets
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/pokemon /etc/nginx/sites-enabled/
sudo nginx -t          # Test config for errors
sudo systemctl reload nginx
```

---

## Step 5: Cloudflare Tunnel

If you already have a Cloudflare Tunnel running, just make sure it points to your nginx (port 80 or 443). No extra WebSocket configuration is needed — Cloudflare Tunnel supports WebSocket natively.

Example `config.yml` for cloudflared:

```yaml
tunnel: your-tunnel-id
credentials-file: /root/.cloudflared/your-tunnel-id.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:80
  - service: http_status:404
```

If you haven't set up the tunnel yet:

```bash
cloudflared tunnel create pokemon
cloudflared tunnel route dns pokemon your-domain.com
cloudflared tunnel run pokemon
```

---

## Verify Everything Works

1. **Frontend loads:** Open `https://your-domain.com` — you should see the game
2. **Lobby connects:** Click "Online" mode — the lobby status should show "Lobby connected" (green dot)
3. **Rooms appear:** Open two browsers, create a room in one, the other should see it in the list
4. **Game works:** Click Join on the room, both players should connect via PeerJS P2P

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Lobby shows "Connecting..." forever | Check if lobby server is running: `pm2 status` or `systemctl status pokemon-lobby` |
| WebSocket 502 error | nginx can't reach port 3001. Check firewall and that lobby.js is running |
| WebSocket 400 error | Missing `proxy_set_header Upgrade` in nginx config |
| Rooms don't appear for other players | Both players must be connected to the same lobby server |
| PeerJS connection fails after lobby join | PeerJS uses its own signaling server (peerjs.com). Make sure outbound HTTPS is allowed |

---

## Ports Summary

| Service | Port | Access |
|---------|------|--------|
| nginx | 80 | Public (via Cloudflare Tunnel) |
| Lobby WebSocket | 3001 | Internal only (nginx proxies to it) |
| PeerJS signaling | External | Uses peerjs.com cloud server |
| Game data | P2P | Direct WebRTC between browsers |

---

## Updates

To update the game:

```bash
# On your local machine
npm run build

# Upload new dist/ to server
scp -r dist/* your-server:/var/www/pokemon/dist/

# If lobby.js changed
scp server/lobby.js your-server:/opt/pokemon-lobby/
ssh your-server "pm2 restart pokemon-lobby"
```
