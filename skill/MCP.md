# ZeroG MCP Proxy

**Invisible infrastructure.** Antigravity talks MCP to ZeroG; ZeroG talks MCP to the real tool server.

```
Antigravity Agent
      ↓  MCP (stdio)
  ZeroG Proxy          ← engine/zerog_proxy.py
      ↓
   1. Intercept tools/call
   2. Query ZeroG memory (hash → few-shot → cold)
   3. exact match (identical tool+args key) → return cached result (skip upstream)
   4. few-shot / cold → forward to upstream, record trace
      ↓  MCP (stdio)
  Real gcloud MCP Server
      ↓
   6. Record tool call + result as new trace
```

## Install MCP config

```bash
git clone https://github.com/NIkhil-cmd-cmd/ZeroG.git ~/ZeroG
cd ~/ZeroG/engine && ./run.sh install
./scripts/install-mcp-config.sh workspace   # writes .agents/mcp.json
# or
./scripts/install-mcp-config.sh global        # ~/.gemini/antigravity/mcp.json
```

Edit the generated config — set `REAL_MCP_COMMAND` and `REAL_MCP_ARGS` to your real MCP server (gcloud, BigQuery, etc.).

## Example Antigravity MCP config

```json
{
  "mcpServers": {
    "gcloud": {
      "command": "/path/to/ZeroG/engine/.venv/bin/python",
      "args": ["/path/to/ZeroG/engine/zerog_proxy.py"],
      "env": {
        "REAL_MCP_COMMAND": "npx",
        "REAL_MCP_ARGS": "-y,@YOUR_ORG/gcloud-mcp-server",
        "OPENAI_API_KEY": "your-key",
        "ZEROG_CLUSTER": "cloud_functions"
      }
    }
  }
}
```

## Environment

| Variable | Purpose |
|----------|---------|
| `REAL_MCP_COMMAND` | Upstream MCP executable (e.g. `npx`, `node`) |
| `REAL_MCP_ARGS` | Comma-separated args for upstream server |
| `OPENAI_API_KEY` | Embeddings for semantic memory |
| `ZEROG_CLUSTER` | `cloud_functions`, `bigquery`, `iam_security` |
| `ZEROG_DB_PATH` | SQLite path (default `engine/zerog.db`) |

## Test locally

Terminal 1 — ensure upstream MCP is configured, then Antigravity will spawn the proxy automatically.

Manual smoke test:

```bash
cd ~/ZeroG/engine
source .venv/bin/activate
export OPENAI_API_KEY=...
export REAL_MCP_COMMAND=npx
export REAL_MCP_ARGS=-y,@YOUR_ORG/gcloud-mcp-server
./run.sh proxy
```

## Why MCP + Skill

| Surface | Role |
|---------|------|
| **MCP proxy** | Protocol-level integration — zero prompt changes, works with any MCP server |
| **SKILL.md** | Lightweight hint that ZeroG memory exists + manual retrieve/record via HTTP |

Show judges both: transport-layer proxy (impressive) and skill-level API (practical).

## Response metadata

Each proxied tool result includes a `[ZeroG · layer=…]` footer and JSON block with lookup metadata (`exact_match`, `few_shot`, `cold_start`, examples, similarity).
