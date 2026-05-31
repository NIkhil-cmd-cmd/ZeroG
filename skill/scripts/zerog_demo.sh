#!/usr/bin/env bash
# Antigravity-friendly ZeroG demo — retrieve with readable output. No Python harness files.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE="${ZEROG_ENGINE_URL:-http://localhost:8000}"
TASK="${1:?Usage: zerog_demo.sh \"task description\" [cluster]}"
CLUSTER="${2:-cloud_functions}"

echo "═══════════════════════════════════════"
echo " ZeroG retrieve · $ENGINE"
echo "═══════════════════════════════════════"
echo "Task: $TASK"
echo "Cluster: $CLUSTER"
echo ""

if ! curl -sf "$ENGINE/health" >/dev/null; then
  echo "✗ Engine offline — start it:"
  echo "  cd ~/ChorusAI/engine && ./run.sh server"
  exit 1
fi

JSON=$("$SCRIPT_DIR/memory_client.sh" retrieve "$TASK" "$CLUSTER")

printf '%s\n' "$JSON" | python3 -c '
import json, sys

data = json.load(sys.stdin)
layer = data.get("layer", "cold_start")
hit = data.get("hit", False)
print(f"Layer: {layer}  hit={hit}")
if data.get("examples"):
    ex = data["examples"][0]
    tools = " → ".join(ex.get("tools", []))
    sim = ex.get("similarity", 0)
    prior = ex.get("task", "")[:100]
    print(f"Similarity: {sim:.2f}")
    print(f"Prior task: {prior}…")
    print(f"Tool order to reuse: {tools}")
    print()
    print("→ Use that TOOL ORDER only. write_function must match THIS task trigger.")
elif hit:
    print("Exact prior run found — reuse tool order, fresh code.")
else:
    print("No similar traces — cold start. Record when done for the team.")
print()
print("Full JSON:")
print(json.dumps(data, indent=2))
'
