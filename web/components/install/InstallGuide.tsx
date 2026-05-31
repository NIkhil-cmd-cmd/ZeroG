"use client";

import { useEffect, useState } from "react";
import CopyBlock from "@/components/ui/CopyBlock";
import { ENGINE_URL, GITHUB_URL, REPO_CLONE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InstallGuide() {
  const [health, setHealth] = useState<string>("checking…");
  const repoPath = "~/ZeroG";

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) =>
        setHealth(
          d.status === "ok"
            ? `Engine online · ${d.traces} traces · GNN ${d.gnn_active ? "active" : "idle"}`
            : "Engine unreachable"
        )
      )
      .catch(() => setHealth("Engine unreachable — start with cd engine && ./run.sh server"));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12">
        <p className="section-label mb-3">Antigravity Skill</p>
        <h1 className="text-4xl font-semibold tracking-tight text-text md:text-5xl">
          Add ZeroG to Antigravity
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary leading-relaxed">
          ZeroG is an Antigravity skill plus a local memory engine. The skill tells your agent
          when to retrieve and record traces. The engine stores embeddings, runs KNN lookup, and
          trains a GNN on real tool-use patterns.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="pill pill-blue">SKILL.md standard</span>
          <span className="pill">KNN + SQLite</span>
          <span className="pill">GraphSAGE GNN</span>
          <span className="pill">{health}</span>
        </div>
      </div>

      {/* Architecture */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-text mb-4">Architecture</h2>
        <div className="ag-card p-6 font-mono text-sm text-text-secondary leading-relaxed">
          <pre className="whitespace-pre-wrap">{`Antigravity Agent
    │
    ├─ reads  .agents/skills/zerog-shared-memory/SKILL.md
    │
    ├─ retrieve ──POST──▶ ${ENGINE_URL}/memory/retrieve
    │                      └─ exact hash → semantic KNN → few-shot → cold
    │
    ├─ executes task (Gemini + tools)
    │
    └─ record   ──POST──▶ ${ENGINE_URL}/memory/record
                           └─ SQLite + OpenAI embeddings + GNN retrain`}</pre>
        </div>
      </section>

      {/* Step 1 */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-2">1. Clone & start the engine</h2>
        <p className="text-text-secondary mb-4 text-sm">
          The engine must run locally (or on your team&apos;s infra). Antigravity calls it via HTTP.
        </p>
        <div className="space-y-4">
          <CopyBlock label="Clone repository" code={`${REPO_CLONE}\ncd ZeroG`} />
          <CopyBlock
            label="Environment (.env in repo root)"
            code={`GEMINI_API_KEY=your-key\nOPENAI_API_KEY=your-key\nGEMINI_MODEL=gemini-2.5-flash\nZEROG_ENGINE_URL=http://localhost:8000`}
          />
          <CopyBlock
            label="Start engine"
            code={`cd engine\npython3 -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt\n./run.sh server`}
          />
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-2">2. Install the Antigravity skill</h2>
        <p className="text-text-secondary mb-4 text-sm">
          Per{" "}
          <a
            href="https://antigravity.google/docs/skills"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Antigravity docs
          </a>
          , skills are folders with a <code className="text-xs bg-bg-code px-1 rounded">SKILL.md</code>{" "}
          file. Install workspace-scoped (this project) or global (all projects).
        </p>

        <div className="space-y-6">
          <div className="ag-card p-6">
            <h3 className="font-semibold text-text mb-2">Option A — One command (recommended)</h3>
            <CopyBlock
              code={`# From your Antigravity project root:\n/path/to/ZeroG/scripts/install-skill.sh workspace\n\n# Or install globally for all projects:\n/path/to/ZeroG/scripts/install-skill.sh global`}
            />
          </div>

          <div className="ag-card p-6">
            <h3 className="font-semibold text-text mb-2">Option B — Workspace scope</h3>
            <p className="text-sm text-text-secondary mb-3">
              Skill available only in this repo. Commit{" "}
              <code className="text-xs bg-bg-code px-1 rounded">.agents/skills/</code> to share with
              your team.
            </p>
            <CopyBlock
              code={`cd /path/to/your-antigravity-project\nmkdir -p .agents/skills\nln -sf ${repoPath}/skill .agents/skills/zerog-shared-memory`}
            />
          </div>

          <div className="ag-card p-6">
            <h3 className="font-semibold text-text mb-2">Option C — Global scope</h3>
            <p className="text-sm text-text-secondary mb-3">Available in every Antigravity workspace.</p>
            <CopyBlock
              code={`mkdir -p ~/.gemini/antigravity/skills\nln -sf ${repoPath}/skill ~/.gemini/antigravity/skills/zerog-shared-memory`}
            />
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-2">3. Configure & verify</h2>
        <CopyBlock
          label="Shell / Antigravity environment"
          code={`export ZEROG_ENGINE_URL=http://localhost:8000\nexport OPENAI_API_KEY=your-key`}
        />
        <div className="mt-4 space-y-4">
          <CopyBlock
            label="Health check"
            code={`curl -s $ZEROG_ENGINE_URL/health | python3 -m json.tool`}
          />
          <CopyBlock
            label="Test memory retrieve"
            code={`${repoPath}/skill/scripts/memory_client.sh retrieve "Deploy Cloud Function with Firestore trigger" cloud_functions`}
          />
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          Restart your Antigravity agent session after installing the skill so it discovers the new{" "}
          <code className="text-xs bg-bg-code px-1 rounded">SKILL.md</code>.
        </p>
      </section>

      {/* API Reference */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-4">Memory API</h2>
        <div className="overflow-x-auto ag-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-left">
                <th className="px-4 py-3 font-mono font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {[
                ["POST /memory/retrieve", "KNN lookup — returns layer, examples, cache hit"],
                ["POST /memory/record", "Store trace after task completion"],
                ["GET /health", "Engine status, trace count, GNN state"],
                ["GET /graph", "Tool transition graph from real traces"],
                ["POST /predict", "GNN next-tool prediction"],
                ["POST /run + GET /stream/:id", "Live demo SSE (cold vs ZeroG)"],
              ].map(([ep, desc]) => (
                <tr key={ep} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-accent">{ep}</td>
                  <td className="px-4 py-3">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Agent workflow */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-4">Agent workflow (from SKILL.md)</h2>
        <ol className="space-y-3 text-text-secondary">
          <li className="flex gap-3">
            <span className="pill pill-blue shrink-0">1</span>
            Agent receives a multi-step GCP task
          </li>
          <li className="flex gap-3">
            <span className="pill pill-blue shrink-0">2</span>
            Calls <code className="font-mono text-xs bg-bg-code px-1 rounded">memory/retrieve</code>{" "}
            — exact hash → semantic match → few-shot → cold start
          </li>
          <li className="flex gap-3">
            <span className="pill pill-blue shrink-0">3</span>
            Executes with injected context if similarity ≥ 0.65
          </li>
          <li className="flex gap-3">
            <span className="pill pill-blue shrink-0">4</span>
            Calls <code className="font-mono text-xs bg-bg-code px-1 rounded">memory/record</code>{" "}
            with tool sequence + outcome
          </li>
          <li className="flex gap-3">
            <span className="pill pill-blue shrink-0">5</span>
            Next engineer&apos;s agent inherits the trace automatically
          </li>
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/demo">
          <Button size="lg">Run live demo</Button>
        </Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          <Button size="lg" variant="outline">
            View on GitHub
          </Button>
        </a>
      </div>
    </main>
  );
}
