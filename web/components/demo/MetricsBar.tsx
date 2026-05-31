export default function MetricsBar({
  cold,
  zerog,
  demoStats,
}: {
  cold: { turns: number; tokens: number; cost: number; latency: number };
  zerog: { turns: number; tokens: number; cost: number; latency: number };
  demoStats?: {
    token_savings_pct?: number;
    pattern_savings_pct?: number;
    turn_savings_pct?: number;
    exploration_skipped?: number;
    recall_latency_ms?: number;
  };
}) {
  const savings = demoStats?.pattern_savings_pct ?? demoStats?.token_savings_pct;
  const turnSavings = demoStats?.turn_savings_pct;
  const displaySavings =
    savings != null && turnSavings != null && savings < 0 && turnSavings > 0
      ? turnSavings
      : savings;
  const savingsLabel =
    savings != null && turnSavings != null && savings < 0 && turnSavings > 0
      ? "turn savings"
      : "pattern transfer savings";
  return (
    <div className="border-t border-border/60 px-6 py-3 bg-surface/30">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-4 font-mono text-xs text-muted">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-accent">Cold</span>
          <span>{cold.turns} model calls</span>
          <span>{cold.tokens.toLocaleString()} tok</span>
          <span>${cold.cost.toFixed(4)}</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-violet">ZeroG</span>
          <span>{zerog.turns} model calls</span>
          <span>{zerog.tokens.toLocaleString()} tok</span>
          <span>${zerog.cost.toFixed(4)}</span>
        </div>
      </div>
      {displaySavings != null && (
        <p className="mx-auto max-w-6xl mt-2 font-mono text-[11px] text-text-secondary">
          {savingsLabel.charAt(0).toUpperCase() + savingsLabel.slice(1)}:{" "}
          <span className={displaySavings >= 0 ? "text-success" : "text-error"}>
            {displaySavings}%
          </span>
          {turnSavings != null && savings != null && savings >= 0 && (
            <span className="text-muted"> · {turnSavings}% fewer model turns</span>
          )}
          {demoStats?.exploration_skipped != null && demoStats.exploration_skipped > 0 && (
            <span className="text-muted">
              {" "}
              · {demoStats.exploration_skipped} exploration steps skipped
            </span>
          )}
          {demoStats?.recall_latency_ms != null && (
            <span className="text-muted"> · recall avg {demoStats.recall_latency_ms}ms</span>
          )}
        </p>
      )}
    </div>
  );
}
