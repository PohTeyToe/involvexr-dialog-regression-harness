# involvexr-dialog-regression-harness

A multi-language sketch demonstrating how I'd approach regression-testing
non-deterministic AI patient dialog at the heart of an InvolveXR-style
platform. Each subfolder is intentional — Python is the harness core,
Next.js is the educator-facing surface I'd want in production, .NET wraps
it for integration with a Lumeto-style backend, and `docs/` is where the
design tradeoffs live.

The hard part isn't running tests — it's deciding what "passes" means when
the same learner utterance ("tell me about your breathing at night") can
produce a clinically correct answer on Monday and a hallucinated
medication on Tuesday, across English, Spanish, and French, across VR,
web, desktop, and the browser-based modality, and across
faculty-customized scenarios. Record-and-replay falls over because the
surface text changes every run while the clinical content is what
actually has to stay correct. This repo is one shape of an answer:
scenario YAML, structured probes, semantic assertions, N-of-M consensus
voting for flake control, and a coverage view tied to learner objectives.

## Live demo

The Next.js front-end and FastAPI back-end are deployment-ready (see
[`DEPLOY.md`](DEPLOY.md) for the one-command deploys). Tokens for Vercel
and Render need to be exported in the local shell first; the build is
otherwise green.

The front-end is fully usable offline against deterministic mock data —
opening it without a backend still shows a complete walkthrough of
scenarios, live-run streaming, reports, and the architecture diagram.

## Repository tour

| Folder | What lives there |
|-|-|
| [`python/`](python/) | Harness core: scenario loader, probe runner, assertions (semantic + latency + cross-language + consensus), HTML report renderer, FastAPI server. This is where the real logic is. **43 passing tests, CI green on Python 3.11/3.12.** |
| [`scenarios/`](scenarios/) | YAML scenarios shared by every language target. Three sample scenarios today: difficult airway, pediatric code blue, and SPIKES breaking bad news. |
| [`web/`](web/) | Next.js 15 + Tailwind v4 + shadcn-style UI. 9 routes, 17 components, dark-mode default. Streams live regression runs from the FastAPI server over Server-Sent Events. Falls back to mock data when the backend is unreachable so the UI is always demo-ready. |
| [`dotnet/`](dotnet/) | ASP.NET Core wrapper using Lumeto's actual test stack: xUnit + Moq + WebApplicationFactory + SpecFlow + FluentValidation. **53 passing tests** across Core (36 unit), Api (14 integration via WebApplicationFactory), and Specs (3 SpecFlow scenarios). 4 source projects, 3 test projects. |
| [`docs/`](docs/) | 13 design documents and 5 ADRs covering architecture (with Mermaid diagrams), C# equivalents for each Python assertion, SpecFlow mapping for the YAML scenarios, integration with Lumeto's stack, testing philosophy, v0.5 production roadmap, and a glossary for non-engineering readers. **~1880 lines.** |

## Quickstart

```bash
git clone https://github.com/PohTeyToe/involvexr-dialog-regression-harness.git
cd involvexr-dialog-regression-harness/python

# offline core, no API key needed
uv sync
uv run pytest -v
uv run python examples/run_demo.py

# with the live Anthropic client
export ANTHROPIC_API_KEY=sk-ant-...
uv run python examples/run_demo.py --live
```

The default path is offline by design — `MockLLMClient` returns
deterministic responses keyed off probe text so CI never has to talk to
a provider. Pass `--live` (or set `RUN_LIVE_LLM_TESTS=1` for the live
test suite) to swap in `RealLLMClient` against `claude-sonnet-4-5`.

For the FastAPI server (used by the Next.js front-end and Railway
deployment) and the embeddings opt-in, see
[`python/README.md`](python/README.md) once it lands. For the C# wrapper
see [`dotnet/README.md`](dotnet/README.md). For the educator UI see
[`web/README.md`](web/README.md).

## Why this exists

This is a sketch I built while preparing for a conversation with
Lumeto's team. It's a conversation starter, not a finished product. The
clinical scenarios and assertion patterns are public-knowledge
approximations — the real value would come from grounding them in actual
InvolveXR scenario data and faculty assessment rubrics.

The shape of the problem is what I wanted to show I understand: that
clinical correctness is a moving target across English/Spanish/French,
across VR/web/desktop/browser-based modalities, across faculty-authored
scenarios, and across an LLM whose surface text rerolls every run. The
shape of an answer is structured probes, semantic assertions, N-of-M
consensus voting, and coverage tied to learner objectives — all of which
live in [`python/`](python/) and are documented in
[`python/DECISIONS.md`](python/DECISIONS.md).

## Author

Abdallah Safi — TMU CompE, Toronto. GitHub
[`@PohTeyToe`](https://github.com/PohTeyToe). Portfolio:
[https://abdallah-safi.vercel.app](https://abdallah-safi.vercel.app).
