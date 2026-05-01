# C# Equivalents

Last updated: 2026-04-30

**TL;DR:** Every Python assertion in `python/src/dialog_harness/assertions.py` has a clean translation to xUnit + Moq + FluentAssertions + FluentValidation. Most translations are mechanical. The interesting ones are the consensus voter (idiomatic in C# as a higher-order test method), the embedding-based persona check (DI'd through a `IEmbeddingProvider` interface), and the YAML loader (`YamlDotNet` with the same Pydantic-style validation). The hard tradeoff at the end is whether to run the harness in-process via `WebApplicationFactory` (faster, sees internals) or out-of-process as a black-box client (slower, more realistic).

## Mapping table

|Python|C# equivalent|Library|
|-|-|-|
|`assert_mentions`|Custom Moq matcher + `FluentAssertions.Should().Contain`|FluentAssertions|
|`assert_does_not_mention`|`Should().NotContainAny`|FluentAssertions|
|`assert_stays_in_character`|Embedding similarity via injected `IEmbeddingProvider`|Custom interface, Moq for tests|
|`assert_latency_p95`|`[Theory]` with inline data, sorted percentile|xUnit + FluentAssertions|
|`assert_language_consistency`|Per-language loop, `MultiLanguageValidator` via FluentValidation|FluentValidation|
|`consensus()` higher-order|`ConsensusFact` test method extension|xUnit + custom attribute|
|`load_scenario` YAML|`YamlDotNet.Serialization.Deserializer` + FluentValidation|YamlDotNet + FluentValidation|

## 1. `assert_mentions`

### Python

```python
def assert_mentions(response: str, terms: list[str]) -> AssertionResult:
    body = response.lower()
    missing = [t for t in terms if t.lower() not in body]
    return AssertionResult(
        name="mentions",
        passed=not missing,
        detail=f"missing: {missing}" if missing else "all terms present",
    )
```

### C#

```csharp
using FluentAssertions;
using FluentAssertions.Execution;

public static class DialogAssertions
{
    public static AssertionResult AssertMentions(string response, IEnumerable<string> terms)
    {
        var body = response.ToLowerInvariant();
        var missing = terms
            .Where(t => !body.Contains(t.ToLowerInvariant(), StringComparison.Ordinal))
            .ToList();

        return new AssertionResult(
            Name: "mentions",
            Passed: missing.Count == 0,
            Detail: missing.Count == 0
                ? "all terms present"
                : $"missing: [{string.Join(", ", missing)}]");
    }
}

// In a test:
[Fact]
public async Task DifficultAirway_FirstProbe_MentionsDifficultAirway()
{
    var response = await _dialog.SendUtteranceAsync("Have you had trouble being put to sleep?");
    var result = DialogAssertions.AssertMentions(response.Text, new[] { "difficult airway" });
    result.Passed.Should().BeTrue(result.Detail);
}
```

**Translation note:** Python's substring containment is one expression. C#'s is two — `.ToLowerInvariant()` and `Contains(..., StringComparison.Ordinal)`. The `StringComparison` parameter matters because case-insensitive culture-sensitive comparison can match Turkish 'i' to ASCII 'i' inconsistently across runners. Always pin to `Ordinal` after lowercasing for tests.

## 2. `assert_does_not_mention`

### Python

```python
def assert_does_not_mention(response: str, banned: list[str]) -> AssertionResult:
    body = response.lower()
    hits = [b for b in banned if b.lower() in body]
    return AssertionResult(name="does_not_mention", passed=not hits, ...)
```

### C#

```csharp
public static AssertionResult AssertDoesNotMention(
    string response,
    IEnumerable<string> banned)
{
    var body = response.ToLowerInvariant();
    var hits = banned
        .Where(b => body.Contains(b.ToLowerInvariant(), StringComparison.Ordinal))
        .ToList();

    return new AssertionResult(
        Name: "does_not_mention",
        Passed: hits.Count == 0,
        Detail: hits.Count == 0 ? "clean" : $"banned hits: [{string.Join(", ", hits)}]");
}
```

You can also bake this into a Moq matcher when the LLM client is mocked:

```csharp
_llmClient
    .Setup(x => x.CompleteAsync(It.Is<string>(prompt =>
        bannedTerms.All(b => !prompt.Contains(b, StringComparison.OrdinalIgnoreCase)))))
    .ReturnsAsync("clean response");
```

`It.Is<string>(predicate)` is the Moq idiom for "match any string that satisfies this predicate". It's the right place for hallucination guards on the **input** to the LLM — but for the **output**, keep the assertion in the test body where it's visible.

## 3. `assert_stays_in_character`

This is the one that actually has design content in the translation, because the Python version uses sentence-transformers with a TF-IDF fallback. The C# version doesn't have a clean drop-in for sentence-transformers — you call out to an embedding service.

### Python

```python
def assert_stays_in_character(response: str, persona: str, threshold: float = 0.05):
    score = embeddings.similarity(persona, response)
    return AssertionResult(
        name="stays_in_character",
        passed=score >= threshold,
        detail=f"similarity={score:.3f} threshold={threshold}",
    )
```

### C#

```csharp
public interface IEmbeddingProvider
{
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
}

public sealed class AzureOpenAiEmbeddingProvider : IEmbeddingProvider
{
    private readonly OpenAIClient _client;
    public AzureOpenAiEmbeddingProvider(OpenAIClient client) => _client = client;

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var resp = await _client.GetEmbeddingsAsync(
            new EmbeddingsOptions("text-embedding-3-small", new[] { text }), ct);
        return resp.Value.Data[0].Embedding.ToArray();
    }
}

public static class CosineSimilarity
{
    public static double Score(float[] a, float[] b)
    {
        if (a.Length != b.Length) throw new ArgumentException("dim mismatch");
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.Length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
        return dot / (Math.Sqrt(na) * Math.Sqrt(nb) + 1e-12);
    }
}

public sealed class CharacterAssertion
{
    private readonly IEmbeddingProvider _embed;
    public CharacterAssertion(IEmbeddingProvider embed) => _embed = embed;

    public async Task<AssertionResult> AssertStaysInCharacterAsync(
        string response, string persona, double threshold = 0.30)
    {
        if (string.IsNullOrWhiteSpace(response) || string.IsNullOrWhiteSpace(persona))
            return new AssertionResult("stays_in_character", false, "empty input");

        var rEmb = await _embed.EmbedAsync(response);
        var pEmb = await _embed.EmbedAsync(persona);
        var score = CosineSimilarity.Score(rEmb, pEmb);

        return new AssertionResult(
            Name: "stays_in_character",
            Passed: score >= threshold,
            Detail: $"similarity={score:F3} threshold={threshold:F2}");
    }
}
```

**Mocking in tests:**

```csharp
[Fact]
public async Task StaysInCharacter_PassesWhenSimilarityAboveThreshold()
{
    var embed = new Mock<IEmbeddingProvider>();
    embed.Setup(x => x.EmbedAsync(It.IsAny<string>(), default))
         .ReturnsAsync((string s, CancellationToken _) =>
             s.Contains("anxious") ? new[] { 1f, 0f, 0f } : new[] { 0.95f, 0.05f, 0.1f });

    var sut = new CharacterAssertion(embed.Object);
    var result = await sut.AssertStaysInCharacterAsync(
        response: "I'm a bit anxious about it.",
        persona: "Anxious 65yo with OSA, soft-spoken.");
    result.Passed.Should().BeTrue();
}
```

**Translation note:** The Python default threshold is 0.05 because the TF-IDF fallback produces tiny scores on short responses. The C# version assumes a real embedding model (text-embedding-3-small or similar) and bumps the default to 0.30. The Python harness comment in `assertions.py` calls this out explicitly. **Threshold is a property of the embedding backend, not of the assertion.** A mixed-backend setup must test thresholds per backend.

## 4. `assert_latency_p95`

### Python

```python
def assert_latency_p95(latencies_ms: list[int], ceiling_ms: int):
    ordered = sorted(latencies_ms)
    n = len(ordered)
    rank = 0.95 * (n - 1)
    lo = int(rank)
    hi = min(lo + 1, n - 1)
    frac = rank - lo
    p95 = ordered[lo] + (ordered[hi] - ordered[lo]) * frac
    return AssertionResult(name="latency_p95", passed=p95 <= ceiling_ms, ...)
```

### C#

```csharp
public static class LatencyAssertions
{
    public static AssertionResult AssertP95Below(IReadOnlyList<int> latenciesMs, int ceilingMs)
    {
        if (latenciesMs.Count == 0)
            return new AssertionResult("latency_p95", false, "no samples");

        var ordered = latenciesMs.OrderBy(x => x).ToArray();
        var n = ordered.Length;
        var rank = 0.95 * (n - 1);
        var lo = (int)rank;
        var hi = Math.Min(lo + 1, n - 1);
        var frac = rank - lo;
        var p95 = (int)Math.Round(ordered[lo] + (ordered[hi] - ordered[lo]) * frac);

        return new AssertionResult(
            Name: "latency_p95",
            Passed: p95 <= ceilingMs,
            Detail: $"p95={p95}ms ceiling={ceilingMs}ms n={latenciesMs.Count}");
    }
}

// Used as a Theory:
[Theory]
[InlineData(2500, new[] { 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 2400 })]
[InlineData(2500, new[] { 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 2000 })]
public void P95_BelowCeiling(int ceiling, int[] samples)
{
    var result = LatencyAssertions.AssertP95Below(samples, ceiling);
    result.Passed.Should().BeTrue(result.Detail);
}
```

**Translation note:** The percentile algorithm matches numpy's `linear` interpolation (the default for `np.percentile`). Other percentile algorithms — Excel's `PERCENTILE.EXC`, R's type 6, the nearest-rank method — produce different numbers on small samples. **Pick one and document it**; do not let "p95" mean different things in different test files. The Python and C# versions here use the same algorithm so cross-validation is meaningful.

## 5. `assert_language_consistency`

### Python

```python
def assert_language_consistency(responses_by_lang, keyword_translations):
    failures = []
    for anchor, by_lang in keyword_translations.items():
        for lang, response in responses_by_lang.items():
            term = by_lang.get(lang, anchor)
            if term.lower() not in response.lower():
                failures.append(f"{lang} missing '{term}' for anchor '{anchor}'")
    return AssertionResult(name="language_consistency", passed=not failures, ...)
```

### C# (with FluentValidation)

```csharp
public sealed record MultilingualResponses(
    Dictionary<string, string> ResponsesByLang,
    Dictionary<string, Dictionary<string, string>> KeywordTranslations);

public sealed class MultilingualValidator : AbstractValidator<MultilingualResponses>
{
    public MultilingualValidator()
    {
        RuleFor(x => x).Custom((m, ctx) =>
        {
            foreach (var (anchor, byLang) in m.KeywordTranslations)
            foreach (var (lang, response) in m.ResponsesByLang)
            {
                var term = byLang.GetValueOrDefault(lang, anchor);
                if (!response.Contains(term, StringComparison.OrdinalIgnoreCase))
                    ctx.AddFailure($"{lang} missing '{term}' for anchor '{anchor}'");
            }
        });
    }
}

// Test usage:
[Fact]
public void LanguageConsistency_AllAnchorsPresent()
{
    var data = new MultilingualResponses(
        ResponsesByLang: new() { ["en"] = "I have sleep apnea.", ["fr"] = "J'ai l'apnée du sommeil." },
        KeywordTranslations: new() { ["sleep apnea"] = new() { ["en"] = "sleep apnea", ["fr"] = "apnée du sommeil" } });

    var result = new MultilingualValidator().Validate(data);
    result.IsValid.Should().BeTrue(string.Join("; ", result.Errors));
}
```

**Translation note:** FluentValidation is overkill for a one-rule assertion. It earns its place when scenarios grow validation rules — "the response in French must use formal `vous`, not `tu`", "the response in Spanish must use clinical `usted`". Each becomes a `RuleFor` and the validator composes them.

## 6. `consensus()` higher-order assertion

The Python version takes a callable. The C# idiom is either a higher-order method or a custom xUnit attribute.

### Python

```python
@consensus_decorator(runs=5, threshold=4)
def check():
    return assert_mentions(model.complete("..."), ["pulse"])
```

### C# — higher-order method

```csharp
public static class Consensus
{
    public static async Task<ConsensusOutcome> RunAsync(
        Func<Task<AssertionResult>> assertion,
        int runs = 5,
        int threshold = 4,
        string? name = null,
        CancellationToken ct = default)
    {
        if (runs < 1) throw new ArgumentOutOfRangeException(nameof(runs));
        if (threshold < 1 || threshold > runs)
            throw new ArgumentOutOfRangeException(nameof(threshold));

        var perRun = new List<AssertionResult>(runs);
        for (int i = 0; i < runs; i++)
        {
            ct.ThrowIfCancellationRequested();
            perRun.Add(await assertion());
        }

        var passCount = perRun.Count(r => r.Passed);
        var passed = passCount >= threshold;
        var label = name ?? perRun.FirstOrDefault()?.Name ?? "consensus";

        return new ConsensusOutcome(
            Name: $"{label}@{threshold}of{runs}",
            Passed: passed,
            Runs: runs,
            Threshold: threshold,
            PassCount: passCount,
            Detail: $"{passCount}/{runs} runs passed (need {threshold})",
            PerRun: perRun);
    }
}

// Test:
[Fact]
public async Task DifficultAirway_StaysInCharacter_4of5()
{
    var outcome = await Consensus.RunAsync(
        runs: 5, threshold: 4,
        assertion: async () =>
        {
            var resp = await _dialog.SendUtteranceAsync("Have you had trouble before?");
            return DialogAssertions.AssertMentions(resp.Text, new[] { "difficult airway" });
        });
    outcome.Passed.Should().BeTrue(outcome.Detail);
}
```

### C# — custom attribute (more declarative, more magic)

```csharp
public class ConsensusFactAttribute : FactAttribute
{
    public int Runs { get; set; } = 5;
    public int Threshold { get; set; } = 4;
}

[ConsensusFact(Runs = 5, Threshold = 4)]
public async Task PatientStaysInCharacter() { ... }
```

The attribute version reads nicer at the call site but requires a custom `IXunitTestRunner` implementation, which is non-trivial. **Default to the higher-order method** until a team owns the attribute infrastructure.

## 7. Scenario YAML loader

### Python (Pydantic)

```python
class Scenario(BaseModel):
    id: str
    title: str
    patient: str
    learner_objectives: list[str]
    probes: list[Probe]
    latency_budget_ms: int = 2500
    languages: list[str] = Field(default_factory=lambda: ["en"])

def load_scenario(path):
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return Scenario.model_validate(raw)
```

### C# (YamlDotNet + FluentValidation)

```csharp
public sealed record Probe(
    string Prompt,
    List<string> MustMention,
    List<string> MustNotMention,
    bool PersonaCheck);

public sealed record Scenario(
    string Id,
    string Title,
    string Patient,
    List<string> LearnerObjectives,
    List<Probe> Probes,
    int LatencyBudgetMs = 2500,
    List<string>? Languages = null);

public sealed class ScenarioValidator : AbstractValidator<Scenario>
{
    public ScenarioValidator()
    {
        RuleFor(s => s.Id).NotEmpty();
        RuleFor(s => s.Title).NotEmpty();
        RuleFor(s => s.Probes).NotEmpty().WithMessage("scenario must define at least one probe");
        RuleForEach(s => s.Probes).ChildRules(p =>
        {
            p.RuleFor(x => x.Prompt).NotEmpty();
        });
    }
}

public static class ScenarioLoader
{
    private static readonly IDeserializer _deserializer = new DeserializerBuilder()
        .WithNamingConvention(UnderscoredNamingConvention.Instance)
        .IgnoreUnmatchedProperties()
        .Build();

    public static Scenario Load(string path)
    {
        var text = File.ReadAllText(path);
        var scenario = _deserializer.Deserialize<Scenario>(text);
        var result = new ScenarioValidator().Validate(scenario);
        if (!result.IsValid)
            throw new InvalidDataException(string.Join("; ", result.Errors));
        return scenario;
    }
}
```

**Translation note:** Pydantic validates on construction. YamlDotNet doesn't — you have to run the validator manually. Wrap both in a `Load` method so the call site sees one symbol. Don't trust YAML files at runtime; always validate.

## 8. When to write this in C# instead of Python

This is the actual design question, not a translation question. Two approaches exist, with different test pyramids.

### Approach A — In-process via `WebApplicationFactory`

The harness becomes a C# test project that boots ASP.NET Core in-process and drives the dialogue surface through the typed gRPC client. Pros: shares fixtures with existing xUnit suite, sees internal state via DI overrides, runs in milliseconds.

```csharp
public class HarnessFixture : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            // Replace the live LLM client with a deterministic mock
            services.AddSingleton<ILlmClient, MockLlmClient>();
        });
    }
}

public class DialogTests : IClassFixture<HarnessFixture>
{
    private readonly DialogueService.DialogueServiceClient _client;
    public DialogTests(HarnessFixture f) =>
        _client = new DialogueService.DialogueServiceClient(f.CreateGrpcChannel());

    [Fact]
    public async Task DifficultAirway_FirstProbe() { ... }
}
```

### Approach B — Out-of-process black-box client

The harness is a standalone process that hits the deployed gRPC surface over the network. Pros: tests the real wire path including auth, telemetry, network failure modes; agnostic to backend language; can run against any environment (PR ephemeral, staging, prod-shadow).

### Recommendation

**Both, at different layers of the test pyramid.**

- In-process via `WebApplicationFactory` for the unit + integration tier — fast, deterministic, runs on every PR.
- Out-of-process black-box for the system tier — slower, runs against deployed envs, catches the auth + transport + telemetry bugs the in-process version is structurally blind to.

The Python harness in this repo is the prototype for the out-of-process tier specifically. If Lumeto's team adopts it, the natural port is C# black-box (so it shares Moq + FluentAssertions with the existing test code) plus a new `WebApplicationFactory`-based in-process suite that reuses the same scenario YAML files.

See [ADR-005](./adr/ADR-005-python-prototype-vs-csharp-production.md) for the long-form rationale on why Python first.
