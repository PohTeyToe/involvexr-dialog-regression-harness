using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace DialogHarness.Core.LLM;

/// <summary>
/// Real Anthropic Messages API client. Wired up but not used in tests by default
/// (tests inject MockLLMClient via the DI container). Kept thin on purpose so it
/// can be swapped for the official SDK without touching call sites.
/// </summary>
public sealed class AnthropicLLMClient : ILLMClient
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _model;

    public AnthropicLLMClient(HttpClient http, string apiKey, string model = "claude-3-5-sonnet-latest")
    {
        _http = http ?? throw new ArgumentNullException(nameof(http));
        _apiKey = apiKey ?? throw new ArgumentNullException(nameof(apiKey));
        _model = model;
    }

    public async Task<LlmResponse> CompleteAsync(LlmRequest request, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var payload = new MessagesRequest
        {
            Model = _model,
            MaxTokens = request.MaxTokens,
            System = request.SystemPrompt,
            Messages = new[] { new Message("user", request.UserPrompt) }
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = JsonContent.Create(payload)
        };
        msg.Headers.Add("x-api-key", _apiKey);
        msg.Headers.Add("anthropic-version", "2023-06-01");

        using var response = await _http.SendAsync(msg, ct).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<MessagesResponse>(ct).ConfigureAwait(false)
                   ?? throw new InvalidOperationException("Empty response from Anthropic");
        sw.Stop();

        var text = body.Content.FirstOrDefault()?.Text ?? string.Empty;
        return new LlmResponse(text, request.Language, sw.ElapsedMilliseconds, _model);
    }

    private sealed record Message(string Role, string Content);

    private sealed class MessagesRequest
    {
        [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;
        [JsonPropertyName("max_tokens")] public int MaxTokens { get; set; }
        [JsonPropertyName("system")] public string? System { get; set; }
        [JsonPropertyName("messages")] public Message[] Messages { get; set; } = Array.Empty<Message>();
    }

    private sealed class MessagesResponse
    {
        [JsonPropertyName("content")] public List<ContentBlock> Content { get; set; } = new();
    }

    private sealed class ContentBlock
    {
        [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
        [JsonPropertyName("text")] public string Text { get; set; } = string.Empty;
    }
}
