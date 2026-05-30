"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AgentPanel from "./AgentPanel";
import MetricsBar from "./MetricsBar";
import ResultsChart from "./ResultsChart";

type ToolEvent = {
  agent: "cold" | "zerog";
  tool: string;
  detail?: string;
  status?: string;
};

type TaskResult = {
  agent: "cold" | "zerog";
  index: number;
  turns: number;
  tokens: number;
  cost: number;
  latency: number;
  layer?: string;
  success: boolean;
};

export default function SplitScreen() {
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState("");
  const [coldTools, setColdTools] = useState<ToolEvent[]>([]);
  const [zerogTools, setZerogTools] = useState<ToolEvent[]>([]);
  const [coldMetrics, setColdMetrics] = useState({ turns: 0, tokens: 0, cost: 0, latency: 0 });
  const [zerogMetrics, setZerogMetrics] = useState({ turns: 0, tokens: 0, cost: 0, latency: 0, layer: "" });
  const [results, setResults] = useState<TaskResult[]>([]);
  const [layers, setLayers] = useState<Record<string, number>>({});
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(async () => {
    esRef.current?.close();
    setRunning(false);
    setTask("");
    setColdTools([]);
    setZerogTools([]);
    setColdMetrics({ turns: 0, tokens: 0, cost: 0, latency: 0 });
    setZerogMetrics({ turns: 0, tokens: 0, cost: 0, latency: 0, layer: "" });
    setResults([]);
    setLayers({});
    try {
      await fetch("/api/reset", { method: "POST" });
    } catch {
      /* engine may be offline */
    }
  }, []);

  const start = useCallback(async () => {
    await reset();
    setRunning(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      });
      const { run_id } = await res.json();
      const es = new EventSource(`/api/stream?run_id=${run_id}`);
      esRef.current = es;

      es.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.type === "task_start") {
          setTask(data.task);
          setColdTools([]);
          setZerogTools([]);
        }
        if (data.type === "tool_call") {
          const entry: ToolEvent = {
            agent: data.agent,
            tool: data.tool,
            detail: data.detail,
            status: data.status,
          };
          setTimeout(() => {
            if (data.agent === "cold") setColdTools((p) => [...p, entry]);
            else setZerogTools((p) => [...p, entry]);
          }, (data.agent === "zerog" ? coldTools.length : 0) * 200);
        }
        if (data.type === "task_complete") {
          const r: TaskResult = data;
          setResults((p) => [...p, r]);
          if (data.agent === "cold") {
            setColdMetrics({
              turns: data.turns,
              tokens: data.tokens,
              cost: data.cost,
              latency: data.latency,
            });
          } else {
            setZerogMetrics({
              turns: data.turns,
              tokens: data.tokens,
              cost: data.cost,
              latency: data.latency,
              layer: data.layer || "",
            });
            if (data.layer) {
              setLayers((p) => ({ ...p, [data.layer]: (p[data.layer] || 0) + 1 }));
            }
          }
        }
        if (data.type === "run_complete") {
          setRunning(false);
          es.close();
        }
      };
      es.onerror = () => {
        setRunning(false);
        es.close();
      };
    } catch {
      setRunning(false);
    }
  }, [reset, coldTools.length]);

  useEffect(() => () => esRef.current?.close(), []);

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-sm tracking-wider">ZEROG DEMO</h1>
          <p className="text-xs text-muted">Shared Memory for Antigravity</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={start}
            disabled={running}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white disabled:opacity-50"
          >
            ▶ START
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:border-accent"
          >
            ↻ RESET
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 divide-x divide-border min-h-[480px]">
        <AgentPanel
          title="COLD SESSION"
          subtitle="Gemini Flash · No shared memory"
          task={task}
          tools={coldTools}
          done={!running && coldMetrics.turns > 0}
          metrics={coldMetrics}
        />
        <AgentPanel
          title="ZEROG SESSION"
          subtitle="Gemini Flash + ZeroG"
          task={task}
          tools={zerogTools}
          done={!running && zerogMetrics.turns > 0}
          metrics={zerogMetrics}
          zerog
        />
      </div>

      <MetricsBar cold={coldMetrics} zerog={zerogMetrics} />
      <ResultsChart results={results} layers={layers} />
    </div>
  );
}
