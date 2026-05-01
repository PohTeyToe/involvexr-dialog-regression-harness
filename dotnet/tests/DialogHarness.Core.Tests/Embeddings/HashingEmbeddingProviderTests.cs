using DialogHarness.Core.Embeddings;
using FluentAssertions;
using Xunit;

namespace DialogHarness.Core.Tests.Embeddings;

public class HashingEmbeddingProviderTests
{
    [Fact]
    public void Identical_strings_have_similarity_one()
    {
        var p = new HashingEmbeddingProvider();
        p.CosineSimilarity("sleep apnea diagnosis", "sleep apnea diagnosis")
            .Should().BeApproximately(1.0, 1e-6);
    }

    [Fact]
    public void Disjoint_strings_have_low_similarity()
    {
        var p = new HashingEmbeddingProvider(512);
        var sim = p.CosineSimilarity("kubernetes microservice", "labored breathing stridor");
        sim.Should().BeLessThan(0.5);
    }

    [Fact]
    public void Empty_string_returns_zero_vector()
    {
        var p = new HashingEmbeddingProvider();
        var v = p.Embed("");
        v.Sum().Should().Be(0);
    }
}
