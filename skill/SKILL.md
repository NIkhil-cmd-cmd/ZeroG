---
name: zerog-shared-memory
description: >
  Shared memory layer for Antigravity agents on Google Cloud tasks.
  Before executing a multi-step GCP task, retrieve similar past session
  traces via the ZeroG engine. After completing, record the tool sequence
  and outcome. Use for Cloud Functions, BigQuery, IAM, and deploy workflows.
  Do not use for real-time external data or user-specific preferences.
---

# ZeroG: Shared Memory for Antigravity

## Prerequisites

1. **ZeroG engine running** at `ZEROG_ENGINE_URL` (default `http://localhost:8000`)
   ```bash
   cd /path/to/ZeroG/engine && ./run.sh server
   ```
2. **Environment variables** in your shell or Antigravity workspace:
   - `ZEROG_ENGINE_URL` — engine base URL
   - `OPENAI_API_KEY` — required for embedding-based retrieval

## Install this skill

From your Antigravity project root:
```bash
/path/to/ZeroG/scripts/install-skill.sh workspace
```

Or globally (all workspaces):
```bash
/path/to/ZeroG/scripts/install-skill.sh global
```

Skill paths (Antigravity standard):
- Workspace: `.agents/skills/zerog-shared-memory/SKILL.md`
- Global: `~/.gemini/antigravity/skills/zerog-shared-memory/SKILL.md`

Restart your agent session after installing.

## Core rules

- **Always retrieve first** before multi-step GCP work
- **Always record after** task completion
- **Similarity thresholds** (returned in `layer` field):
  - `exact_match` / `semantic_match` → follow cached trace (minimal tokens)
  - `few_shot` → inject similar trace as in-context example
  - `cold_start` → proceed normally, record for next session

## Tools

### Retrieve similar traces
```bash
export ZEROG_ENGINE_URL="${ZEROG_ENGINE_URL:-http://localhost:8000}"
/path/to/ZeroG/skill/scripts/memory_client.sh retrieve \
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
/path/to/ZeroG/skill/scripts/memory_client.sh record \
  "Deploy Cloud Function with Firestore trigger" \
  "read_docs,write_function,set_iam,gcloud_deploy,DONE" \
  success \
  cloud_functions
```

Or via curl:
```bash
curl -s "$ZEROG_ENGINE_URL/memory/record" \
  -H "Content-Type: application/json" \
  -d '{"task":"...","tools":["read_docs","write_function","gcloud_deploy"],"success":true,"cluster":"cloud_functions"}'
```

## Workflow

1. Agent receives GCP task
2. Call `retrieve` with task description (+ cluster if known)
3. If `hit: true` or `layer: few_shot` → use returned trace pattern
4. Execute task with Gemini / Antigravity tools
5. Call `record` with final tool sequence and success/failure
6. Next session on the team benefits automatically

## Health check
```bash
curl -s "$ZEROG_ENGINE_URL/health"
```
