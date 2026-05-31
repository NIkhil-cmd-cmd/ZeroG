---
name: zerog-shared-memory
description: >
  Shared memory layer for Antigravity agents on Google Cloud tasks.
  Before executing a multi-step GCP task, retrieve similar past session
  traces via the ZeroG engine. After completing, record the tool sequence
  and outcome. Use for Cloud Functions, BigQuery, IAM, and deploy workflows.
  Do not use for real-time external data or user-specific preferences.
  For Antigravity demos read skill/DEMO.md — use zerog_demo.sh and memory_client.sh only; never import ZeroGHarness.
---

# ZeroG: Shared Memory for Antigravity

**Antigravity demo:** read `DEMO.md` in this folder. Use `scripts/zerog_demo.sh` + `scripts/memory_client.sh` only.

## DO NOT (Antigravity)

- Do **not** create Python files (`run_harness_task.py`, etc.)
- Do **not** `import` from `zerog.harness` or `zerog.memory`
- Do **not** call engine `/run` or `/train` from Antigravity — that is the web UI demo only
- Do **use terminal**: `zerog_demo.sh` → your GCP tools → `memory_client.sh record`

ZeroG integrates at **two surfaces**:

1. **MCP proxy (recommended for hackathon demo)** — `engine/zerog_proxy.py` sits between Antigravity and real MCP servers. The agent doesn't know ZeroG exists; tool calls get faster via cached traces. See `skill/MCP.md`.
2. **SKILL.md (this file)** — tells the agent about shared memory and HTTP retrieve/record when not using the proxy.

## MCP proxy (invisible infrastructure)

```bash
cd ~/ZeroG/engine && ./run.sh install
~/ZeroG/scripts/install-mcp-config.sh workspace
# Edit .agents/mcp.json → set REAL_MCP_COMMAND / REAL_MCP_ARGS to your gcloud MCP server
```

Antigravity spawns `zerog_proxy.py` instead of the real server. ZeroG intercepts every `tools/call`, checks memory, forwards if needed, records traces.

Full docs: `skill/MCP.md` · example config: `config/antigravity-mcp.example.json`

## Public install (skill only)

From any machine — clones the repo and installs the skill globally:

```bash
curl -fsSL https://raw.githubusercontent.com/NIkhil-cmd-cmd/ZeroG/main/scripts/install-skill.sh | bash -s public
```

Or with a local clone:

```bash
git clone https://github.com/NIkhil-cmd-cmd/ZeroG.git ~/ZeroG
~/ZeroG/scripts/install-skill.sh global
```

Restart your Antigravity agent session after installing.

## Environment

Set these in your shell, Antigravity workspace env, or `~/.zshrc`:

```bash
export ZEROG_ENGINE_URL=http://localhost:8000
export OPENAI_API_KEY=your-openai-key          # embeddings (retrieve/record)
export GEMINI_API_KEY=your-gemini-key          # optional — only if agent runs tasks via engine
```

Public endpoints:
- **Engine API:** https://soul-hung-entered-logos.trycloudflare.com
- **Web demo:** https://zerogagi.vercel.app
- **GitHub:** https://github.com/NIkhil-cmd-cmd/ZeroG

Health check:
```bash
curl -s "$ZEROG_ENGINE_URL/health"
```

## Skill paths (Antigravity standard)

- Workspace: `.agents/skills/zerog-shared-memory/SKILL.md`
- Global: `~/.gemini/antigravity/skills/zerog-shared-memory/SKILL.md`

## Core rules

- **Always retrieve first** before multi-step GCP work
- **Always record after** task completion
- **Similarity thresholds** (returned in `layer` field):
  - `exact_match` → only when task text is **identical** (byte-level hash). Safe to replay in MCP.
  - `few_shot` → similar task: reuse **tool order only**, always run fresh `write_function` for this task
  - `cold_start` → proceed normally, record for the team
  - Never auto-replay on embedding similarity alone — different triggers need different code

## Antigravity agent protocol (follow exactly)

When the user asks to use this skill:

1. **Run shell only** — never write Python that imports `zerog`
2. **Step 1:** `scripts/zerog_demo.sh "<task>" cloud_functions` (or full path `~/ChorusAI/skill/scripts/zerog_demo.sh`)
3. **Step 2:** Tell user the `layer`, similarity, and tool order from output
4. **Step 3:** Execute the GCP task yourself with Antigravity tools — reuse tool **order**, not prior code
5. **Step 4:** `scripts/memory_client.sh record "<task>" "tool1,tool2,..." success cloud_functions`

If you catch yourself writing `run_harness_task.py` or `from zerog.harness import` — stop and use the shell scripts above.

## Tools

### Retrieve similar traces

```bash
export ZEROG_ENGINE_URL="${ZEROG_ENGINE_URL:-http://localhost:8000}"
~/ChorusAI/skill/scripts/zerog_demo.sh \
  "Deploy Cloud Function with Firestore trigger" \
  cloud_functions
```

Or lower-level:

```bash
~/ChorusAI/skill/scripts/memory_client.sh retrieve \
  "Deploy Cloud Function with Firestore trigger" \
  cloud_functions
```

Or via curl:

```bash
curl -s "$ZEROG_ENGINE_URL/memory/retrieve" \
  -H "Content-Type: application/json" \
  -d '{"task":"Deploy Cloud Function with Firestore trigger","cluster":"cloud_functions"}'
```

Returns: `{ hit, layer, cached_result, examples: [{ task, tools, similarity }] }`

### Record completed trace

```bash
~/ChorusAI/skill/scripts/memory_client.sh record \
  "Deploy Cloud Function with Firestore trigger" \
  "write_function,set_iam,gcloud_deploy,gcloud_check_status,DONE" \
  success \
  cloud_functions
```

Or via curl:

```bash
curl -s "$ZEROG_ENGINE_URL/memory/record" \
  -H "Content-Type: application/json" \
  -d '{"task":"...","tools":["write_function","set_iam","gcloud_deploy","DONE"],"success":true,"cluster":"cloud_functions"}'
```

## Workflow

1. Agent receives GCP task
2. Call `retrieve` with task description (+ cluster if known)
3. If `hit: true` or `layer: few_shot` → use returned trace pattern (skip redundant doc reads, IAM before deploy)
4. Execute task with Gemini / Antigravity tools
5. Call `record` with final tool sequence and success/failure
6. Teammates on different but similar tasks inherit the pattern automatically

## Clusters

Use the `cluster` field when recording/retrieving:

- `cloud_functions` — deploy, IAM, gen2, triggers
- `bigquery` — queries, transfers, BQML
- `iam_security` — roles, org policy, Secret Manager
