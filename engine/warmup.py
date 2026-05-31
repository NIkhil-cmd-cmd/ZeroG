"""
Generate real traces from Gemini, then train the GNN.
Run BEFORE the demo: python warmup.py
"""

import asyncio
import json
from pathlib import Path
from zerog.memory import ZeroGMemory
from zerog.harness import ZeroGHarness
from zerog.tasks import TASKS
from zerog.gnn_service import gnn_service

async def main():
    memory = ZeroGMemory()
    harness = ZeroGHarness(memory=memory)

    print(f"ZeroG warmup — generating real traces for {len(TASKS)} tasks...\n")
    for i, t in enumerate(TASKS):
        print(f"[{i+1}/{len(TASKS)}] {t['id']}: {t['task'][:60]}...")
        try:
            result = await harness.run_task(t["task"])
            print(
                f"  → {result.turns} turns · {result.tokens} tokens · "
                f"{'✓' if result.success else '✗'} · {result.layer}"
            )
        except Exception as e:
            print(f"  ✗ {e}")

    seed_path = Path(__file__).parent / "data" / "seed_traces.json"
    seed_path.parent.mkdir(exist_ok=True)
    with open(seed_path, "w") as f:
        json.dump(
            [
                {
                    "task": t["task"],
                    "tools": t["tools"],
                    "success": t["success"],
                    "final_output": t.get("final_output", ""),
                }
                for t in memory.all_traces()
            ],
            f,
            indent=2,
        )
    print(f"\nSaved {len(memory.traces)} real traces to {seed_path}")

    if len(memory.traces) >= 3:
        ok = gnn_service.train_from_traces(memory.all_traces(), epochs=200)
        print(f"GNN trained: {ok} · accuracy {gnn_service.accuracy * 100:.1f}%")

    stats = memory.get_stats(gnn_stats=gnn_service.stats())
    print(f"\nZeroG ready: {stats['total_traces']} traces")


if __name__ == "__main__":
    asyncio.run(main())
