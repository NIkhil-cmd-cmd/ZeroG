import asyncio
import json
import uuid
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from zerog.memory import ZeroGMemory
from zerog.harness import ZeroGHarness
from zerog.tasks import get_tasks_for_demo

app = FastAPI(title="ZeroG Engine")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

memory = ZeroGMemory()
event_queues: dict[str, asyncio.Queue] = {}


class RunConfig(BaseModel):
    cluster: str | None = None
    count: int = 10
    model: str = "gemini-2.0-flash"


@app.post("/run")
async def start_run(config: RunConfig, background_tasks: BackgroundTasks):
    run_id = str(uuid.uuid4())
    queue = asyncio.Queue()
    event_queues[run_id] = queue
    background_tasks.add_task(execute_run, run_id, config, queue)
    return {"run_id": run_id}


async def execute_run(run_id: str, config: RunConfig, queue: asyncio.Queue):
    tasks = get_tasks_for_demo(config.cluster, config.count)
    cold = ZeroGHarness(memory=None, model=config.model)
    warm = ZeroGHarness(memory=memory, model=config.model)

    for i, task_def in enumerate(tasks):
        task = task_def["task"]
        await queue.put(
            json.dumps(
                {
                    "type": "task_start",
                    "index": i,
                    "task": task,
                    "cluster": task_def["cluster"],
                    "service": task_def["service"],
                }
            )
        )

        async def cold_cb(tool, detail, status):
            await queue.put(
                json.dumps(
                    {
                        "type": "tool_call",
                        "agent": "cold",
                        "index": i,
                        "tool": tool,
                        "detail": detail,
                        "status": status,
                    }
                )
            )

        cold_result = await cold.run_task(task, on_tool_call=cold_cb)
        await queue.put(
            json.dumps(
                {
                    "type": "task_complete",
                    "agent": "cold",
                    "index": i,
                    "success": cold_result.success,
                    "turns": cold_result.turns,
                    "tokens": cold_result.tokens,
                    "cost": round(cold_result.cost, 4),
                    "latency": round(cold_result.latency, 2),
                    "tool_calls": cold_result.tool_calls,
                    "layer": cold_result.layer,
                }
            )
        )

        async def warm_cb(tool, detail, status):
            await queue.put(
                json.dumps(
                    {
                        "type": "tool_call",
                        "agent": "zerog",
                        "index": i,
                        "tool": tool,
                        "detail": detail,
                        "status": status,
                    }
                )
            )

        warm_result = await warm.run_task(task, on_tool_call=warm_cb)
        await queue.put(
            json.dumps(
                {
                    "type": "task_complete",
                    "agent": "zerog",
                    "index": i,
                    "success": warm_result.success,
                    "turns": warm_result.turns,
                    "tokens": warm_result.tokens,
                    "cost": round(warm_result.cost, 4),
                    "latency": round(warm_result.latency, 2),
                    "tool_calls": warm_result.tool_calls,
                    "layer": warm_result.layer,
                }
            )
        )

    await queue.put(json.dumps({"type": "run_complete", "total_tasks": len(tasks)}))


@app.get("/stream/{run_id}")
async def stream(run_id: str):
    queue = event_queues.get(run_id)
    if not queue:
        return {"error": "Not found"}

    async def gen():
        while True:
            data = await queue.get()
            parsed = json.loads(data)
            yield {"event": "message", "data": data}
            if parsed.get("type") == "run_complete":
                break
        del event_queues[run_id]

    return EventSourceResponse(gen())


@app.get("/stats")
async def stats():
    return memory.get_stats()


DEFAULT_GRAPH = {
    "nodes": [
        {"id": "read_docs", "count": 45},
        {"id": "write_function", "count": 38},
        {"id": "gcloud_deploy", "count": 35},
        {"id": "set_iam", "count": 22},
        {"id": "run_tests", "count": 30},
        {"id": "check_permissions", "count": 18},
        {"id": "query_bigquery", "count": 15},
        {"id": "write_config", "count": 14},
        {"id": "zerog_recall", "count": 32},
        {"id": "generate_code", "count": 50},
    ],
    "edges": [
        {"source": "zerog_recall", "target": "generate_code", "weight": 28},
        {"source": "read_docs", "target": "write_function", "weight": 34},
        {"source": "generate_code", "target": "write_function", "weight": 42},
        {"source": "write_function", "target": "gcloud_deploy", "weight": 35},
        {"source": "gcloud_deploy", "target": "set_iam", "weight": 18},
        {"source": "set_iam", "target": "gcloud_deploy", "weight": 17},
        {"source": "write_function", "target": "run_tests", "weight": 20},
        {"source": "run_tests", "target": "write_function", "weight": 9},
        {"source": "check_permissions", "target": "set_iam", "weight": 11},
        {"source": "query_bigquery", "target": "write_function", "weight": 6},
        {"source": "write_config", "target": "gcloud_deploy", "weight": 8},
    ],
}


@app.get("/graph")
async def graph():
    g = memory.get_graph()
    if not g["nodes"]:
        return DEFAULT_GRAPH
    return g


@app.post("/reset")
async def reset():
    global memory
    memory = ZeroGMemory()
    return {"status": "reset"}
