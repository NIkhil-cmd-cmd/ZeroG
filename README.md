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

## Add to Antigravity (public)

One command — clones GitHub, installs skill globally, uses public engine:

```bash
curl -fsSL https://raw.githubusercontent.com/NIkhil-cmd-cmd/ZeroG/main/scripts/install-skill.sh | bash -s public
export OPENAI_API_KEY=your-key
```

Then restart your Antigravity agent session.

| URL | Purpose |
|-----|---------|
| https://web-pi-nine-22.vercel.app | Landing, demo, install guide |
| https://zerog-production.up.railway.app | Public memory engine API |
| https://github.com/NIkhil-cmd-cmd/ZeroG | Source + skill |

## Deploy public engine

**Railway** (from `engine/`):
```bash
railway login
railway init
railway variables set GEMINI_API_KEY=... OPENAI_API_KEY=...
railway up
```

**Render**: connect GitHub repo at [render.com](https://render.com) — uses `render.yaml` blueprint.

After deploy, set your public URL in Antigravity:
```bash
export ZEROG_ENGINE_URL=https://your-engine-url
```

## Demo (real runs only)

Cold and ZeroG run **different tasks** in the same cluster — ZeroG transfers deploy patterns via shared memory (few-shot), not same-task caching.

**Local:**
```bash
cd engine && ./run.sh server   # terminal 1
cd web && pnpm dev             # terminal 2
```

Open `/demo` → **Start demo** runs 4 pairs (cold discovers path → ZeroG gets similar task with memory).

## Deploy to Vercel

Web app: https://web-pi-nine-22.vercel.app — `ENGINE_URL` env var points at the public Railway engine.

## The Skill

See `skill/SKILL.md` or `/install` on the web app.

## Built By

Nikhil Krishnaswamy & Advaiyt Sane
