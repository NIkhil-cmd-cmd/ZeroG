#!/usr/bin/env bash
# ZeroG memory client — retrieve or record traces via the engine API
set -euo pipefail

ENGINE="${ZEROG_ENGINE_URL:-http://localhost:8000}"
CMD="${1:-}"

case "$CMD" in
  retrieve)
    TASK="${2:?Usage: memory_client.sh retrieve \"task description\" [cluster]}"
    CLUSTER="${3:-}"
    if [ -n "$CLUSTER" ]; then
      curl -sf "$ENGINE/memory/retrieve" \
        -H "Content-Type: application/json" \
        -d "{\"task\":$(python3 -c "import json; print(json.dumps('$TASK'))"),\"cluster\":\"$CLUSTER\"}"
    else
      curl -sf "$ENGINE/memory/retrieve" \
        -H "Content-Type: application/json" \
        -d "{\"task\":$(python3 -c "import json; print(json.dumps('$TASK'))")}"
    fi
    echo
    ;;
  record)
    TASK="${2:?Usage: memory_client.sh record \"task\" \"tool1,tool2\" success|fail [cluster]}"
    TOOLS="${3:?tools required as comma-separated list}"
    OUTCOME="${4:-success}"
    CLUSTER="${5:-}"
    SUCCESS=$([ "$OUTCOME" = "success" ] && echo true || echo false)
    IFS=',' read -ra TOOL_ARR <<< "$TOOLS"
    TOOLS_JSON=$(printf '"%s",' "${TOOL_ARR[@]}" | sed 's/,$//')
    TOOLS_JSON="[$TOOLS_JSON]"
    BODY="{\"task\":$(python3 -c "import json; print(json.dumps('$TASK'))"),\"tools\":$TOOLS_JSON,\"success\":$SUCCESS"
    if [ -n "$CLUSTER" ]; then
      BODY="$BODY,\"cluster\":\"$CLUSTER\""
    fi
    BODY="$BODY}"
    curl -sf "$ENGINE/memory/record" -H "Content-Type: application/json" -d "$BODY"
    echo
    ;;
  health)
    curl -sf "$ENGINE/health" | python3 -m json.tool
    ;;
  *)
    echo "ZeroG memory client"
    echo "  retrieve \"task description\" [cluster]"
    echo "  record \"task\" \"tool1,tool2,tool3\" [success|fail] [cluster]"
    echo "  health"
    exit 1
    ;;
esac
