"""
ZeroG shared memory — 4-layer lookup.
SQLite for persistence, numpy for KNN, in-memory hash cache for speed.
No external database. Everything local.
"""

import hashlib
import json
import os
import sqlite3
import numpy as np
from pathlib import Path
from dataclasses import dataclass, field
from zerog.embeddings import get_embedding

DB_PATH = Path(
    os.environ.get("ZEROG_DB_PATH", str(Path(__file__).parent.parent / "zerog.db"))
)


@dataclass
class Trace:
    task: str
    tool_sequence: list[str]
    success: bool
    embedding: np.ndarray
    similarity: float = 0.0


@dataclass
class LookupResult:
    hit: bool
    cached_result: str | None = None
    examples: list[Trace] = field(default_factory=list)
    layer: str = "cold_start"
    embedding: np.ndarray | None = None


class ZeroGMemory:
    def __init__(self):
        self.hash_cache: dict[str, dict] = {}
        self.traces: list[dict] = []
        self.embeddings: np.ndarray | None = None
        self._init_db()
        self._load_from_db()

    def _init_db(self):
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS traces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_text TEXT NOT NULL,
                task_hash TEXT NOT NULL,
                tool_sequence TEXT NOT NULL,
                success INTEGER NOT NULL,
                embedding BLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_hash ON traces(task_hash)")
        conn.commit()
        conn.close()

    def _load_from_db(self):
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute(
            "SELECT task_text, task_hash, tool_sequence, success, embedding FROM traces"
        ).fetchall()
        conn.close()
        for row in rows:
            task_text, task_hash, tool_seq, success, emb_bytes = row
            emb = np.frombuffer(emb_bytes, dtype=np.float32) if emb_bytes else None
            self.traces.append(
                {
                    "task": task_text,
                    "hash": task_hash,
                    "tools": json.loads(tool_seq),
                    "success": bool(success),
                    "embedding": emb,
                }
            )
            self.hash_cache[task_hash] = {
                "result": f"Tools: {tool_seq}",
                "success": bool(success),
                "tools": json.loads(tool_seq),
            }
        if self.traces:
            valid = [t["embedding"] for t in self.traces if t["embedding"] is not None]
            if valid:
                self.embeddings = np.stack(valid)

    def _hash(self, text: str) -> str:
        return hashlib.sha256(
            " ".join(text.lower().strip().split()).encode()
        ).hexdigest()

    async def lookup(self, task: str) -> LookupResult:
        task_hash = self._hash(task)

        if task_hash in self.hash_cache:
            cached = self.hash_cache[task_hash]
            if cached["success"]:
                return LookupResult(
                    hit=True, cached_result=cached["result"], layer="exact_match"
                )

        embedding = await get_embedding(task)

        if self.embeddings is not None and len(self.embeddings) > 0:
            norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1, norms)
            normed = self.embeddings / norms
            query_norm = embedding / (np.linalg.norm(embedding) + 1e-8)
            similarities = normed @ query_norm

            top_idx = int(np.argmax(similarities))
            top_sim = float(similarities[top_idx])

            if top_sim > 0.95:
                trace = self.traces[top_idx]
                if trace["success"]:
                    return LookupResult(
                        hit=True,
                        cached_result=f"Tools: {' → '.join(trace['tools'])}",
                        layer="semantic_match",
                        embedding=embedding,
                    )

            if top_sim > 0.70:
                top_k_idx = np.argsort(similarities)[-3:][::-1]
                examples = [
                    Trace(
                        task=self.traces[idx]["task"],
                        tool_sequence=self.traces[idx]["tools"],
                        success=self.traces[idx]["success"],
                        embedding=self.traces[idx]["embedding"],
                        similarity=float(similarities[idx]),
                    )
                    for idx in top_k_idx
                ]
                return LookupResult(
                    hit=False,
                    examples=examples,
                    layer="few_shot",
                    embedding=embedding,
                )

        return LookupResult(hit=False, layer="cold_start", embedding=embedding)

    async def record(
        self,
        task: str,
        tools: list[str],
        success: bool,
        embedding: np.ndarray | None = None,
    ):
        if embedding is None:
            embedding = await get_embedding(task)
        task_hash = self._hash(task)
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO traces (task_text, task_hash, tool_sequence, success, embedding) VALUES (?, ?, ?, ?, ?)",
            (task, task_hash, json.dumps(tools), int(success), embedding.tobytes()),
        )
        conn.commit()
        conn.close()
        self.traces.append(
            {
                "task": task,
                "hash": task_hash,
                "tools": tools,
                "success": success,
                "embedding": embedding,
            }
        )
        self.hash_cache[task_hash] = {
            "result": f"Tools: {' → '.join(tools)}",
            "success": success,
            "tools": tools,
        }
        valid = [t["embedding"] for t in self.traces if t["embedding"] is not None]
        if valid:
            self.embeddings = np.stack(valid)

    def get_stats(self) -> dict:
        return {
            "total_traces": len(self.traces),
            "successful": sum(1 for t in self.traces if t["success"]),
            "unique_tasks": len(self.hash_cache),
            "gnn_active": len(self.traces) >= 50,
        }

    def get_graph(self) -> dict:
        nodes, edges = {}, {}
        for trace in self.traces:
            tools = trace["tools"]
            for tool in tools:
                nodes[tool] = nodes.get(tool, 0) + 1
            for i in range(len(tools) - 1):
                key = (tools[i], tools[i + 1])
                edges[key] = edges.get(key, 0) + 1
        return {
            "nodes": [{"id": k, "count": v} for k, v in nodes.items()],
            "edges": [
                {"source": k[0], "target": k[1], "weight": v} for k, v in edges.items()
            ],
        }
