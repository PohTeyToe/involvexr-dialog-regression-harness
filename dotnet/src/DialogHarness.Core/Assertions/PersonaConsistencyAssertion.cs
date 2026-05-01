using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;

namespace DialogHarness.Core.Assertions;

/// <summary>
/// Compares the response to the gold persona description via embedding similarity.
/// </summary>
public sealed class PersonaConsistencyAssertion : IAssertion
{
    private readonly string _goldPersona;
    private readonly IEmbeddingProvider _embeddings;
    private readonly double _threshold;

    public PersonaConsistencyAssertion(
        string goldPersona,
        IEmbeddingProvider embeddings,
        double threshold = 0.15)
    {
        _goldPersona = goldPersona;
        _embeddings = embeddings;
        _threshold = threshold;
    }

    public string Name => "PersonaConsistency";

    public AssertionResult Evaluate(LlmResponse response)
    {
        var sim = _embeddings.CosineSimilarity(_goldPersona, response.Text ?? string.Empty);
        var passed = sim >= _threshold;
        return new AssertionResult(
            passed, Name,
            passed
                ? $"Persona consistent (sim={sim:F2})"
                : $"Persona drift detected (sim={sim:F2} < {_threshold:F2})",
            sim,
            new Dictionary<string, object>
            {
                ["similarity"] = sim,
                ["threshold"] = _threshold
            });
    }
}
