import Link from "next/link";
import Nav from "@/components/layout/Nav";
import ForceGraph from "@/components/graph/ForceGraph";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export default function GraphPage() {
  return (
    <>
      <Nav />
      <div className="border-b border-border bg-bg-subtle px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label mb-2">GNN Visualizer</p>
            <h1 className="text-3xl font-semibold text-text">Tool-use graph</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Nodes = tools · Edges = transitions · Weights from real agent traces
            </p>
          </div>
          <Link href="/demo">
            <Button variant="outline">Generate traces →</Button>
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8 h-[calc(100vh-220px)] min-h-[500px]">
        <ForceGraph />
      </div>
      <Footer />
    </>
  );
}
