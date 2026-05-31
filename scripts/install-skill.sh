#!/usr/bin/env bash
# Install ZeroG as an Antigravity skill (workspace or global scope)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_SRC="$REPO_ROOT/skill"
SCOPE="${1:-workspace}"
TARGET_NAME="zerog-shared-memory"

install_workspace() {
  local dest
  dest="$(pwd)/.agents/skills/$TARGET_NAME"
  mkdir -p "$(dirname "$dest")"
  if [ -L "$dest" ] || [ -d "$dest" ]; then
    rm -rf "$dest"
  fi
  ln -sf "$SKILL_SRC" "$dest"
  echo "✓ Workspace skill linked: $dest"
  echo "  Restart your Antigravity agent session to pick it up."
}

install_global() {
  local dest="$HOME/.gemini/antigravity/skills/$TARGET_NAME"
  mkdir -p "$(dirname "$dest")"
  if [ -L "$dest" ] || [ -d "$dest" ]; then
    rm -rf "$dest"
  fi
  ln -sf "$SKILL_SRC" "$dest"
  echo "✓ Global skill linked: $dest"
  echo "  Available in all Antigravity workspaces after restart."
}

case "$SCOPE" in
  workspace|project)
    install_workspace
    ;;
  global)
    install_global
    ;;
  *)
    echo "Usage: ./scripts/install-skill.sh [workspace|global]"
    echo "  workspace — link into ./.agents/skills/ (run from your project root)"
    echo "  global    — link into ~/.gemini/antigravity/skills/"
    exit 1
    ;;
esac

echo ""
echo "Start the memory engine:"
echo "  cd $REPO_ROOT/engine && ./run.sh server"
echo ""
echo "Set in your shell or Antigravity env:"
echo "  export ZEROG_ENGINE_URL=http://localhost:8000"
echo "  export OPENAI_API_KEY=...   # embeddings"
echo "  export GEMINI_API_KEY=...   # agent runs"
