using System.Collections.Concurrent;
using System.Diagnostics;
using DialogHarness.Api.Models;
using DialogHarness.Core.Assertions;
using DialogHarness.Core.Consensus;
using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;
using DialogHarness.Core.Scenarios;
using FluentValidation;

namespace DialogHarness.Api.Endpoints;

public static class RunsEndpoint
{
    private static readonly ConcurrentDictionary<string, RunResponse> _runs = new();

    public static IEndpointRouteBuilder MapRunEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/runs");

        group.MapPost("", async (
            RunRequest request,
            IValidator<RunRequest> validator,
            ScenarioLoader loader,
            ILLMClient llm,
            IEmbeddingProvider embeddings,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToDictionary());
            }

            var dir = ScenariosEndpoint.ResolveScenariosDirectory(config);
            var all = await loader.LoadAllFromDirectoryAsync(dir, ct);
            var scenario = all.FirstOrDefault(s =>
                string.Equals(s.Id, request.ScenarioId, StringComparison.OrdinalIgnoreCase));
            if (scenario is null)
            {
                return Results.NotFound(new { error = $"Scenario '{request.ScenarioId}' not found" });
            }

            var sw = Stopwatch.StartNew();
            var consensus = new ConsensusRunner();
            var summaries = new List<AssertionSummary>();
            int passedProbes = 0;

            foreach (var probe in scenario.Probes)
            {
                var assertion = new SemanticMentionAssertion(probe.MustMention, embeddings);
                var result = await consensus.RunWithConsensusAsync(
                    async ct => await llm.CompleteAsync(
                        new LlmRequest(scenario.Patient, probe.Prompt, request.Language), ct),
                    assertion,
                    request.ConsensusRuns,
                    request.ConsensusThreshold,
                    ct);

                if (result.Passed) passedProbes++;
                summaries.Add(new AssertionSummary(
                    Name: $"{assertion.Name}({probe.Prompt[..Math.Min(40, probe.Prompt.Length)]})",
                    Passed: result.Passed,
                    Message: $"{result.PassedCount}/{result.Runs} runs passed (threshold {result.Threshold})",
                    Score: result.Runs == 0 ? 0 : (double)result.PassedCount / result.Runs));
            }

            sw.Stop();
            var runId = Guid.NewGuid().ToString("N");
            var response = new RunResponse(
                RunId: runId,
                ScenarioId: scenario.Id,
                Status: passedProbes == scenario.Probes.Count ? "passed" : "failed",
                Probes: scenario.Probes.Count,
                PassedProbes: passedProbes,
                Assertions: summaries,
                DurationMs: sw.ElapsedMilliseconds);

            _runs[runId] = response;
            return Results.Created($"/api/runs/{runId}", response);
        }).WithName("CreateRun");

        group.MapGet("/{id}", (string id) =>
        {
            return _runs.TryGetValue(id, out var run) ? Results.Ok(run) : Results.NotFound();
        }).WithName("GetRun");

        return app;
    }
}
