"use client";

import { useEffect, useState } from "react";
import CopyBlock from "@/components/ui/CopyBlock";
import { ENGINE_URL, GITHUB_URL, PUBLIC_ENGINE_URL, REPO_CLONE, WEB_URL } from "@/lib/constants";
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
          ZeroG is an Antigravity skill plus a public memory engine. The skill tells your agent
          when to retrieve and record traces. The engine stores embeddings, runs KNN lookup, and
          trains a GNN on real tool-use patterns — no local server required.
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
    ├─ MCP (stdio) ──▶ zerog_proxy.py  ← protocol-level cache (recommended)
    │                      └─ intercept tools/call → memory → forward/record
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

      {/* MCP proxy */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-text mb-4">MCP proxy (invisible infrastructure)</h2>
        <p className="text-text-secondary mb-4 text-sm leading-relaxed">
          Antigravity uses MCP for all external tools. ZeroG sits between Antigravity and the real
          gcloud/BigQuery MCP server — no prompt changes, no agent awareness. Exact cache hits skip
          the upstream call entirely.
        </p>
        <div className="ag-card p-6 mb-4 font-mono text-xs text-text-secondary whitespace-pre-wrap">{`Antigravity  →  ZeroG Proxy (zerog_proxy.py)  →  Real MCP Server
                 1. tools/call intercepted
                 2. memory lookup (hash → semantic → few-shot)
                 3. cache hit → return cached result
                 4. else → forward + record trace`}</div>
        <div className="space-y-4">
          <CopyBlock
            label="Install MCP config (workspace)"
            code={`git clone ${GITHUB_URL}.git ~/ZeroG\ncd ~/ZeroG/engine && ./run.sh install\n~/ZeroG/scripts/install-mcp-config.sh workspace`}
          />
          <CopyBlock
            label="Example .agents/mcp.json snippet"
            code={`{\n  "mcpServers": {\n    "gcloud": {\n      "command": "~/ZeroG/engine/.venv/bin/python",\n      "args": ["~/ZeroG/engine/zerog_proxy.py"],\n      "env": {\n        "REAL_MCP_COMMAND": "npx",\n        "REAL_MCP_ARGS": "-y,@YOUR_ORG/gcloud-mcp-server",\n        "OPENAI_API_KEY": "your-key",\n        "ZEROG_CLUSTER": "cloud_functions"\n      }\n    }\n  }\n}`}
          />
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          See <code className="text-xs bg-bg-code px-1 rounded">skill/MCP.md</code> and{" "}
          <code className="text-xs bg-bg-code px-1 rounded">config/antigravity-mcp.example.json</code>{" "}
          in the repo.
        </p>
      </section>

      {/* Step 1 — public install */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-2">1. Install skill (public, one command)</h2>
        <p className="text-text-secondary mb-4 text-sm">
          No local clone required. Installs globally to{" "}
          <code className="text-xs bg-bg-code px-1 rounded">~/.gemini/antigravity/skills/</code>.
        </p>
        <CopyBlock
          label="Public install"
          code={`curl -fsSL https://raw.githubusercontent.com/NIkhil-cmd-cmd/ZeroG/main/scripts/install-skill.sh | bash -s public`}
        />
        <div className="mt-4 space-y-4">
          <CopyBlock
            label="Antigravity environment"
            code={`export ZEROG_ENGINE_URL=${PUBLIC_ENGINE_URL}\nexport OPENAI_API_KEY=your-openai-key`}
          />
          <CopyBlock
            label="Public URLs"
            code={`Engine: ${PUBLIC_ENGINE_URL}\nWeb:    ${WEB_URL}\nGitHub: ${GITHUB_URL}`}
          />
        </div>
      </section>

      {/* Step 2 — local dev optional */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-2">2. Local engine (optional)</h2>
        <p className="text-text-secondary mb-4 text-sm">
          For offline dev or your own keys. Production demo uses the public engine above.
        </p>
        <div className="space-y-4">
          <CopyBlock label="Clone repository" code={`${REPO_CLONE}\ncd ZeroG`} />
          <CopyBlock
            label="Start engine locally"
            code={`cd engine && ./run.sh server\nexport ZEROG_ENGINE_URL=http://localhost:8000`}
          />
        </div>
      </section>

      {/* Step 3 — skill scopes */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-2">3. Skill install scopes</h2>
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
            <h3 className="font-semibold text-text mb-2">Option A — Public (recommended)</h3>
            <CopyBlock code={`curl -fsSL https://raw.githubusercontent.com/NIkhil-cmd-cmd/ZeroG/main/scripts/install-skill.sh | bash -s public`} />
          </div>

          <div className="ag-card p-6">
            <h3 className="font-semibold text-text mb-2">Option B — Workspace scope (local clone)</h3>
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
            <h3 className="font-semibold text-text mb-2">Option C — Global scope (local clone)</h3>
            <p className="text-sm text-text-secondary mb-3">Available in every Antigravity workspace.</p>
            <CopyBlock
              code={`mkdir -p ~/.gemini/antigravity/skills\nln -sf ${repoPath}/skill ~/.gemini/antigravity/skills/zerog-shared-memory`}
            />
          </div>
        </div>
      </section>

      {/* Step 4 */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-text mb-2">4. Configure & verify</h2>
        <CopyBlock
          label="Shell / Antigravity environment"
          code={`export ZEROG_ENGINE_URL=${PUBLIC_ENGINE_URL}\nexport OPENAI_API_KEY=your-openai-key`}
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
