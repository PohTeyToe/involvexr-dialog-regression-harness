using DialogHarness.Core.Assertions;
using DialogHarness.Core.LLM;
using FluentAssertions;
using Xunit;

namespace DialogHarness.Core.Tests.Assertions;

public class LanguageConsistencyAssertionTests
{
    [Fact]
    public void Single_language_passes_trivially()
    {
        var a = new LanguageConsistencyAssertion(new[] { "sleep apnea" });
        var result = a.Evaluate(new LlmResponse("I have sleep apnea", "en", 50, "mock"));
        result.Passed.Should().BeTrue();
    }

    [Fact]
    public void Aligned_languages_pass()
    {
        var a = new LanguageConsistencyAssertion(new[] { "sleep apnea" });
        a.AddSample(new LlmResponse("I have sleep apnea", "en", 50, "mock"));
        a.AddSample(new LlmResponse("Tengo sleep apnea diagnosticada", "es", 50, "mock"));
        var final = a.Evaluate(new LlmResponse("J'ai sleep apnea", "fr", 50, "mock"));
        final.Passed.Should().BeTrue();
    }

    [Fact]
    public void Drift_between_languages_fails()
    {
        var a = new LanguageConsistencyAssertion(new[] { "sleep apnea" });
        a.AddSample(new LlmResponse("I have sleep apnea", "en", 50, "mock"));
        var final = a.Evaluate(new LlmResponse("Bonjour, ça va?", "fr", 50, "mock"));
        final.Passed.Should().BeFalse();
    }
}
