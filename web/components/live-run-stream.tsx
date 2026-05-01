"use client";

import * as React from "react";
import { CheckCircle2, Loader2, XCircle, Activity, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProbeResultRow } from "@/components/probe-result-row";
import { CoverageDonut } from "@/components/coverage-donut";
import { startRun, streamRun } from "@/lib/api";
import type {
  AssertionResult,
  CoverageReport,
  ProbeResult,
  ProbeStatus,
  Scenario,
} from "@/lib/types";
import { formatDuration, pct } from "@/lib/utils";

type Props = { scenario: Scenario };

type ProbeRowState = {
  prompt: string;
  status: ProbeStatus;
  result?: ProbeResult;
  flash?: "pass" | "fail" | null;
};

export function LiveRunStream({ scenario }: Props) {
  const [running, setRunning] = React.useState(false);
  const [mode, setMode] = React.useState<"live" | "mock" | null>(null);
  const [rows, setRows] = React.useState<ProbeRowState[]>([]);
  const [latency, setLatency] = React.useState<AssertionResult | null>(null);
  const [coverage, setCoverage] = React.useState<CoverageReport | null>(null);
  const [done, setDone] = React.useState<{ passed: boolean } | null>(null);
  const [runId, setRunId] = React.useState<string | null>(null);
  const closeRef = React.useRef<(() => void) | null>(null);

  // Reset state when scenario changes
  React.useEffect(() => {
    return () => closeRef.current?.();
  }, []);

  const handleStart = async () => {
    closeRef.current?.();
    setRows(
      scenario.probes.map((p) => ({ prompt: p.prompt, status: "queued" }))
    );
    setLatency(null);
    setCoverage(null);
    setDone(null);
    setRunning(true);
    setRunId(null);

    const { run_id, source } = await startRun(scenario.name);
    setRunId(run_id);

    // Track which probe to mark as running next
    let nextRunningIndex = 0;

    const handle = streamRun(run_id, scenario.name, {
      onEvent: (ev) => {
        if (ev.type === "started") {
          // Mark first probe as running
          setRows((r) =>
            r.map((row, i) =>
              i === 0 ? { ...row, status: "running" } : row
            )
          );
          nextRunningIndex = 0;
        } else if (ev.type === "probe") {
          const idx = ev.payload.index;
          setRows((r) =>
            r.map((row, i) => {
              if (i === idx) {
                return {
                  ...row,
                  status: ev.payload.passed ? "passed" : "failed",
                  result: ev.payload,
                  flash: ev.payload.passed ? "pass" : "fail",
                };
              }
              if (i === idx + 1) {
                return { ...row, status: "running" };
              }
              return row;
            })
          );
          nextRunningIndex = idx + 1;
          // Clear flash after the animation
          setTimeout(() => {
            setRows((r) => r.map((row, i) => (i === idx ? { ...row, flash: null } : row)));
          }, 1300);
        } else if (ev.type === "latency") {
          setLatency(ev.payload);
        } else if (ev.type === "coverage") {
          setCoverage(ev.payload);
        } else if (ev.type === "done") {
          setDone({ passed: ev.payload.passed });
          setRunning(false);
        } else if (ev.type === "error") {
          setRows((r) =>
            r.map((row, i) =>
              i === nextRunningIndex && row.status === "running"
                ? { ...row, status: "failed" }
                : row
            )
          );
          setRunning(false);
        }
      },
      onDone: () => {
        setRunning(false);
      },
      onError: () => setRunning(false),
    });
    setMode(handle.mode === "live" && source === "live" ? "live" : "mock");
    closeRef.current = handle.close;
  };

  const totalLatency = rows.reduce((acc, r) => acc + (r.result?.latency_ms ?? 0), 0);
  const passCount = rows.filter((r) => r.status === "passed").length;
  const failCount = rows.filter((r) => r.status === "failed").length;
  const totalProbes = rows.length || scenario.probes.length;
  const passRate = totalProbes ? passCount / totalProbes : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{scenario.title}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {scenario.probes.length} probes · latency budget {scenario.latency_budget_ms} ms ·
            languages {scenario.languages.map((l) => l.toUpperCase()).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode && (
            <Badge variant={mode === "live" ? "success" : "warning"}>
              {mode === "live" ? "live backend" : "simulated stream"}
            </Badge>
          )}
          <button
            onClick={handleStart}
            disabled={running}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            {running ? "Running..." : "Run regression"}
          </button>
        </div>
      </div>

      {runId && (
        <div className="text-xs font-mono text-[var(--muted-foreground)]">
          run_id <span className="text-[var(--foreground)]">{runId}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-2">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
              Click <span className="font-medium text-[var(--foreground)]">Run regression</span>{" "}
              to start a live execution.
            </div>
          ) : (
            rows.map((r, i) => (
              <ProbeResultRow
                key={i}
                index={i}
                prompt={r.prompt}
                status={r.status}
                result={r.result}
                flash={r.flash ?? null}
              />
            ))
          )}
        </CardContent>
      </Card>

      {(latency || coverage || done) && (
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <SummaryStat
                icon={done?.passed ? CheckCircle2 : XCircle}
                label="Outcome"
                value={done ? (done.passed ? "Pass" : "Fail") : "..."}
                tone={done?.passed === false ? "error" : done?.passed ? "success" : "muted"}
                sublabel={`${passCount} pass · ${failCount} fail · ${pct(passRate)} rate`}
              />
              <SummaryStat
                icon={Clock}
                label="Latency"
                value={latency ? latency.detail.split("=")[1]?.trim() ?? formatDuration(totalLatency) : formatDuration(totalLatency)}
                tone={latency ? (latency.passed ? "success" : "warning") : "muted"}
                sublabel={`budget ${scenario.latency_budget_ms} ms`}
              />
              <div className="flex items-center gap-4">
                {coverage ? (
                  <>
                    <CoverageDonut
                      covered={coverage.objectives.filter((o) => o.covered).length}
                      total={coverage.objectives.length}
                    />
                    <div className="text-sm">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                        Objectives covered
                      </div>
                      <ul className="space-y-1">
                        {coverage.objectives.map((o, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                              style={{
                                background: o.covered ? "var(--success)" : "var(--error)",
                              }}
                            />
                            <span className="text-xs">{o.objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[var(--muted-foreground)]">Coverage pending</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
  tone: "success" | "warning" | "error" | "muted";
}) {
  const colorMap = {
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    error: "text-[var(--error)]",
    muted: "text-[var(--muted-foreground)]",
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`text-2xl font-semibold ${colorMap[tone]}`}>{value}</div>
      {sublabel && (
        <div className="text-xs text-[var(--muted-foreground)]">{sublabel}</div>
      )}
    </div>
  );
}
