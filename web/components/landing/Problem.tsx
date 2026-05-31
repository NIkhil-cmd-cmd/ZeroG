"use client";

import { useEffect, useRef, useState } from "react";
import type { EngineStats } from "@/lib/constants";

function TerminalPanel({
  header,
  lines,
  footer,
  active,
}: {
  header: string;
  lines: { text: string; type: string }[];
  footer?: string;
  active: boolean;
}) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisible(0);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setVisible(i);
      if (i >= lines.length) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [active, lines.length]);

  const color = (type: string) => {
    if (type === "success") return "text-success";
    if (type === "error") return "text-error";
    if (type === "tool") return "text-accent";
    return "text-text-secondary";
  };

  return (
    <div className="ag-card overflow-hidden">
      <div className="border-b border-border bg-bg-subtle px-4 py-2 font-mono text-xs text-text-secondary">
        {header}
      </div>
      <pre className="min-h-[280px] p-4 font-mono text-xs leading-relaxed">
        {lines.slice(0, visible).map((line, i) => (
          <div key={i} className={color(line.type)}>
            {line.text || "\u00A0"}
          </div>
        ))}
        {footer && visible >= lines.length && (
          <div className="mt-4 text-text-secondary">{footer}</div>
        )}
      </pre>
    </div>
  );
}

export default function Problem() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const [stats, setStats] = useState<EngineStats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setActive(true);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const recent = stats?.recent_traces ?? [];

  return (
    <section ref={ref} className="border-t border-border bg-bg-subtle py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <p className="section-label mb-4">01 · The problem</p>
        <h2 className="text-3xl font-semibold text-text md:text-4xl">
          Every Antigravity session starts from zero.
        </h2>
        <p className="mt-4 max-w-2xl text-text-secondary">
          Without shared memory, each engineer&apos;s agent rediscovers the same GCP deploy paths —
          same IAM errors, same --gen2 flags, same token burn.
        </p>

        {recent.length >= 2 ? (
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <TerminalPanel
              header="Trace from memory store"
              lines={recent[0].tools.map((t) => ({ text: `→ ${t}`, type: "tool" }))}
              footer={recent[0].task.slice(0, 70) + "…"}
              active={active}
            />
            <TerminalPanel
              header="Similar task — repeated pattern"
              lines={recent[1].tools.map((t) => ({ text: `→ ${t}`, type: "tool" }))}
              footer={recent[1].task.slice(0, 70) + "…"}
              active={active}
            />
          </div>
        ) : (
          <div className="ag-card mt-12 p-12 text-center">
            <p className="font-mono text-sm text-text-secondary">
              Run the demo to populate real trace data here.
            </p>
            <a href="/demo" className="mt-4 inline-block text-sm text-accent hover:underline">
              Open demo →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
