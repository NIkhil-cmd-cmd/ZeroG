"use client";

import { useEffect, useRef, useState } from "react";
import { TERMINAL_LINES } from "@/lib/constants";

function TerminalPanel({
  header,
  lines,
  active,
}: {
  header: string;
  lines: typeof TERMINAL_LINES.monday;
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
    if (type === "cmd") return "text-text";
    return "text-muted";
  };

  return (
    <div className="rounded-xl bg-surface border border-border overflow-hidden">
      <div className="px-4 py-2 border-b border-border font-mono text-xs text-muted">
        {header}
      </div>
      <pre className="p-4 font-mono text-xs leading-relaxed min-h-[320px]">
        {lines.slice(0, visible).map((line, i) => (
          <div key={i} className={color(line.type)}>
            {line.text || "\u00A0"}
          </div>
        ))}
      </pre>
    </div>
  );
}

export default function Problem() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setActive(true);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="fade-in py-24 px-8 max-w-6xl mx-auto">
      <p className="section-label mb-4">01</p>
      <h2 className="text-3xl md:text-4xl font-medium mb-12">
        Every Antigravity session starts from zero.
      </h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <TerminalPanel
          header="Monday · Platform Eng · Agent Session #847"
          lines={TERMINAL_LINES.monday}
          active={active}
        />
        <TerminalPanel
          header="Tuesday · Same Team · Agent Session #848"
          lines={TERMINAL_LINES.tuesday}
          active={active}
        />
      </div>
      <p className="text-center text-muted text-sm max-w-lg mx-auto">
        Same pattern. Same mistakes. Same cost.
        <br />
        Session #848 learned nothing from #847.
      </p>
    </section>
  );
}
