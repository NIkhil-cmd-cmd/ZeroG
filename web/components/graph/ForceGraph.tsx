"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphData } from "@/lib/constants";
import { toolColor } from "@/lib/constants";
import NodeDetail from "./NodeDetail";
import TrainingCurve from "./TrainingCurve";

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface SimEdge {
  source: string;
  target: string;
  weight: number;
}

export default function ForceGraph({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showGnn, setShowGnn] = useState(false);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => {
        if (!r.ok) throw new Error("No trace data yet — run the demo first");
        return r.json();
      })
      .then(setGraph)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!graph?.nodes.length) return;

    const maxCount = Math.max(...graph.nodes.map((n) => n.count), 1);
    const nodes: SimNode[] = graph.nodes.map((n, i) => ({
      id: n.id,
      x: 200 + Math.cos((i / graph.nodes.length) * Math.PI * 2) * 120,
      y: 150 + Math.sin((i / graph.nodes.length) * Math.PI * 2) * 80,
      vx: 0,
      vy: 0,
      color: toolColor(n.id),
      size: compact ? 4 + (n.count / maxCount) * 12 : 6 + (n.count / maxCount) * 18,
    }));
    edgesRef.current = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }));
    nodesRef.current = nodes;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const nodeMap = () => Object.fromEntries(nodesRef.current.map((n) => [n.id, n]));

    const tick = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const map = nodeMap();

      for (const n of ns) {
        n.vx *= 0.9;
        n.vy *= 0.9;
      }
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = 800 / (dist * dist);
          ns[i].vx -= (dx / dist) * repulse;
          ns[i].vy -= (dy / dist) * repulse;
          ns[j].vx += (dx / dist) * repulse;
          ns[j].vy += (dy / dist) * repulse;
        }
      }
      for (const e of es) {
        const s = map[e.source];
        const t = map[e.target];
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * 0.005;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
        t.vx -= (dx / dist) * force;
        t.vy -= (dy / dist) * force;
      }
      for (const n of ns) {
        n.vx += (w / 2 - n.x) * 0.001;
        n.vy += (h / 2 - n.y) * 0.001;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(20, Math.min(w - 20, n.x));
        n.y = Math.max(20, Math.min(h - 20, n.y));
      }

      ctx.clearRect(0, 0, w, h);
      const maxW = Math.max(...es.map((e) => e.weight), 1);
      for (const e of es) {
        const s = map[e.source];
        const t = map[e.target];
        if (!s || !t) continue;
        const alpha = 0.2 + (e.weight / maxW) * 0.6;
        ctx.strokeStyle = showGnn ? `rgba(147, 52, 230, ${alpha})` : `rgba(26, 115, 232, ${alpha * 0.6})`;
        ctx.lineWidth = 0.5 + (e.weight / maxW) * 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }
      for (const n of ns) {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();
        if (hovered === n.id) {
          ctx.strokeStyle = "#1a73e8";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      animId = requestAnimationFrame(tick);
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit = nodesRef.current.find(
        (n) => Math.hypot(n.x - (ev.clientX - rect.left), n.y - (ev.clientY - rect.top)) < n.size + 4
      );
      setHovered(hit?.id ?? null);
    };
    canvas.addEventListener("mousemove", onMove);
    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, [compact, graph, hovered, showGnn]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-text-secondary text-sm font-mono p-6 text-center ag-card">
        {error}
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-text-secondary text-sm font-mono ag-card">
        Loading trace graph…
      </div>
    );
  }

  if (compact) {
    return <canvas ref={canvasRef} className="w-full h-full bg-bg-subtle" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <div className="flex-1 relative rounded-xl ag-card overflow-hidden min-h-[500px]">
        <canvas ref={canvasRef} className="w-full h-full min-h-[500px] bg-bg-subtle" />
        <label className="absolute top-4 right-4 flex items-center gap-2 text-xs font-mono text-muted cursor-pointer">
          <input type="checkbox" checked={showGnn} onChange={(e) => setShowGnn(e.target.checked)} />
          GNN edge emphasis
        </label>
      </div>
      <div className="lg:w-72 space-y-4">
        <NodeDetail nodeId={hovered} graph={graph} />
        <TrainingCurve />
        <p className="text-xs text-muted font-mono">
          {graph.nodes.length} tools · {graph.edges.length} transitions · live trace data
        </p>
      </div>
    </div>
  );
}
