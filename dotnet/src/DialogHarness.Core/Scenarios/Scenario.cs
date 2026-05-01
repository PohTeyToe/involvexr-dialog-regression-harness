using YamlDotNet.Serialization;

namespace DialogHarness.Core.Scenarios;

/// <summary>
/// Mirrors the Pydantic Scenario model in the Python harness.
/// Drives both unit tests and the API.
/// </summary>
public sealed class Scenario
{
    [YamlMember(Alias = "id")]
    public string Id { get; set; } = string.Empty;

    [YamlMember(Alias = "title")]
    public string Title { get; set; } = string.Empty;

    [YamlMember(Alias = "patient")]
    public string Patient { get; set; } = string.Empty;

    [YamlMember(Alias = "learner_objectives")]
    public List<string> LearnerObjectives { get; set; } = new();

    [YamlMember(Alias = "latency_budget_ms")]
    public int LatencyBudgetMs { get; set; } = 2500;

    [YamlMember(Alias = "languages")]
    public List<string> Languages { get; set; } = new() { "en" };

    [YamlMember(Alias = "probes")]
    public List<Probe> Probes { get; set; } = new();
}
