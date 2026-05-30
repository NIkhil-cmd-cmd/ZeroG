export default function MetricsBar({
  cold,
  zerog,
}: {
  cold: { turns: number; tokens: number; cost: number; latency: number };
  zerog: { turns: number; tokens: number; cost: number; latency: number };
}) {
  return (
    <div className="border-t border-border px-6 py-3 grid md:grid-cols-2 gap-4 font-mono text-xs text-muted">
      <div className="flex gap-6">
        <span className="text-accent">Cold</span>
        <span>{cold.turns} calls</span>
        <span>{cold.tokens} tok</span>
        <span>${cold.cost.toFixed(2)}</span>
      </div>
      <div className="flex gap-6">
        <span className="text-violet">ZeroG</span>
        <span>{zerog.turns} calls</span>
        <span>{zerog.tokens} tok</span>
        <span>${zerog.cost.toFixed(2)}</span>
      </div>
    </div>
  );
}
