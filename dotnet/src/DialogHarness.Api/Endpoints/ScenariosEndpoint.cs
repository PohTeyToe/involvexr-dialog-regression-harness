using DialogHarness.Core.Scenarios;

namespace DialogHarness.Api.Endpoints;

public static class ScenariosEndpoint
{
    public static IEndpointRouteBuilder MapScenarioEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/scenarios");

        group.MapGet("", async (ScenarioLoader loader, IConfiguration config, CancellationToken ct) =>
        {
            var dir = ResolveScenariosDirectory(config);
            var scenarios = await loader.LoadAllFromDirectoryAsync(dir, ct);
            return Results.Ok(scenarios.Select(s => new
            {
                s.Id,
                s.Title,
                s.LatencyBudgetMs,
                s.Languages,
                ProbeCount = s.Probes.Count
            }));
        }).WithName("ListScenarios");

        group.MapGet("/{id}", async (string id, ScenarioLoader loader, IConfiguration config, CancellationToken ct) =>
        {
            var dir = ResolveScenariosDirectory(config);
            var scenarios = await loader.LoadAllFromDirectoryAsync(dir, ct);
            var match = scenarios.FirstOrDefault(s =>
                string.Equals(s.Id, id, StringComparison.OrdinalIgnoreCase));
            return match is null ? Results.NotFound() : Results.Ok(match);
        }).WithName("GetScenario");

        return app;
    }

    internal static string ResolveScenariosDirectory(IConfiguration config)
    {
        var configured = config["Scenarios:Directory"];
        if (!string.IsNullOrWhiteSpace(configured) && Directory.Exists(configured))
        {
            return configured;
        }
        var appBase = AppContext.BaseDirectory;
        var local = Path.Combine(appBase, "scenarios");
        if (Directory.Exists(local)) return local;
        var rel = Path.GetFullPath(Path.Combine(appBase, "..", "..", "..", "..", "..", "..", "scenarios"));
        return rel;
    }
}
