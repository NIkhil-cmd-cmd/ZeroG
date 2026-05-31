"""Load, train, and serve the ToolGNN from real trace data."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch

from zerog.gnn import ToolGNN, train_gnn

ENGINE_ROOT = Path(__file__).parent.parent
CHECKPOINT_PATH = ENGINE_ROOT / "zerog_gnn.pt"
META_PATH = ENGINE_ROOT / "zerog_gnn_meta.json"


class GNNService:
    def __init__(self):
        self.model: ToolGNN | None = None
        self.tool_vocab: list[str] = []
        self.edge_index: torch.Tensor | None = None
        self.edge_weight: torch.Tensor | None = None
        self.loss_history: list[float] = []
        self.accuracy: float = 0.0
        self.num_traces: int = 0
        self.last_trained: str | None = None
        self.load()

    def load(self) -> bool:
        if not CHECKPOINT_PATH.exists():
            return False
        try:
            ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)
            self.tool_vocab = ckpt["tool_vocab"]
            self.model = ToolGNN(len(self.tool_vocab))
            self.model.load_state_dict(ckpt["model_state"])
            self.edge_index = ckpt["edge_index"]
            self.edge_weight = ckpt["edge_weight"]
            self.num_traces = ckpt.get("num_traces", 0)
            if META_PATH.exists():
                meta = json.loads(META_PATH.read_text())
                self.loss_history = meta.get("loss_history", [])
                self.accuracy = meta.get("accuracy", 0.0)
                self.last_trained = meta.get("last_trained")
            self.model.eval()
            return True
        except Exception:
            self.model = None
            return False

    def save(self, edge_index, edge_weight):
        if not self.model:
            return
        torch.save(
            {
                "model_state": self.model.state_dict(),
                "tool_vocab": self.tool_vocab,
                "edge_index": edge_index,
                "edge_weight": edge_weight,
                "num_traces": self.num_traces,
            },
            CHECKPOINT_PATH,
        )
        META_PATH.write_text(
            json.dumps(
                {
                    "loss_history": self.loss_history,
                    "accuracy": self.accuracy,
                    "last_trained": self.last_trained,
                    "num_traces": self.num_traces,
                },
                indent=2,
            )
        )

    def train_from_traces(self, traces: list[dict], epochs: int = 200) -> bool:
        if len(traces) < 3:
            return False
        tool_vocab = sorted({tool for t in traces for tool in t["tools"]})
        result = train_gnn(traces, tool_vocab, epochs=epochs)
        if not result:
            return False
        self.model = result.model
        self.tool_vocab = result.tool_vocab
        self.edge_index = result.edge_index
        self.edge_weight = result.edge_weight
        self.loss_history = result.loss_history
        self.accuracy = result.accuracy
        self.num_traces = result.num_traces
        self.last_trained = datetime.now(timezone.utc).isoformat()
        self.save(result.edge_index, result.edge_weight)
        return True

    @property
    def active(self) -> bool:
        return self.model is not None and len(self.tool_vocab) > 0

    def stats(self) -> dict:
        return {
            "active": self.active,
            "accuracy": round(self.accuracy * 100, 1),
            "loss_history": self.loss_history[-50:],
            "last_trained": self.last_trained,
            "num_traces_trained": self.num_traces,
            "tool_count": len(self.tool_vocab),
        }

    async def predict(self, task: str, current_tool: str) -> dict:
        from zerog.embeddings import get_embedding

        if not self.active or not self.model:
            return {"error": "GNN not trained yet — run warmup or complete demo tasks"}
        if current_tool not in self.tool_vocab:
            return {"error": f"Tool '{current_tool}' not in vocabulary"}

        task_emb = await get_embedding(task)
        idx = self.tool_vocab.index(current_tool)
        raw = self.model.predict(idx, task_emb, self.edge_index, self.edge_weight)
        for p in raw["predictions"]:
            p["tool"] = self.tool_vocab[p["tool_idx"]]
        return {
            "task": task,
            "current_tool": current_tool,
            "predictions": raw["predictions"],
        }


gnn_service = GNNService()
