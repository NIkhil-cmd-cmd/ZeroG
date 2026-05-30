"use client";

import Link from "next/link";
import MiniForceGraph from "@/components/graph/ForceGraph";

const predictions = [
  {
    task: "Delete a Cloud Function",
    after: "gcloud_check_status",
    top: { tool: "gcloud_delete", pct: 93 },
    second: { tool: "gcloud_deploy", pct: 4 },
  },
  {
    task: "Redeploy a Cloud Function",
    after: "gcloud_check_status",
    top: { tool: "gcloud_deploy", pct: 87 },
    second: { tool: "gcloud_delete", pct: 8 },
  },
];

export default function GNNSection() {
  return (
    <section className="fade-in py-24 px-8 max-w-6xl mx-auto">
      <p className="section-label mb-4">03</p>
      <h2 className="text-3xl md:text-4xl font-medium mb-6">The memory that predicts.</h2>
      <p className="text-text/70 max-w-3xl mb-4 leading-relaxed">
        ZeroG trains a Graph Neural Network on real traces from real Antigravity sessions. Each tool
        becomes a node. Each transition becomes a weighted edge. The GNN learns tool clusters and
        predicts the optimal next tool — conditioned on the task, not just the last action.
      </p>
      <p className="text-text/50 text-sm mb-10">
        Not synthetic. Not simulated. Real tool calls, real outcomes.
      </p>

      <div className="rounded-xl border border-border overflow-hidden mb-6 h-64">
        <MiniForceGraph compact />
      </div>
      <Link href="/graph" className="text-accent text-sm hover:underline mb-10 inline-block">
        Explore the full graph →
      </Link>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {predictions.map((p) => (
          <div key={p.task} className="rounded-xl bg-surface border border-border p-6 font-mono text-xs">
            <p className="text-muted mb-2">TASK: &quot;{p.task}&quot;</p>
            <p className="mb-4">After {p.after}:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-28 text-accent">{p.top.tool}</span>
                <div className="flex-1 h-2 bg-border rounded overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${p.top.pct}%` }} />
                </div>
                <span className="text-success w-8">{p.top.pct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-28 text-muted">{p.second.tool}</span>
                <div className="flex-1 h-2 bg-border rounded overflow-hidden">
                  <div className="h-full bg-muted" style={{ width: `${p.second.pct}%` }} />
                </div>
                <span className="text-muted w-8">{p.second.pct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-muted text-sm mt-8">
        Same node. Different predictions. The task embedding is doing the routing that static rules
        can&apos;t.
      </p>
    </section>
  );
}
