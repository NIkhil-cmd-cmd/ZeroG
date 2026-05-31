"use client";

import { useEffect, useState } from "react";
import type { EngineStats } from "@/lib/constants";
import { CHART } from "@/lib/chartHelpers";
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
          const x = 40 + (i / (losses.length - 1)) * 200;
          const maxL = Math.max(...losses, 0.001);
          const y = 90 - (loss / maxL) * 70;
          return `${x},${y}`;
        })
      : [];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted font-mono mb-2">GNN training loss</p>
        {!gnn?.active ? (
          <p className="text-xs text-muted font-mono">Not trained yet — run demo tasks to accumulate traces</p>
        ) : (
          <>
            <svg viewBox="0 0 280 110" className="w-full">
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1="30"
                  y1={20 + i * 22}
                  x2="260"
                  y2={20 + i * 22}
                  stroke={CHART.grid}
                  strokeWidth="1"
                />
              ))}
              <line x1="30" y1="90" x2="260" y2="90" stroke={CHART.axis} />
              {points.length >= 2 && (
                <polyline points={points.join(" ")} fill="none" stroke={CHART.zerog} strokeWidth="2" />
              )}
            </svg>
            <p className="text-xs text-success font-mono mt-2">Accuracy: {gnn.accuracy}%</p>
            <p className="text-xs text-muted font-mono">
              Traces: {gnn.num_traces_trained}
              {gnn.last_trained && ` · ${new Date(gnn.last_trained).toLocaleString()}`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
