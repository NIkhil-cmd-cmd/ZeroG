"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ForceGraph from "@/components/graph/ForceGraph";
import { Card, CardContent } from "@/components/ui/card";

type PredictionPanel = {
  task: string;
  after: string;
  predictions: { tool: string; confidence: number }[];
  error?: string;
};

export default function GNNSection() {
  const [panels, setPanels] = useState<PredictionPanel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const queries = [
      { task: "Delete a Cloud Function", current_tool: "gcloud_check_status" },
      { task: "Redeploy a Cloud Function with updated code", current_tool: "gcloud_check_status" },
    ];
    Promise.all(
      queries.map((q) =>
        fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) {
            return {
              task: q.task,
              after: q.current_tool,
              predictions: [],
              error: data.detail || "GNN not trained yet",
            };
          }
          return {
            task: q.task,
            after: q.current_tool,
            predictions: (data.predictions as { tool: string; confidence: number }[]).slice(0, 2),
          };
        })
      )
    )
      .then(setPanels)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-24 px-8 max-w-6xl mx-auto">
      <p className="section-label mb-4">03</p>
      <h2 className="text-3xl md:text-4xl font-semibold text-text mb-6">The memory that predicts.</h2>
      <p className="text-text-secondary max-w-3xl mb-4 leading-relaxed">
        ZeroG trains a Graph Neural Network on real traces from real Antigravity sessions. Each tool
        becomes a node. Each transition becomes a weighted edge. The GNN learns tool clusters and
        predicts the optimal next tool — conditioned on the task, not just the last action.
      </p>

      <div className="ag-card rounded-xl overflow-hidden mb-6 h-64 border border-border">
        <ForceGraph compact />
      </div>
      <Link href="/graph" className="text-accent text-sm hover:underline mb-10 inline-block">
        Explore the full graph →
      </Link>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {loading && <p className="text-muted text-sm font-mono col-span-2">Loading GNN predictions…</p>}
        {!loading &&
          panels.map((p) => (
            <Card key={p.task}>
              <CardContent className="p-6 font-mono text-xs">
                <p className="text-muted mb-2">TASK: &quot;{p.task}&quot;</p>
                <p className="mb-4">After {p.after}:</p>
                {p.error ? (
                  <p className="text-warning">{p.error}</p>
                ) : (
                  <div className="space-y-2">
                    {p.predictions.map((pred, i) => (
                      <div key={pred.tool} className="flex items-center gap-2">
                        <span className={`w-32 ${i === 0 ? "text-accent" : "text-muted"}`}>{pred.tool}</span>
                        <div className="flex-1 h-2 bg-border rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent to-violet"
                            style={{ width: `${Math.round(pred.confidence * 100)}%` }}
                          />
                        </div>
                        <span className={i === 0 ? "text-success w-10" : "text-muted w-10"}>
                          {Math.round(pred.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
      <p className="text-center text-muted text-sm mt-8">
        Same node. Different predictions. The task embedding routes tools that static rules can&apos;t.
      </p>
    </section>
  );
}
