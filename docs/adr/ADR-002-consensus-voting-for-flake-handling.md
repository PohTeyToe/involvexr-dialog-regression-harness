# ADR-002: N-of-M consensus voting for flake handling

Last updated: 2026-04-30
Status: Accepted

## Context

Even with contract-based assertions ([ADR-001](./ADR-001-semantic-vs-string-assertions.md)), an individual assertion can fail on a stochastic response when the contract is genuinely satisfied "most" of the time. Examples:

- The patient persona "prefers short answers" — an `assert_mentions("sleep apnea")` will succeed 90% of the time but occasionally produce a one-sentence response that doesn't get to the disclosure.
- The latency budget is met on 9 runs out of 10, with one outlier from a slow upstream call.
- The persona-similarity score sits at 0.32 average with a 0.04 stddev against a 0.30 threshold; one run will sometimes dip to 0.29.

Three responses to that situation:

1. **Retry until green.** Simple, but corrosive. Real regressions that pass on the third try get merged. The flake budget grows. Engineers stop trusting the test suite.
2. **Lower the bar.** Drop temperature, raise thresholds, weaken assertions until the test never fails. Hides regressions structurally — the test no longer detects what it was meant to detect.
3. **Run multiple times, require a majority.** Treat each run as a sample from a noisy distribution and assert on the distribution, not on a single observation.

## Decision

Adopt N-of-M consensus voting at the assertion level. Implementation in `python/src/dialog_harness/consensus.py`:

- Default: 5 runs, 4 must pass (`runs=5, threshold=4`).
- The assertion fails when 2+ runs fail — a strong signal of a real regression rather than a coin-flip.
- The per-run breakdown is in the report. A 3/5 result is visible even when it counts as a fail; a 5/5 result is visible even when a 4/5 would have passed.
- Latency uses a continuous variant: collect N samples and compute p95 across them rather than k-of-n boolean voting (`latency_consensus`).

The voting is wrapped as both a function (`consensus(assertion_fn, runs=5, threshold=4)`) and a decorator (`@consensus_decorator(runs=5, threshold=4)`) so callers pick whichever style fits.

## Consequences

**Positive.**

- Tolerates real LLM noise without hiding real signal. A genuine regression breaks the contract on most runs, not on one.
- The per-run report is debuggable: a flake that passes 3/5 today and 2/5 tomorrow tells you the assertion is degrading even before it tips below threshold.
- Composes with every existing assertion automatically — the voting layer is independent of the assertion logic.
- Defaults are explicit (5 of 4) so reviewers know the noise budget without reading code.

**Negative.**

- Runs each assertion N times → 5x the LLM call budget. This is why CI defaults to mock-LLM ([ADR-003](./ADR-003-mock-by-default-llm-client.md)). Live-LLM consensus runs nightly, not per-PR.
- Doesn't help with **deterministic** flakes (network blip, test-isolation bug, race in the SUT). Those need fixing, not voting.
- The threshold choice is a tunable, and a wrong tuning hides regressions in either direction. 4-of-5 is a reasonable default but real scenarios may need scenario-specific values.
- Statistical rigor is approximate. 5 samples is too few for a real p-value claim; the voting is engineering pragmatism, not hypothesis testing.

## Alternatives considered

**Single retry on failure.** Rejected. One retry hides single-run flakes but not double-flakes; real regressions only need to pass on the second try. No discipline.

**Best-of-N (1-of-N to pass).** Rejected for assertion correctness — too permissive. The contract should hold most of the time, not occasionally.

**Statistical significance testing.** Rejected for v0.4. Computing a confidence interval on 5 samples is theatre. With 50+ samples per assertion the math gets honest, but the LLM cost gets unreasonable.

**Quarantine + manual triage.** Rejected as a default. Quarantine has its place (a known flaky scenario gets a Github issue and an expiry date) but it's the escape hatch, not the policy. See [testing_philosophy.md §5](../testing_philosophy.md).

**Provider-side determinism (seed pinning).** Partial mitigation, not a substitute. Some providers expose seeds, some don't, and seeds don't persist across model versions. Useful when available, can't be the only strategy.
