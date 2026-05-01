using DialogHarness.Core.LLM;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace DialogHarness.Api.Tests;

/// <summary>
/// Custom WebApplicationFactory&lt;Program&gt; that:
///  1. Points the API at the test bin's bundled scenarios/ folder
///  2. Replaces the real ILLMClient with a Moq-controllable mock
///
/// Pattern: tests use Fixture.LlmMock to script per-test responses; everything else
/// (DI, FluentValidation, routing, JSON) goes through the real ASP.NET Core pipeline.
/// </summary>
public sealed class ApiTestFixture : WebApplicationFactory<Program>
{
    public Mock<ILLMClient> LlmMock { get; } = new();

    public ApiTestFixture()
    {
        // Default behaviour: every prompt yields a response that satisfies the
        // happy-path scenarios shipped in /scenarios. Individual tests override.
        LlmMock.Setup(c => c.CompleteAsync(It.IsAny<LlmRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((LlmRequest req, CancellationToken _) =>
            {
                var lower = req.UserPrompt.ToLowerInvariant();
                // Order matters: more specific phrases first.
                var text = lower.Contains("put to sleep") || lower.Contains("intubation") || lower.Contains("anaesthesia")
                        ? "They warned me about a difficult airway during my last intubation."
                    : lower.Contains("breathing at night") || lower.Contains("sleep apnea") || lower.Contains("at night")
                        ? "I have sleep apnea and labored breathing at night."
                    : lower.Contains("breath")
                        ? "I have labored breathing and stridor right now."
                    : lower.Contains("tilt") || lower.Contains("head") || lower.Contains("neck")
                        ? "My neck is stiff and limited; I cannot extend it."
                    : lower.Contains("news") || lower.Contains("diagnosis")
                        ? "Please be honest with me about the news and diagnosis."
                    : lower.Contains("child") || lower.Contains("pediatric") || lower.Contains("compression")
                        ? "Beginning compressions on the child now."
                    : "I am the patient. Could you ask that again?";
                return new LlmResponse(text, req.Language, 120, "mock-1.0");
            });
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var scenariosDir = Path.Combine(AppContext.BaseDirectory, "scenarios");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Scenarios:Directory"] = scenariosDir
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Replace the real LLM client with the mock.
            var existing = services.Where(s => s.ServiceType == typeof(ILLMClient)).ToList();
            foreach (var d in existing) services.Remove(d);
            services.AddSingleton<ILLMClient>(_ => LlmMock.Object);
        });
    }
}
