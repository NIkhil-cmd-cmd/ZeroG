import type { GraphData } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export default function NodeDetail({
  nodeId,
  graph,
}: {
  nodeId: string | null;
  graph: GraphData;
}) {
  if (!nodeId) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted font-mono">Hover a node for details</p>
        </CardContent>
      </Card>
    );
  }

  const node = graph.nodes.find((n) => n.id === nodeId);
  const outgoing = graph.edges
    .filter((e) => e.source === nodeId)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const totalCalls = graph.edges
    .filter((e) => e.source === nodeId || e.target === nodeId)
    .reduce((s, e) => s + e.weight, 0);

  return (
    <Card>
      <CardContent className="p-4 font-mono text-xs">
        <p className="text-accent mb-2">{nodeId}</p>
        <p className="text-muted mb-1">Appearances in traces: {node?.count ?? 0}</p>
        <p className="text-muted mb-3">Total transition weight: {totalCalls}</p>
        <p className="text-muted mb-1">Top outgoing:</p>
        {outgoing.length === 0 && <p className="text-muted">No outgoing edges</p>}
        {outgoing.map((e) => (
          <div key={e.target} className="flex justify-between text-text-secondary">
            <span>→ {e.target}</span>
            <span>{e.weight}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
