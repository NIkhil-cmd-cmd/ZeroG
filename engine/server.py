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
from zerog.tasks import get_demo_pairs, TASKS

CF_PATTERN = ["write_function", "set_iam", "gcloud_deploy", "DONE"]


async def seed_demo_traces(mem: ZeroGMemory, cluster: str | None = None):
    """Pre-load teammate traces so pair 1 ZeroG has memory even after reset."""
    if mem.traces:
        return
    seeds = [t for t in TASKS if t["cluster"] == (cluster or "cloud_functions")][:2]
    for s in seeds:
        await mem.record(
            task=s["task"],
            tools=CF_PATTERN,
            success=True,
            final_output="Teammate deploy pattern",
            cluster=s["cluster"],
        )
from zerog.gnn_service import gnn_service
from zerog.session_log import SessionLog, serialize_lookup

app = FastAPI(title="ZeroG Engine")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

memory = ZeroGMemory()
event_queues: dict[str, asyncio.Queue] = {}
demo_stats: dict = {}
last_recall_ms: float = 0.0
last_demo_log: dict = {}
run_logs: dict[str, SessionLog] = {}


async def build_gnn_recall_viz(task: str, lookup) -> list[dict]:
    """GNN next-tool predictions along the recalled trace path."""
    if not gnn_service.active:
        return []

    steps: list[dict] = []
    tools_to_probe: list[str] = []

    if lookup.cached_tools:
        tools_to_probe = lookup.cached_tools[:5]
    elif lookup.examples:
        tools_to_probe = lookup.examples[0].tool_sequence[:5]
    else:
        tools_to_probe = ["read_docs", "write_function"]

    seen = set()
    for tool in tools_to_probe:
        if tool in seen or tool in ("DONE", "zerog_recall"):
            continue
        seen.add(tool)
        if tool not in gnn_service.tool_vocab:
            steps.append(
                {
                    "current_tool": tool,
                    "predictions": [],
                    "note": "Tool not yet in GNN vocabulary",
                }
            )
            continue
        pred = await gnn_service.predict(task, tool)
        steps.append(
            {
                "current_tool": tool,
                "predictions": [
                    {
                        "tool": p.get("tool", p.get("tool_idx")),
                        "confidence": round(float(p.get("confidence", 0)), 4),
                    }
                    for p in pred.get("predictions", [])[:3]
                ],
            }
        )
    return steps


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
    global demo_stats, last_recall_ms, last_demo_log
    session = SessionLog(run_id)
    run_logs[run_id] = session

    async def emit(payload: dict):
        session.add(payload)
        await queue.put(json.dumps(payload))

    try:
        pairs = get_demo_pairs(config.cluster, config.count)
    except ValueError as e:
        await emit({"type": "error", "message": str(e)})
        return

    await seed_demo_traces(memory, config.cluster)

    cold = ZeroGHarness(memory=None, model=config.model)
    warm = ZeroGHarness(memory=memory, model=config.model)

    cold_results = []
    zerog_results = []
    all_recall_times: list[float] = []

    for pair in pairs:
        i = pair["index"]
        cold_def = pair["cold"]
        zerog_def = pair["zerog"]
        prior_task = cold_def["task"]
        compare_task = zerog_def["task"]
        cluster = cold_def["cluster"]

        # Teammate trace for this pair (prior art — no LLM)
        await memory.record(
            task=prior_task,
            tools=CF_PATTERN,
            success=True,
            final_output="Teammate session pattern",
            cluster=cluster,
        )

        await emit(
            {
                "type": "task_start",
                "index": i,
                "total": len(pairs),
                "task": compare_task,
                "cold_task": prior_task,
                "zerog_task": compare_task,
                "compare_task": compare_task,
                "prior_task": prior_task,
                "cluster": cluster,
                "cold_service": cold_def["service"],
                "zerog_service": zerog_def["service"],
            }
        )

        await emit(
            {
                "type": "phase",
                "agent": "cold",
                "index": i,
                "message": f"Pair {i+1}/{len(pairs)} · Cold — same task, no memory ({zerog_def['service']})…",
            }
        )

        async def cold_cb(tool, detail, status, _i=i):
            await emit(
                {
                    "type": "tool_call",
                    "agent": "cold",
                    "index": _i,
                    "tool": tool,
                    "detail": detail,
                    "status": status,
                }
            )

        async def cold_turn(turn_log, _i=i):
            await emit(
                {
                    "type": "model_turn",
                    "agent": "cold",
                    "index": _i,
                    **turn_log,
                }
            )

        try:
            cold_result = await cold.run_task(
                compare_task,
                cluster=cluster,
                agent_mode="explorer",
                on_tool_call=cold_cb,
                on_turn=cold_turn,
            )
        except Exception as e:
            await emit({"type": "error", "agent": "cold", "message": str(e)})
            break

        cold_results.append(cold_result)

        await emit(
            {
                "type": "task_complete",
                "agent": "cold",
                "index": i,
                "success": cold_result.success,
                "turns": cold_result.turns,
                "model_turns": cold_result.model_turns,
                "tokens": cold_result.tokens,
                "cost": round(cold_result.cost, 6),
                "latency": round(cold_result.latency, 2),
                "tool_calls": cold_result.tool_calls,
                "layer": cold_result.layer,
                "model_logs": cold_result.model_logs,
            }
        )

        await emit(
            {
                "type": "phase",
                "agent": "zerog",
                "index": i,
                "message": f"Pair {i+1}/{len(pairs)} · ZeroG — same task · pattern from {cold_def['service']}…",
            }
        )

        recall_payload: dict = {}

        async def warm_recall(lookup, lookup_ms, _i=i, _task=compare_task, _cluster=cluster):
            nonlocal recall_payload
            all_recall_times.append(lookup_ms)
            gnn_steps = await build_gnn_recall_viz(_task, lookup)
            recall_payload = {
                **serialize_lookup(lookup),
                "task": _task,
                "cluster": _cluster,
                "gnn_steps": gnn_steps,
                "gnn_active": gnn_service.active,
            }
            await emit(
                {
                    "type": "recall",
                    "agent": "zerog",
                    "index": _i,
                    **recall_payload,
                }
            )

        async def warm_cb(tool, detail, status, _i=i):
            await emit(
                {
                    "type": "tool_call",
                    "agent": "zerog",
                    "index": _i,
                    "tool": tool,
                    "detail": detail,
                    "status": status,
                }
            )

        async def warm_turn(turn_log, _i=i):
            await emit(
                {
                    "type": "model_turn",
                    "agent": "zerog",
                    "index": _i,
                    **turn_log,
                }
            )

        recall_start = time.perf_counter()
        try:
            warm_result = await warm.run_task(
                compare_task,
                cluster=cluster,
                agent_mode="pattern",
                on_tool_call=warm_cb,
                on_recall=warm_recall,
                on_turn=warm_turn,
            )
        except Exception as e:
            await emit({"type": "error", "agent": "zerog", "message": str(e)})
            break

        zerog_results.append(warm_result)
        await emit(
            {
                "type": "task_complete",
                "agent": "zerog",
                "index": i,
                "success": warm_result.success,
                "turns": warm_result.turns,
                "model_turns": warm_result.model_turns,
                "tokens": warm_result.tokens,
                "cost": round(warm_result.cost, 6),
                "latency": round(warm_result.latency, 2),
                "tool_calls": warm_result.tool_calls,
                "layer": warm_result.layer,
                "model_logs": warm_result.model_logs,
                "recall": recall_payload,
                "recall_latency_ms": round(all_recall_times[-1], 1) if all_recall_times else 0,
            }
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
        EXPLORER = {"read_docs", "check_permissions", "write_config", "run_tests", "gcloud_check_status"}
        exploration_skipped = sum(
            sum(1 for t in cold_results[i].tool_calls if t in EXPLORER)
            for i in range(len(cold_results))
        )
        # Pattern-transfer pairs only (exclude exact_match replays)
        pattern_cold = sum(
            cold_tokens[i]
            for i, r in enumerate(zerog_results)
            if r.layer != "exact_match"
        )
        pattern_zerog = sum(
            zerog_tokens[i]
            for i, r in enumerate(zerog_results)
            if r.layer != "exact_match"
        )
        pattern_savings = (
            round((1 - pattern_zerog / pattern_cold) * 100, 1)
            if pattern_cold
            else savings
        )
        speedup = (
            round(sum(cold_lat) / max(sum(zerog_lat), 0.01), 2)
            if zerog_lat
            else 1.0
        )
        cold_turns_total = sum(r.model_turns for r in cold_results)
        zerog_turns_total = sum(r.model_turns for r in zerog_results)
        turn_savings = (
            round((1 - zerog_turns_total / cold_turns_total) * 100, 1)
            if cold_turns_total
            else 0
        )
        avg_recall = (
            round(sum(all_recall_times) / len(all_recall_times), 1)
            if all_recall_times
            else 0
        )
        last_recall_ms = avg_recall
        demo_stats = {
            "cold_tokens_series": cold_tokens,
            "zerog_tokens_series": zerog_tokens,
            "cold_turns_series": [r.model_turns for r in cold_results],
            "zerog_turns_series": [r.model_turns for r in zerog_results],
            "token_savings_pct": savings,
            "pattern_savings_pct": pattern_savings,
            "turn_savings_pct": turn_savings,
            "exploration_skipped": exploration_skipped,
            "speedup_ratio": speedup,
            "recall_latency_ms": avg_recall,
            "tasks_run": len(cold_results),
        }

    # Retrain GNN on accumulated real traces
    if len(memory.traces) >= 3:
        gnn_service.train_from_traces(memory.all_traces(), epochs=100)

    export = session.export(demo_stats)
    last_demo_log = export
    await emit(
        {
            "type": "run_complete",
            "total_tasks": len(pairs),
            "run_id": run_id,
            "demo_stats": demo_stats if cold_results and zerog_results else {},
        }
    )


@app.get("/demo/log")
async def demo_log():
    if not last_demo_log:
        raise HTTPException(status_code=404, detail="No demo log yet — run the demo first")
    return last_demo_log


@app.get("/runs/{run_id}/log")
async def run_log(run_id: str):
    session = run_logs.get(run_id)
    if not session:
        if last_demo_log.get("run_id") == run_id:
            return last_demo_log
        raise HTTPException(status_code=404, detail="Run log not found")
    return session.export(demo_stats)


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
    global memory, demo_stats, last_demo_log
    if DB_PATH.exists():
        DB_PATH.unlink()
    memory = ZeroGMemory()
    demo_stats = {}
    last_demo_log = {}
    return {"status": "reset"}
