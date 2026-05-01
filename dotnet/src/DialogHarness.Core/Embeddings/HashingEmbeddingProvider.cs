using System.Text.RegularExpressions;

namespace DialogHarness.Core.Embeddings;

/// <summary>
/// Lightweight hashing bag-of-words embedding for offline demos.
/// Production swap target: Azure OpenAI text-embedding-3-small or Sentence Transformers.
/// Deterministic, no GPU, no model download.
/// </summary>
public sealed class HashingEmbeddingProvider : IEmbeddingProvider
{
    private readonly int _dimensions;

    public HashingEmbeddingProvider(int dimensions = 256)
    {
        if (dimensions <= 0) throw new ArgumentOutOfRangeException(nameof(dimensions));
        _dimensions = dimensions;
    }

    public float[] Embed(string text)
    {
        var vector = new float[_dimensions];
        if (string.IsNullOrWhiteSpace(text)) return vector;

        var tokens = Tokenize(text);
        foreach (var token in tokens)
        {
            var bucket = StableHash(token) % _dimensions;
            vector[bucket] += 1f;
        }

        Normalize(vector);
        return vector;
    }

    public double CosineSimilarity(string a, string b)
    {
        var va = Embed(a);
        var vb = Embed(b);
        double dot = 0;
        for (int i = 0; i < va.Length; i++) dot += va[i] * vb[i];
        return dot;
    }

    private static IEnumerable<string> Tokenize(string text) =>
        Regex.Split(text.ToLowerInvariant(), "[^a-z0-9]+")
            .Where(t => t.Length >= 2);

    private static int StableHash(string s)
    {
        unchecked
        {
            int hash = 23;
            foreach (var c in s) hash = hash * 31 + c;
            return Math.Abs(hash);
        }
    }

    private static void Normalize(float[] v)
    {
        double sum = 0;
        foreach (var x in v) sum += x * x;
        var norm = Math.Sqrt(sum);
        if (norm < 1e-9) return;
        for (int i = 0; i < v.Length; i++) v[i] = (float)(v[i] / norm);
    }
}
