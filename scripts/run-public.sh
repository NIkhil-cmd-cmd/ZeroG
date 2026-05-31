#!/usr/bin/env bash
# Start ZeroG engine + Cloudflare quick tunnel (public URL, no account needed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE_PORT="${ENGINE_PORT:-8000}"

if lsof -ti:"$ENGINE_PORT" >/dev/null 2>&1; then
  echo "Engine already on :$ENGINE_PORT"
else
  echo "Starting engine on :$ENGINE_PORT…"
  (
    cd "$ROOT/engine"
    source .venv/bin/activate
    set -a && source "$ROOT/.env" && set +a
    exec uvicorn server:app --host 127.0.0.1 --port "$ENGINE_PORT"
  ) &
  sleep 3
fi

if ! command -v cloudflared >/dev/null; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

echo "Opening Cloudflare tunnel…"
cloudflared tunnel --url "http://127.0.0.1:$ENGINE_PORT" 2>&1 | tee /tmp/zerog-tunnel.log &
sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/zerog-tunnel.log | head -1)
echo ""
echo "Public engine: ${URL:-see /tmp/zerog-tunnel.log}"
echo "Health:        ${URL}/health"
echo "Web demo:      https://zerogagi.vercel.app/demo"
echo ""
echo "Keep this terminal open during the demo."
