"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AssertionResult, ProbeResult, ProbeStatus } from "@/lib/types";

type Props = {
  index: number;
  status: ProbeStatus;
  prompt: string;
  result?: ProbeResult;
  flash?: "pass" | "fail" | null;
};

export function ProbeResultRow({ index, status, prompt, result, flash }: Props) {
  const [open, setOpen] = React.useState(false);
  const passing = result?.passed === true;
  const failing = result?.passed === false;

  return (
    <div
      className={cn(
        "rounded-md border border-[var(--border)] overflow-hidden",
        flash === "pass" && "flash-pass",
        flash === "fail" && "flash-fail"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--accent)]/40 transition-colors"
        aria-expanded={open}
      >
        <span className="font-mono text-xs text-[var(--muted-foreground)] w-6">
          #{index + 1}
        </span>
        <StatusDot status={status} />
        <span className="flex-1 text-sm truncate">{prompt}</span>
        {result && (
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            {formatDuration(result.latency_ms)}
          </span>
        )}
        {passing && (
          <Badge variant="success" className="hidden sm:inline-flex">
            pass
          </Badge>
        )}
        {failing && (
          <Badge variant="error" className="hidden sm:inline-flex">
            fail
          </Badge>
        )}
        {status === "running" && (
          <Badge variant="primary" className="hidden sm:inline-flex">
            running
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--muted-foreground)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3 space-y-3 animate-fade-in-up">
          {result?.response && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Patient response
              </div>
              <p className="text-sm leading-relaxed font-mono">
                {result.response}
              </p>
            </div>
          )}
          {result?.assertions?.length ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                Assertions
              </div>
              <ul className="space-y-1.5">
                {result.assertions.map((a, i) => (
                  <AssertionLine key={i} a={a} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AssertionLine({ a }: { a: AssertionResult }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          a.passed
            ? "bg-[color-mix(in_oklch,var(--success)_25%,transparent)] text-[var(--success)]"
            : "bg-[color-mix(in_oklch,var(--error)_25%,transparent)] text-[var(--error)]"
        )}
      >
        {a.passed ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      </span>
      <div className="flex-1">
        <span className="font-mono text-xs">{a.name}</span>
        <span className="text-[var(--muted-foreground)] text-xs ml-2">{a.detail}</span>
      </div>
    </li>
  );
}

function StatusDot({ status }: { status: ProbeStatus }) {
  if (status === "queued") {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-[var(--muted-foreground)]/50" />
    );
  }
  if (status === "running") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />;
  }
  if (status === "passed") {
    return <span className="inline-block h-2 w-2 rounded-full bg-[var(--success)]" />;
  }
  return <span className="inline-block h-2 w-2 rounded-full bg-[var(--error)]" />;
}
