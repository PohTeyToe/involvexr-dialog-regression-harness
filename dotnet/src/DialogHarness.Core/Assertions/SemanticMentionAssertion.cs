using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;

namespace DialogHarness.Core.Assertions;

/// <summary>
/// Passes if at least one expected concept either appears literally OR has cosine
/// similarity above the threshold against the response text.
/// </summary>
public sealed class SemanticMentionAssertion : IAssertion
{
    private readonly IReadOnlyList<string> _expectedConcepts;
    private readonly IEmbeddingProvider _embeddings;
    private readonly double _similarityThreshold;

    public SemanticMentionAssertion(
        IEnumerable<string> expectedConcepts,
        IEmbeddingProvider embeddings,
        double similarityThreshold = 0.35)
    {
        _expectedConcepts = expectedConcepts.ToList();
        _embeddings = embeddings;
        _similarityThreshold = similarityThreshold;
    }

    public string Name => "SemanticMention";

    public AssertionResult Evaluate(LlmResponse response)
    {
        var text = response.Text ?? string.Empty;
        if (_expectedConcepts.Count == 0)
        {
            return new AssertionResult(true, Name, "No expected concepts", 1.0);
        }

        double bestScore = 0;
        string? bestConcept = null;
        foreach (var concept in _expectedConcepts)
        {
            if (text.Contains(concept, StringComparison.OrdinalIgnoreCase))
            {
                return new AssertionResult(
                    true, Name,
                    $"Literal match for '{concept}'",
                    1.0,
                    new Dictionary<string, object> { ["matched"] = concept });
            }
            var sim = _embeddings.CosineSimilarity(text, concept);
            if (sim > bestScore)
            {
                bestScore = sim;
                bestConcept = concept;
            }
        }

        var passed = bestScore >= _similarityThreshold;
        return new AssertionResult(
            passed, Name,
            passed
                ? $"Semantic match for '{bestConcept}' at {bestScore:F2}"
                : $"No literal or semantic match (best={bestScore:F2})",
            bestScore,
            new Dictionary<string, object>
            {
                ["bestConcept"] = bestConcept ?? string.Empty,
                ["bestScore"] = bestScore,
                ["threshold"] = _similarityThreshold
            });
    }
}
