# ADR-005: Python prototype, C# production port

Last updated: 2026-04-30
Status: Accepted

## Context

The harness is built in Python. Lumeto's backend, AI Character Framework, and existing test suite are .NET. This ADR records why the prototype is Python despite the production stack being C#, and what the production port looks like.

Three honest reasons the prototype is Python:

1. **Iteration speed on the assertion library.** Python's REPL, type annotations, and `pytest` collection let an assertion + test pair land in 30 seconds. The same loop in C# is slower because of project file rebuilds, more verbose syntax, and a heavier test runner.
2. **The author's familiarity** is higher in Python's testing ecosystem. The goal of v0.4 was to ship a working harness that demonstrates the testing approach, not to bikeshed the language choice.
3. **Provider SDKs and embedding libraries** have a better Python-first experience: `sentence-transformers`, `openai`, `anthropic`, `pydantic`, `httpx`, `pytest-asyncio`. The C# equivalents exist but are less mature for ML adjacent work.

Three reasons the prototype shouldn't **stay** Python in a real Lumeto deployment:

1. **The team's daily language is C#.** A test suite in a different language is a maintenance burden — fewer eyes, separate dependency management, separate CI tooling.
2. **The existing test surface (xUnit + SpecFlow + Moq + WebApplicationFactory + FluentValidation) is already wired up.** Reusing it is free; rebuilding it in Python is duplicative.
3. **In-process testing via `WebApplicationFactory`** is meaningfully faster than out-of-process gRPC calls and gives access to DI overrides for surgical mock injection. That capability is C#-only.

## Decision

**Ship v0.4 in Python.** Optimize for assertion-library iteration speed and for clear demonstration of the testing approach. The Python harness is a black-box client over gRPC; everything below the gRPC contract is fair game to refactor in any language.

**Plan a C# port for v0.5.** The port is two test projects, not one:

- `tests/InvolveXR.Dialog.Regression.InProcess` — uses `WebApplicationFactory<Program>`, swaps the LLM client via DI, runs against an in-process gRPC server. Fast, deterministic, runs every PR.
- `tests/InvolveXR.Dialog.Regression.BlackBox` — standalone runner that hits a deployed gRPC endpoint with auth. Runs in the post-deploy stage against the ephemeral environment. Mirrors the Python harness's role.

**Keep the scenarios and assertion semantics shared.** The same `scenarios/*.yaml` files (or their `.feature` equivalents — see [ADR-004](./ADR-004-scenario-yaml-vs-gherkin.md)) feed both ports. The assertion semantics are documented in [csharp_equivalents.md](../csharp_equivalents.md) so the C# port is a translation, not a redesign.

## Consequences

**Positive.**

- v0.4 shipped fast and demonstrably works (43 passing tests, 3 real scenarios).
- The Python prototype validates the testing approach against real LLM behavior before the team commits engineering time to a C# port.
- The C# port has a clear shape — it's not a research project, it's a translation of a known-good design.
- The assertion library's correctness is established in Python first (cheap to iterate). The C# port inherits that correctness rather than discovering it from scratch.

**Negative.**

- Two implementations means two test runs, two CI configurations, two review surfaces during the migration window.
- The Python harness will accumulate features that the C# port needs to match. Discipline required: don't add Python-only features once the C# port is on the way.
- Operational overhead: the team has to keep `pip` and `uv` working in CI for the Python tier, in addition to the .NET toolchain they already maintain.
- Some assertion details are easier in Python (sentence-transformers in-process) than in C# (call out to an embedding service). The port has to handle these gracefully.

## Alternatives considered

**Build directly in C# from the start.** Considered. Would have shipped slower because of the assertion-library iteration tax, and the design wouldn't have been validated against real LLM behavior before being baked into the production codebase. The Python prototype is, in part, a de-risking exercise.

**Stay Python permanently.** Rejected. The maintenance burden of a Python test suite in a .NET shop accumulates over years. Better to bite the migration cost once than to live with it indefinitely.

**Polyglot — Python for the runner, C# for the assertion library shared via FFI or a service boundary.** Rejected. Adds a network or interop layer between the test and the assertion logic, which is exactly the kind of complexity that makes a test suite untrustworthy. Single-language is right at this layer.

**Rust or Go for the runner.** Considered briefly — fast, single binary, easy to ship in CI. Rejected because (a) neither language is in Lumeto's stack, (b) the LLM client SDKs are weaker, (c) the win over Python is small for an integration test runner that spends 99% of its time waiting on I/O.

**Use Lumeto's existing xUnit + SpecFlow without writing a new harness at all.** Considered. The gap is that nothing in their existing test surface specifically targets dialogue-layer regression — there's no consensus voter, no embedding-similarity assertion, no mock LLM fixture. The harness adds those pieces, which then port back into their test surface as new test classes.
