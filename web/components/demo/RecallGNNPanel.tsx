"use client";

import type { RecallEvent } from "@/lib/demoTypes";

export default function RecallGNNPanel({ recall }: { recall: RecallEvent | null }) {
  if (!recall) {
    return (
      <div className="ag-card p-4 font-mono text-xs text-muted">
        GNN recall visualization appears when ZeroG retrieves memory…
      </div>
    );
  }

  return (
    <div className="ag-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill pill-blue">Memory: {recall.layer}</span>
        {recall.gnn_active ? (
          <span className="pill">GNN active</span>
        ) : (
          <span className="pill">GNN idle — trains after 3 traces</span>
        )}
        {recall.examples[0] && (
          <span className="text-xs font-mono text-muted">
            sim={recall.examples[0].similarity.toFixed(2)}
            {recall.layer === "few_shot" && recall.examples[0].similarity < 0.55 && (
              <span className="text-warning"> · cluster fallback</span>
            )}
          </span>
        )}
      </div>

      {recall.examples[0] && (
        <div className="font-mono text-xs text-text-secondary">
          <p className="text-muted mb-1">Recalled trace path</p>
          <p className="text-accent break-words">{recall.examples[0].tools.join(" → ")}</p>
        </div>
      )}

      <div className="space-y-3">
        <p className="font-mono text-xs text-muted">GNN next-tool predictions per step</p>
        {recall.gnn_steps.length === 0 ? (
          <p className="text-xs font-mono text-muted">No GNN predictions yet</p>
        ) : (
          recall.gnn_steps.map((step) => (
            <div key={step.current_tool} className="rounded-lg border border-border bg-bg-subtle p-3">
              <p className="font-mono text-xs text-accent mb-2">After {step.current_tool}</p>
              {step.note && <p className="text-xs text-warning font-mono mb-2">{step.note}</p>}
              {step.predictions.length === 0 ? (
                <p className="text-xs text-muted font-mono">—</p>
              ) : (
                <div className="space-y-1.5">
                  {step.predictions.map((p, idx) => (
                    <div key={`${step.current_tool}-${p.tool}`} className="flex items-center gap-2">
                      <span className={`w-28 truncate ${idx === 0 ? "text-violet" : "text-muted"}`}>
                        {String(p.tool)}
                      </span>
                      <div className="flex-1 h-2 rounded bg-border overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-violet"
                          style={{ width: `${Math.round(p.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-muted">{Math.round(p.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
