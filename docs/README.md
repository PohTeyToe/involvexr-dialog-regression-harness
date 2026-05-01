# Documentation Index

Last updated: 2026-04-30

**TL;DR:** This folder is the design rationale for the InvolveXR Dialog Regression Harness. It explains how the harness fits into a Lumeto-style backend, why each design choice was made, and what a production C# port would look like. Code samples are illustrative — the running implementation lives in `python/`.

## Reading order

If you have 10 minutes, read `architecture.md` and `testing_philosophy.md`.
If you have 30 minutes, also read `csharp_equivalents.md` and the ADR set.
If you have an hour, read all of it and skim the glossary as you go.

## Documents

|Doc|What's in it|
|-|-|
|[architecture.md](./architecture.md)|How the harness fits into a Lumeto deployment, with a full system diagram and integration points|
|[csharp_equivalents.md](./csharp_equivalents.md)|1:1 mapping of every Python assertion to xUnit + Moq + FluentAssertions, with translation tradeoffs|
|[specflow_mapping.md](./specflow_mapping.md)|Same scenarios expressed as SpecFlow `.feature` files for non-engineer readability|
|[integration_with_lumeto_stack.md](./integration_with_lumeto_stack.md)|Concrete walkthrough of dropping the harness into Lumeto's existing test project, CI pipeline, and reporting flow|
|[testing_philosophy.md](./testing_philosophy.md)|Why assertion-based beats record-and-replay and snapshot testing for non-deterministic systems|
|[v0_5_roadmap.md](./v0_5_roadmap.md)|What this would need to be production-ready against a real LLM provider and the full InvolveXR surface|
|[glossary.md](./glossary.md)|Quick reference for non-engineering readers — faculty, clinical SMEs, PMs|

## Architecture Decision Records

|ADR|Subject|
|-|-|
|[ADR-001](./adr/ADR-001-semantic-vs-string-assertions.md)|Why we don't use exact string match|
|[ADR-002](./adr/ADR-002-consensus-voting-for-flake-handling.md)|Why N-of-M voting beats retry-and-pray and snapshot testing|
|[ADR-003](./adr/ADR-003-mock-by-default-llm-client.md)|Why CI runs offline; live tests are opt-in|
|[ADR-004](./adr/ADR-004-scenario-yaml-vs-gherkin.md)|Why we prototyped in YAML but the production answer is SpecFlow|
|[ADR-005](./adr/ADR-005-python-prototype-vs-csharp-production.md)|Why this was built in Python first and what the C# port looks like|

## Conventions

- Mermaid diagrams render natively on GitHub. Code blocks are tagged `mermaid`, `csharp`, `python`, `gherkin`, `yaml`, or `bash`.
- File references use repo-relative paths: `python/src/dialog_harness/assertions.py`.
- "Lumeto stack" means the publicly-stated stack (Azure, ASP.NET Core, gRPC, Unreal, etc.). Anything not in that stack is called out as "harness-only" or "speculative".
- "ACF" stands for AI Character Framework — the term used here for the dialogue-management surface that owns patient-agent prompts and state. The real internal name may differ.
