"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, FileText } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { describeBackend } from "@/lib/api";

export function TopBar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const backend = describeBackend();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur px-4 lg:px-6">
      <div className="flex items-center gap-3 lg:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Dialog Harness</span>
        </Link>
        <div className="hidden lg:block text-sm text-[var(--muted-foreground)]">
          Regression-testing non-deterministic AI patient dialog
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={backend.backendConfigured ? "success" : "warning"}>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: backend.backendConfigured
                ? "var(--success)"
                : "var(--warning)",
            }}
          />
          {backend.backendConfigured ? "Live API" : "Mock data"}
        </Badge>
        <ThemeToggle />
      </div>
      {mobileOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-full border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {[
              ["/", "Overview"],
              ["/scenarios", "Scenarios"],
              ["/run", "Run"],
              ["/reports", "Reports"],
              ["/architecture", "Architecture"],
              ["/docs/decisions", "Docs"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 hover:bg-[var(--accent)]"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
