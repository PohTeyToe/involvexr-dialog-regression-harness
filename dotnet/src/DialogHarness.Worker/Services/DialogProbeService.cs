using DialogHarness.Core.Assertions;
using DialogHarness.Core.Consensus;
using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;
using DialogHarness.Core.Scenarios;

namespace DialogHarness.Worker.Services;

/// <summary>
/// Stub demonstrating how the harness would plug into a gRPC backend.
/// Today exposes a plain async method; in production this becomes a gRPC service
/// matching Lumeto's Cloud Services contract.
/// </summary>
public sealed class DialogProbeService
{
    private readonly ILLMClient _llm;
    private readonly IEmbeddingProvider _embeddings;
    private readonly ConsensusRunner _consensus = new();

    public DialogProbeService(ILLMClient llm, IEmbeddingProvider embeddings)
    {
        _llm = llm;
        _embeddings = embeddings;
    }

    public async Task<ConsensusResult> RunProbeAsync(
        Scenario scenario,
        Probe probe,
        int runs,
        int threshold,
        string language,
        CancellationToken ct)
    {
        var assertion = new SemanticMentionAssertion(probe.MustMention, _embeddings);
        return await _consensus.RunWithConsensusAsync(
            async c => await _llm.CompleteAsync(
                new LlmRequest(scenario.Patient, probe.Prompt, language), c),
            assertion, runs, threshold, ct);
    }
}
