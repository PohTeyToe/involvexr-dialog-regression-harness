using DialogHarness.Core.Assertions;
using DialogHarness.Core.LLM;
using FluentAssertions;
using Xunit;

namespace DialogHarness.Core.Tests.Assertions;

public class LatencyBudgetAssertionTests
{
    private static LlmResponse R(long ms) => new("text", "en", ms, "mock");

    [Fact]
    public void Passes_when_p95_below_budget()
    {
        var a = new LatencyBudgetAssertion(2500);
        for (int i = 0; i < 20; i++) a.Evaluate(R(1000));
        a.Evaluate(R(1500)).Passed.Should().BeTrue();
    }

    [Fact]
    public void Fails_when_p95_exceeds_budget()
    {
        var a = new LatencyBudgetAssertion(1000);
        for (int i = 0; i < 20; i++) a.Evaluate(R(2000));
        a.Evaluate(R(2500)).Passed.Should().BeFalse();
    }

    [Fact]
    public void Diagnostics_include_p95_and_budget()
    {
        var a = new LatencyBudgetAssertion(1500);
        var result = a.Evaluate(R(900));
        result.Diagnostics!["budgetMs"].Should().Be(1500L);
        result.Diagnostics["sampleCount"].Should().Be(1);
    }

    [Fact]
    public void Throws_on_zero_budget()
    {
        Action act = () => _ = new LatencyBudgetAssertion(0);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
