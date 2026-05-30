export default function TrainingCurve() {
  const losses = Array.from({ length: 20 }, (_, i) => {
    const x = (i / 19) * 200 + 20;
    const y = 80 - Math.exp(-i * 0.15) * 60 - i * 0.5;
    return `${x},${y}`;
  });

  return (
    <div className="rounded-xl bg-surface border border-border p-4">
      <p className="text-xs text-muted font-mono mb-2">GNN Loss Curve</p>
      <svg viewBox="0 0 240 100" className="w-full">
        <polyline points={losses.join(" ")} fill="none" stroke="#7c3aed" strokeWidth="1.5" />
        <text x="20" y="95" fill="#555" fontSize="8" fontFamily="monospace">
          epoch
        </text>
        <text x="4" y="20" fill="#555" fontSize="8" fontFamily="monospace">
          loss
        </text>
      </svg>
      <p className="text-xs text-success font-mono mt-2">Accuracy: 87.3%</p>
      <p className="text-xs text-muted font-mono">Traces: 50 · Last retrain: today</p>
    </div>
  );
}
