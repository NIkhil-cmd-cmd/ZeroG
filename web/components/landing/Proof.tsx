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

  const statCards = hasDemo
    ? [
        {
          value: `${demo.speedup_ratio ?? 1}×`,
          label: "faster",
          desc: "ZeroG vs cold session latency (last demo run)",
        },
        {
          value: `${demo.pattern_savings_pct ?? demo.token_savings_pct ?? 0}%`,
          label: "pattern savings",
          desc: "Token or turn reduction on same-task pairs",
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

      <div className="grid md:grid-cols-3 gap-6 mb-8">
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

      <p className="text-center text-muted text-sm">
        {hasDemo ? "Metrics from your last demo run. " : ""}
        <Link href="/demo" className="text-accent hover:underline">
          Run the demo →
        </Link>
      </p>
    </section>
  );
}
