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
from zerog.gnn import train_gnn


async def main():
    memory = ZeroGMemory()
    harness = ZeroGHarness(memory=memory, model="gemini-2.0-flash")

    print(f"ZeroG warmup — generating real traces for {len(TASKS)} tasks...\n")
    for i, t in enumerate(TASKS):
        print(f"[{i+1}/{len(TASKS)}] {t['id']}: {t['task'][:60]}...")
        result = await harness.run_task(t["task"])
        print(
            f"  → {result.turns} turns · {result.tokens} tokens · {'✓' if result.success else '✗'}"
        )

    seed_path = Path(__file__).parent / "data" / "seed_traces.json"
    seed_path.parent.mkdir(exist_ok=True)
    with open(seed_path, "w") as f:
        json.dump(
            [
                {"task": t["task"], "tools": t["tools"], "success": t["success"]}
                for t in memory.traces
            ],
            f,
            indent=2,
        )
    print(f"\nSaved {len(memory.traces)} real traces to {seed_path}")

    tool_vocab = sorted({tool for t in memory.traces for tool in t["tools"]})
    print(f"Training GNN on {len(memory.traces)} traces, {len(tool_vocab)} tools...")
    model = train_gnn(memory.traces, tool_vocab, epochs=200)
    if model:
        import torch

        torch.save(
            {
                "model_state": model.state_dict(),
                "tool_vocab": tool_vocab,
                "num_traces": len(memory.traces),
            },
            Path(__file__).parent / "zerog_gnn.pt",
        )
        print("GNN saved to zerog_gnn.pt")

    stats = memory.get_stats()
    print(
        f"\nZeroG ready: {stats['total_traces']} traces · GNN {'active' if stats['gnn_active'] else 'warming up'}"
    )


if __name__ == "__main__":
    asyncio.run(main())
