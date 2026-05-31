type TaskResult = {
  agent: "cold" | "zerog";
  index: number;
  tokens: number;
  turns: number;
};

export default function ResultsChart({
  results,
  layers,
}: {
  results: TaskResult[];
  layers: Record<string, number>;
}) {
  const cold = results.filter((r) => r.agent === "cold");
  const zerog = results.filter((r) => r.agent === "zerog");

  const tokenLine = (data: TaskResult[], color: string, glow?: boolean) => {
    if (data.length < 2) return null;
    let cum = 0;
    const pts = data.map((d, i) => {
      cum += d.tokens;
      return `${(i / Math.max(data.length - 1, 1)) * 360 + 40},${200 - cum / 80}`;
    });
    return (
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        filter={glow ? "url(#violetGlow)" : undefined}
      />
    );
  };

  const layerTotal = Object.values(layers).reduce((a, b) => a + b, 0) || 1;
  const layerEntries = Object.entries(layers);
  let dashOffset = 0;
  const circumference = 2 * Math.PI * 40;

  return (
    <section className="border-t border-border/60 p-6">
      <p className="font-mono text-xs text-muted mb-4">AGGREGATE</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="ag-card rounded-xl p-4">
          <p className="text-xs text-muted mb-2 font-mono">Token Cost Over Time</p>
          <svg viewBox="0 0 420 220" className="w-full">
            <defs>
              <filter id="violetGlow">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.5" />
              </filter>
            </defs>
            {tokenLine(cold, "#4d8dff")}
            {tokenLine(zerog, "#8b74ff", true)}
          </svg>
        </div>
        <div className="ag-card rounded-xl p-4">
          <p className="text-xs text-muted mb-2 font-mono">Tool Calls Over Time</p>
          <svg viewBox="0 0 420 220" className="w-full">
            {(() => {
              let cCum = 0;
              let zCum = 0;
              const cPts = cold.map((d, i) => {
                cCum += d.turns;
                return `${(i / Math.max(cold.length - 1, 1)) * 360 + 40},${200 - cCum * 8}`;
              });
              const zPts = zerog.map((d, i) => {
                zCum += d.turns;
                return `${(i / Math.max(zerog.length - 1, 1)) * 360 + 40},${200 - zCum * 8}`;
              });
              return (
                <>
                  {cPts.length >= 2 && <polyline points={cPts.join(" ")} fill="none" stroke="#4d8dff" strokeWidth="2" />}
                  {zPts.length >= 2 && <polyline points={zPts.join(" ")} fill="none" stroke="#8b74ff" strokeWidth="2" />}
                </>
              );
            })()}
          </svg>
        </div>
        <div className="ag-card rounded-xl p-4 flex items-center gap-6">
          <p className="text-xs text-muted font-mono">Memory Layer Breakdown</p>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#2f3f65" strokeWidth="12" />
            {layerEntries.map(([layer, count], i) => {
              const colors = ["#42d392", "#4d8dff", "#ffcb5a", "#ff6b7d"];
              const seg = (count / layerTotal) * circumference;
              const el = (
                <circle
                  key={layer}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="12"
                  strokeDasharray={`${seg} ${circumference}`}
                  strokeDashoffset={-dashOffset}
                  transform="rotate(-90 50 50)"
                />
              );
              dashOffset += seg;
              return el;
            })}
          </svg>
          <div className="text-xs font-mono text-muted">
            {layerEntries.map(([l, c]) => (
              <div key={l}>
                {l}: {c}
              </div>
            ))}
            {!layerEntries.length && <div>No data yet</div>}
          </div>
        </div>
        <div className="ag-card rounded-xl p-4">
          <p className="text-xs text-muted mb-2 font-mono">Savings Curve</p>
          <svg viewBox="0 0 420 220" className="w-full">
            {cold.length > 0 &&
              zerog.length > 0 &&
              (() => {
                const pts = cold.map((c, i) => {
                  const z = zerog[i];
                  const savings = z ? ((c.tokens - z.tokens) / c.tokens) * 100 : 0;
                  return `${(i / Math.max(cold.length - 1, 1)) * 360 + 40},${200 - savings * 1.5}`;
                });
                return <polyline points={pts.join(" ")} fill="none" stroke="#42d392" strokeWidth="2" />;
              })()}
          </svg>
        </div>
      </div>
    </section>
  );
}
