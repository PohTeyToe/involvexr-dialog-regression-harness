# Testing Philosophy

Last updated: 2026-04-30

**TL;DR:** LLM-driven systems are non-deterministic by design. The naive responses — "lower the temperature", "snapshot the output", "retry until green" — all fail under real load. This harness uses assertion-based testing with N-of-M consensus voting, a mocked-by-default LLM, and a clearly tiered test pyramid. The honest tradeoff: assertions catch regressions that violate stated contracts, not regressions in the unstated good-taste of the model. We're explicit about both.

## 1. The non-determinism problem

A patient agent in InvolveXR is a function from `(persona, history, utterance) → response_text`. That function is implemented by an LLM that produces different outputs on identical inputs. Three sources of variance:

|Source|Magnitude|Controllable?|
|-|-|-|
|Sampling temperature|Large at temp ≥ 0.5|Yes, but lowering hurts persona quality|
|Provider-side rerolls (caching, A/B routing)|Small to moderate|No|
|Prompt-template drift (history compaction, tool inserts)|Variable|Partial — versioned templates help|
|Underlying model updates|Anywhere from unnoticeable to scenario-breaking|No (vendor-controlled)|
|Embedding model updates (used by `assert_stays_in_character`)|Small but biased|Partial — pin model versions|

Even with `temperature=0`, the same prompt can produce different tokens across model versions, model regions, and provider load. **You cannot test an LLM-driven system with `assertEquals` on the response text.** Anyone who tells you otherwise is selling something or has not run the test in production yet.

## 2. Three approaches and why two are wrong

### 2a. Record-and-replay

Run the scenarios once against a live LLM, save the responses, replay them in CI by intercepting the LLM call.

Where this works: a deterministic snapshot of the conversation history through ACF's prompt-templating logic, replayed against a hash-matched LLM cache. Useful for testing the orchestration code below the LLM.

Where this fails:

- Snapshot expires the moment the prompt changes — and prompts change constantly during product development.
- Tells you nothing about how the system handles **new** inputs (the whole point of a regression suite is that it generalizes).
- Cache size grows linearly in (scenarios × probes × consensus runs).
- Doesn't catch model-update regressions because the cached output is replayed regardless.

The correct use of record-and-replay: as a **fixture** for unit-testing assertion logic. Replay 500 known-good and known-bad responses to verify the assertion library does the right thing. **Not** as the primary regression mechanism.

### 2b. Snapshot testing

Same idea, more aggressive: serialize the entire response, commit it, fail the build if any byte differs.

Why it fails: every model update is a red build, every prompt nudge is a hundred-file diff, and engineers learn to mass-`git checkout` snapshots until the green-build muscle memory eats every regression. Snapshot testing is calibrated for deterministic systems. LLMs are not deterministic systems.

### 2c. Assertion-based testing (this harness)

State the **contracts** the response must satisfy:

- Must mention the symptoms the patient is supposed to disclose at this turn.
- Must not mention drugs that don't exist in the formulary.
- Must stay similar (in embedding space) to the persona description.
- Must respond within a latency budget.

Each contract is one assertion. The response can vary as long as the contracts hold. When a contract breaks, the failure is interpretable — "missing 'sleep apnea' on probe 2" — not "byte 147 changed".

The cost: contracts are written, not derived. Someone has to decide what the patient should disclose at each turn. **That's the point.** Encoding clinical intent in the test is what makes the test meaningful.

See [ADR-001](./adr/ADR-001-semantic-vs-string-assertions.md) for the deeper argument.

## 3. Consensus voting

Even good assertions occasionally fail on a stochastic response. Three responses to that:

|Strategy|Failure mode|
|-|-|
|Retry until green|Hides real regressions; flake budget grows over time|
|Lower temperature|Hurts persona quality; doesn't fix the root cause|
|N-of-M consensus|Tolerates noise without hiding signal|

The harness uses consensus voting: run each assertion N times (default 5) and pass if M-of-N succeed (default 4). The test fails when 2+ runs fail, which is a strong signal of an actual regression rather than a coin-flip. The per-run breakdown is in the report, so a 3/5 result is visible (the assertion is degrading even if it technically passed).

The full rationale is in [ADR-002](./adr/ADR-002-consensus-voting-for-flake-handling.md). The short version: consensus is statistical, not magical. It buys you tolerance to provider noise at the cost of more LLM calls. The mock-LLM mode in CI bypasses this — consensus is needed for live-LLM tests, not for offline ones.

## 4. The test pyramid for AI-character systems

```mermaid
flowchart TB
    subgraph Pyramid["Test pyramid"]
        direction TB
        Live["Live-LLM regression<br/>(opt-in, nightly, on main)"]
        Int["Mocked-LLM end-to-end<br/>(every PR, ~2 min)"]
        Unit["Assertion library unit tests<br/>(every commit, &lt;5 sec)"]
    end

    Live -->|few, slow, expensive, vendor-noisy| Int
    Int -->|many, fast, deterministic| Unit
    Unit -->|hundreds, instant| Foundation((((foundation))))

    classDef tier fill:#f0f0f0,stroke:#888,color:#000
    class Live,Int,Unit tier
```

Tiers in detail:

|Tier|Speed|What it catches|What it misses|
|-|-|-|-|
|Unit (assertion library)|Milliseconds|Bugs in the assertions themselves — false positives, false negatives, off-by-one in p95|Anything about the SUT|
|Mocked-LLM end-to-end|Seconds|Orchestration bugs, prompt-template regressions, gRPC contract breaks, persona-injection bugs|Provider-specific behavior, real noise|
|Live-LLM regression|Tens of seconds per scenario|Provider regressions, persona drift on real data, latency regressions|Costs money; flakier; needs consensus voting to be tolerable|

The mistake to avoid: treating the live-LLM tier as the **main** test surface. It's the **canary** tier. Every PR runs unit + mocked. Live runs nightly on main, optionally on PRs marked `live-llm-required`.

In `python/tests/`:

- `test_assertions.py`, `test_consensus.py`, `test_scenario.py`, `test_coverage.py` — the unit tier.
- `test_runner_e2e.py` — the mocked end-to-end tier.
- `test_real_llm.py` — the live tier, gated by env flag.

That maps directly onto the pyramid.

## 5. Flake handling: quarantine, fix-forward, or tolerate?

When a test flakes, you have three honest choices:

|Choice|When it's right|When it's wrong|
|-|-|-|
|Quarantine|The flake is real, the underlying signal is real, but the diagnosis is going to take more than the current PR|Quarantine ages: a "temporarily" quarantined test is the same as a deleted test|
|Fix-forward|The root cause is identified and tractable inside the current PR|The root cause is "the model is non-deterministic" — that's not fixable in the test|
|Tolerate (consensus voting)|The flake is provider noise, not a real signal|The flake is hiding a real regression that consensus rounds down to passing|

The harness picks "tolerate" by default at the assertion level (consensus voting) and "fix-forward" at the scenario level (a flaking scenario gets a Github issue, a date, and an owner — never a `@skip` decorator without an expiry).

There is no fourth option. "Just rerun it" is "tolerate" without the discipline.

## 6. What this approach can't catch

Be honest about the limits:

- **Good-taste regressions.** "The patient sounds robotic now" — there's no assertion for that. A semantic similarity check catches gross persona drift; subtle voice changes need human review.
- **Cross-turn coherence.** Each probe is independent in the current scenario format. A regression where the patient contradicts itself across turns isn't caught unless you write a multi-turn scenario with `must_mention` referring back to an earlier turn.
- **Reasoning bugs.** "The patient correctly inferred difficulty from limited mouth opening but failed to connect it to airway risk." That's a clinical-reasoning assertion and we don't have one. SMEs catch these.
- **Tool-use bugs.** If the ACF makes a tool call to fetch vitals from Pulse, the harness sees the rendered text but not the tool-call args. A regression that fetches the wrong vital but renders a plausible response slips through.
- **Latency variance under load.** Latency in CI is not latency in production. The harness's p95 number is a smoke alarm, not a SLO measurement.
- **Failures that only happen in a real Unreal client.** WebRTC negotiation, audio transcription noise, GPU pool eviction. The harness is a synthetic learner; it doesn't render frames or speak words.

These are real gaps. Some are addressable in [v0.5](./v0_5_roadmap.md) (multi-turn coherence, tool-call assertions). Others (clinical good taste, real client load) are out of scope for any automated harness, by design — they're what SME review and load testing are for.

## 7. The shape of a good assertion

Across the assertion library, the patterns that work:

1. **Stated as a contract, not a snapshot.** "Must mention X" survives the response text rerolling.
2. **Cheap to evaluate.** Embedding similarity is the most expensive assertion; everything else is substring matching. The cost of consensus voting is dominated by the LLM call, not the assertion.
3. **Failure detail is interpretable.** `missing: ['sleep apnea']` lets you debug. `bytes differ at offset 147` does not.
4. **Independent of unrelated assertions.** A failure in `assert_mentions` shouldn't bleed into `assert_stays_in_character`'s pass/fail. Each assertion runs and reports separately.
5. **Composable into consensus.** Any assertion that returns `(passed, detail)` works with the consensus voter. New assertions inherit voting for free.

If a proposed assertion violates any of these, it usually means the contract is wrong, not the implementation.
