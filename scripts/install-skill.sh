#!/usr/bin/env bash
# Install ZeroG as an Antigravity skill (workspace, global, or from public GitHub)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_REPO="https://github.com/NIkhil-cmd-cmd/ZeroG.git"
ZEROG_HOME="${ZEROG_HOME:-$HOME/ZeroG}"
PUBLIC_ENGINE_URL="${ZEROG_ENGINE_URL:-https://soul-hung-entered-logos.trycloudflare.com}"
SCOPE="${1:-workspace}"
TARGET_NAME="zerog-shared-memory"

ensure_public_repo() {
  if [ ! -d "$ZEROG_HOME/.git" ]; then
    echo "Cloning ZeroG from GitHub → $ZEROG_HOME"
    git clone --depth 1 "$GITHUB_REPO" "$ZEROG_HOME"
  else
    git -C "$ZEROG_HOME" pull --ff-only 2>/dev/null || true
  fi
}

link_skill() {
  local dest="$1"
  local src="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -L "$dest" ] || [ -d "$dest" ]; then
    rm -rf "$dest"
  fi
  ln -sf "$src" "$dest"
  echo "✓ Skill linked: $dest → $src"
}

install_workspace() {
  local dest
  dest="$(pwd)/.agents/skills/$TARGET_NAME"
  link_skill "$dest" "$REPO_ROOT/skill"
  echo "  Restart your Antigravity agent session to pick it up."
}

install_global() {
  local dest="$HOME/.gemini/antigravity/skills/$TARGET_NAME"
  link_skill "$dest" "$REPO_ROOT/skill"
  echo "  Available in all Antigravity workspaces after restart."
}

install_public() {
  ensure_public_repo
  local dest="$HOME/.gemini/antigravity/skills/$TARGET_NAME"
  link_skill "$dest" "$ZEROG_HOME/skill"
  echo ""
  echo "Public ZeroG engine (shared memory API):"
  echo "  export ZEROG_ENGINE_URL=$PUBLIC_ENGINE_URL"
  echo ""
  echo "Add to Antigravity env or ~/.zshrc:"
  echo "  export ZEROG_ENGINE_URL=$PUBLIC_ENGINE_URL"
  echo "  export OPENAI_API_KEY=your-key   # embeddings"
  echo ""
  echo "Test:"
  echo "  curl -s \$ZEROG_ENGINE_URL/health | python3 -m json.tool"
  echo "  $ZEROG_HOME/skill/scripts/memory_client.sh health"
}

case "$SCOPE" in
  workspace|project)
    install_workspace
    ;;
  global)
    install_global
    ;;
  public|github)
    install_public
    ;;
  *)
    echo "Usage: ./scripts/install-skill.sh [workspace|global|public]"
    echo "  workspace — link from local clone into ./.agents/skills/"
    echo "  global    — link from local clone into ~/.gemini/antigravity/skills/"
    echo "  public    — clone GitHub repo + global skill (no local clone needed)"
    exit 1
    ;;
esac

echo ""
echo "Engine URL (local dev):"
echo "  export ZEROG_ENGINE_URL=http://localhost:8000"
echo "  cd ${REPO_ROOT}/engine && ./run.sh server"
echo ""
echo "Repo: $GITHUB_REPO"
echo "Web:  https://web-pi-nine-22.vercel.app"
