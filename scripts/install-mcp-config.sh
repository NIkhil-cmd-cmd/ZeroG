#!/usr/bin/env bash
# Print Antigravity MCP config snippet for ZeroG proxy (workspace or global)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="${REPO_ROOT}/engine/.venv/bin/python"
PROXY="${REPO_ROOT}/engine/zerog_proxy.py"
SCOPE="${1:-workspace}"

if [ ! -x "$PYTHON" ]; then
  PYTHON="$(command -v python3)"
fi

snippet() {
  cat <<EOF
{
  "mcpServers": {
    "gcloud": {
      "command": "$PYTHON",
      "args": ["$PROXY"],
      "env": {
        "REAL_MCP_COMMAND": "npx",
        "REAL_MCP_ARGS": "-y,@YOUR_ORG/gcloud-mcp-server",
        "OPENAI_API_KEY": "\${OPENAI_API_KEY}",
        "ZEROG_CLUSTER": "cloud_functions",
        "ZEROG_DB_PATH": "zerog.db"
      }
    }
  }
}
EOF
}

case "$SCOPE" in
  workspace)
    DEST="$(pwd)/.agents/mcp.json"
    mkdir -p "$(dirname "$DEST")"
    snippet > "$DEST"
    echo "✓ Wrote $DEST"
    ;;
  global)
    DEST="$HOME/.gemini/antigravity/mcp.json"
    mkdir -p "$(dirname "$DEST")"
    snippet > "$DEST"
    echo "✓ Wrote $DEST"
    ;;
  print)
    snippet
    ;;
  *)
    echo "Usage: ./scripts/install-mcp-config.sh [workspace|global|print]"
    exit 1
    ;;
esac

echo ""
echo "Set REAL_MCP_COMMAND / REAL_MCP_ARGS to your real gcloud MCP server."
echo "Restart Antigravity after updating MCP config."
