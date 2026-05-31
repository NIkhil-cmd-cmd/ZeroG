"use client";

import { useEffect, useState } from "react";
import type { EngineStats } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export default function TrainingCurve() {
  const [stats, setStats] = useState<EngineStats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const gnn = stats?.gnn;
  const losses = gnn?.loss_history ?? [];

  const points =
    losses.length > 1
      ? losses.map((loss, i) => {
          const x = (i / (losses.length - 1)) * 200 + 20;
          const maxL = Math.max(...losses, 0.001);
          const y = 80 - (loss / maxL) * 60;
          return `${x},${y}`;
        })
      : [];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted font-mono mb-2">GNN Loss Curve</p>
        {!gnn?.active ? (
          <p className="text-xs text-muted font-mono">Not trained yet — run demo tasks to accumulate traces</p>
        ) : (
          <>
            <svg viewBox="0 0 240 100" className="w-full">
              {points.length >= 2 && <polyline points={points.join(" ")} fill="none" stroke="#8b74ff" strokeWidth="1.5" />}
            </svg>
            <p className="text-xs text-success font-mono mt-2">Accuracy: {gnn.accuracy}%</p>
            <p className="text-xs text-muted font-mono">
              Traces: {gnn.num_traces_trained}
              {gnn.last_trained && ` · Retrained ${new Date(gnn.last_trained).toLocaleString()}`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
