# Glossary

Last updated: 2026-04-30

**TL;DR:** Quick reference for non-engineering readers — faculty, clinical SMEs, product managers — covering the testing and infrastructure terms used throughout the docs.

## Terms

**ACF (AI Character Framework).** The dialogue-management layer that owns patient-agent personas, conversation history, and prompt templating. Sits between the gRPC surface and the LLM provider. The harness treats ACF as a black box and tests its behavior via the gRPC contract.

**Assertion.** A single check on a response. Examples: "must mention 'sleep apnea'", "must not mention 'fictomycin'", "p95 latency under 2500ms". Each assertion produces a pass/fail plus a human-readable detail.

**Black-box client.** A test client that interacts with the system only through its public contract (here, gRPC), without reaching into internal state. Pro: realistic, refactor-resilient. Con: can't inspect why something failed beyond the contract.

**Consensus voting (N-of-M).** Run the same assertion N times against fresh LLM responses; pass if M succeed. Default in this harness: 5 runs, 4 must pass. Tolerates random model variance without hiding real regressions. See [ADR-002](./adr/ADR-002-consensus-voting-for-flake-handling.md).

**Embedding similarity.** A way of comparing two pieces of text by converting each to a numeric vector ("embedding") and measuring the angle between them (cosine similarity). Used in `assert_stays_in_character` to check whether a response sounds like the persona description without requiring exact word matches.

**Flake / flaky test.** A test that sometimes passes and sometimes fails on the same code, with no real regression. Distinct from a true intermittent bug. The harness uses consensus voting to absorb flake from LLM noise.

**Gherkin.** The plain-English language used by SpecFlow and Cucumber. Looks like `Given the patient is anxious, When the learner asks about breathing, Then the response should mention sleep apnea`. Readable by non-engineers; backed by step-definition code.

**gRPC.** A high-performance RPC framework. The dialogue contract between Unreal clients and ASP.NET Core services is defined in `.proto` files and generates typed clients in C#, Unreal C++, and Python.

**Hallucination guard.** An assertion that the response does not mention something it shouldn't — typically a fake drug name or contraindicated procedure. In this harness: `assert_does_not_mention`. Cheap, high-value.

**Integration test.** A test that exercises multiple components together (e.g., the API layer plus the database plus the orchestrator). Slower than unit tests, faster than end-to-end. The mocked-LLM mode of this harness is integration-level.

**LivingDoc.** The HTML report SpecFlow produces from `.feature` files showing each scenario's pass/fail status. Designed for non-engineering review.

**LLM (Large Language Model).** The generative model behind the patient agent's responses. Could be Azure OpenAI, Anthropic, or another vendor. The harness is provider-agnostic — see [v0_5_roadmap §1](./v0_5_roadmap.md).

**Mock LLM.** A fake LLM that returns deterministic responses based on the prompt. Used in CI so tests are fast, free, and reproducible. The real LLM is only used in opt-in nightly runs. See [ADR-003](./adr/ADR-003-mock-by-default-llm-client.md).

**OpenTelemetry (OTel).** A vendor-neutral framework for collecting traces, metrics, and logs. The harness emits traces with the same conventions as the InvolveXR services so they show up together in Grafana.

**Persona drift.** When the patient agent gradually stops sounding like the persona description over a long conversation, or starts mentioning details inconsistent with the persona. Caught (partially) by `assert_stays_in_character`.

**Probe.** A single learner utterance in a scenario, with the assertions it must satisfy. A scenario contains multiple probes.

**Regression test.** A test that catches behavior changes between versions. The opposite of a feature test (which checks that a new feature works). This harness is regression-focused — it catches when an update breaks behavior that previously worked.

**Scenario.** A clinical situation the patient agent should handle: a 65-year-old with a difficult airway, a pediatric code blue, a breaking-bad-news conversation. Each scenario has a persona, learner objectives, and probes.

**Snapshot test.** A test that compares the response byte-for-byte against a saved expected value. Works for deterministic systems; fails for LLM-driven systems. Not used in this harness. See [ADR-001](./adr/ADR-001-semantic-vs-string-assertions.md).

**SpecFlow.** A SpecFlow library for .NET that turns Gherkin `.feature` files into runnable xUnit tests. Lumeto already uses it. The harness scenarios can be expressed as SpecFlow features — see [specflow_mapping.md](./specflow_mapping.md).

**Step definition.** A C# method tagged with `[Given]`, `[When]`, or `[Then]` that implements one Gherkin sentence. Ties the human-readable feature file to the assertion library.

**Test pyramid.** The standard pattern: many fast unit tests, fewer slower integration tests, very few end-to-end tests. This harness has its own version: assertion-library unit tests, mocked-LLM integration tests, opt-in live-LLM regression tests. See [testing_philosophy.md §4](./testing_philosophy.md).

**Testcontainers.** A library that spins up real services (databases, message queues) in Docker for integration tests, then tears them down. On the [v0.5 roadmap](./v0_5_roadmap.md) for Azure SQL and Service Bus integration.

**Unit test.** A test of one function or one class in isolation, using mocks for dependencies. Fast (milliseconds), runs on every commit. The assertion library tests in `python/tests/test_assertions.py` are unit tests.

**WebApplicationFactory.** An ASP.NET Core test helper that boots the API in-process so tests can hit real endpoints without spinning up a full server. Faster than out-of-process testing; sees DI container so mocks can be swapped in. See [integration_with_lumeto_stack.md §2](./integration_with_lumeto_stack.md).

**xUnit.** The test framework Lumeto uses for the .NET side. Provides `[Fact]` and `[Theory]` attributes for individual tests and parameterized tests respectively.

**YAML.** A plain-text format used for the scenario files in this harness. Easy for engineers to author; less accessible to non-engineers than Gherkin.
