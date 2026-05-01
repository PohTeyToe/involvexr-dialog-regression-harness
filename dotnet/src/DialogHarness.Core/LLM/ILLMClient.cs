namespace DialogHarness.Core.LLM;

public sealed record LlmRequest(
    string SystemPrompt,
    string UserPrompt,
    string Language = "en",
    int MaxTokens = 512);

public sealed record LlmResponse(
    string Text,
    string Language,
    long LatencyMs,
    string Model);

public interface ILLMClient
{
    Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default);
}
