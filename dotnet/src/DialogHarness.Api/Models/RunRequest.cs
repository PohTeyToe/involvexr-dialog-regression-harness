namespace DialogHarness.Api.Models;

public sealed record RunRequest(
    string ScenarioId,
    int ConsensusRuns,
    int ConsensusThreshold,
    string Language = "en");

public sealed record AssertionSummary(
    string Name,
    bool Passed,
    string Message,
    double Score);

public sealed record RunResponse(
    string RunId,
    string ScenarioId,
    string Status,
    int Probes,
    int PassedProbes,
    IReadOnlyList<AssertionSummary> Assertions,
    long DurationMs);
