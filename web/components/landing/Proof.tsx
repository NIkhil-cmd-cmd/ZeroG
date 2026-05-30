import Link from "next/link";

export default function Proof() {
  const coldPoints = Array.from({ length: 50 }, (_, i) => `${(i / 49) * 400},${200 - i * 3.5}`);
  const zerogPoints = Array.from({ length: 50 }, (_, i) => {
    const y = 200 - Math.min(i * 3.5, 80) - Math.log(i + 1) * 8;
    return `${(i / 49) * 400},${y}`;
  });

  return (
    <section className="fade-in py-24 px-8 max-w-6xl mx-auto">
      <p className="section-label mb-4">05</p>
      <h2 className="text-3xl md:text-4xl font-medium mb-12">Numbers from real runs.</h2>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { value: "5×", label: "faster", desc: "Session #10 vs Session #1 on same task type" },
          { value: "71%", label: "token savings", desc: "After 50 shared traces in the same domain" },
          { value: "<1s", label: "recall", desc: "Memory lookup is a single KNN query" },
        ].map((s) => (
          <div key={s.value} className="rounded-xl bg-surface border border-border p-8 text-center">
            <p className="text-4xl font-medium text-accent mb-1">{s.value}</p>
            <p className="text-sm text-muted mb-3">{s.label}</p>
            <p className="text-xs text-text/50">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-surface border border-border p-6">
        <svg viewBox="0 0 440 220" className="w-full">
          <defs>
            <filter id="glow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.5" />
            </filter>
          </defs>
          <line x1="40" y1="200" x2="420" y2="200" stroke="#1e1e1e" />
          <line x1="40" y1="20" x2="40" y2="200" stroke="#1e1e1e" />
          <text x="230" y="216" textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">
            Session number (1–50)
          </text>
          <polyline points={coldPoints.join(" ")} fill="none" stroke="#4285f4" strokeWidth="2" transform="translate(40,0)" />
          <polyline
            points={zerogPoints.join(" ")}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2"
            filter="url(#glow)"
            transform="translate(40,0)"
          />
          <text x="60" y="40" fill="#4285f4" fontSize="9" fontFamily="monospace">
            Cold sessions
          </text>
          <text x="60" y="55" fill="#7c3aed" fontSize="9" fontFamily="monospace">
            ZeroG sessions
          </text>
        </svg>
        <p className="text-center text-muted text-sm mt-4">
          Live data from the demo.{" "}
          <Link href="/demo" className="text-accent hover:underline">
            Run it yourself →
          </Link>
        </p>
      </div>
    </section>
  );
}
