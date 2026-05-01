using DialogHarness.Core.Assertions;
using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;
using FluentAssertions;
using Moq;
using Xunit;

namespace DialogHarness.Core.Tests.Assertions;

public class SemanticMentionAssertionTests
{
    private static LlmResponse Resp(string text) => new(text, "en", 100, "mock-1.0");

    [Fact]
    public void Passes_on_literal_match()
    {
        var assertion = new SemanticMentionAssertion(
            new[] { "sleep apnea" }, new HashingEmbeddingProvider());
        var result = assertion.Evaluate(Resp("Yes I have sleep apnea diagnosed five years ago."));
        result.Passed.Should().BeTrue();
        result.Score.Should().Be(1.0);
    }

    [Fact]
    public void Fails_when_no_concept_matches()
    {
        var assertion = new SemanticMentionAssertion(
            new[] { "sleep apnea" }, new HashingEmbeddingProvider(), similarityThreshold: 0.9);
        var result = assertion.Evaluate(Resp("Lovely weather today."));
        result.Passed.Should().BeFalse();
        result.Message.Should().Contain("No literal or semantic match");
    }

    [Fact]
    public void Empty_concepts_passes_trivially()
    {
        var assertion = new SemanticMentionAssertion(
            Array.Empty<string>(), new HashingEmbeddingProvider());
        assertion.Evaluate(Resp("anything")).Passed.Should().BeTrue();
    }

    [Fact]
    public void Uses_injected_embedding_provider_for_semantic_path()
    {
        var mock = new Mock<IEmbeddingProvider>();
        mock.Setup(e => e.CosineSimilarity(It.IsAny<string>(), It.IsAny<string>())).Returns(0.5);
        var assertion = new SemanticMentionAssertion(
            new[] { "totally-unrelated-concept-xyz" }, mock.Object, similarityThreshold: 0.4);
        var result = assertion.Evaluate(Resp("the quick brown fox"));
        result.Passed.Should().BeTrue();
        mock.Verify(e => e.CosineSimilarity(It.IsAny<string>(), It.IsAny<string>()), Times.AtLeastOnce);
    }

    [Theory]
    [InlineData("DIFFICULT AIRWAY")]
    [InlineData("difficult airway")]
    [InlineData("...difficult airway, yes.")]
    public void Match_is_case_insensitive(string text)
    {
        var assertion = new SemanticMentionAssertion(
            new[] { "difficult airway" }, new HashingEmbeddingProvider());
        assertion.Evaluate(Resp(text)).Passed.Should().BeTrue();
    }
}
