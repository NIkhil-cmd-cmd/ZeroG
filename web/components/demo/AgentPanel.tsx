import { Card, CardContent } from "@/components/ui/card";

const LAYER_LABELS: Record<string, string> = {
  exact_match: "Exact duplicate task — cached replay (identical task text only)",
  semantic_match: "High similarity — pattern hint (still executes fresh)",
  few_shot: "Pattern transfer — reused tool order, new task-specific code",
  cold_start: "Cold start — no similar traces yet",
};

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
  tools: { tool: string; detail?: string; status?: string }[];
  done: boolean;
  metrics: { turns: number; tokens: number; cost: number; latency: number; layer?: string };
  zerog?: boolean;
}) {
  const statusColor = (s?: string) => {
    if (s === "complete" || s === "success") return "text-success";
    if (s === "error") return "text-error";
    return "text-accent";
  };

  return (
    <div className="p-6 flex flex-col">
      <h2 className="font-mono text-xs font-semibold text-text-secondary mb-1">{title}</h2>
      <p className="text-xs text-text-secondary mb-4">{subtitle}</p>

      <Card className="flex-1 min-h-[280px]">
        <CardContent className="p-4 font-mono text-xs h-full overflow-y-auto">
          {task && (
            <p className="text-muted mb-3 leading-relaxed">
              <span className="text-muted">Task: </span>
              {task.length > 100 ? `${task.slice(0, 100)}…` : task}
            </p>
          )}
          {tools.length === 0 && !done && <p className="text-muted animate-pulse">Waiting for Gemini tool calls…</p>}
          {tools.map((t, i) => (
            <div key={i} className={`mb-2 ${statusColor(t.status)}`}>
              <div className="flex items-center gap-2">
                <span>{t.status === "error" ? "✗" : "→"}</span>
                <span className="text-accent">{t.tool}</span>
              </div>
              {t.detail && <p className="text-muted ml-5 mt-0.5 leading-relaxed break-words">{t.detail}</p>}
            </div>
          ))}
          {done && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-success">✓ Done — {metrics.turns} model calls</p>
              {zerog && metrics.layer && (
                <p className="text-violet mt-1 text-[11px]">Memory layer: {LAYER_LABELS[metrics.layer] ?? metrics.layer}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs text-muted">
        <span>Model calls: {metrics.turns}</span>
        <span>Tokens: {metrics.tokens.toLocaleString()}</span>
        <span>Cost: ${metrics.cost.toFixed(4)}</span>
        <span>Time: {metrics.latency.toFixed(0)}s</span>
      </div>
    </div>
  );
}
