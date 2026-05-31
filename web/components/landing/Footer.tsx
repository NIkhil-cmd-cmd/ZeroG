import Link from "next/link";
import { GITHUB_URL, NAV_LINKS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <p className="text-lg font-semibold text-text">ZeroG</p>
            <p className="mt-1 text-sm text-text-secondary">
              Shared memory for Antigravity agents
            </p>
            <p className="mt-4 text-xs text-muted">
              Nikhil Krishnaswamy & Advaiyt Sane · May 2026
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted mb-3">Product</p>
              <div className="flex flex-col gap-2 text-sm">
                {NAV_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className="text-text-secondary hover:text-accent">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted mb-3">Links</p>
              <div className="flex flex-col gap-2 text-sm">
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent">
                  GitHub
                </a>
                <a href="https://antigravity.google/docs/skills" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent">
                  Antigravity Skills docs
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
