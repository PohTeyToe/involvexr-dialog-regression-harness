using DialogHarness.Core.Scenarios;
using FluentAssertions;
using Xunit;

namespace DialogHarness.Core.Tests.Scenarios;

public class ScenarioLoaderTests
{
    private static string ScenariosDir =>
        Path.Combine(AppContext.BaseDirectory, "scenarios");

    [Fact]
    public void Throws_on_empty_yaml()
    {
        var loader = new ScenarioLoader();
        Action act = () => loader.LoadFromString("");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Parses_minimal_yaml()
    {
        var loader = new ScenarioLoader();
        var yaml = """
        id: test_v1
        title: Test scenario
        patient: A test patient.
        learner_objectives:
          - Recognize foo
        latency_budget_ms: 1500
        languages: [en]
        probes:
          - prompt: "Hello?"
            must_mention: ["hi"]
            must_not_mention: []
        """;
        var s = loader.LoadFromString(yaml);
        s.Id.Should().Be("test_v1");
        s.Probes.Should().HaveCount(1);
        s.Probes[0].MustMention.Should().Contain("hi");
    }

    [Fact]
    public async Task Loads_all_bundled_scenarios()
    {
        var loader = new ScenarioLoader();
        var scenarios = await loader.LoadAllFromDirectoryAsync(ScenariosDir);
        scenarios.Should().HaveCountGreaterOrEqualTo(3);
        scenarios.Select(s => s.Id).Should().Contain("difficult_airway_v1");
    }

    [Fact]
    public async Task Validator_accepts_loaded_scenarios()
    {
        var loader = new ScenarioLoader();
        var validator = new ScenarioValidator();
        var scenarios = await loader.LoadAllFromDirectoryAsync(ScenariosDir);

        foreach (var s in scenarios)
        {
            var result = validator.Validate(s);
            result.IsValid.Should().BeTrue($"{s.Id} should validate; errors: {string.Join("; ", result.Errors)}");
        }
    }

    [Fact]
    public void Validator_rejects_missing_id()
    {
        var validator = new ScenarioValidator();
        var s = new Scenario
        {
            Title = "x",
            Patient = "x",
            LatencyBudgetMs = 100,
            Languages = new() { "en" },
            Probes = new() { new Probe { Prompt = "hi", MustMention = new(), MustNotMention = new() } }
        };
        validator.Validate(s).IsValid.Should().BeFalse();
    }
}
