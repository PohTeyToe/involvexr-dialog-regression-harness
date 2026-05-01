// Docs content. The three "design-note" docs (decisions, csharp_equivalents,
// specflow_mapping) are embedded inline because they were authored for the
// web surface and don't exist as standalone markdown files. The longer
// reference docs (architecture, testing_philosophy, v0_5_roadmap, glossary,
// integration_with_lumeto_stack) are read from the repo's /docs folder at
// build time so they stay in sync with the canonical source.

import fs from "node:fs";
import path from "node:path";

export type Doc = { title: string; subtitle?: string; body: string };

// Resolve the repo-root /docs directory from web/ at build time.
// process.cwd() during `next build` is the web/ directory.
function readRepoDoc(filename: string): string {
  const candidates = [
    path.join(process.cwd(), "content", "docs", filename),
    path.join(process.cwd(), "..", "docs", filename),
    path.join(process.cwd(), "docs", filename),
  ];
  for (const p of candidates) {
    try {
      return fs.readFileSync(p, "utf8");
    } catch {
      // try next
    }
  }
  return `# ${filename}\n\nDocument source not found at build time.`;
}

const ARCHITECTURE_MD = readRepoDoc("architecture.md");
const TESTING_PHILOSOPHY_MD = readRepoDoc("testing_philosophy.md");
const V0_5_ROADMAP_MD = readRepoDoc("v0_5_roadmap.md");
const GLOSSARY_MD = readRepoDoc("glossary.md");
const INTEGRATION_MD = readRepoDoc("integration_with_lumeto_stack.md");

export const DOCS: Record<string, Doc> = {
  decisions: {
    title: "Design decisions",
    subtitle:
      "What I picked, what I rejected, and what I'd do if this were not a sketch.",
    body: `## Why YAML scenarios, not code

Faculty edit clinical scenarios. Faculty do not write Python. YAML keeps the
authoring surface open without giving non-engineers a debugger.

Trade-off: YAML can't express conditional probes ("if patient mentions chest
pain, follow up with..."). For that, the harness uses an optional
\`branches:\` block per probe. SpecFlow-style \`Given/When/Then\` would also
work; YAML won out because it round-trips through git review more cleanly.

## Why semantic assertions, not exact-match

Record-and-replay is what every test framework reaches for first. It fails
the moment the LLM rerolls its surface text — which is every run. We assert
on the things that have to stay true regardless of phrasing:

- **must_mention**: a clinically required concept must appear in the
  response (synonyms allowed via embedding distance).
- **must_not_mention**: banned terms (e.g. fabricated medications, premature
  reassurance) must not appear.
- **persona_check**: does the response read like the configured persona?
  Cosine similarity against an embedded persona description.

## Why N-of-M consensus voting

A single sample can be a fluke either way. Running each probe \`M\` times
and requiring \`N\` to pass smooths out flake without hiding real
regressions. The default \`N=2, M=3\` catches obvious drift fast and only
inflates run time 3x.

## Why a coverage view

You can have 100% pass rate and still miss a learner objective entirely.
Coverage maps probes to objectives via a simple semantic-overlap heuristic;
faculty see at a glance which objectives have no probe pointed at them.

## What I'd build next

- **Faculty editor**: a web UI for editing scenario YAML with a live
  validator. Currently they edit YAML directly.
- **Drift dashboard**: trend pass-rate by scenario over time, surface
  scenarios trending downward before they fail.
- **Auto-bisect**: when a regression lands, walk the model-version axis to
  identify which release introduced it.
`,
  },
  csharp_equivalents: {
    title: "C# equivalents",
    subtitle:
      "Mapping the Python harness to a Lumeto-style ASP.NET Core stack.",
    body: `## Where each piece lands

| Python module | C# equivalent | Notes |
|-|-|-|
| \`scenario.py\` | \`Scenarios/\` POCOs + \`YamlDotNet\` | Scenario record matches the YAML shape 1:1. |
| \`runner.py\` | \`ProbeRunner\` hosted service | One \`HostedService\` per run, \`Channel<T>\` for events. |
| \`assertions.py\` | \`Assertions/\` static class | Embedding similarity uses Azure OpenAI's \`text-embedding-3-small\`. |
| \`mock_llm.py\` | \`IDialogClient\` + \`InMemoryDialogClient\` | DI-swappable for offline xUnit runs. |
| FastAPI server | Minimal API + SignalR | SignalR replaces SSE for the live stream. |

## Test harness wiring

\`\`\`csharp
public class DialogRegressionFixture : IAsyncLifetime
{
    public ProbeRunner Runner { get; private set; } = default!;
    public async Task InitializeAsync()
    {
        var client = Environment.GetEnvironmentVariable("RUN_LIVE_LLM") == "1"
            ? new RealDialogClient()
            : new InMemoryDialogClient();
        Runner = new ProbeRunner(client);
    }
    public Task DisposeAsync() => Task.CompletedTask;
}

[CollectionDefinition("dialog")]
public class DialogCollection : ICollectionFixture<DialogRegressionFixture> { }
\`\`\`

## Why we keep Python around

The .NET wrapper shells out to the Python core for two reasons:

1. The semantic-assertion code is small but evolves fast. Keeping it in one
   place avoids two implementations drifting.
2. The Python \`uv\` tooling makes ad-hoc faculty-side experiments cheap;
   they don't need a .NET SDK.

Long-term, the assertion library could move to a shared gRPC service that
both sides consume.
`,
  },
  specflow_mapping: {
    title: "SpecFlow / Gherkin mapping",
    subtitle: "How existing behavior tests survive this addition.",
    body: `## The principle

The harness does not replace SpecFlow. It augments it. Existing
\`Given/When/Then\` scenarios stay exactly where they are. The harness adds a
new test category — non-deterministic dialog — that SpecFlow handles
awkwardly.

## Mapping table

| SpecFlow concept | Harness concept |
|-|-|
| Feature file | Scenario YAML |
| Scenario | A scenario block with N probes |
| Step | A probe |
| Step assertion | A semantic / latency / persona assertion |
| Background | \`patient:\` block, applied to every probe |
| Examples table | \`languages:\` axis with \`keyword_translations:\` |

## When to use which

| Use SpecFlow when... | Use the harness when... |
|-|-|
| The behavior is deterministic | The system under test is an LLM |
| You're testing UI flows | You're testing dialog content |
| Stakeholders read tests | Engineers + faculty co-author tests |

## Bridging the two

The .NET wrapper exposes scenarios as xUnit \`Theory\` data sources, so a
SpecFlow step can call into the harness:

\`\`\`gherkin
When the difficult-airway scenario is replayed against current dialog model
Then the harness pass rate is at least 80 percent
And no probe mentions a fabricated medication
\`\`\`

That keeps stakeholder-readable tests on the SpecFlow side while the
heavy-lifting assertions live in the harness.
`,
  },
  architecture: {
    title: "Architecture",
    subtitle: "How the harness sits next to the InvolveXR stack.",
    body: ARCHITECTURE_MD,
  },
  testing_philosophy: {
    title: "Testing philosophy",
    subtitle: "Why assertion-based tests, not snapshot tests, for LLM dialog.",
    body: TESTING_PHILOSOPHY_MD,
  },
  integration_with_lumeto_stack: {
    title: "Integration with the Lumeto stack",
    subtitle: "Two ways to drop the harness into a Lumeto deployment.",
    body: INTEGRATION_MD,
  },
  v0_5_roadmap: {
    title: "v0.5 roadmap",
    subtitle: "What's missing before this is production-ready.",
    body: V0_5_ROADMAP_MD,
  },
  glossary: {
    title: "Glossary",
    subtitle: "Terms used throughout the docs, for non-engineering readers.",
    body: GLOSSARY_MD,
  },
};
