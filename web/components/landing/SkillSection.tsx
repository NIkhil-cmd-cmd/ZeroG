"use client";

import Link from "next/link";
import CopyBlock from "@/components/ui/CopyBlock";
import { Button } from "@/components/ui/button";

export default function SkillSection() {
  return (
    <section id="architecture" className="border-t border-border bg-bg-subtle py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">Integration</p>
        <h2 className="text-3xl font-semibold text-text md:text-4xl">
          One SKILL.md. Plugs into Antigravity.
        </h2>
        <p className="mt-4 max-w-2xl text-text-secondary">
          Two integration surfaces: MCP proxy at the transport layer (invisible to the agent) plus
          SKILL.md for HTTP memory retrieve/record.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="ag-card p-6">
            <p className="font-mono text-xs text-muted mb-3">skill/SKILL.md</p>
            <pre className="code-block text-xs leading-relaxed">{`---
name: zerog-shared-memory
description: >
  Shared memory for Antigravity. Retrieve similar
  traces before tasks. Record after completion.
---

# ZeroG Shared Memory

## Rules
- Always retrieve before multi-step GCP tasks
- Always record after completion
- Identical task text → exact match (MCP replay only)
- Similar task → few-shot tool order, fresh write_function
- No match → cold start, record for next time`}</pre>
          </div>

          <div className="space-y-4">
            <CopyBlock
              label="MCP proxy (recommended)"
              code={`git clone https://github.com/NIkhil-cmd-cmd/ZeroG.git ~/ZeroG\ncd ~/ZeroG/engine && ./run.sh install\n~/ZeroG/scripts/install-mcp-config.sh workspace`}
            />
            <CopyBlock
              label="Skill + HTTP memory"
              code={`curl -fsSL https://raw.githubusercontent.com/NIkhil-cmd-cmd/ZeroG/main/scripts/install-skill.sh | bash -s public\nexport ZEROG_ENGINE_URL=https://zerog-production.up.railway.app\nexport OPENAI_API_KEY=your-key`}
            />
            <CopyBlock
              label="Retrieve trace"
              code={`./skill/scripts/memory_client.sh retrieve \\
  "Deploy Cloud Function with Firestore trigger" \\
  cloud_functions`}
            />
            <Link href="/install">
              <Button className="w-full sm:w-auto">Full install guide →</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
