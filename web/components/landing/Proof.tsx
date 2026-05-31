"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EngineStats } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export default function Proof() {
  const [stats, setStats] = useState<EngineStats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const demo = stats?.demo;
  const hasDemo = demo && (demo.tasks_run ?? 0) > 0;

  const coldSeries = demo?.cold_tokens_series ?? [];
  const zerogSeries = demo?.zerog_tokens_series ?? [];

  const toPoints = (series: number[], offsetX: number, scaleY: number) => {
    if (series.length < 2) return "";
    let cum = 0;
    return series
      .map((v, i) => {
        cum += v;
        return `${offsetX + (i / (series.length - 1)) * 360},${200 - cum / scaleY}`;
      })
      .join(" ");
  };

  const statCards = hasDemo
    ? [
        {
          value: `${demo.speedup_ratio ?? 1}×`,
          label: "faster",
          desc: "ZeroG vs cold session latency (last demo run)",
        },
        {
          value: `${demo.token_savings_pct ?? 0}%`,
          label: "token savings",
          desc: "Token reduction on last demo run",
        },
        {
          value: `${demo.recall_latency_ms ?? 0}ms`,
          label: "recall",
          desc: "Last ZeroG memory lookup latency",
        },
      ]
    : [
        { value: "—", label: "faster", desc: "Run the demo to measure speedup" },
        { value: "—", label: "token savings", desc: "Run the demo to measure savings" },
        { value: "—", label: "recall", desc: "Run the demo to measure lookup time" },
      ];

  return (
    <section className="py-24 px-8 max-w-6xl mx-auto">
      <p className="section-label mb-4">05</p>
      <h2 className="text-3xl md:text-4xl font-semibold text-text mb-12">Numbers from real runs.</h2>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-8 text-center">
              <p className="text-4xl font-semibold text-accent mb-1">{s.value}</p>
              <p className="text-sm text-text-secondary mb-3">{s.label}</p>
              <p className="text-xs text-muted">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="ag-card rounded-xl p-6">
        {hasDemo && coldSeries.length >= 2 ? (
          <svg viewBox="0 0 440 220" className="w-full">
            <line x1="40" y1="200" x2="420" y2="200" stroke="#dadce0" />
            <polyline points={toPoints(coldSeries, 40, 80)} fill="none" stroke="#1a73e8" strokeWidth="2" />
            <polyline
              points={toPoints(zerogSeries, 40, 80)}
              fill="none"
              stroke="#9334e6"
              strokeWidth="2"
            />
            <text x="60" y="40" fill="#1a73e8" fontSize="9" fontFamily="monospace">
              Cold sessions
            </text>
            <text x="60" y="55" fill="#9334e6" fontSize="9" fontFamily="monospace">
              ZeroG sessions
            </text>
          </svg>
        ) : (
          <p className="text-center text-muted text-sm font-mono py-12">
            No demo run data yet — cumulative token chart appears after you run the demo
          </p>
        )}
        <p className="text-center text-muted text-sm mt-4">
          {hasDemo ? "Metrics from your last demo run. " : ""}
          <Link href="/demo" className="text-accent hover:underline">
            Run the demo →
          </Link>
        </p>
      </div>
    </section>
  );
}
