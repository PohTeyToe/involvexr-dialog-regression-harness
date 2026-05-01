using System.Diagnostics;

namespace DialogHarness.Core.LLM;

/// <summary>
/// Deterministic offline LLM stand-in. Lets tests and demos run without network.
/// Responses are seeded by the user prompt hash so consensus tests can verify stability.
/// </summary>
public sealed class MockLLMClient : ILLMClient
{
    private readonly Dictionary<string, string> _scriptedResponses;
    private readonly string _defaultResponse;
    private readonly int _latencyJitterMs;

    public MockLLMClient(
        Dictionary<string, string>? scriptedResponses = null,
        string defaultResponse = "I am the patient. Could you ask that again?",
        int latencyJitterMs = 5)
    {
        _scriptedResponses = scriptedResponses ?? new Dictionary<string, string>();
        _defaultResponse = defaultResponse;
        _latencyJitterMs = latencyJitterMs;
    }

    public Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var text = ResolveResponse(request.UserPrompt);
        sw.Stop();
        var latency = sw.ElapsedMilliseconds + _latencyJitterMs;
        return Task.FromResult(new LlmResponse(text, request.Language, latency, "mock-1.0"));
    }

    private string ResolveResponse(string userPrompt)
    {
        foreach (var (key, value) in _scriptedResponses)
        {
            if (userPrompt.Contains(key, StringComparison.OrdinalIgnoreCase))
            {
                return value;
            }
        }
        return _defaultResponse;
    }
}
