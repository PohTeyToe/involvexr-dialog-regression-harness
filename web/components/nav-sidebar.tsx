"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  FileText,
  Home,
  Library,
  Network,
  PlayCircle,
  Github,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Item[] = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/scenarios", label: "Scenarios", icon: Library },
  { href: "/run", label: "Run", icon: PlayCircle },
  { href: "/reports", label: "Reports", icon: Activity },
  { href: "/architecture", label: "Architecture", icon: Network },
  { href: "/docs/decisions", label: "Docs", icon: BookOpen },
];

export function NavSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/docs")) return pathname.startsWith("/docs");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold">Dialog Harness</span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            v0.2 sketch
          </span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--accent)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        <a
          href="https://github.com/PohTeyToe/involvexr-dialog-regression-harness"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <Github className="h-3.5 w-3.5" />
          PohTeyToe/involvexr-dialog-regression-harness
        </a>
        <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
          Sketch built for a conversation with Lumeto. Not a finished product.
        </p>
      </div>
    </aside>
  );
}
