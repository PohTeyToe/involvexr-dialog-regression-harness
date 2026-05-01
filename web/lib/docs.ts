// Embedded docs source so the page renders even before /docs/ is populated
// by Phase 2C. When that lands, swap to fs.readFile in a Server Component.

export type Doc = { title: string; subtitle?: string; body: string };

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
};
