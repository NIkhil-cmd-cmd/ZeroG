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

## Public install (one command)

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
export ZEROG_ENGINE_URL=https://zerog-production.up.railway.app
export OPENAI_API_KEY=your-openai-key          # embeddings (retrieve/record)
export GEMINI_API_KEY=your-gemini-key          # optional — only if agent runs tasks via engine
```

Public endpoints:
- **Engine API:** https://zerog-production.up.railway.app
- **Web demo:** https://web-pi-nine-22.vercel.app
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
  - `exact_match` / `semantic_match` → follow cached trace (minimal tokens)
  - `few_shot` → inject similar trace from same cluster (transfers across services)
  - `cold_start` → proceed normally, record for the team

## Tools

### Retrieve similar traces

```bash
export ZEROG_ENGINE_URL="${ZEROG_ENGINE_URL:-https://zerog-production.up.railway.app}"
~/ZeroG/skill/scripts/memory_client.sh retrieve \
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
~/ZeroG/skill/scripts/memory_client.sh record \
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
