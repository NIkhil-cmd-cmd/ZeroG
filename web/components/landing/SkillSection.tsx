export default function SkillSection() {
  return (
    <section className="fade-in py-24 px-8 max-w-4xl mx-auto">
      <p className="section-label mb-4">06</p>
      <h2 className="text-3xl md:text-4xl font-medium mb-8">One SKILL.md. Any Antigravity agent.</h2>

      <div className="rounded-xl bg-surface border border-border overflow-hidden font-mono text-xs leading-relaxed">
        <div className="px-4 py-2 border-b border-border text-muted">skill/SKILL.md</div>
        <pre className="p-6 text-text/80 overflow-x-auto">
{`---
name: zerog-shared-memory
description: >
  Shared memory layer for Antigravity agents.
  Before executing a task, retrieve similar past
  traces via KNN. After completing, record the
  trace. Makes agents faster, cheaper, and more
  accurate over time.
---

# ZeroG: Shared Memory

## Core Rules
- Always check memory before executing
- Always record traces after completion
- Similarity > 0.95 → follow cached trace
- Similarity 0.70-0.95 → inject as example
- Similarity < 0.70 → cold start, record for next time`}
        </pre>
      </div>

      <p className="text-muted text-sm mt-6 mb-4">
        Install it like any Antigravity skill. The memory compounds from the first session.
      </p>
      <code className="block font-mono text-sm text-accent bg-surface border border-border rounded-lg px-4 py-3">
        $ npx skills add zerog/shared-memory
      </code>
    </section>
  );
}
