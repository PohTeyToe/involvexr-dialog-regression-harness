# involvexr-dialog-regression-harness

Regression-testing non-deterministic, LLM-driven patient dialog is hard. The same
learner utterance ("tell me about your breathing at night") can produce a clinically
correct answer on Monday and a hallucinated medication on Tuesday — across English,
Spanish, and French, across VR, web, desktop, and the browser-based modality, and
across faculty-customized scenarios. Traditional record-and-replay test frameworks
fall over because the surface text changes every run while the clinical content is
what actually has to stay correct. This repo is a small Python sketch of a probe-and-
assertion framework for that problem: load a scenario, fire structured probes at a
patient agent, and assert against semantic content, persona drift, banned content,
latency budgets, and cross-language consistency.

## Why this exists

This is a sketch I built while preparing for a conversation with Lumeto's team.
It's a conversation starter, not a finished product. The clinical scenarios and
assertion patterns are public-knowledge approximations — the real value would come
from grounding them in actual InvolveXR scenario data and faculty assessment rubrics.

## Quickstart

```bash
git clone https://github.com/PohTeyToe/involvexr-dialog-regression-harness.git
cd involvexr-dialog-regression-harness

# with uv
uv sync
uv run pytest -v
uv run python examples/run_demo.py

# or with pip
pip install -e .[dev]
pytest -v
python examples/run_demo.py
```

The demo writes self-contained HTML reports to `reports/regression_<timestamp>.html`.
No API keys, no network — `MockLLMClient` returns deterministic responses keyed off
probe text. A `RealLLMClient` stub is wired up for swapping in a live provider later.

## Architecture

A scenario is a YAML file describing a virtual patient, learner objectives, and a list
of probes. A `ProbeRunner` drives those probes through any object satisfying the
`LLMClient` protocol and collects a `RunReport` of `AssertionResult`s. The report
renderer produces a single self-contained HTML file. Everything else is composition.

```
scenarios/*.yaml
   |
   v
load_scenario --> Scenario --> ProbeRunner(client) --> RunReport --> render_report --> HTML
                                       |
                              MockLLMClient | RealLLMClient
```

## Assertions

- `assert_mentions(response, terms)` — clinical anchors must appear
- `assert_does_not_mention(response, banned)` — block hallucinated meds, lab values
- `assert_stays_in_character(response, persona)` — TF-IDF cosine vs persona description
- `assert_latency_p95(latencies, ceiling_ms)` — multi-run latency bound
- `assert_language_consistency(responses_by_lang, translations)` — every language
  variant must surface the same clinical concepts via a translation map

The semantic-similarity check uses `scikit-learn` TF-IDF for zero-config installs.
Production should swap in a real sentence-embedding model — that's a one-line
change at the `assert_stays_in_character` boundary.

## What's intentionally missing

- Real LLM provider integration (the `RealLLMClient` is a typed stub)
- Scenario coverage analysis — knowing which probes haven't been tried in N days
- Flake retry semantics — k-of-n passes, quarantine on flap
- Probe execution against the OnScreen Web client via Playwright (the right place
  to assert that the rendered patient utterance matches the model's text)
- Multi-user sync regression — two learners, one scenario, divergent state
- CI parallel sharding by scenario, with HTML artifact upload
- Faculty-authored assertion DSL so non-engineers can add probes

## Author

Abdallah Safi — TMU, Toronto. GitHub `@PohTeyToe`. Portfolio:
https://abdallah-safi.vercel.app
