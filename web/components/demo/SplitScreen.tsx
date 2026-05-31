"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AgentPanel from "./AgentPanel";
import MetricsBar from "./MetricsBar";
import ResultsChart from "./ResultsChart";
import { Button } from "@/components/ui/button";

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
  const [results, setResults] = useState<TaskResult[]>([]);
  const [layers, setLayers] = useState<Record<string, number>>({});
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
    setResults([]);
    setLayers({});
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
        body: JSON.stringify({ count: 4, cluster: "cloud_functions" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to start run — is the engine running?");
        setRunning(false);
        return;
      }
      const { run_id } = data;
      const es = new EventSource(`/api/stream?run_id=${run_id}`);
      esRef.current = es;

      es.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.type === "error") {
          setError(data.message);
          setRunning(false);
          es.close();
          return;
        }
        if (data.type === "task_start") {
          setColdTask(data.cold_task || data.task || "");
          setZerogTask(data.zerog_task || "");
          setTaskIndex(data.index + 1);
          setTaskTotal(data.total ?? 4);
          setColdTools([]);
          setZerogTools([]);
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
          const r: TaskResult = data;
          setResults((p) => [...p, r]);
          if (data.agent === "cold") {
            setColdMetrics({
              turns: data.turns,
              tokens: data.tokens,
              cost: data.cost,
              latency: data.latency,
            });
            setPhase(`Task ${data.index + 1}/${taskTotal} · Cold done — starting ZeroG…`);
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
            setPhase(`Task ${data.index + 1}/${taskTotal} · ZeroG done (${data.layer})`);
          }
        }
        if (data.type === "run_complete") {
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
              Same cluster · different tasks · ZeroG transfers deploy patterns across services
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
          subtitle="Gemini · no memory · discovers path from scratch"
          task={coldTask}
          tools={coldTools}
          done={!running && coldMetrics.turns > 0}
          metrics={coldMetrics}
        />
        <AgentPanel
          title="ZEROG SESSION"
          subtitle="Gemini + shared memory · similar task, different service"
          task={zerogTask}
          tools={zerogTools}
          done={!running && zerogMetrics.turns > 0}
          metrics={{ ...zerogMetrics, layer: zerogMetrics.layer }}
          zerog
        />
      </div>

      <MetricsBar cold={coldMetrics} zerog={zerogMetrics} />
      <ResultsChart results={results} layers={layers} />
    </div>
  );
}
