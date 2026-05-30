import Link from "next/link";
import ForceGraph from "@/components/graph/ForceGraph";

export default function GraphPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-accent">
            ← ZeroG
          </Link>
          <h1 className="text-xl font-medium mt-1">Tool-Use Graph</h1>
          <p className="text-xs text-muted">GNN-learned transitions from real traces</p>
        </div>
        <Link href="/demo" className="text-sm text-accent hover:underline">
          Run Demo →
        </Link>
      </header>
      <div className="p-6 h-[calc(100vh-80px)]">
        <ForceGraph />
      </div>
    </div>
  );
}
