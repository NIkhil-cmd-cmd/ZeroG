"use client";

import { useState } from "react";

export default function CopyBlock({
  code,
  label,
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      {label && (
        <p className="mb-2 font-mono text-xs font-medium text-text-secondary">{label}</p>
      )}
      <pre className="code-block pr-24 whitespace-pre-wrap">{code}</pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 rounded-md border border-border bg-bg px-2.5 py-1 font-mono text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
