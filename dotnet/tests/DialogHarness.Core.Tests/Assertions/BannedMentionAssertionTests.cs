using DialogHarness.Core.Assertions;
using DialogHarness.Core.LLM;
using FluentAssertions;
using Xunit;

namespace DialogHarness.Core.Tests.Assertions;

public class BannedMentionAssertionTests
{
    private static LlmResponse Resp(string text) => new(text, "en", 100, "mock-1.0");

    [Fact]
    public void Fails_when_banned_term_present()
    {
        var assertion = new BannedMentionAssertion(new[] { "fictomycin" });
        assertion.Evaluate(Resp("They gave me fictomycin once.")).Passed.Should().BeFalse();
    }

    [Fact]
    public void Passes_when_clean()
    {
        var assertion = new BannedMentionAssertion(new[] { "fictomycin" });
        assertion.Evaluate(Resp("They gave me cefazolin once.")).Passed.Should().BeTrue();
    }

    [Fact]
    public void Fuzzy_catches_misspellings()
    {
        var assertion = new BannedMentionAssertion(new[] { "fictomycin" }, fuzzy: true, fuzzyDistance: 1);
        var result = assertion.Evaluate(Resp("They gave me fictomicin once."));
        result.Passed.Should().BeFalse();
        result.Diagnostics!["matched"].Should().Be("fictomycin");
    }

    [Fact]
    public void Fuzzy_off_by_default_misses_misspellings()
    {
        var assertion = new BannedMentionAssertion(new[] { "fictomycin" });
        assertion.Evaluate(Resp("fictomicin")).Passed.Should().BeTrue();
    }

    [Fact]
    public void Empty_banned_list_passes()
    {
        var assertion = new BannedMentionAssertion(Array.Empty<string>());
        assertion.Evaluate(Resp("anything goes")).Passed.Should().BeTrue();
    }
}
