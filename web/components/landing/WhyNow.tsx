export default function WhyNow() {
  return (
    <section className="fade-in py-24 px-8 max-w-3xl mx-auto text-center">
      <p className="section-label mb-4">04</p>
      <h2 className="text-3xl md:text-4xl font-medium mb-10">The timing.</h2>
      <div className="text-text/70 leading-relaxed space-y-4 text-left md:text-center mb-12">
        <p>
          Antigravity is becoming the default agent harness for Google Cloud teams. Engineers already
          using Docs, Sheets, BigQuery, and Cloud Console are getting agents wired into daily
          workflows.
        </p>
        <p>
          But enterprise Antigravity is early. There&apos;s no shared learning layer. Every team pays
          the cold-start tax on every session, across every engineer.
        </p>
        <p>
          This is the window. Build the memory infrastructure before the adoption curve steepens. The
          team that ships shared memory for Antigravity now owns the most defensible layer in the
          stack — one that gets stronger with every trace recorded.
        </p>
      </div>

      <div className="relative py-8">
        <svg viewBox="0 0 600 60" className="w-full max-w-xl mx-auto">
          <line x1="40" y1="30" x2="560" y2="30" stroke="#1e1e1e" strokeWidth="1" />
          {[
            { x: 80, label: "2025", sub: "CLI Launch" },
            { x: 240, label: "2026 I/O", sub: "" },
            { x: 400, label: "Enterprise Wave", sub: "" },
            { x: 520, label: "Scale", sub: "" },
          ].map((d) => (
            <g key={d.label}>
              <circle cx={d.x} cy={30} r={4} fill="#4285f4" />
              <text x={d.x} y={50} textAnchor="middle" fill="#555" fontSize="10" fontFamily="monospace">
                {d.label}
              </text>
              {d.sub && (
                <text x={d.x} y={14} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">
                  {d.sub}
                </text>
              )}
            </g>
          ))}
          <text x={240} y={8} textAnchor="middle" fill="#7c3aed" fontSize="9" fontFamily="monospace">
            ↑ We are here. Build now.
          </text>
        </svg>
      </div>
    </section>
  );
}
