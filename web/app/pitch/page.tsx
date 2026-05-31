import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Memory layers", value: "4", detail: "hash, semantic, few-shot, cold" },
  { label: "Trace store", value: "SQLite", detail: "embeddings, tools, outcome, cluster" },
  { label: "Live demo", value: "SSE", detail: "task events streamed in real time" },
  { label: "Learning", value: "GNN", detail: "tool transitions from real traces" },
];

const sections = [
  {
    id: "problem",
    eyebrow: "01",
    label: "Problem",
    title: "Every new agent session starts by rediscovering the same workflow.",
    body: "Cloud tasks repeat the same setup logic, but each session burns context on the same flags, the same IAM order, and the same verification steps. The result is duplicated work and no durable transfer between agents.",
    cards: [
      "Cold starts cost tokens before any useful work begins.",
      "Trace knowledge disappears at the end of each session.",
      "A second agent does not inherit what the first one learned.",
    ],
  },
  {
    id: "solution",
    eyebrow: "02",
    label: "Solution",
    title: "ZeroG turns solved sessions into shared memory.",
    body: "Before a multi-step task starts, the agent retrieves a matching or similar trace. After it finishes, ZeroG records the tool path and outcome so the next agent can reuse the pattern instead of starting from zero.",
    cards: [
      "Exact matches replay a cached successful path.",
      "Semantic matches reuse an equivalent workflow.",
      "Few-shot matches inject a prior run as context.",
    ],
  },
  {
    id: "implementation",
    eyebrow: "03",
    label: "Implementation",
    title: "The system is a skill, a memory engine, and a trace learner.",
    body: "The web app presents the pitch. The engine stores traces, retrieves similar work, and streams demo events. A GNN learns tool transitions from real sessions to improve recall hints over time.",
    cards: [
      "SKILL.md tells Antigravity to retrieve before work and record after work.",
      "FastAPI exposes health, stats, stream, memory, and train endpoints.",
      "OpenAI embeddings and SQLite back the retrieval layer.",
    ],
  },
  {
    id: "demo",
    eyebrow: "04",
    label: "Demo",
    title: "The live benchmark compares cold exploration against ZeroG on the same task.",
    body: "Each pair runs the same Cloud Functions deploy task twice. Cold must read docs and probe permissions. ZeroG retrieves a teammate trace and skips straight to the deploy path.",
    cards: [
      "Same task per pair — fair token comparison.",
      "Real tool calls through Gemini or Anthropic.",
      "Metrics show turns, tokens, exploration steps skipped, and recall layer.",
    ],
  },
  {
    id: "implication",
    eyebrow: "05",
    label: "Implication",
    title: "Agent work becomes organizational memory.",
    body: "ZeroG makes each solved task available to later agents. That turns one session's debugging and deployment work into a reusable layer of institutional knowledge that compounds over time.",
    cards: [
      "Less repeated setup work across the team.",
      "Faster onboarding for unfamiliar tasks.",
      "A practical memory layer for autonomous agents.",
    ],
  },
];

export default function PitchPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-bg">
        <section className="border-b border-border bg-bg-subtle px-6 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="section-label mb-4">Pitch</p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-text md:text-6xl">
                ZeroG: shared memory for Antigravity agents.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-secondary md:text-xl">
                A structured pitch page for the product story. It follows the same section rhythm
                as the reference site while keeping ZeroG&apos;s own problem, solution,
                implementation, demo, and implication.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/demo">
                  <Button size="lg">Run demo</Button>
                </Link>
                <Link href="/install">
                  <Button size="lg" variant="outline">
                    Install skill
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {stats.map((item) => (
                <div key={item.label} className="ag-card px-5 py-4">
                  <p className="font-mono text-xs uppercase text-muted">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-text">{item.value}</p>
                  <p className="mt-1 text-sm text-text-secondary">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8">
              {sections.map((section, index) => (
                <article
                  key={section.id}
                  id={section.id}
                  className={`grid gap-6 border-b border-border py-10 last:border-b-0 lg:grid-cols-[0.75fr_1.25fr] ${
                    index % 2 === 0 ? "" : "lg:grid-cols-[1fr_1fr]"
                  }`}
                >
                  <div className="space-y-3">
                    <p className="section-label">{section.eyebrow}</p>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                      {section.label}
                    </p>
                    <h2 className="max-w-xl text-2xl font-semibold leading-tight text-text md:text-3xl">
                      {section.title}
                    </h2>
                  </div>

                  <div>
                    <p className="max-w-3xl text-base leading-relaxed text-text-secondary md:text-lg">
                      {section.body}
                    </p>
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {section.cards.map((card) => (
                        <div key={card} className="rounded-lg border border-border bg-bg-subtle p-4">
                          <p className="text-sm leading-relaxed text-text">{card}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-bg-subtle px-6 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="section-label mb-3">Proof path</p>
              <h2 className="text-3xl font-semibold text-text md:text-4xl">
                The demo is not a mockup. It is a live engine run.
              </h2>
              <p className="mt-4 max-w-2xl text-text-secondary">
                The interface streams real events from the backend, including tool calls, task
                completion, retrieval layer, token counts, and latency.
              </p>
            </div>
            <div className="ag-card overflow-hidden">
              <div className="border-b border-border bg-bg-subtle px-4 py-2 font-mono text-xs text-text-secondary">
                Demo workflow
              </div>
              <div className="grid gap-0 md:grid-cols-3">
                {[
                  ["Cold", "same task", "read_docs and permission probing"],
                  ["ZeroG", "same task", "recall + skip exploration"],
                  ["Record", "tool path", "stored for the next agent"],
                ].map(([title, subtitle, desc]) => (
                  <div key={title} className="border-b border-border p-5 md:border-b-0 md:border-r last:border-r-0">
                    <p className="font-mono text-xs uppercase text-accent">{title}</p>
                    <p className="mt-2 text-base font-semibold text-text">{subtitle}</p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="ag-card p-6">
                <p className="section-label mb-3">What it changes</p>
                <p className="text-2xl font-semibold text-text">
                  The next agent does not repeat the first agent&apos;s learning curve.
                </p>
                <p className="mt-4 text-text-secondary">
                  The project makes procedural knowledge transferable across sessions, which is the
                  practical step from single-agent automation to team memory.
                </p>
              </div>
              <div className="ag-card p-6">
                <p className="section-label mb-3">Where it goes next</p>
                <p className="text-2xl font-semibold text-text">
                  More tasks, more traces, more reusable workflows.
                </p>
                <p className="mt-4 text-text-secondary">
                  As the trace set grows, retrieval improves and the demo becomes a better proxy
                  for how agents can share operational knowledge.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo">
                <Button variant="outline">Run demo</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost">Back to landing</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
