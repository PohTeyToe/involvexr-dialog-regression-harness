"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type PresentSection = { id: string; label: string };

type Props = {
  sections: PresentSection[];
};

export function PresentSidebar({ sections }: Props) {
  const [active, setActive] = React.useState<string>(sections[0]?.id ?? "");

  React.useEffect(() => {
    const ids = sections.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that is intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActive(visible[0].target.id);
        }
      },
      {
        // Trigger when section header enters top 40% of viewport.
        rootMargin: "-15% 0px -55% 0px",
        threshold: 0,
      }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    setActive(id);
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <aside
      className="hidden lg:block w-56 shrink-0 print:hidden"
      aria-label="Section navigation"
    >
      <div className="sticky top-20">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-3 px-3">
          Walkthrough
        </div>
        <nav>
          <ul className="space-y-0.5">
            {sections.map((s, i) => {
              const isActive = active === s.id;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => handleClick(e, s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-[var(--accent)] text-[var(--foreground)] font-medium"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-block h-1 w-1 rounded-full shrink-0 transition-colors",
                        isActive ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                      )}
                    />
                    <span className="font-mono text-[10px] text-[var(--muted-foreground)] w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
