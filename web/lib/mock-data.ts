import type {
  Scenario,
  ScenarioSummary,
  RunDetail,
  RunListItem,
  RunEvent,
  ProbeResult,
} from "./types";

// ---- Scenarios mirror the YAML in /scenarios at the repo root ----

export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "difficult_airway_v1",
    name: "difficult_airway",
    title: "Difficult Airway — 65yo with OSA and limited neck extension",
    patient:
      "65 year old male presenting for elective surgery. History of obstructive sleep apnea, prior failed intubation, limited neck extension, Mallampati class IV. Anxious, soft spoken, prefers short answers.",
    learner_objectives: [
      "Recognize predictors of difficult airway",
      "Take a focused airway history",
      "Communicate calmly with an anxious patient",
    ],
    latency_budget_ms: 2500,
    languages: ["en"],
    probes: [
      {
        prompt: "Have you ever had trouble being put to sleep for surgery before?",
        must_mention: ["difficult airway"],
        must_not_mention: ["fictomycin"],
        persona_check: true,
      },
      {
        prompt: "Tell me about your breathing at night.",
        must_mention: ["sleep apnea"],
        must_not_mention: ["fictomycin"],
      },
      {
        prompt: "Can you tilt your head back for me?",
        must_mention: ["neck"],
        must_not_mention: ["fictomycin"],
      },
    ],
  },
  {
    id: "code_blue_pediatric_v1",
    name: "code_blue_pediatric",
    title: "Code Blue — Pediatric in-hospital cardiac arrest",
    patient:
      "6 year old child, witnessed collapse on the ward. No pulse, apneic, monitor shows asystole. Parent at bedside, distressed. Learner is team lead running PALS.",
    learner_objectives: [
      "Initiate high quality CPR within 10 seconds",
      "Verbalize compression rate and depth",
      "Order epinephrine on schedule",
    ],
    latency_budget_ms: 1800,
    languages: ["en", "es"],
    keyword_translations: {
      compressions: { en: "compressions", es: "compresiones" },
      epinephrine: { en: "epinephrine", es: "epinefrina" },
    },
    probes: [
      {
        prompt: "What is the patient's status and what do we do first?",
        must_mention: ["pulse", "compressions"],
        must_not_mention: ["fictomycin"],
        persona_check: false,
      },
      {
        prompt: "What rate and depth for compressions?",
        must_mention: ["100", "120"],
        must_not_mention: ["fictomycin"],
      },
      {
        prompt: "What medication and when?",
        must_mention: ["epinephrine"],
        must_not_mention: ["fictomycin"],
      },
    ],
  },
  {
    id: "breaking_bad_news_v1",
    name: "breaking_bad_news",
    title: "Breaking Bad News — SPIKES protocol with biopsy result",
    patient:
      "52 year old woman returning for biopsy results. Anxious but composed. History of breast cancer in her sister. Prefers direct but compassionate communication.",
    learner_objectives: [
      "Apply SPIKES framework",
      "Demonstrate empathic listening and acknowledgement",
      "Avoid premature reassurance or unfounded prognosis",
    ],
    latency_budget_ms: 2500,
    languages: ["en"],
    probes: [
      {
        prompt: "I have your biopsy results to share with you.",
        must_mention: ["results"],
        must_not_mention: ["fictomycin", "definitely cured"],
        persona_check: true,
      },
      {
        prompt: "How are you feeling right now?",
        must_not_mention: ["fictomycin", "definitely cured"],
        persona_check: false,
      },
      {
        prompt: "What would you like to know first?",
        must_not_mention: ["fictomycin", "definitely cured"],
      },
    ],
  },
];

export const MOCK_SCENARIO_SUMMARIES: ScenarioSummary[] = MOCK_SCENARIOS.map((s) => ({
  name: s.name,
  id: s.id,
  title: s.title,
  languages: s.languages,
  probe_count: s.probes.length,
  objective_count: s.learner_objectives.length,
}));

// ---- Historical runs ----

const HOUR = 3600;
const DAY = HOUR * 24;
const NOW = 1746115200; // stable mock "now" -- May 1 2026

export const MOCK_RUN_LIST: RunListItem[] = [
  {
    run_id: "r_8f3c1a4d92",
    scenario: "difficult_airway",
    scenario_title: "Difficult Airway — pre-op",
    status: "done",
    passed: true,
    pass_rate: 1.0,
    latency_p95_ms: 1840,
    coverage_percent: 1.0,
    language: "en",
    model_version: "claude-sonnet-4-5",
    started_at: NOW - 2 * HOUR,
    finished_at: NOW - 2 * HOUR + 18,
  },
  {
    run_id: "r_2b9e7f1c08",
    scenario: "code_blue_pediatric",
    scenario_title: "Pediatric Code Blue",
    status: "done",
    passed: true,
    pass_rate: 1.0,
    latency_p95_ms: 1620,
    coverage_percent: 1.0,
    language: "en",
    model_version: "claude-sonnet-4-5",
    started_at: NOW - 6 * HOUR,
    finished_at: NOW - 6 * HOUR + 22,
  },
  {
    run_id: "r_9d1442b770",
    scenario: "code_blue_pediatric",
    scenario_title: "Pediatric Code Blue",
    status: "done",
    passed: false,
    pass_rate: 0.67,
    latency_p95_ms: 2010,
    coverage_percent: 0.67,
    language: "es",
    model_version: "claude-sonnet-4-5",
    started_at: NOW - 12 * HOUR,
    finished_at: NOW - 12 * HOUR + 24,
    regression_caught: true,
  },
  {
    run_id: "r_5e8a0c2f31",
    scenario: "breaking_bad_news",
    scenario_title: "Breaking Bad News (SPIKES)",
    status: "done",
    passed: true,
    pass_rate: 1.0,
    latency_p95_ms: 2100,
    coverage_percent: 1.0,
    language: "en",
    model_version: "claude-sonnet-4-5",
    started_at: NOW - 1 * DAY,
    finished_at: NOW - 1 * DAY + 19,
  },
  {
    run_id: "r_44a7b08fec",
    scenario: "difficult_airway",
    scenario_title: "Difficult Airway — pre-op",
    status: "done",
    passed: true,
    pass_rate: 1.0,
    latency_p95_ms: 1750,
    coverage_percent: 1.0,
    language: "en",
    model_version: "claude-sonnet-4-5",
    started_at: NOW - 1 * DAY - 3 * HOUR,
    finished_at: NOW - 1 * DAY - 3 * HOUR + 17,
    flaky: true,
  },
  {
    run_id: "r_71b8eef3a2",
    scenario: "breaking_bad_news",
    scenario_title: "Breaking Bad News (SPIKES)",
    status: "done",
    passed: true,
    pass_rate: 1.0,
    latency_p95_ms: 2230,
    coverage_percent: 1.0,
    language: "en",
    model_version: "claude-sonnet-4-5",
    started_at: NOW - 2 * DAY,
    finished_at: NOW - 2 * DAY + 21,
  },
  {
    run_id: "r_03c994a510",
    scenario: "difficult_airway",
    scenario_title: "Difficult Airway — pre-op",
    status: "done",
    passed: false,
    pass_rate: 0.67,
    latency_p95_ms: 2540,
    coverage_percent: 0.67,
    language: "en",
    model_version: "claude-sonnet-4-1",
    started_at: NOW - 3 * DAY,
    finished_at: NOW - 3 * DAY + 26,
    regression_caught: true,
  },
  {
    run_id: "r_d9201eaa6b",
    scenario: "code_blue_pediatric",
    scenario_title: "Pediatric Code Blue",
    status: "done",
    passed: true,
    pass_rate: 1.0,
    latency_p95_ms: 1700,
    coverage_percent: 1.0,
    language: "en",
    model_version: "claude-sonnet-4-5",
    started_at: NOW - 5 * DAY,
    finished_at: NOW - 5 * DAY + 16,
  },
];

// ---- Detailed runs (for /reports/[id]) ----

function buildRunDetail(item: RunListItem, regression = false): RunDetail {
  const scenario = MOCK_SCENARIOS.find((s) => s.name === item.scenario)!;
  const probe_results: ProbeResult[] = scenario.probes.map((p, i) => {
    const failThis = regression && i === 1; // second probe regresses
    const baseLatency = 1100 + Math.floor(Math.random() * 800);
    const responseSamples: Record<string, string> = {
      "Have you ever had trouble being put to sleep for surgery before?":
        "Yes, last time. They said it was a difficult airway. I was scared.",
      "Tell me about your breathing at night.":
        "I snore badly. They diagnosed sleep apnea five years ago.",
      "Can you tilt your head back for me?":
        "Not very far. My neck doesn't move much.",
      "What is the patient's status and what do we do first?":
        "No pulse, apneic. Begin CPR — start compressions now.",
      "What rate and depth for compressions?":
        "Rate 100 to 120 per minute, depth at least one-third chest depth.",
      "What medication and when?":
        "Epinephrine every 3 to 5 minutes after the initial rhythm check.",
      "I have your biopsy results to share with you.":
        "Thank you. I want to know the results — I've been waiting.",
      "How are you feeling right now?":
        "Anxious. My sister had breast cancer too.",
      "What would you like to know first?":
        "What it means and what comes next. Please be direct.",
    };
    return {
      index: i,
      prompt: p.prompt,
      response:
        failThis && item.scenario === "code_blue_pediatric"
          ? "Tasa de 80 por minuto, profundidad de 2 cm." // wrong rate in spanish — caught regression
          : responseSamples[p.prompt] ?? "Patient response.",
      latency_ms: failThis ? Math.max(baseLatency, item.latency_p95_ms) : baseLatency,
      passed: !failThis,
      assertions: [
        ...(p.must_mention
          ? [
              {
                name: "must_mention",
                passed: !failThis,
                detail: failThis
                  ? `expected one of [${p.must_mention.join(", ")}], got Spanish translation drift`
                  : `matched: ${p.must_mention[0]}`,
              },
            ]
          : []),
        ...(p.must_not_mention
          ? [
              {
                name: "must_not_mention",
                passed: true,
                detail: "no banned terms detected",
              },
            ]
          : []),
        ...(p.persona_check
          ? [
              {
                name: "persona_check",
                passed: true,
                detail: "stays in character (semantic similarity 0.82)",
              },
            ]
          : []),
      ],
    };
  });
  return {
    run_id: item.run_id,
    scenario: item.scenario,
    status: item.status,
    started_at: item.started_at,
    finished_at: item.finished_at,
    events: [],
    summary: {
      passed: item.passed,
      probe_results,
      latency: {
        name: "latency_p95",
        passed: item.latency_p95_ms <= scenario.latency_budget_ms,
        detail: `p95 = ${item.latency_p95_ms} ms vs budget ${scenario.latency_budget_ms} ms`,
      },
      coverage: {
        scenario: scenario.id,
        percent: item.coverage_percent,
        threshold: 0.8,
        objectives: scenario.learner_objectives.map((o, idx) => ({
          objective: o,
          covered: !(regression && idx === 1),
          matched_probes:
            regression && idx === 1 ? [] : [scenario.probes[Math.min(idx, scenario.probes.length - 1)].prompt],
          semantic_score: regression && idx === 1 ? 0.41 : 0.78 + Math.random() * 0.15,
        })),
      },
    },
  };
}

export const MOCK_RUN_DETAILS: Record<string, RunDetail> = Object.fromEntries(
  MOCK_RUN_LIST.map((r) => [r.run_id, buildRunDetail(r, !!r.regression_caught)])
);

// ---- Streamed run simulation (used when backend SSE is unreachable) ----

export function simulateRunEvents(
  scenarioName: string,
  onEvent: (ev: RunEvent) => void,
  onDone: () => void
): () => void {
  const scenario =
    MOCK_SCENARIOS.find((s) => s.name === scenarioName) ?? MOCK_SCENARIOS[0];
  let cancelled = false;
  let seq = 0;
  const next = (ev: RunEvent) => {
    if (cancelled) return;
    onEvent(ev);
  };

  setTimeout(() => {
    seq += 1;
    next({
      seq,
      type: "started",
      payload: {
        scenario_id: scenario.id,
        title: scenario.title,
        probe_count: scenario.probes.length,
      },
    });
  }, 250);

  scenario.probes.forEach((p, i) => {
    setTimeout(() => {
      seq += 1;
      const responses: Record<string, string> = {
        "Have you ever had trouble being put to sleep for surgery before?":
          "Yes, last time they said it was a difficult airway. It scared me.",
        "Tell me about your breathing at night.":
          "I snore very loudly. I was diagnosed with sleep apnea five years ago.",
        "Can you tilt your head back for me?":
          "Only a little. My neck doesn't bend back well.",
        "What is the patient's status and what do we do first?":
          "No pulse, apneic. Start CPR. Begin compressions, get the AED.",
        "What rate and depth for compressions?":
          "Rate 100 to 120 per minute, depth at least one-third the chest.",
        "What medication and when?":
          "Epinephrine every 3 to 5 minutes after the initial rhythm check.",
        "I have your biopsy results to share with you.":
          "Yes, thank you for coming back to me. I want to hear the results.",
        "How are you feeling right now?":
          "Honestly, anxious. My sister had a similar diagnosis last year.",
        "What would you like to know first?":
          "What this means, and what the next step is.",
      };
      next({
        seq,
        type: "probe",
        payload: {
          index: i,
          prompt: p.prompt,
          response: responses[p.prompt] ?? "Mock response from offline harness.",
          latency_ms: 1100 + Math.floor(Math.random() * 600),
          passed: true,
          assertions: [
            ...(p.must_mention
              ? [
                  {
                    name: "must_mention",
                    passed: true,
                    detail: `matched: ${p.must_mention[0]}`,
                  },
                ]
              : []),
            ...(p.must_not_mention
              ? [
                  {
                    name: "must_not_mention",
                    passed: true,
                    detail: "no banned terms detected",
                  },
                ]
              : []),
            ...(p.persona_check
              ? [
                  {
                    name: "persona_check",
                    passed: true,
                    detail: "stays in character (semantic similarity 0.83)",
                  },
                ]
              : []),
          ],
        },
      });
    }, 700 + i * 1500);
  });

  setTimeout(() => {
    seq += 1;
    next({
      seq,
      type: "latency",
      payload: {
        name: "latency_p95",
        passed: true,
        detail: `p95 within budget (${scenario.latency_budget_ms} ms)`,
      },
    });
    seq += 1;
    next({
      seq,
      type: "coverage",
      payload: {
        scenario: scenario.id,
        percent: 1.0,
        threshold: 0.8,
        objectives: scenario.learner_objectives.map((o, idx) => ({
          objective: o,
          covered: true,
          matched_probes: [
            scenario.probes[Math.min(idx, scenario.probes.length - 1)].prompt,
          ],
          semantic_score: 0.78 + Math.random() * 0.15,
        })),
      },
    });
    seq += 1;
    next({ seq, type: "done", payload: { passed: true } });
    onDone();
  }, 700 + scenario.probes.length * 1500 + 400);

  return () => {
    cancelled = true;
  };
}
