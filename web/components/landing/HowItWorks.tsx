const cards = [
  {
    title: "EXACT MATCH",
    desc: "Identical task text (SHA-256 hash). MCP may replay cached tool output.",
    badge: "MCP only",
    badgeClass: "text-success bg-green-50 border-green-200",
  },
  {
    title: "FEW-SHOT",
    desc: "Similar task in same cluster. Inject tool order only — always run fresh code.",
    badge: "~pattern",
    badgeClass: "text-warning bg-amber-50 border-amber-200",
  },
  {
    title: "COLD START",
    desc: "No similar traces. Full agent run. Record for the team.",
    badge: "full cost",
    badgeClass: "text-error bg-red-50 border-red-200",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">02 · Memory pipeline</p>
        <h2 className="text-3xl font-semibold text-text md:text-4xl">
          Three gates. Pattern transfer without wrong artifacts.
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.title} className="ag-card ag-card-hover p-6">
              <h3 className="font-mono text-xs font-semibold text-accent mb-3">{c.title}</h3>
              <p className="text-sm text-text-secondary mb-4 leading-relaxed">{c.desc}</p>
              <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-xs ${c.badgeClass}`}>
                {c.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
