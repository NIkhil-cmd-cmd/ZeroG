---
name: zerog-shared-memory
description: >
  Shared memory layer for Antigravity agents. Before executing a task,
  retrieve similar past session traces via KNN search. After completing
  a task, record the trace for future sessions. Eliminates cold-start
  cost across teams. Do not use for tasks requiring real-time external
  data or user-specific preferences.
---

# ZeroG: Shared Memory for Antigravity

## Prerequisites

1. **`uv`**: Read the `uv` skill and follow its Setup instructions.
2. **Environment**: Set `ZEROG_DB_PATH` (defaults to ./zerog.db) and
   `OPENAI_API_KEY` in `~/.env`.

## Overview

ZeroG gives Antigravity agents shared memory across sessions. Every
task trace — tool sequence, outcome, embedding — is stored and
retrievable by future agents on the same team. The more sessions
that run, the faster and cheaper subsequent sessions become.

## Core Rules

- **Always check memory first**: Before executing any multi-step task,
  run `retrieve` to check for similar past traces.
- **Always record after completion**: After finishing a task, run
  `record` to store the trace for future sessions.
- **Respect similarity thresholds**:
  - Score > 0.95 → follow the cached trace directly (zero cost)
  - Score 0.70-0.95 → inject as in-context example (+60 tokens)
  - Score < 0.70 → cold start, proceed normally, record for next time

## Available Tools

- **`retrieve`**: KNN search for similar past traces.
  ```
  uv run scripts/memory_client.py retrieve "task description"
  ```
  Returns: top-k traces with similarity scores, tool sequences, outcomes.

- **`record`**: Write a completed trace to shared memory.
  ```
  uv run scripts/memory_client.py record \
    --task "task description" \
    --tools "tool1,tool2,tool3" \
    --outcome "success" \
    --tokens_used 1234
  ```

## Workflow

1. Agent receives task
2. Agent calls `retrieve` with the task description
3. If high-similarity match → follow stored tool sequence
4. Execute the task
5. Agent calls `record` with completed trace
6. Next session on this team benefits automatically
