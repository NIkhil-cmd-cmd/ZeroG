import asyncio
import json
import time
import uuid
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from zerog.config import DEFAULT_GEMINI_MODEL
from zerog.memory import ZeroGMemory, DB_PATH
from zerog.harness import ZeroGHarness
from zerog.tasks import get_demo_pairs
from zerog.gnn_service import gnn_service

app = FastAPI(title="ZeroG Engine")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

memory = ZeroGMemory()
event_queues: dict[str, asyncio.Queue] = {}
demo_stats: dict = {}
last_recall_ms: float = 0.0


class RunConfig(BaseModel):
    cluster: str | None = None
    count: int = 5
    model: str = DEFAULT_GEMINI_MODEL


class PredictRequest(BaseModel):
    task: str
    current_tool: str


class RetrieveRequest(BaseModel):
    task: str
    cluster: str | None = None
    top_k: int = 3


class RecordRequest(BaseModel):
    task: str
    tools: list[str]
    success: bool = True
    final_output: str = ""
    cluster: str | None = None


@app.get("/")
async def root():
    from zerog.config import GITHUB_REPO, PUBLIC_WEB_URL, PUBLIC_ENGINE_URL

    return {
        "name": "ZeroG Engine",
        "docs": "/docs",
        "health": "/health",
        "github": GITHUB_REPO,
        "web": PUBLIC_WEB_URL,
        "engine": PUBLIC_ENGINE_URL,
        "endpoints": {
            "retrieve": "POST /memory/retrieve",
            "record": "POST /memory/record",
            "predict": "POST /predict",
            "graph": "GET /graph",
            "stats": "GET /stats",
        },
    }


@app.get("/health")
async def health():
    import os

    return {
        "status": "ok",
        "gemini": bool(os.environ.get("GEMINI_API_KEY")),
        "openai": bool(os.environ.get("OPENAI_API_KEY")),
        "traces": len(memory.traces),
        "gnn_active": gnn_service.active,
    }


@app.post("/run")
async def start_run(config: RunConfig, background_tasks: BackgroundTasks):
    run_id = str(uuid.uuid4())
    queue = asyncio.Queue()
    event_queues[run_id] = queue
    background_tasks.add_task(execute_run, run_id, config, queue)
    return {"run_id": run_id}


async def execute_run(run_id: str, config: RunConfig, queue: asyncio.Queue):
    global demo_stats, last_recall_ms
    try:
        pairs = get_demo_pairs(config.cluster, config.count)
    except ValueError as e:
        await queue.put(json.dumps({"type": "error", "message": str(e)}))
        return

    cold = ZeroGHarness(memory=None, model=config.model)
    warm = ZeroGHarness(memory=memory, model=config.model)

    cold_results = []
    zerog_results = []

    for pair in pairs:
        i = pair["index"]
        cold_def = pair["cold"]
        zerog_def = pair["zerog"]
        cold_task = cold_def["task"]
        zerog_task = zerog_def["task"]
        cluster = cold_def["cluster"]

        await queue.put(
            json.dumps(
                {
                    "type": "task_start",
                    "index": i,
                    "total": len(pairs),
                    "task": cold_task,
                    "cold_task": cold_task,
                    "zerog_task": zerog_task,
                    "cluster": cluster,
                    "cold_service": cold_def["service"],
                    "zerog_service": zerog_def["service"],
                }
            )
        )

        await queue.put(
            json.dumps(
                {
                    "type": "phase",
                    "agent": "cold",
                    "index": i,
                    "message": f"Pair {i+1}/{len(pairs)} · Cold — new task ({cold_def['service']})…",
                }
            )
        )

        async def cold_cb(tool, detail, status, _i=i):
            await queue.put(
                json.dumps(
                    {
                        "type": "tool_call",
                        "agent": "cold",
                        "index": _i,
                        "tool": tool,
                        "detail": detail,
                        "status": status,
                    }
                )
            )

        try:
            cold_result = await cold.run_task(
                cold_task, cluster=cluster, on_tool_call=cold_cb
            )
        except Exception as e:
            await queue.put(json.dumps({"type": "error", "agent": "cold", "message": str(e)}))
            break

        cold_results.append(cold_result)

        if cold_result.success:
            await memory.record(
                task=cold_task,
                tools=cold_result.tool_calls,
                success=True,
                final_output=cold_result.final_output,
                cluster=cluster,
            )

        await queue.put(
            json.dumps(
                {
                    "type": "task_complete",
                    "agent": "cold",
                    "index": i,
                    "success": cold_result.success,
                    "turns": cold_result.turns,
                    "tokens": cold_result.tokens,
                    "cost": round(cold_result.cost, 6),
                    "latency": round(cold_result.latency, 2),
                    "tool_calls": cold_result.tool_calls,
                    "layer": cold_result.layer,
                }
            )
        )

        await queue.put(
            json.dumps(
                {
                    "type": "phase",
                    "agent": "zerog",
                    "index": i,
                    "message": f"Pair {i+1}/{len(pairs)} · ZeroG — different task ({zerog_def['service']}) · {len(memory.traces)} traces…",
                }
            )
        )

        async def warm_cb(tool, detail, status, _i=i):
            await queue.put(
                json.dumps(
                    {
                        "type": "tool_call",
                        "agent": "zerog",
                        "index": _i,
                        "tool": tool,
                        "detail": detail,
                        "status": status,
                    }
                )
            )

        recall_start = time.perf_counter()
        try:
            warm_result = await warm.run_task(
                zerog_task, cluster=cluster, on_tool_call=warm_cb
            )
        except Exception as e:
            await queue.put(json.dumps({"type": "error", "agent": "zerog", "message": str(e)}))
            break

        last_recall_ms = (time.perf_counter() - recall_start) * 1000
        zerog_results.append(warm_result)
        await queue.put(
            json.dumps(
                {
                    "type": "task_complete",
                    "agent": "zerog",
                    "index": i,
                    "success": warm_result.success,
                    "turns": warm_result.turns,
                    "tokens": warm_result.tokens,
                    "cost": round(warm_result.cost, 6),
                    "latency": round(warm_result.latency, 2),
                    "tool_calls": warm_result.tool_calls,
                    "layer": warm_result.layer,
                }
            )
        )

    # Compute real demo metrics from this run
    if cold_results and zerog_results:
        cold_tokens = [r.tokens for r in cold_results]
        zerog_tokens = [r.tokens for r in zerog_results]
        cold_lat = [r.latency for r in cold_results]
        zerog_lat = [r.latency for r in zerog_results]
        total_cold = sum(cold_tokens)
        total_zerog = sum(zerog_tokens)
        savings = (
            round((1 - total_zerog / total_cold) * 100, 1) if total_cold else 0
        )
        speedup = (
            round(sum(cold_lat) / max(sum(zerog_lat), 0.01), 2)
            if zerog_lat
            else 1.0
        )
        demo_stats = {
            "cold_tokens_series": cold_tokens,
            "zerog_tokens_series": zerog_tokens,
            "cold_turns_series": [r.turns for r in cold_results],
            "zerog_turns_series": [r.turns for r in zerog_results],
            "token_savings_pct": savings,
            "speedup_ratio": speedup,
            "recall_latency_ms": round(last_recall_ms, 1),
            "tasks_run": len(cold_results),
        }

    # Retrain GNN on accumulated real traces
    if len(memory.traces) >= 3:
        gnn_service.train_from_traces(memory.all_traces(), epochs=100)

    await queue.put(json.dumps({"type": "run_complete", "total_tasks": len(pairs)}))


@app.get("/stream/{run_id}")
async def stream(run_id: str):
    queue = event_queues.get(run_id)
    if not queue:
        raise HTTPException(status_code=404, detail="Run not found")

    async def gen():
        while True:
            data = await queue.get()
            parsed = json.loads(data)
            yield {"event": "message", "data": data}
            if parsed.get("type") in ("run_complete", "error"):
                break
        del event_queues[run_id]

    return EventSourceResponse(gen())


@app.get("/stats")
async def stats():
    return memory.get_stats(gnn_stats=gnn_service.stats(), demo_stats=demo_stats)


@app.get("/graph")
async def graph():
    g = memory.get_graph()
    if not g["nodes"]:
        raise HTTPException(
            status_code=404,
            detail="No traces yet — run the demo or warmup.py to build the graph",
        )
    return g


@app.post("/predict")
async def predict(req: PredictRequest):
    result = await gnn_service.predict(req.task, req.current_tool)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.post("/memory/retrieve")
async def memory_retrieve(req: RetrieveRequest):
    lookup = await memory.lookup(req.task, cluster=req.cluster)
    return {
        "hit": lookup.hit,
        "layer": lookup.layer,
        "cached_result": lookup.cached_result,
        "examples": [
            {
                "task": ex.task,
                "tools": ex.tool_sequence,
                "success": ex.success,
                "similarity": round(ex.similarity, 4),
            }
            for ex in lookup.examples[: req.top_k if req.top_k > 0 else 3]
        ],
    }


@app.post("/memory/record")
async def memory_record(req: RecordRequest):
    await memory.record(
        task=req.task,
        tools=req.tools,
        success=req.success,
        final_output=req.final_output,
        cluster=req.cluster,
    )
    return {"status": "recorded", "total_traces": len(memory.traces)}


@app.post("/train")
async def train():
    ok = gnn_service.train_from_traces(memory.all_traces(), epochs=200)
    if not ok:
        raise HTTPException(status_code=400, detail="Need at least 3 traces with embeddings")
    return gnn_service.stats()


@app.post("/reset")
async def reset():
    global memory, demo_stats
    if DB_PATH.exists():
        DB_PATH.unlink()
    memory = ZeroGMemory()
    demo_stats = {}
    return {"status": "reset"}
