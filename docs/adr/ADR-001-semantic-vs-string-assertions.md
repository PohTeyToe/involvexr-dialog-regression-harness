# ADR-001: Semantic and contract-based assertions, not exact string match

Last updated: 2026-04-30
Status: Accepted

## Context

The harness verifies the output of a patient agent driven by an LLM. The LLM produces different responses on identical inputs because of sampling temperature, provider-side rerolls, prompt-template churn during product development, and underlying model updates that the test team does not control.

The naive testing approach for any text-producing system is `assertEquals(expected, actual)`. That approach is structurally broken for LLM output: the response **rerolls** every time the test runs. Either the test breaks every run (useless), the temperature is dropped to zero (degrading product quality to make tests pass), or the team learns to ignore the failures (the worst possible state).

There are three serious alternatives:

1. **Exact string match** with a frozen seed and temperature 0. Brittle — the model still reseats across versions and providers.
2. **Snapshot testing** — save the output, fail on any byte change. Fails the same way; every model update is a hundred-file diff.
3. **Contract-based assertions** — verify properties of the response, not the response itself.

## Decision

Adopt contract-based assertions exclusively. The assertion library in `python/src/dialog_harness/assertions.py` provides:

- `assert_mentions(response, terms)` — substring containment for required content.
- `assert_does_not_mention(response, banned)` — substring containment for forbidden content (hallucination guard).
- `assert_stays_in_character(response, persona, threshold)` — embedding cosine similarity between response and persona description.
- `assert_latency_p95(latencies, ceiling)` — performance contract.
- `assert_language_consistency(...)` — multilingual anchor matching.

Each assertion expresses one contract. A response can vary in surface form indefinitely as long as the contracts hold.

## Consequences

**Positive.**

- Tests survive routine LLM rerolls without flapping.
- Failure messages are interpretable: `missing: ['sleep apnea']` tells you what regressed; a snapshot diff at byte 147 does not.
- The set of contracts encodes the clinical intent for each scenario, which is useful documentation in its own right.
- Adding new assertion types is mechanical — they all return `(name, passed, detail)` and compose into consensus voting for free.

**Negative.**

- Contracts are written, not derived. Someone has to think about what the patient should disclose at each turn. This is intentional but it's a real cost.
- A response that satisfies every contract can still be subtly wrong (poor bedside manner, awkward phrasing). The harness can't catch this; SME review can.
- Embedding-similarity thresholds are backend-dependent. `assert_stays_in_character` uses 0.05 with the TF-IDF fallback; production with `text-embedding-3-small` should use ~0.30. Threshold drift across environments is a real foot-gun.

## Alternatives considered

**Snapshot testing.** Rejected. Every model update would be a red build with no signal. Engineers would learn to bulk-accept the diffs, and real regressions would slip through. See [testing_philosophy.md §2b](../testing_philosophy.md).

**Frozen seed + temperature 0.** Rejected. Doesn't survive model version changes (the seed maps differently across versions) and degrades persona quality (low temperature produces stilted, repetitive responses).

**Pure LLM-as-judge.** Considered for `assert_stays_in_character` and rejected for the default path. An LLM grading another LLM doubles the non-determinism budget and the cost. Embedding similarity is cheaper, more deterministic, and good enough for the persona-drift signal we want. LLM-as-judge stays available for harder assertions (e.g., "the response correctly applies the contraindication rule") in [v0.5](../v0_5_roadmap.md), where the cost is justified.

**Schema-based output assertions** (the model emits structured JSON). Out of scope here — the patient agent renders natural language. Schema validation is the right tool for tool-call payloads but not for dialogue text.
