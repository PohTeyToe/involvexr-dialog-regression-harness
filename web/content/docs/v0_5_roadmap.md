# v0.5 Roadmap

Last updated: 2026-04-30

**TL;DR:** v0.4 (this repo) is a working prototype: 43 passing tests, three real scenarios, a deterministic mock LLM, an opt-in live-LLM path, and a FastAPI surface. Production-ready means filling gaps in multi-vendor LLM support, multi-surface coverage, real integration-fixture sharing with Lumeto's xUnit suite, OTel export, coverage analysis, multilingual handling, gRPC contract testing, and ML-driven probe generation. Each item below explains the gap, the proposed shape, and why it's not in v0.4.

## Roadmap items

### 1. Real LLM provider abstraction (multi-vendor)

**Gap.** `python/src/dialog_harness/real_llm.py` covers a single provider path. A production harness has to handle Azure OpenAI, Anthropic via Bedrock or direct, and a customer-on-prem option, with provider-specific retries, rate limits, and cost accounting.

**Shape.** An `ILlmProvider` interface with implementations per vendor, factory by env var (`HARNESS_LLM_PROVIDER=azure_openai|anthropic|bedrock|mock`). A `BudgetGuard` wrapper that hard-stops a run when token spend exceeds a configured ceiling — non-negotiable for nightly live runs.

**Why not in v0.4.** Without an active vendor commitment from Lumeto, the abstraction would over-fit one shape. Better to ship the prototype with a clean swap point and add adapters as the team picks providers.

### 2. Playwright probes for OnScreen Web client

**Gap.** The harness drives gRPC. Lumeto also ships a Pixel Streaming web client via Next.js. A persona regression that only manifests on the web surface (e.g., long responses get cut by a UI scroll bug, or French diacritics get mangled in the text-to-speech path) doesn't show up in gRPC.

**Shape.** A second runner that drives the web client with Playwright. Same scenario YAML, same assertion library, different transport. The runner's job is to type the probe into the web UI, capture the rendered response (DOM + audio transcript), and feed it to the assertion library.

**Why not in v0.4.** Two reasons. First, the Pixel Streaming session bring-up is heavyweight — needs a working WebRTC signaling server and a GPU streaming target. Second, multi-surface testing only earns its keep when there's a known surface-specific regression class. Worth doing once the gRPC tier is mature.

### 3. Testcontainers for Azure SQL + Service Bus integration tests

**Gap.** The mock-LLM mode runs against the real ASP.NET Core service via gRPC, but skips persistence. A real integration tier needs Azure SQL and Service Bus to verify the orchestrator stores transcripts and emits events correctly.

**Shape.** Testcontainers-Python (or Testcontainers-DotNet for the C# port) brings up `mcr.microsoft.com/azure-sql-edge` and an Azure Service Bus emulator (when one exists; until then, RabbitMQ as a stand-in for the bus contract). Scenario runs assert post-conditions on the DB and the bus.

**Why not in v0.4.** Persistence regressions belong in xUnit + WebApplicationFactory, not in a black-box dialogue harness. This roadmap item is about giving the harness optional persistence assertions, not making it the primary persistence test surface.

### 4. xUnit fixture sharing with Lumeto's existing test suite

**Gap.** The Python harness re-implements scenario loading, mock LLM, and HTTP client setup. The C# port should share these with the existing xUnit suite via `IClassFixture<HarnessFixture>` and the existing `WebApplicationFactory<Program>` plumbing.

**Shape.** See [integration_with_lumeto_stack.md §2](./integration_with_lumeto_stack.md). One fixture, swapped DI registrations, scenarios fed via `[Theory] [MemberData]` from the same `scenarios/` folder.

**Why not in v0.4.** This is the C# port that ADR-005 explicitly defers. Python first, then port once the assertion library is stable.

### 5. OpenTelemetry trace export from regression runs

**Gap.** v0.4 emits a basic `harness.run_id` trace via a hand-rolled span wrapper. Production needs full OTel SDK integration — span context propagation across the gRPC boundary, exporter to the existing collector, semantic conventions matching the InvolveXR services.

**Shape.** Replace the hand-rolled wrapper with `opentelemetry-sdk` + `opentelemetry-exporter-otlp` (Python) or `OpenTelemetry.Api` + `OpenTelemetry.Exporter.OpenTelemetryProtocol` (C#). Tag spans with `service.name=dialog-harness`, `harness.run_id`, `harness.scenario.id`, `harness.probe.idx`. Propagate `traceparent` header through gRPC metadata so harness spans share trace IDs with backend spans.

**Why not in v0.4.** The full OTel SDK is a non-trivial dependency that adds friction to the prototype. v0.4's hand-rolled emitter covers the demo case (one trace ID per run) without forcing the dep.

### 6. Coverage analysis: objective → probe mapping

**Gap.** Each scenario has `learner_objectives` (e.g., "Recognize predictors of difficult airway") and a list of probes. There's no automated check that **every objective is covered by at least one probe** — a coverage gap silently goes unnoticed.

**Shape.** A new `coverage.py` module (the file already exists as a stub) that loads each scenario, maps objectives to probes via either explicit linking (each probe declares which objective it targets) or LLM-assisted matching (a coverage pass that says "objective 2 is covered by probes 1 and 3, objective 3 is uncovered"). The harness fails if any objective has zero linked probes.

**Why not in v0.4.** v0.4 has the stub. The mapping format is a small design decision — explicit linking is simpler, LLM-assisted matching is more robust. Worth picking the right one, not shipping the wrong one fast.

### 7. Per-language gold-answer curation

**Gap.** v0.4 multilingual support is anchor-keyword translation: "the French response must contain `apnée du sommeil`". This catches gross translation errors but not register, formality, or clinical-idiom regressions.

**Shape.** Per-language gold-reference responses curated by clinical SMEs in each language. The assertion shifts from substring matching to semantic similarity (embedding cosine) against the gold reference, with per-language thresholds because embedding models are biased across languages.

**Why not in v0.4.** Curating gold references in 4+ languages is an SME-time cost, not an engineering cost. v0.4 ships the cheap version (anchor matching) and clearly flags it as the cheap version.

### 8. gRPC contract testing layer

**Gap.** The harness drives gRPC but doesn't independently verify the contract. A backwards-incompatible change to a proto field (renamed, retyped, renumbered) only shows up as a runtime error inside a scenario, not as a clear contract failure.

**Shape.** A separate test class that exercises every gRPC method with positive and negative cases — required fields, optional fields, edge values, oversized payloads, missing auth, expired tokens. Runs before the scenario suite. Fast (no LLM, no DB). Catches refactor regressions immediately.

**Why not in v0.4.** v0.4 doesn't yet have a real gRPC dialogue surface to write contract tests against — it's a prototype that talks to a mock. Once the C# port lands, contract tests become the natural first thing to write.

### 9. AI-driven probe generation

**Gap.** Probes are hand-written. A real scenario should have dozens to hundreds of probe variations (different phrasings of the same question, different cultural registers, different learner skill levels). Hand-writing all of them is impractical.

**Shape.** A scenario-augmentation step that takes a base scenario and uses an LLM to produce probe variations. The variations are reviewed by an SME (mandatory — never run uncurated generated probes in CI), tagged with their source seed probe, and added to the scenario file with a `generated: true` marker. The harness can then run the base set in mock mode and the augmented set in nightly live mode.

**Why not in v0.4.** Generated probes without SME curation are worse than no probes — they introduce false-positive failures and false-negative coverage. The generation pipeline is straightforward; the curation workflow is the actual product, and that's a longer build.

### 10. Multi-turn scenario format

**Gap.** Probes are independent in v0.4. A regression where the patient contradicts itself across turns ("In probe 1 said never had surgery; in probe 5 said had a hip replacement in 2018") doesn't get caught because each probe is asserted in isolation.

**Shape.** A `multi_turn` scenario type where the assertion can refer to prior responses: `must_be_consistent_with: probe[1].response`. The assertion library gets a `assert_consistent_with` that checks for explicit contradictions via a small classifier or rule-based pattern matching.

**Why not in v0.4.** Cross-turn assertions are a meaningfully different shape than per-turn assertions and would have doubled the assertion library scope. Saving for v0.5 keeps v0.4 honest.

## Sequencing

If the team adopts this harness, the order I'd build the v0.5 items:

1. **Item 4** (xUnit fixture sharing) — earliest reuse for the team.
2. **Item 8** (gRPC contract testing) — falls out of item 4.
3. **Item 5** (full OTel) — small effort, big payoff for triage.
4. **Item 1** (multi-vendor LLM) — once a vendor decision is made.
5. **Item 6** (coverage analysis) — quick win, makes objectives meaningful.
6. **Item 10** (multi-turn) — needed before the harness scales beyond ~5 scenarios.
7. **Item 7** (gold-answer curation) — needs SME bandwidth.
8. **Item 9** (probe generation) — needs the curation workflow first.
9. **Item 2** (Playwright web probes) — needs a stable Pixel Streaming dev env.
10. **Item 3** (Testcontainers) — only if persistence regressions become a real pain point.
