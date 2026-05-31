"""Structured session logging for demo export."""

from __future__ import annotations

import time
from typing import Any

from zerog.memory import LookupResult


def serialize_lookup(lookup: LookupResult) -> dict[str, Any]:
    return {
        "layer": lookup.layer,
        "hit": lookup.hit,
        "cached_result": lookup.cached_result,
        "cached_tools": lookup.cached_tools or [],
        "examples": [
            {
                "task": ex.task[:200],
                "tools": ex.tool_sequence,
                "success": ex.success,
                "similarity": round(ex.similarity, 4),
            }
            for ex in lookup.examples
        ],
    }


class SessionLog:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.entries: list[dict[str, Any]] = []
        self.started_at = time.time()

    def add(self, payload: dict[str, Any]) -> dict[str, Any]:
        entry = {"ts": time.time(), **payload}
        self.entries.append(entry)
        return entry

    def export(self, demo_stats: dict | None = None) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "started_at": self.started_at,
            "exported_at": time.time(),
            "entry_count": len(self.entries),
            "demo_stats": demo_stats or {},
            "entries": self.entries,
        }
