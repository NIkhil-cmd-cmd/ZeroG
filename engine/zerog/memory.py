"""
ZeroG shared memory — 4-layer lookup.
SQLite for persistence, numpy for KNN, in-memory hash cache for speed.
"""

import hashlib
import json
import os
import sqlite3
import time
import numpy as np
from pathlib import Path
from dataclasses import dataclass, field
from zerog.embeddings import get_embedding

_engine_root = Path(__file__).parent.parent
_raw = os.environ.get("ZEROG_DB_PATH")
if _raw:
    DB_PATH = Path(_raw)
    if not DB_PATH.is_absolute():
        normalized = _raw.replace("\\", "/")
        if normalized in ("./engine/zerog.db", "engine/zerog.db"):
            DB_PATH = _engine_root / "zerog.db"
        else:
            DB_PATH = (_engine_root / DB_PATH).resolve()
else:
    DB_PATH = _engine_root / "zerog.db"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)


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
    cached_tools: list[str] | None = None
    examples: list[Trace] = field(default_factory=list)
    layer: str = "cold_start"
    embedding: np.ndarray | None = None


class ZeroGMemory:
    def __init__(self):
        self.hash_cache: dict[str, dict] = {}
        self.traces: list[dict] = []
        self.embeddings: np.ndarray | None = None
        self.embedding_trace_idx: list[int] = []
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
                final_output TEXT,
                cluster TEXT,
                embedding BLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )
        try:
            conn.execute("ALTER TABLE traces ADD COLUMN final_output TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE traces ADD COLUMN cluster TEXT")
        except sqlite3.OperationalError:
            pass
        conn.execute("CREATE INDEX IF NOT EXISTS idx_hash ON traces(task_hash)")
        conn.commit()
        conn.close()

    def _load_from_db(self):
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute(
            "SELECT task_text, task_hash, tool_sequence, success, final_output, cluster, embedding FROM traces"
        ).fetchall()
        conn.close()
        for i, row in enumerate(rows):
            task_text, task_hash, tool_seq, success, final_output, cluster, emb_bytes = row
            emb = np.frombuffer(emb_bytes, dtype=np.float32) if emb_bytes else None
            tools = json.loads(tool_seq)
            self.traces.append(
                {
                    "task": task_text,
                    "hash": task_hash,
                    "tools": tools,
                    "success": bool(success),
                    "final_output": final_output or "",
                    "cluster": cluster,
                    "embedding": emb,
                }
            )
            self.hash_cache[task_hash] = {
                "result": final_output or f"Tools: {' → '.join(tools)}",
                "success": bool(success),
                "tools": tools,
            }
            if emb is not None:
                self.embedding_trace_idx.append(i)
        if self.embedding_trace_idx:
            self.embeddings = np.stack(
                [self.traces[i]["embedding"] for i in self.embedding_trace_idx]
            )

    def _hash(self, text: str) -> str:
        return hashlib.sha256(
            " ".join(text.lower().strip().split()).encode()
        ).hexdigest()

    def _similarity_search(self, embedding: np.ndarray) -> tuple[int, float]:
        norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        normed = self.embeddings / norms
        query_norm = embedding / (np.linalg.norm(embedding) + 1e-8)
        similarities = normed @ query_norm
        top_emb_idx = int(np.argmax(similarities))
        return self.embedding_trace_idx[top_emb_idx], float(similarities[top_emb_idx])

    async def lookup(self, task: str, cluster: str | None = None) -> LookupResult:
        t0 = time.perf_counter()
        task_hash = self._hash(task)

        if task_hash in self.hash_cache:
            cached = self.hash_cache[task_hash]
            if cached["success"]:
                return LookupResult(
                    hit=True,
                    cached_result=cached["result"],
                    cached_tools=cached.get("tools", []),
                    layer="exact_match",
                )

        embedding = await get_embedding(task)

        if self.embeddings is not None and len(self.embeddings) > 0:
            norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1, norms)
            normed = self.embeddings / norms
            query_norm = embedding / (np.linalg.norm(embedding) + 1e-8)
            sims = normed @ query_norm
            top_k_emb = np.argsort(sims)[-3:][::-1]

            # Similar tasks share tool ORDER only — never auto-replay (hit=False always).
            # Only identical task text (hash above) may skip execution (MCP / exact repeat).
            examples = [
                Trace(
                    task=self.traces[self.embedding_trace_idx[idx]]["task"],
                    tool_sequence=self.traces[self.embedding_trace_idx[idx]]["tools"],
                    success=self.traces[self.embedding_trace_idx[idx]]["success"],
                    embedding=self.traces[self.embedding_trace_idx[idx]]["embedding"],
                    similarity=float(sims[idx]),
                )
                for idx in top_k_emb
                if self.traces[self.embedding_trace_idx[idx]]["success"]
                and float(sims[idx]) > 0.50
            ]
            if examples:
                return LookupResult(
                    hit=False,
                    examples=examples,
                    layer="few_shot",
                    embedding=embedding,
                )

        # Same-cluster fallback: most recent successful trace in this domain
        if cluster:
            prior = [
                t
                for t in self.traces
                if t.get("cluster") == cluster and t["success"]
            ]
            if prior:
                best = prior[-1]
                best_emb = best.get("embedding")
                sim = 0.0
                if best_emb is not None:
                    qn = embedding / (np.linalg.norm(embedding) + 1e-8)
                    bn = best_emb / (np.linalg.norm(best_emb) + 1e-8)
                    sim = float(np.dot(qn, bn))
                return LookupResult(
                    hit=False,
                    examples=[
                        Trace(
                            task=best["task"],
                            tool_sequence=best["tools"],
                            success=True,
                            embedding=best_emb,
                            similarity=sim,
                        )
                    ],
                    layer="few_shot",
                    embedding=embedding,
                )

        _ = time.perf_counter() - t0
        return LookupResult(hit=False, layer="cold_start", embedding=embedding)

    async def record(
        self,
        task: str,
        tools: list[str],
        success: bool,
        final_output: str = "",
        embedding: np.ndarray | None = None,
        cluster: str | None = None,
    ):
        if embedding is None:
            embedding = await get_embedding(task)
        task_hash = self._hash(task)
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO traces (task_text, task_hash, tool_sequence, success, final_output, cluster, embedding) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                task,
                task_hash,
                json.dumps(tools),
                int(success),
                final_output,
                cluster,
                embedding.tobytes(),
            ),
        )
        conn.commit()
        conn.close()
        idx = len(self.traces)
        self.traces.append(
            {
                "task": task,
                "hash": task_hash,
                "tools": tools,
                "success": success,
                "final_output": final_output,
                "cluster": cluster,
                "embedding": embedding,
            }
        )
        self.hash_cache[task_hash] = {
            "result": final_output or f"Tools: {' → '.join(tools)}",
            "success": success,
            "tools": tools,
        }
        self.embedding_trace_idx.append(idx)
        if self.embeddings is None:
            self.embeddings = embedding.reshape(1, -1)
        else:
            self.embeddings = np.vstack([self.embeddings, embedding.reshape(1, -1)])

    def get_stats(self, gnn_stats: dict | None = None, demo_stats: dict | None = None) -> dict:
        recent = [
            {
                "task": t["task"][:80],
                "tools": t["tools"],
                "success": t["success"],
            }
            for t in self.traces[-4:]
        ]
        return {
            "total_traces": len(self.traces),
            "successful": sum(1 for t in self.traces if t["success"]),
            "unique_tasks": len(self.hash_cache),
            "recent_traces": recent,
            "gnn": gnn_stats or {"active": False},
            "demo": demo_stats or {},
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
            "nodes": [{"id": k, "count": v} for k, v in sorted(nodes.items())],
            "edges": [
                {"source": k[0], "target": k[1], "weight": v}
                for k, v in sorted(edges.items())
            ],
        }

    def all_traces(self) -> list[dict]:
        return self.traces
