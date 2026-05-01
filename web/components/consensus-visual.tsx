"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Outcome = "pass" | "fail";

function Dot({ outcome, delay }: { outcome: Outcome; delay: number }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-75",
        outcome === "pass"
          ? "bg-[color-mix(in_oklch,var(--success)_18%,transparent)] border-[var(--success)] text-[var(--success)]"
          : "bg-[color-mix(in_oklch,var(--error)_18%,transparent)] border-[var(--error)] text-[var(--error)]"
      )}
      aria-label={outcome === "pass" ? "pass" : "fail"}
    >
      {outcome === "pass" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </div>
  );
}

function Row({
  label,
  outcomes,
  threshold,
  verdict,
}: {
  label: string;
  outcomes: Outcome[];
  threshold: number;
  verdict: { passed: boolean; text: string };
}) {
  const passes = outcomes.filter((o) => o === "pass").length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted-foreground)]">{label}</span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          threshold {threshold}/{outcomes.length}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {outcomes.map((o, i) => (
          <Dot key={i} outcome={o} delay={i * 140} />
        ))}
        <div className="ml-3 flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              verdict.passed ? "text-[var(--success)]" : "text-[var(--error)]"
            )}
          >
            {verdict.passed ? "PASS" : "FAIL"}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            ({passes}/{outcomes.length}) {verdict.text}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ConsensusVisual() {
  return (
    <div className="space-y-6">
      <Row
        label="run A"
        outcomes={["pass", "pass", "pass", "pass", "fail"]}
        threshold={4}
        verdict={{ passed: true, text: "threshold met" }}
      />
      <Row
        label="run B"
        outcomes={["pass", "fail", "fail", "pass", "fail"]}
        threshold={4}
        verdict={{ passed: false, text: "below threshold" }}
      />
    </div>
  );
}
