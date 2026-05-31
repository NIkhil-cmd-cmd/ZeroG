"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GITHUB_URL, NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            Z
          </span>
          <span className="text-lg font-semibold tracking-tight text-text">ZeroG</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const base = link.href.split("#")[0];
            const active =
              pathname === base || (base !== "" && base !== "/" && pathname.startsWith(base));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-bg-subtle font-medium text-accent"
                    : "text-text-secondary hover:bg-bg-subtle hover:text-text"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              GitHub
            </Button>
          </a>
          <Link href="/install">
            <Button size="sm">Add to Antigravity</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
