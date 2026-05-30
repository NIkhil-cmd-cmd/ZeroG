const cards = [
  {
    title: "EXACT MATCH",
    desc: "Hash hit. Return cached trace.",
    detail: "Zero tokens. Zero cost.",
    badge: "■ 0 tokens",
    badgeColor: "text-success",
  },
  {
    title: "SEMANTIC MATCH",
    desc: "Embedding similarity > 0.95. Return cached trace.",
    detail: "",
    badge: "■ ~150 tok",
    badgeColor: "text-success",
  },
  {
    title: "FEW-SHOT INJECTION",
    desc: "Inject top trace as in-context example.",
    detail: "85% faster.",
    badge: "■ ~210 tok",
    badgeColor: "text-warning",
  },
  {
    title: "COLD START",
    desc: "No match. Run from scratch. Record trace for next session.",
    detail: "",
    badge: "■ full cost",
    badgeColor: "text-error",
  },
];

export default function HowItWorks() {
  return (
    <section className="fade-in py-24 px-8 max-w-6xl mx-auto">
      <p className="section-label mb-4">02</p>
      <h2 className="text-3xl md:text-4xl font-medium mb-12">
        One session learns. Every session benefits.
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.title} className="card-hover rounded-xl bg-surface p-6">
            <h3 className="font-mono text-xs text-accent mb-3 tracking-wider">{c.title}</h3>
            <p className="text-sm text-text/80 mb-2">{c.desc}</p>
            {c.detail && <p className="text-sm text-text/60 mb-4">{c.detail}</p>}
            <p className={`font-mono text-xs mt-auto ${c.badgeColor}`}>{c.badge}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-muted text-sm">
        Tasks flow left to right through four gates. Most tasks resolve before they reach full cost.
      </p>
    </section>
  );
}
