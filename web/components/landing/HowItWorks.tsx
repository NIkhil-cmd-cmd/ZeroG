const cards = [
  {
    title: "EXACT MATCH",
    desc: "SHA-256 hash hit on task text. Return cached trace.",
    badge: "0 tokens",
    badgeClass: "text-success bg-green-50 border-green-200",
  },
  {
    title: "SEMANTIC MATCH",
    desc: "OpenAI embedding cosine similarity > 0.95.",
    badge: "~150 tok",
    badgeClass: "text-success bg-green-50 border-green-200",
  },
  {
    title: "FEW-SHOT",
    desc: "Similarity 0.65–0.95. Inject top trace as context.",
    badge: "~210 tok",
    badgeClass: "text-warning bg-amber-50 border-amber-200",
  },
  {
    title: "COLD START",
    desc: "No match. Full agent run. Record trace after.",
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
          Four gates. Most tasks never reach full cost.
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
