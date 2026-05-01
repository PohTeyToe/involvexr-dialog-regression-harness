using DialogHarness.Core.Assertions;
using DialogHarness.Core.Consensus;
using DialogHarness.Core.LLM;
using FluentAssertions;
using Moq;
using Xunit;

namespace DialogHarness.Core.Tests.Assertions;

public class ConsensusRunnerTests
{
    private static LlmResponse R(string text) => new(text, "en", 100, "mock");

    [Fact]
    public async Task Passes_when_threshold_met()
    {
        var runner = new ConsensusRunner();
        var assertion = new Mock<IAssertion>();
        assertion.SetupGet(a => a.Name).Returns("X");
        var seq = assertion.SetupSequence(a => a.Evaluate(It.IsAny<LlmResponse>()));
        seq.Returns(new AssertionResult(true, "X", "ok"))
           .Returns(new AssertionResult(true, "X", "ok"))
           .Returns(new AssertionResult(true, "X", "ok"))
           .Returns(new AssertionResult(true, "X", "ok"))
           .Returns(new AssertionResult(false, "X", "no"));

        var result = await runner.RunWithConsensusAsync(
            _ => Task.FromResult(R("anything")),
            assertion.Object, runs: 5, threshold: 4);

        result.Passed.Should().BeTrue();
        result.PassedCount.Should().Be(4);
        result.PerRun.Should().HaveCount(5);
    }

    [Fact]
    public async Task Fails_when_threshold_not_met()
    {
        var runner = new ConsensusRunner();
        var assertion = new Mock<IAssertion>();
        var seq = assertion.SetupSequence(a => a.Evaluate(It.IsAny<LlmResponse>()));
        seq.Returns(new AssertionResult(true, "X", "ok"))
           .Returns(new AssertionResult(true, "X", "ok"))
           .Returns(new AssertionResult(false, "X", "no"))
           .Returns(new AssertionResult(false, "X", "no"))
           .Returns(new AssertionResult(false, "X", "no"));

        var result = await runner.RunWithConsensusAsync(
            _ => Task.FromResult(R("anything")),
            assertion.Object, runs: 5, threshold: 4);

        result.Passed.Should().BeFalse();
        result.PassedCount.Should().Be(2);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(5, 0)]
    [InlineData(5, 6)]
    public async Task Throws_on_invalid_thresholds(int runs, int threshold)
    {
        var runner = new ConsensusRunner();
        var assertion = new Mock<IAssertion>();
        Func<Task> act = () => runner.RunWithConsensusAsync(
            _ => Task.FromResult(R("x")),
            assertion.Object, runs, threshold);
        await act.Should().ThrowAsync<ArgumentOutOfRangeException>();
    }

    [Fact]
    public async Task Calls_probe_runner_n_times()
    {
        var runner = new ConsensusRunner();
        int calls = 0;
        var assertion = new Mock<IAssertion>();
        assertion.Setup(a => a.Evaluate(It.IsAny<LlmResponse>()))
            .Returns(new AssertionResult(true, "X", "ok"));

        await runner.RunWithConsensusAsync(_ =>
        {
            Interlocked.Increment(ref calls);
            return Task.FromResult(R("x"));
        }, assertion.Object, runs: 7, threshold: 1);

        calls.Should().Be(7);
    }
}
