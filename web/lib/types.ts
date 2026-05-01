// Type definitions mirroring the Pydantic models in python/src/dialog_harness_api/main.py
// Keep field names identical for zero-friction wire compatibility.

export type Probe = {
  prompt: string;
  must_mention?: string[];
  must_not_mention?: string[];
  persona_check?: boolean;
};

export type Scenario = {
  id: string;
  name: string; // file stem
  title: string;
  patient: string;
  learner_objectives: string[];
  latency_budget_ms: number;
  languages: string[];
  probes: Probe[];
  keyword_translations?: Record<string, Record<string, string>>;
};

export type ScenarioSummary = {
  name: string;
  id: string;
  title: string;
  languages: string[];
  probe_count: number;
  objective_count: number;
};

export type AssertionResult = {
  name: string;
  passed: boolean;
  detail: string;
};

export type ProbeResult = {
  index: number;
  prompt: string;
  response: string;
  latency_ms: number;
  passed: boolean;
  assertions: AssertionResult[];
};

export type CoverageObjective = {
  objective: string;
  covered: boolean;
  matched_probes: string[];
  semantic_score: number;
};

export type CoverageReport = {
  scenario?: string;
  percent: number;
  threshold?: number;
  objectives: CoverageObjective[];
};

export type RunStatus = "pending" | "running" | "done" | "failed";

export type RunEvent =
  | { seq: number; type: "started"; payload: { scenario_id: string; title: string; probe_count: number } }
  | { seq: number; type: "probe"; payload: ProbeResult }
  | { seq: number; type: "latency"; payload: AssertionResult }
  | { seq: number; type: "coverage"; payload: CoverageReport }
  | { seq: number; type: "done"; payload: { passed: boolean } }
  | { seq: number; type: "error"; payload: { message: string } };

export type RunSummary = {
  passed: boolean;
  probe_results: ProbeResult[];
  latency: AssertionResult;
  coverage: CoverageReport;
};

export type RunDetail = {
  run_id: string;
  scenario: string;
  status: RunStatus;
  started_at: number;
  finished_at: number | null;
  events: RunEvent[];
  summary: RunSummary | null;
};

// Frontend-only enrichment for the reports listing page.
export type RunListItem = {
  run_id: string;
  scenario: string;
  scenario_title: string;
  status: RunStatus;
  passed: boolean;
  pass_rate: number;
  latency_p95_ms: number;
  coverage_percent: number;
  language: string;
  model_version: string;
  started_at: number;
  finished_at: number | null;
  flaky?: boolean;
  regression_caught?: boolean;
};

export type ProbeStatus = "queued" | "running" | "passed" | "failed";
