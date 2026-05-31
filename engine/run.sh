#!/usr/bin/env bash
# ZeroG engine — always use the venv, not system pip3
set -e
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

source .venv/bin/activate

# Load API keys from project root .env
if [ -f ../.env ]; then
  set -a
  source ../.env
  set +a
fi

case "${1:-server}" in
  install)
    pip install -r requirements.txt
    ;;
  warmup)
    python warmup.py
    ;;
  server)
    uvicorn server:app --reload --port 8000
    ;;
  *)
    echo "Usage: ./run.sh [install|warmup|server]"
    exit 1
    ;;
esac
