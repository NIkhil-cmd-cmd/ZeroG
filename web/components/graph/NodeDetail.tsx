import { DEFAULT_EDGES } from "@/lib/constants";

export default function NodeDetail({ nodeId }: { nodeId: string | null }) {
  if (!nodeId) {
    return (
      <div className="rounded-xl bg-surface border border-border p-4">
        <p className="text-xs text-muted font-mono">Hover a node for details</p>
      </div>
    );
  }

  const outgoing = DEFAULT_EDGES.filter((e) => e.source === nodeId)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const totalCalls = DEFAULT_EDGES.filter((e) => e.source === nodeId || e.target === nodeId).reduce(
    (s, e) => s + e.weight,
    0
  );

  return (
    <div className="rounded-xl bg-surface border border-border p-4 font-mono text-xs">
      <p className="text-accent mb-2">{nodeId}</p>
      <p className="text-muted mb-3">Total transitions: {totalCalls}</p>
      <p className="text-muted mb-1">Top outgoing:</p>
      {outgoing.map((e) => (
        <div key={e.target} className="flex justify-between text-text/70">
          <span>→ {e.target}</span>
          <span>{e.weight}</span>
        </div>
      ))}
    </div>
  );
}
