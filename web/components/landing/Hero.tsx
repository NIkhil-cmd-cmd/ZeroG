"use client";

import Link from "next/link";
import Nav from "@/components/layout/Nav";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <>
      <Nav />
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
          <div className="max-w-3xl">
            <p className="section-label mb-4">AGI House × Google DeepMind · Track 1</p>
            <h1 className="text-5xl font-semibold tracking-tight text-text md:text-6xl lg:text-7xl">
              Zero cold starts.
            </h1>
            <p className="mt-6 text-xl text-text-secondary leading-relaxed md:text-2xl">
              The shared memory layer for{" "}
              <span className="font-medium text-text">Antigravity</span>. One agent learns. Every
              agent on your team inherits the trace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/install">
                <Button size="lg">Add to Antigravity →</Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline">
                  Live demo
                </Button>
              </Link>
            </div>
            <p className="mt-8 font-mono text-xs text-muted">
              KNN retrieval · SQLite persistence · GraphSAGE GNN · Gemini tool-calling
            </p>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              { label: "Memory layers", value: "4", sub: "hash → semantic → few-shot → cold" },
              { label: "Storage", value: "SQLite", sub: "embeddings + tool sequences" },
              { label: "Integration", value: "SKILL.md", sub: ".agents/skills/ standard" },
            ].map((s) => (
              <div key={s.label} className="ag-card ag-card-hover p-6">
                <p className="text-sm text-text-secondary">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold text-text">{s.value}</p>
                <p className="mt-1 font-mono text-xs text-muted">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
