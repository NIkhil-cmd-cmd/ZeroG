import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

const sections = [
  {
    eyebrow: "01 · Problem",
    title: "Agents solve the same operational puzzles from scratch.",
    body: "Cloud tasks are repetitive but not identical: deploy flags, IAM order, service-specific setup, and verification steps recur across teams. Today each agent spends context and tool calls rediscovering patterns another agent already learned.",
    points: [
      "Cold starts waste tokens on setup and documentation loops.",
      "Useful traces stay trapped inside one session.",
      "Similar tasks do not benefit from previous failures or fixes.",
    ],
  },
  {
    eyebrow: "02 · Solution",
    title: "ZeroG turns past agent work into shared memory.",
    body: "Before an Antigravity agent starts a multi-step GCP task, it retrieves matching or similar traces. After completion, it records the tool path and result. The next agent inherits the pattern without fine-tuning or retraining.",
    points: [
      "Exact matches replay cached successful paths.",
      "Semantic matches reuse equivalent traces.",
      "Few-shot matches inject the best prior workflow as context.",
    ],
  },
  {
    eyebrow: "03 · Implementation",
    title: "A SKILL.md layer backed by retrieval and a tool-use graph.",
    body: "The prototype combines an Antigravity skill, a FastAPI memory engine, OpenAI embeddings, SQLite persistence, Gemini tool-calling, and a PyTorch GNN that learns tool transitions from real traces.",
    points: [
      "Skill calls `/memory/retrieve` before work and `/memory/record` after work.",
      "Engine stores task hashes, embeddings, tool sequences, clusters, and outcomes.",
      "Graph view exposes the learned tool-transition structure.",
    ],
  },
  {
    eyebrow: "04 · Demo",
    title: "Cold agent versus ZeroG on different tasks in the same cluster.",
    body: "The live demo runs paired Cloud Functions tasks. The cold agent discovers the path first. ZeroG then receives a different task with a related deploy pattern and uses memory to reduce redundant exploration.",
    points: [
      "Same cluster, different services.",
      "Real tool-calling loop with Gemini or Anthropic fallback.",
      "Metrics compare tokens, turns, latency, and recall layer.",
    ],
  },
  {
    eyebrow: "05 · Implication",
    title: "Teams get compounding agent experience.",
    body: "ZeroG makes agent work cumulative. Every solved workflow becomes reusable infrastructure for future agents, creating a lightweight team memory layer that improves with normal usage.",
    points: [
      "Less repeated setup work across cloud operations.",
      "Faster onboarding for agents entering unfamiliar workflows.",
      "A path toward organization-level procedural memory.",
    ],
  },
];

const architecture = [
  { label: "Skill", value: "SKILL.md", detail: "Antigravity retrieval and recording rules" },
  { label: "Memory", value: "FastAPI", detail: "Trace API, health, stats, stream, graph" },
  { label: "Retrieval", value: "4 layers", detail: "hash, semantic, few-shot, cold start" },
  { label: "Learning", value: "GNN", detail: "Tool transition prediction from traces" },
];

export default function PitchPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-bg">
        <section className="border-b border-border bg-bg-subtle px-6 py-16 md:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="section-label mb-4">Pitch section</p>
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-text md:text-6xl">
                  ZeroG: shared memory for Antigravity agents.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-secondary md:text-xl">
                  A compact pitch narrative covering the problem, solution, implementation, demo,
                  and the broader implication of making agent work cumulative.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/demo">
                    <Button size="lg">Run demo</Button>
                  </Link>
                  <Link href="/graph">
                    <Button size="lg" variant="outline">
                      View graph
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {architecture.map((item) => (
                  <div key={item.label} className="border-l-2 border-accent bg-surface px-5 py-4 shadow-sm">
                    <p className="font-mono text-xs uppercase text-muted">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold text-text">{item.value}</p>
                    <p className="mt-1 text-sm text-text-secondary">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5">
              {sections.map((section) => (
                <article
                  key={section.eyebrow}
                  className="grid gap-6 border-b border-border py-10 last:border-b-0 md:grid-cols-[0.85fr_1.4fr]"
                >
                  <div>
                    <p className="section-label mb-3">{section.eyebrow}</p>
                    <h2 className="text-2xl font-semibold leading-tight text-text md:text-3xl">
                      {section.title}
                    </h2>
                  </div>
                  <div>
                    <p className="text-base leading-relaxed text-text-secondary md:text-lg">
                      {section.body}
                    </p>
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {section.points.map((point) => (
                        <div key={point} className="rounded-lg border border-border bg-bg-subtle p-4">
                          <p className="text-sm leading-relaxed text-text">{point}</p>
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
          <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="section-label mb-3">Close</p>
              <h2 className="text-3xl font-semibold text-text">The pitch lands on compounding memory.</h2>
              <p className="mt-3 max-w-2xl text-text-secondary">
                ZeroG is not another agent. It is the shared layer that lets many agents reuse what
                one agent already figured out.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/install">
                <Button>Add to Antigravity</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to landing</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
