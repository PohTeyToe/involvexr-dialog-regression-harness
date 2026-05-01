using DialogHarness.Core.LLM;

namespace DialogHarness.Core.Assertions;

/// <summary>
/// Fails if any banned term appears in the response. Optional fuzzy matching
/// catches near-misses (e.g. "fictomicin" when banned term is "fictomycin").
/// </summary>
public sealed class BannedMentionAssertion : IAssertion
{
    private readonly IReadOnlyList<string> _bannedTerms;
    private readonly bool _fuzzy;
    private readonly int _fuzzyDistance;

    public BannedMentionAssertion(
        IEnumerable<string> bannedTerms,
        bool fuzzy = false,
        int fuzzyDistance = 1)
    {
        _bannedTerms = bannedTerms.ToList();
        _fuzzy = fuzzy;
        _fuzzyDistance = fuzzyDistance;
    }

    public string Name => "BannedMention";

    public AssertionResult Evaluate(LlmResponse response)
    {
        var text = (response.Text ?? string.Empty).ToLowerInvariant();
        if (_bannedTerms.Count == 0)
        {
            return new AssertionResult(true, Name, "No banned terms configured");
        }

        foreach (var banned in _bannedTerms)
        {
            var lower = banned.ToLowerInvariant();
            if (text.Contains(lower))
            {
                return new AssertionResult(
                    false, Name, $"Banned term '{banned}' present", 0.0,
                    new Dictionary<string, object> { ["matched"] = banned });
            }
            if (_fuzzy)
            {
                foreach (var word in text.Split(new[] { ' ', ',', '.', '!', '?', ';', ':' },
                             StringSplitOptions.RemoveEmptyEntries))
                {
                    if (Levenshtein(word, lower) <= _fuzzyDistance)
                    {
                        return new AssertionResult(
                            false, Name, $"Fuzzy banned match '{word}' ~= '{banned}'", 0.0,
                            new Dictionary<string, object>
                            {
                                ["matched"] = banned,
                                ["actual"] = word
                            });
                    }
                }
            }
        }

        return new AssertionResult(true, Name, "No banned terms detected");
    }

    private static int Levenshtein(string s, string t)
    {
        if (s == t) return 0;
        if (s.Length == 0) return t.Length;
        if (t.Length == 0) return s.Length;

        var prev = new int[t.Length + 1];
        var curr = new int[t.Length + 1];
        for (int j = 0; j <= t.Length; j++) prev[j] = j;

        for (int i = 1; i <= s.Length; i++)
        {
            curr[0] = i;
            for (int j = 1; j <= t.Length; j++)
            {
                var cost = s[i - 1] == t[j - 1] ? 0 : 1;
                curr[j] = Math.Min(Math.Min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            (prev, curr) = (curr, prev);
        }
        return prev[t.Length];
    }
}
