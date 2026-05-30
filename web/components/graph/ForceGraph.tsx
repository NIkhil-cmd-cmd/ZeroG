"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_EDGES, DEFAULT_NODES } from "@/lib/constants";
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
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);

  useEffect(() => {
    const nodes: SimNode[] = DEFAULT_NODES.map((n, i) => ({
      id: n.id,
      x: 200 + Math.cos((i / DEFAULT_NODES.length) * Math.PI * 2) * 120,
      y: 150 + Math.sin((i / DEFAULT_NODES.length) * Math.PI * 2) * 80,
      vx: 0,
      vy: 0,
      color: n.color,
      size: compact ? n.size * 0.5 : n.size * 0.4,
    }));
    const edges: SimEdge[] = DEFAULT_EDGES.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }));
    nodesRef.current = nodes;
    edgesRef.current = edges;

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
      const maxW = Math.max(...es.map((e) => e.weight));

      for (const e of es) {
        const s = map[e.source];
        const t = map[e.target];
        if (!s || !t) continue;
        const alpha = 0.2 + (e.weight / maxW) * 0.6;
        ctx.strokeStyle = showGnn
          ? `rgba(124, 58, 237, ${alpha})`
          : `rgba(66, 133, 244, ${alpha * 0.5})`;
        ctx.lineWidth = 0.5 + (e.weight / maxW) * 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        const angle = Math.atan2(t.y - s.y, t.x - s.x);
        const ax = t.x - Math.cos(angle) * (t.size + 4);
        const ay = t.y - Math.sin(angle) * (t.size + 4);
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 6 * Math.cos(angle - 0.4), ay - 6 * Math.sin(angle - 0.4));
        ctx.lineTo(ax - 6 * Math.cos(angle + 0.4), ay - 6 * Math.sin(angle + 0.4));
        ctx.fill();
      }

      for (const n of ns) {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();
        if (hovered === n.id) {
          ctx.strokeStyle = "#fff";
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
    animId = requestAnimationFrame(tick);

    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const hit = nodesRef.current.find(
        (n) => Math.hypot(n.x - mx, n.y - my) < n.size + 4
      );
      setHovered(hit?.id ?? null);
    };
    canvas.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, [compact, hovered, showGnn]);

  if (compact) {
    return <canvas ref={canvasRef} className="w-full h-full bg-bg" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <div className="flex-1 relative rounded-xl border border-border overflow-hidden min-h-[500px]">
        <canvas ref={canvasRef} className="w-full h-full min-h-[500px] bg-bg" />
        <label className="absolute top-4 right-4 flex items-center gap-2 text-xs font-mono text-muted cursor-pointer">
          <input type="checkbox" checked={showGnn} onChange={(e) => setShowGnn(e.target.checked)} />
          GNN predictions overlay
        </label>
      </div>
      <div className="lg:w-72 space-y-4">
        <NodeDetail nodeId={hovered} />
        <TrainingCurve />
        <p className="text-xs text-muted font-mono">Trained on real Antigravity session data</p>
      </div>
    </div>
  );
}
