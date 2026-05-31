"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AgentPanel from "./AgentPanel";
import DemoLogPanel from "./DemoLogPanel";
import MetricsBar from "./MetricsBar";
import { Button } from "@/components/ui/button";
import type { DemoLogEntry } from "@/lib/demoTypes";

type ToolEvent = {
  agent: "cold" | "zerog";
  tool: string;
  detail?: string;
  status?: string;
};

export default function SplitScreen() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState("");
  const [taskIndex, setTaskIndex] = useState(0);
  const [taskTotal, setTaskTotal] = useState(4);
  const [coldTask, setColdTask] = useState("");
  const [zerogTask, setZerogTask] = useState("");
  const [coldTools, setColdTools] = useState<ToolEvent[]>([]);
  const [zerogTools, setZerogTools] = useState<ToolEvent[]>([]);
  const [coldMetrics, setColdMetrics] = useState({ turns: 0, tokens: 0, cost: 0, latency: 0 });
  const [zerogMetrics, setZerogMetrics] = useState({ turns: 0, tokens: 0, cost: 0, latency: 0, layer: "" });
  const [logEntries, setLogEntries] = useState<DemoLogEntry[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [demoStats, setDemoStats] = useState<Record<string, number>>({});
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(async () => {
    esRef.current?.close();
    setRunning(false);
    setError(null);
    setPhase("");
    setColdTask("");
    setZerogTask("");
    setColdTools([]);
    setZerogTools([]);
    setColdMetrics({ turns: 0, tokens: 0, cost: 0, latency: 0 });
    setZerogMetrics({ turns: 0, tokens: 0, cost: 0, latency: 0, layer: "" });
    setLogEntries([]);
    setRunId(null);
    setDemoStats({});
    const res = await fetch("/api/reset", { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.detail || "Engine unreachable — start it with cd engine && ./run.sh server");
    }
  }, []);

  const start = useCallback(async () => {
    await reset();
    setRunning(true);
    setError(null);
    setPhase("Starting demo run…");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 2, cluster: "cloud_functions" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to start run — is the engine running?");
        setRunning(false);
        return;
      }
      const { run_id } = data;
      setRunId(run_id);
      const es = new EventSource(`/api/stream?run_id=${run_id}`);
      esRef.current = es;

      es.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        setLogEntries((p) => [...p, { ...data, ts: data.ts ?? Date.now() / 1000 }]);

        if (data.type === "error") {
          setError(data.message);
          setRunning(false);
          es.close();
          return;
        }
        if (data.type === "task_start") {
          setColdTask(data.compare_task || data.zerog_task || data.task || "");
          setZerogTask(data.compare_task || data.zerog_task || "");
          setTaskIndex(data.index + 1);
          setTaskTotal(data.total ?? 4);
          setColdTools([]);
          setZerogTools([]);
          setColdMetrics({ turns: 0, tokens: 0, cost: 0, latency: 0 });
          setZerogMetrics({ turns: 0, tokens: 0, cost: 0, latency: 0, layer: "" });
        }
        if (data.type === "phase") {
          setPhase(data.message);
        }
        if (data.type === "tool_call") {
          const entry: ToolEvent = {
            agent: data.agent,
            tool: data.tool,
            detail: data.detail,
            status: data.status,
          };
          if (data.agent === "cold") setColdTools((p) => [...p, entry]);
          else setZerogTools((p) => [...p, entry]);
        }
        if (data.type === "task_complete") {
          const modelTurns = data.model_turns ?? data.turns;
          if (data.agent === "cold") {
            setColdMetrics({
              turns: modelTurns,
              tokens: data.tokens,
              cost: data.cost,
              latency: data.latency,
            });
            setPhase(`Task ${data.index + 1}/${taskTotal} · Cold done — starting ZeroG…`);
          } else {
            setZerogMetrics({
              turns: modelTurns,
              tokens: data.tokens,
              cost: data.cost,
              latency: data.latency,
              layer: data.layer || "",
            });
            setPhase(
              `Task ${data.index + 1}/${taskTotal} · ZeroG done (${data.layer}, recall ${data.recall_latency_ms ?? "?"}ms)`
            );
          }
        }
        if (data.type === "run_complete") {
          if (data.demo_stats) setDemoStats(data.demo_stats);
          setPhase("Demo complete");
          setRunning(false);
          es.close();
        }
      };
      es.onerror = () => {
        setError("Stream disconnected — check engine logs");
        setRunning(false);
        es.close();
      };
    } catch {
      setError("Cannot reach engine at localhost:8000");
      setRunning(false);
    }
  }, [reset, taskTotal]);

  useEffect(() => () => esRef.current?.close(), []);

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-bg-subtle px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="section-label mb-1">Live benchmark</p>
            <h1 className="text-2xl font-semibold text-text">Cold vs ZeroG</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Same task per pair · cold explores · ZeroG transfers teammate deploy pattern
            </p>
            {phase && <p className="mt-2 font-mono text-xs text-accent">{phase}</p>}
          </div>
          <div className="flex gap-3 shrink-0">
            <Button onClick={start} disabled={running}>
              {running ? `Running ${taskIndex}/${taskTotal}…` : "Start demo"}
            </Button>
            <Button onClick={reset} disabled={running} variant="outline">
              Reset
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-error/50 bg-error/10 text-error text-sm font-mono">
          {error}
        </div>
      )}

      <div className="mx-auto max-w-6xl grid md:grid-cols-2 divide-x divide-border border-t border-border min-h-[480px]">
        <AgentPanel
          title="COLD SESSION"
          subtitle="Gemini · no memory · read_docs exploration path"
          task={coldTask}
          tools={coldTools}
          done={!running && coldMetrics.turns > 0}
          metrics={coldMetrics}
        />
        <AgentPanel
          title="ZEROG SESSION"
          subtitle="Gemini + shared memory · same task · skips exploration"
          task={zerogTask}
          tools={zerogTools}
          done={!running && zerogMetrics.turns > 0}
          metrics={{ ...zerogMetrics, layer: zerogMetrics.layer }}
          zerog
        />
      </div>

      <MetricsBar cold={coldMetrics} zerog={zerogMetrics} demoStats={demoStats} />

      <DemoLogPanel entries={logEntries} runId={runId} />
    </div>
  );
}
