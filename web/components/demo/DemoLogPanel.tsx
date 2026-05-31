"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DemoExport, DemoLogEntry } from "@/lib/demoTypes";

export default function DemoLogPanel({
  entries,
  runId,
}: {
  entries: DemoLogEntry[];
  runId: string | null;
}) {
  const [filter, setFilter] = useState<"all" | "model_turn" | "recall" | "tool_call">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  const exportJson = async () => {
    let payload: DemoExport | { entries: DemoLogEntry[]; run_id: string | null };
    try {
      const res = await fetch("/api/demo-log");
      if (res.ok) {
        payload = await res.json();
      } else {
        payload = {
          run_id: runId,
          entries,
          exported_at: Date.now() / 1000,
          entry_count: entries.length,
          demo_stats: {},
          started_at: entries[0]?.ts ?? Date.now() / 1000,
        } as DemoExport;
      }
    } catch {
      payload = {
        run_id: runId,
        entries,
        exported_at: Date.now() / 1000,
        entry_count: entries.length,
        demo_stats: {},
        started_at: entries[0]?.ts ?? Date.now() / 1000,
      } as DemoExport;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zerog-demo-${runId || "log"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="border-t border-border bg-bg-subtle px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label mb-1">Session log</p>
            <h2 className="text-lg font-semibold text-text">Model & memory events</h2>
            <p className="text-xs text-text-secondary font-mono mt-1">
              {entries.length} events {runId ? `· run ${runId.slice(0, 8)}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {(["all", "recall", "model_turn", "tool_call"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={exportJson} disabled={entries.length === 0}>
              Export JSON
            </Button>
          </div>
        </div>

        <div className="ag-card max-h-80 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
          {filtered.length === 0 ? (
            <p className="text-muted">Run the demo to capture model turns, recalls, and tool calls.</p>
          ) : (
            filtered.map((entry, i) => (
              <pre key={i} className="mb-3 whitespace-pre-wrap break-words text-text-secondary border-b border-border pb-3 last:border-0">
                {JSON.stringify(entry, null, 2)}
              </pre>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
