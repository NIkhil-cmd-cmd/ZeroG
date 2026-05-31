# ZeroG

**Zero cold starts.** The shared memory layer for Antigravity.

When an Antigravity agent solves a task, ZeroG writes the trace into shared memory. When the next agent hits a similar task, ZeroG retrieves that trace and injects it as context. No retraining. No fine-tuning. Just a SKILL.md and a memory backend.

Built for [AGI House x Google DeepMind Build Day](https://github.com/NIkhil-cmd-cmd/ZeroG) · May 2026

## Architecture

```
zerog/
├── web/          # Next.js — landing page, live demo, GNN visualizer
├── engine/       # Python — FastAPI + shared memory + GNN
└── skill/        # Antigravity SKILL.md
```

## Quick Start

### 1. Environment

```bash
cp .env.example .env
# Add your GEMINI_API_KEY and OPENAI_API_KEY
```

### 2. Python Engine

```bash
cd engine
pip install -r requirements.txt
python warmup.py          # Generate traces + train GNN (requires API keys)
uvicorn server:app --reload --port 8000
```

### 3. Web Frontend

```bash
cd web
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with full pitch |
| `/demo` | Split-screen cold vs ZeroG demo (SSE) |
| `/graph` | Force-directed GNN tool-use visualizer |

## Demo (real runs only)

The demo calls **Gemini** for tool-calling and **OpenAI** for embeddings. No simulated fallback.

**Required in `.env`:**
- `GEMINI_API_KEY` — agent runs
- `OPENAI_API_KEY` — memory embeddings + GNN task conditioning

```bash
cd engine && ./run.sh server   # terminal 1
cd web && pnpm dev             # terminal 2
```

Open `/demo` → **START** runs 3 real task pairs (cold vs ZeroG), streams live tool calls, retrains the GNN on accumulated traces.

Optional: `./run.sh warmup` pre-generates traces for all 15 GCP tasks.

## Deploy to Vercel

The Vercel deployment serves the **landing page and graph UI**. The live demo requires the Python engine running locally (or hosted separately) with `ENGINE_URL` set in Vercel env vars.

## The Skill

Install as an Antigravity skill:

```bash
npx skills add https://raw.githubusercontent.com/NIkhil-cmd-cmd/ZeroG/main/skill/SKILL.md
```

See `skill/SKILL.md` for full documentation.

## Built By

Nikhil Krishnaswamy & Advaiyt Sane
