import Link from "next/link";
import { GITHUB_URL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-border py-12 px-8 text-center">
      <p className="text-lg font-medium mb-2">ZeroG</p>
      <p className="text-sm text-muted mb-6">The shared memory layer for Antigravity.</p>
      <p className="text-xs text-muted mb-6">
        Built by Nikhil Krishnaswamy &amp; Advaiyt Sane
        <br />
        AGI House x Google DeepMind Build Day · May 2026
      </p>
      <div className="flex justify-center gap-6 text-sm">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
          GitHub
        </a>
        <Link href="/demo" className="hover:text-accent">
          Demo
        </Link>
        <Link href="/graph" className="hover:text-accent">
          Graph
        </Link>
      </div>
    </footer>
  );
}
