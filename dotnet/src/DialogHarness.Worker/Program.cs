using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;
using DialogHarness.Core.Scenarios;
using DialogHarness.Worker.Services;

// Tiny console host that demonstrates the worker wiring without spinning up gRPC.
// In production this becomes a long-running gRPC service.
var loader = new ScenarioLoader();
var llm = new MockLLMClient();
var embeddings = new HashingEmbeddingProvider();
var probeService = new DialogProbeService(llm, embeddings);

var scenariosDir = Path.Combine(AppContext.BaseDirectory, "scenarios");
if (!Directory.Exists(scenariosDir))
{
    Console.WriteLine("DialogHarness.Worker stub started; no scenarios directory bundled.");
    return;
}

var scenarios = await loader.LoadAllFromDirectoryAsync(scenariosDir);
Console.WriteLine($"Loaded {scenarios.Count} scenarios. Worker stub ready for gRPC wiring.");
foreach (var s in scenarios)
{
    Console.WriteLine($"  - {s.Id}: {s.Probes.Count} probes, budget {s.LatencyBudgetMs}ms");
}
_ = probeService; // referenced
