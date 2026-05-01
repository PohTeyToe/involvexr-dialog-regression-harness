using DialogHarness.Core.Assertions;
using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;
using FluentAssertions;
using Moq;
using Xunit;

namespace DialogHarness.Core.Tests.Assertions;

public class PersonaConsistencyAssertionTests
{
    private static LlmResponse Resp(string text) => new(text, "en", 100, "mock-1.0");

    [Fact]
    public void Passes_when_response_aligns_with_persona()
    {
        var persona = "65 year old male, anxious, soft spoken, sleep apnea, difficult airway";
        var assertion = new PersonaConsistencyAssertion(persona, new HashingEmbeddingProvider(), threshold: 0.05);
        var result = assertion.Evaluate(Resp("I am 65 with sleep apnea and an anxious history of difficult airway"));
        result.Passed.Should().BeTrue();
        result.Score.Should().BeGreaterThan(0.05);
    }

    [Fact]
    public void Fails_when_threshold_high_and_no_overlap()
    {
        var persona = "anxious soft spoken patient";
        var assertion = new PersonaConsistencyAssertion(persona, new HashingEmbeddingProvider(), threshold: 0.99);
        assertion.Evaluate(Resp("kubernetes microservices reactive streams")).Passed.Should().BeFalse();
    }

    [Fact]
    public void Threshold_value_is_surfaced_in_diagnostics()
    {
        var mock = new Mock<IEmbeddingProvider>();
        mock.Setup(m => m.CosineSimilarity(It.IsAny<string>(), It.IsAny<string>())).Returns(0.5);
        var assertion = new PersonaConsistencyAssertion("persona", mock.Object, threshold: 0.4);
        var result = assertion.Evaluate(Resp("hi"));
        result.Diagnostics!["threshold"].Should().Be(0.4);
        result.Diagnostics["similarity"].Should().Be(0.5);
    }
}
