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

## Demo Without Engine

The web app includes a **simulated demo fallback** when the Python engine is offline. Click START on `/demo` — it works on Vercel without a backend.

For live Gemini runs, start the engine locally and set `ENGINE_URL=http://localhost:8000`.

## Deploy to Vercel

```bash
cd web
vercel --prod
```

Set environment variables in Vercel dashboard if connecting to a hosted engine.

## The Skill

Install as an Antigravity skill:

```bash
npx skills add zerog/shared-memory
```

See `skill/SKILL.md` for full documentation.

## Built By

Nikhil Krishnaswamy & Advaiyt Sane
