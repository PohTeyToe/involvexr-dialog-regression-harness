namespace DialogHarness.Core.Embeddings;

public interface IEmbeddingProvider
{
    float[] Embed(string text);
    double CosineSimilarity(string a, string b);
}
