# ADR-003: Mock-by-default LLM client; live tests are opt-in

Last updated: 2026-04-30
Status: Accepted

## Context

The harness drives a system whose dialogue layer is implemented by an LLM. Two failure modes pull in opposite directions:

1. **Test on a real LLM every time** → CI cost, vendor rate limits, network flake, and a feedback loop slow enough that engineers stop running tests locally.
2. **Test on a mock LLM only** → catches structural bugs (orchestration, gRPC contract, prompt injection routing) but misses provider-specific regressions (model update changes the response distribution, embedding model version changes similarity scores, latency drift in the live provider).

Both cases are real. The question is the **default**.

A representative cost calculation: 3 scenarios × 15 probes each × 5 consensus runs = 225 LLM calls per harness run. At a typical Azure OpenAI rate ($0.005 per call for a small model, much higher for GPT-4 class), one CI run is ~$1-5. Run that on every PR for a 30-engineer team and the monthly bill hits four figures. More importantly, every PR pays a 30-60 second wall-clock tax on the LLM call latency, and PRs that touch the harness or scenarios take that hit twice (locally and in CI).

## Decision

Mock-by-default: every harness run uses `python/src/dialog_harness/mock_llm.py` unless `--provider live` (or the env equivalent) is explicitly set. Live runs are opt-in at three levels:

1. **Local development.** Engineer can run `--provider live` against a personal API key for ad-hoc testing.
2. **CI nightly.** A scheduled pipeline on `main` runs `--provider azure_openai --consensus-runs 5 --consensus-threshold 4` against the deployed environment.
3. **PR opt-in.** A PR labeled `live-llm-required` triggers an additional CI stage that runs the live suite. Used when the PR touches the prompt templates or the LLM provider integration directly.

The mock LLM is **deterministic but not stupid**. It returns scenario-aware canned responses — when the prompt mentions "sleep apnea", the mock includes "sleep apnea" in the response — so the assertion library exercises against realistic input shape. It is not a stub that returns `"OK"`.

## Consequences

**Positive.**

- CI runs in <2 minutes on every PR. Engineers actually run them locally.
- Zero LLM cost on PR builds.
- Deterministic CI — no flake from upstream provider noise.
- Live tier still exists, gated, with a budget and a higher consensus threshold (live noise is bigger than mock noise).
- The mock surface is small enough to maintain but realistic enough to exercise the assertion library properly.

**Negative.**

- Mock LLM responses can drift from real LLM responses if not maintained. A scenario that passes against the mock but fails against live is the whole reason this tier exists, but it requires nightly live runs to surface the drift quickly.
- Engineers can game the mock to make a failing test pass. Code review has to watch for "the test now passes because the mock was changed to match the new code" — the mock should change for **scenario** reasons, not for **code** reasons.
- Provider-specific bugs (Azure OpenAI vs Anthropic differences in tool use, JSON output, refusals) only show up nightly. PR feedback for those bugs is delayed by up to a day.

## Alternatives considered

**Live-only on every PR.** Rejected on cost and feedback latency. The harness becomes too expensive to run, engineers stop running it locally, and the test suite becomes "what CI runs", not "what I run". That kills the assertion library's iteration speed.

**Recorded responses replayed in CI.** Considered. The cache invalidation problem makes it unworkable as the primary mechanism — every prompt change is a cache miss, every model update is a stale cache. Still useful as a fixture for unit-testing the assertion library (a small frozen set of known-good and known-bad responses).

**Provider-fanout in CI** (run against three providers in parallel on every PR). Rejected. Triples the cost and the failure modes without proportional information gain. Better to test against the production provider live, nightly, with consensus voting.

**Use a small local model** (e.g., a 3B-parameter model running in-process). Considered. Promising but operationally painful — model storage, GPU access in CI, latency, drift from production model behavior. Worth revisiting if Lumeto picks an on-prem option.

**Snapshot the live LLM responses periodically and fall back to them when offline.** Same problems as recorded responses. Not pursued.
