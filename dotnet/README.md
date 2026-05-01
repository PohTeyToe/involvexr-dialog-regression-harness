# dotnet/ -- DialogHarness on .NET 8

This folder demonstrates the InvolveXR dialog regression harness implemented natively in C# using the test stack actually used at Lumeto: **xUnit + Moq + WebApplicationFactory + SpecFlow (Reqnroll) + FluentValidation**.

## Why this exists

The Python harness in `../python/` is the reference implementation. This .NET port shows the same patterns -- assertions, consensus voting, scenario-driven probing -- expressed idiomatically in C# so the harness can be embedded directly in a .NET backend (e.g. ASP.NET Core, gRPC services) without shelling out to Python.

## Quickstart

```
cd dotnet
dotnet restore
dotnet build
dotnet test
```

All three commands should succeed. The full test suite runs in well under a minute on the default mock LLM client.

## Solution layout

| Project | Purpose |
|-|-|
| `DialogHarness.Core` | Domain models, assertion library, consensus runner, LLM client interface, embedding provider |
| `DialogHarness.Api` | ASP.NET Core minimal API exposing `/api/scenarios` and `/api/runs` |
| `DialogHarness.Worker` | Console stub showing how the harness would plug into a gRPC backend |
| `DialogHarness.Core.Tests` | xUnit unit tests for assertions, consensus, scenario loader |
| `DialogHarness.Api.Tests` | Integration tests using `WebApplicationFactory<Program>` with a mocked `ILLMClient` |
| `DialogHarness.Specs` | Reqnroll BDD specs driving the harness via Gherkin features |

## Mapping to the Python harness

| Python module | C# equivalent |
|-|-|
| `python/src/scenarios/loader.py` | `DialogHarness.Core.Scenarios.ScenarioLoader` |
| `python/src/assertions/semantic_mention.py` | `DialogHarness.Core.Assertions.SemanticMentionAssertion` |
| `python/src/assertions/banned_mention.py` | `DialogHarness.Core.Assertions.BannedMentionAssertion` |
| `python/src/assertions/persona_consistency.py` | `DialogHarness.Core.Assertions.PersonaConsistencyAssertion` |
| `python/src/assertions/latency_budget.py` | `DialogHarness.Core.Assertions.LatencyBudgetAssertion` |
| `python/src/consensus.py` | `DialogHarness.Core.Consensus.ConsensusRunner` |
| `python/src/llm/anthropic_client.py` | `DialogHarness.Core.LLM.AnthropicLLMClient` |
| `python/src/llm/mock_client.py` | `DialogHarness.Core.LLM.MockLLMClient` |
| `python/src/api/routes.py` | `DialogHarness.Api.Endpoints.*` |

## API endpoints

| Method | Path | Description |
|-|-|-|
| GET | `/api/health` | Liveness probe |
| GET | `/api/scenarios` | List configured scenarios |
| GET | `/api/scenarios/{id}` | Scenario detail |
| POST | `/api/runs` | Execute a scenario through the consensus runner |
| GET | `/api/runs/{id}` | Fetch run status (in-memory store) |

`POST /api/runs` body is validated by `RunRequestValidator` (FluentValidation): `ConsensusRuns` 1..11, `ConsensusThreshold` 1..ConsensusRuns, `Language` ISO 639-1.

## What is intentionally omitted

- **Real Anthropic SDK call** -- `AnthropicLLMClient` is wired up correctly but the API and tests use `MockLLMClient` by default so the suite runs offline. Swap the DI registration in `Program.cs` to enable live calls.
- **Real embedding model** -- `HashingEmbeddingProvider` is a deterministic bag-of-words stand-in. Production swap target: Azure OpenAI text-embedding-3-small or a local Sentence Transformers model.
- **gRPC service implementation** -- `DialogHarness.Worker` is a console stub. The contracts and DI wiring are in place; adding `Grpc.AspNetCore` and a `.proto` file would complete the integration.
- **Persistent run storage** -- runs are kept in an in-process `ConcurrentDictionary`. Production would swap in Postgres or Redis behind an `IRunRepository`.

## Test strategy

The `DialogHarness.Api.Tests/RunsEndpointTests.Post_run_executes_consensus_and_returns_201` test is the canonical integration test: it spins up the full ASP.NET Core pipeline via `WebApplicationFactory<Program>`, replaces only `ILLMClient` with a Moq instance, and asserts on the consensus result coming back over real HTTP. Routing, model binding, FluentValidation, JSON serialization all run as they would in production.
