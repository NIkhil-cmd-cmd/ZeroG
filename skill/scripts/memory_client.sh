#!/usr/bin/env bash
# ZeroG memory client — retrieve or record traces via the engine API
set -euo pipefail

ENGINE="${ZEROG_ENGINE_URL:-http://localhost:8000}"
CMD="${1:-}"

json_post() {
  local path="$1"
  local body="$2"
  curl -sf "$ENGINE$path" \
    -H "Content-Type: application/json" \
    -d "$body"
}

case "$CMD" in
  retrieve)
    TASK="${2:?Usage: memory_client.sh retrieve \"task description\" [cluster]}"
    CLUSTER="${3:-}"
    BODY=$(python3 -c 'import json,sys; print(json.dumps({"task":sys.argv[1],"cluster":sys.argv[2]} if sys.argv[2] else {"task":sys.argv[1]}))' "$TASK" "$CLUSTER")
    json_post "/memory/retrieve" "$BODY" | python3 -m json.tool
    ;;
  record)
    TASK="${2:?Usage: memory_client.sh record \"task\" \"tool1,tool2\" success|fail [cluster]}"
    TOOLS="${3:?tools required as comma-separated list}"
    OUTCOME="${4:-success}"
    CLUSTER="${5:-}"
    SUCCESS=$([ "$OUTCOME" = "success" ] && echo True || echo False)
    BODY=$(python3 -c '
import json, sys
task, tools_csv, success, cluster = sys.argv[1], sys.argv[2], sys.argv[3] == "True", sys.argv[4]
tools = [t.strip() for t in tools_csv.split(",") if t.strip()]
payload = {"task": task, "tools": tools, "success": success}
if cluster:
    payload["cluster"] = cluster
print(json.dumps(payload))
' "$TASK" "$TOOLS" "$SUCCESS" "$CLUSTER")
    json_post "/memory/record" "$BODY" | python3 -m json.tool
    ;;
  health)
    curl -sf "$ENGINE/health" | python3 -m json.tool
    ;;
  *)
    echo "ZeroG memory client"
    echo "  health"
    echo "  retrieve \"task description\" [cluster]"
    echo "  record \"task\" \"tool1,tool2,tool3\" [success|fail] [cluster]"
    exit 1
    ;;
esac
