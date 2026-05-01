using DialogHarness.Core.LLM;

namespace DialogHarness.Core.Assertions;

/// <summary>
/// Aggregates responses by language and verifies each language variant covers
/// the same clinical concepts. Use AddSample() per language, then Evaluate().
/// </summary>
public sealed class LanguageConsistencyAssertion : IAssertion
{
    private readonly IReadOnlyList<string> _expectedConcepts;
    private readonly Dictionary<string, List<string>> _samplesByLang = new();

    public LanguageConsistencyAssertion(IEnumerable<string> expectedConcepts)
    {
        _expectedConcepts = expectedConcepts.ToList();
    }

    public string Name => "LanguageConsistency";

    public void AddSample(LlmResponse response)
    {
        if (!_samplesByLang.TryGetValue(response.Language, out var list))
        {
            list = new List<string>();
            _samplesByLang[response.Language] = list;
        }
        list.Add(response.Text ?? string.Empty);
    }

    public AssertionResult Evaluate(LlmResponse response)
    {
        AddSample(response);

        if (_samplesByLang.Count <= 1)
        {
            return new AssertionResult(true, Name,
                $"Single language ({_samplesByLang.Keys.FirstOrDefault() ?? "none"}); skipping cross-language check");
        }

        var coverage = new Dictionary<string, int>();
        foreach (var (lang, samples) in _samplesByLang)
        {
            var combined = string.Join(" ", samples).ToLowerInvariant();
            var hits = _expectedConcepts.Count(c => combined.Contains(c.ToLowerInvariant()));
            coverage[lang] = hits;
        }

        var min = coverage.Values.Min();
        var max = coverage.Values.Max();
        var passed = min == max;
        return new AssertionResult(
            passed, Name,
            passed
                ? $"All languages cover {min}/{_expectedConcepts.Count} concepts"
                : $"Language drift: min={min} max={max}",
            _expectedConcepts.Count == 0 ? 1.0 : (double)min / _expectedConcepts.Count,
            coverage.ToDictionary(kv => kv.Key, kv => (object)kv.Value));
    }
}
