# ADR-004: Scenario YAML for the prototype, SpecFlow Gherkin for production

Last updated: 2026-04-30
Status: Accepted (with planned migration path)

## Context

Scenarios encode clinical intent: who the patient is, what the learner should accomplish, what the patient should disclose at each turn. The format choice has two audiences:

- **Engineers**, who edit scenarios alongside code, run them locally, and care about iteration speed.
- **Clinical SMEs and faculty**, who own the clinical correctness of the scenarios, may not be engineers, and need to read and review scenarios as part of curriculum design.

The format choice is a real tradeoff:

|Format|Engineer cost|SME cost|Tooling|
|-|-|-|-|
|YAML|Low (any editor, any language)|Medium (engineer-coded structure)|Pydantic/YamlDotNet validation|
|Gherkin|Medium (need step-defs)|Low (reads like prose)|SpecFlow + LivingDoc|
|Custom DSL|High (parser + validator)|Variable|Custom everything|
|Code-only|Low for engineers|High|Native|

The harness is a Python prototype meant to demonstrate a testing approach. Lumeto's existing test stack already runs SpecFlow + xUnit, so the production answer is structurally clear.

## Decision

**v0.4 prototype: YAML.** All scenarios in `scenarios/` are YAML, parsed by `python/src/dialog_harness/scenario.py` using Pydantic for validation.

**Production: SpecFlow Gherkin.** When the harness ports to C# and integrates into Lumeto's existing test project, scenarios become `.feature` files driven by SpecFlow step definitions. The shape of that translation is documented in [specflow_mapping.md](../specflow_mapping.md).

**Both formats coexist.** The Python harness ships a YAML→Gherkin converter (v0.5) so both formats are first-class. YAML stays useful for programmatic generation (LLM-augmented probe variations, fuzzed scenarios), Gherkin stays the canonical SME-readable form.

## Consequences

**Positive.**

- The prototype shipped fast (one weekend) because YAML + Pydantic is a 50-line scenario loader.
- The production path uses tooling Lumeto already runs (SpecFlow + LivingDoc), so the migration cost is bounded.
- Each format is used where it fits — YAML for engineering-internal use, Gherkin for SME-facing curriculum.
- The `scenarios/` folder versioning history is preserved through the migration; YAML files become the input to a converter, not deleted artifacts.

**Negative.**

- Two formats means two validators, two parsers, two test paths. The converter has to be lossless or we end up with the worst of both worlds.
- Faculty looking at the v0.4 repo will see YAML and have to take it on faith that the production version will be Gherkin. The converter (or at least a sample Gherkin file) needs to ship before any SME review.
- A scenario that's natural in YAML may be awkward in Gherkin and vice versa. A conversion tool can't always preserve intent perfectly.

## Alternatives considered

**Gherkin from day one.** Rejected for the prototype. SpecFlow is .NET-only; the Python prototype would have needed `behave` or `pytest-bdd`, and neither integrates with the Lumeto stack the way SpecFlow does. Better to use the natural format for each step of the journey.

**YAML-only forever.** Rejected. Faculty review is a hard requirement for clinical content, and asking SMEs to review YAML against an engineer-defined schema is a friction point that will degrade scenario quality over time. Gherkin solves this for free.

**Custom DSL.** Rejected on principle — building a clinical-scenario DSL from scratch is six months of work and ends up with worse tooling than either YAML or Gherkin. The right time to write a custom DSL is "after the existing options have demonstrably failed", and they haven't.

**Code-only scenarios** (a `Scenario` class instantiated in C# directly). Rejected. Loses SME readability completely; turns curriculum design into a code review.

**Markdown with frontmatter.** Considered. Pretty for human reading, painful to validate. The frontmatter is YAML in any case; you've just re-introduced YAML with extra steps.
