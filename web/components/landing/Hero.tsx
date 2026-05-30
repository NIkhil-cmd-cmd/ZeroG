"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { COLORS, GITHUB_URL } from "@/lib/constants";

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let last = 0;
    const nodes = Array.from({ length: 15 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.002,
    }));

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (t: number) => {
      if (t - last < 33) {
        animId = requestAnimationFrame(draw);
        return;
      }
      last = t;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * w;
          const dy = (nodes[i].y - nodes[j].y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(66, 133, 244, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * w, nodes[i].y * h);
            ctx.lineTo(nodes[j].x * w, nodes[j].y * h);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = "rgba(66, 133, 244, 0.25)";
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full">
        <span className="text-xl font-medium tracking-tight">ZeroG</span>
        <div className="flex gap-6 text-sm">
          <Link href="/demo" className="hover:text-accent transition-colors">
            Demo
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
            GitHub
          </a>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-medium tracking-tight mb-6">
          Zero cold starts.
        </h1>
        <p className="text-lg md:text-xl text-text/80 max-w-2xl mb-10 leading-relaxed">
          The shared memory layer for Antigravity.
          <br />
          One agent learns. Every agent on your team benefits.
        </p>
        <div className="flex gap-4 mb-16">
          <Link
            href="/demo"
            className="px-6 py-3 rounded-lg text-sm font-medium"
            style={{ backgroundColor: COLORS.accent, color: "#fff" }}
          >
            Try the Demo →
          </Link>
          <Link
            href="/graph"
            className="px-6 py-3 rounded-lg text-sm font-medium border border-border hover:border-accent transition-colors"
          >
            View the Graph
          </Link>
        </div>

        <div className="w-full max-w-3xl h-48 rounded-xl overflow-hidden border border-border relative">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        <p className="mt-8 font-mono text-xs text-muted">
          Built for Antigravity · Powered by Gemini
        </p>
      </div>
    </section>
  );
}
