type ToolEvent = { tool: string; detail?: string; status?: string };

export default function AgentPanel({
  title,
  subtitle,
  task,
  tools,
  done,
  metrics,
  zerog,
}: {
  title: string;
  subtitle: string;
  task: string;
  tools: ToolEvent[];
  done: boolean;
  metrics: { turns: number; tokens: number; cost: number; latency: number; layer?: string };
  zerog?: boolean;
}) {
  const statusColor = (s?: string) => {
    if (s === "complete" || s === "success") return "text-success";
    if (s === "error") return "text-error";
    if (s === "running") return "text-warning";
    return "text-accent";
  };

  return (
    <div className="p-6 flex flex-col">
      <h2 className="font-mono text-xs text-muted mb-1">{title}</h2>
      <p className="text-xs text-text/60 mb-4">{subtitle}</p>

      <div className="flex-1 rounded-xl bg-surface border border-border p-4 font-mono text-xs min-h-[280px]">
        {task && (
          <p className="text-muted mb-3 truncate">Task: {task.slice(0, 60)}...</p>
        )}
        {tools.map((t, i) => (
          <div key={i} className={`mb-1 ${statusColor(t.status)}`}>
            → {t.tool}
            {t.detail && <span className="text-muted ml-2">{t.detail}</span>}
          </div>
        ))}
        {done && (
          <p className="mt-4 text-success">
            ✓ Done — {metrics.turns} tool calls
            {zerog && metrics.layer && ` · Layer: ${metrics.layer}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs text-muted">
        <span>Tool calls: {metrics.turns}</span>
        <span>Tokens: {metrics.tokens.toLocaleString()}</span>
        <span>Cost: ${metrics.cost.toFixed(2)}</span>
        <span>Time: {metrics.latency.toFixed(0)}s</span>
      </div>
    </div>
  );
}
