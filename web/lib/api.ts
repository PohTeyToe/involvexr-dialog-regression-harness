// Type-safe client for the FastAPI server in python/src/dialog_harness_api.
// All methods fall back to mock data when NEXT_PUBLIC_API_URL is unset
// or the backend is unreachable, so the demo always renders.

import {
  MOCK_RUN_DETAILS,
  MOCK_RUN_LIST,
  MOCK_SCENARIOS,
  MOCK_SCENARIO_SUMMARIES,
  simulateRunEvents,
} from "./mock-data";
import type {
  CoverageReport,
  RunDetail,
  RunEvent,
  RunListItem,
  Scenario,
  ScenarioSummary,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function hasBackend(): boolean {
  return API_URL.length > 0;
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!hasBackend()) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type ApiHealth = {
  backendConfigured: boolean;
  backendUrl: string;
};

export function describeBackend(): ApiHealth {
  return { backendConfigured: hasBackend(), backendUrl: API_URL };
}

export async function listScenarios(): Promise<{
  scenarios: ScenarioSummary[];
  source: "live" | "mock";
}> {
  const data = await fetchJSON<{ scenarios: ScenarioSummary[] }>("/api/scenarios");
  if (data?.scenarios) return { scenarios: data.scenarios, source: "live" };
  return { scenarios: MOCK_SCENARIO_SUMMARIES, source: "mock" };
}

export async function getScenario(name: string): Promise<{
  scenario: Scenario;
  source: "live" | "mock";
} | null> {
  const live = await fetchJSON<{ name: string; raw: unknown; scenario: Scenario }>(
    `/api/scenarios/${encodeURIComponent(name)}`
  );
  if (live?.scenario) {
    // Backend Pydantic model doesn't include `name` field; merge it from URL.
    return { scenario: { ...live.scenario, name: live.name }, source: "live" };
  }
  const found = MOCK_SCENARIOS.find((s) => s.name === name);
  return found ? { scenario: found, source: "mock" } : null;
}

export async function getCoverage(name: string): Promise<{
  coverage: CoverageReport;
  source: "live" | "mock";
} | null> {
  const live = await fetchJSON<CoverageReport>(`/api/coverage/${encodeURIComponent(name)}`);
  if (live) return { coverage: live, source: "live" };
  // Synthesize from mock data
  const sc = MOCK_SCENARIOS.find((s) => s.name === name);
  if (!sc) return null;
  return {
    source: "mock",
    coverage: {
      scenario: sc.id,
      percent: 1.0,
      threshold: 0.8,
      objectives: sc.learner_objectives.map((o, i) => ({
        objective: o,
        covered: true,
        matched_probes: [sc.probes[Math.min(i, sc.probes.length - 1)].prompt],
        semantic_score: 0.78,
      })),
    },
  };
}

export async function startRun(scenario: string): Promise<{
  run_id: string;
  source: "live" | "mock";
}> {
  if (hasBackend()) {
    try {
      const res = await fetch(`${API_URL}/api/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (res.ok) {
        const data = (await res.json()) as { run_id: string };
        return { run_id: data.run_id, source: "live" };
      }
    } catch {
      // fall through to mock
    }
  }
  return {
    run_id: `mock_${Math.random().toString(36).slice(2, 10)}`,
    source: "mock",
  };
}

export async function listRuns(): Promise<{
  runs: RunListItem[];
  source: "mock"; // backend doesn't currently expose a list endpoint
}> {
  return { runs: MOCK_RUN_LIST, source: "mock" };
}

export async function getRun(runId: string): Promise<{
  run: RunDetail;
  source: "live" | "mock";
} | null> {
  const live = await fetchJSON<RunDetail>(`/api/runs/${encodeURIComponent(runId)}`);
  if (live) return { run: live, source: "live" };
  const mock = MOCK_RUN_DETAILS[runId];
  return mock ? { run: mock, source: "mock" } : null;
}

// Stream a run -- attempts EventSource, falls back to scripted mock stream.
export function streamRun(
  runId: string,
  scenarioForFallback: string,
  handlers: {
    onEvent: (ev: RunEvent) => void;
    onDone: () => void;
    onError?: (err: string) => void;
  }
): { close: () => void; mode: "live" | "mock" } {
  if (hasBackend() && !runId.startsWith("mock_")) {
    try {
      const es = new EventSource(`${API_URL}/api/runs/${encodeURIComponent(runId)}/stream`);
      let seq = 0;
      const subscribe = (type: RunEvent["type"]) => {
        es.addEventListener(type, (raw: MessageEvent) => {
          try {
            const payload = JSON.parse(raw.data);
            seq += 1;
            handlers.onEvent({ seq, type, payload } as RunEvent);
            if (type === "done" || type === "error") {
              handlers.onDone();
              es.close();
            }
          } catch (e) {
            handlers.onError?.(String(e));
          }
        });
      };
      (["started", "probe", "latency", "coverage", "done", "error"] as const).forEach(subscribe);
      es.onerror = () => {
        handlers.onError?.("connection lost");
        es.close();
      };
      return { close: () => es.close(), mode: "live" };
    } catch {
      // fall through
    }
  }
  const cancel = simulateRunEvents(scenarioForFallback, handlers.onEvent, handlers.onDone);
  return { close: cancel, mode: "mock" };
}
