"use client";

import { CHART, ChartFrame, seriesPoints } from "@/lib/chartHelpers";

type TaskResult = {
  agent: "cold" | "zerog";
  index: number;
  tokens: number;
  turns: number;
};

const W = 420;
const H = 220;
const PAD = 44;

function Grid() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = PAD + ((H - PAD * 2) * i) / 4;
        return (
          <line key={`gy-${i}`} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={CHART.grid} strokeWidth="1" />
        );
      })}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={CHART.axis} strokeWidth="1.5" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={CHART.axis} strokeWidth="1.5" />
    </>
  );
}

export default function ResultsChart({
  results,
  layers,
}: {
  results: TaskResult[];
  layers: Record<string, number>;
}) {
  const cold = results.filter((r) => r.agent === "cold");
  const zerog = results.filter((r) => r.agent === "zerog");
  const coldTokens = cold.map((r) => r.tokens);
  const zerogTokens = zerog.map((r) => r.tokens);
  const coldTurns = cold.map((r) => r.turns);
  const zerogTurns = zerog.map((r) => r.turns);

  const layerTotal = Object.values(layers).reduce((a, b) => a + b, 0) || 1;
  const layerEntries = Object.entries(layers);
  let dashOffset = 0;
  const circumference = 2 * Math.PI * 36;
  const layerColors: Record<string, string> = {
    few_shot: CHART.zerog,
    exact_match: CHART.success,
    semantic_match: "#1967d2",
    cold_start: CHART.muted,
  };

  const savingsPts =
    cold.length > 0
      ? cold.map((c, i) => {
          const z = zerog[i];
          const savings = z && c.tokens ? ((c.tokens - z.tokens) / c.tokens) * 100 : 0;
          const x = PAD + (i / Math.max(cold.length - 1, 1)) * (W - PAD * 2);
          const y = H - PAD - (Math.max(0, savings) / 100) * (H - PAD * 2);
          return `${x},${y}`;
        })
      : [];

  return (
    <section className="border-t border-border px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-1">Aggregate</p>
        <h2 className="text-lg font-semibold text-text mb-6">Benchmark charts</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <ChartFrame
            title="Token cost per pair"
            empty={cold.length === 0 ? "Run the demo to populate charts" : undefined}
            legend={[
              { color: CHART.cold, label: "Cold" },
              { color: CHART.zerog, label: "ZeroG" },
            ]}
          >
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              <Grid />
              {coldTokens.length >= 1 && (
                <polyline
                  points={seriesPoints(coldTokens, W, H, PAD, true)}
                  fill="none"
                  stroke={CHART.cold}
                  strokeWidth="2.5"
                />
              )}
              {zerogTokens.length >= 1 && (
                <polyline
                  points={seriesPoints(zerogTokens, W, H, PAD, true)}
                  fill="none"
                  stroke={CHART.zerog}
                  strokeWidth="2.5"
                />
              )}
            </svg>
          </ChartFrame>

          <ChartFrame
            title="Tool calls per pair"
            empty={cold.length === 0 ? "Run the demo to populate charts" : undefined}
            legend={[
              { color: CHART.cold, label: "Cold" },
              { color: CHART.zerog, label: "ZeroG" },
            ]}
          >
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              <Grid />
              {coldTurns.length >= 1 && (
                <polyline
                  points={seriesPoints(coldTurns, W, H, PAD, true)}
                  fill="none"
                  stroke={CHART.cold}
                  strokeWidth="2.5"
                />
              )}
              {zerogTurns.length >= 1 && (
                <polyline
                  points={seriesPoints(zerogTurns, W, H, PAD, true)}
                  fill="none"
                  stroke={CHART.zerog}
                  strokeWidth="2.5"
                />
              )}
            </svg>
          </ChartFrame>

          <ChartFrame title="ZeroG memory layers" empty={layerEntries.length === 0 ? "No ZeroG recalls yet" : undefined}>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
                <circle cx="50" cy="50" r="36" fill="none" stroke={CHART.grid} strokeWidth="10" />
                {layerEntries.map(([layer, count]) => {
                  const seg = (count / layerTotal) * circumference;
                  const el = (
                    <circle
                      key={layer}
                      cx="50"
                      cy="50"
                      r="36"
                      fill="none"
                      stroke={layerColors[layer] || CHART.cold}
                      strokeWidth="10"
                      strokeDasharray={`${seg} ${circumference}`}
                      strokeDashoffset={-dashOffset}
                      transform="rotate(-90 50 50)"
                    />
                  );
                  dashOffset += seg;
                  return el;
                })}
              </svg>
              <div className="text-xs font-mono text-text-secondary space-y-1">
                {layerEntries.map(([l, c]) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: layerColors[l] || CHART.cold }} />
                    {l}: {c}
                  </div>
                ))}
              </div>
            </div>
          </ChartFrame>

          <ChartFrame
            title="Token savings vs cold (%)"
            empty={cold.length === 0 ? "Run the demo to populate charts" : undefined}
            legend={[{ color: CHART.success, label: "Savings %" }]}
          >
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              <Grid />
              {savingsPts.length >= 2 && (
                <polyline points={savingsPts.join(" ")} fill="none" stroke={CHART.success} strokeWidth="2.5" />
              )}
            </svg>
          </ChartFrame>
        </div>
      </div>
    </section>
  );
}
