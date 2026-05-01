using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace DialogHarness.Api.Tests;

public class HealthEndpointTests : IClassFixture<ApiTestFixture>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(ApiTestFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task Health_returns_200_with_status_ok()
    {
        var response = await _client.GetAsync("/api/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<HealthBody>();
        body!.Status.Should().Be("ok");
        body.Service.Should().Be("DialogHarness.Api");
    }

    private sealed record HealthBody(string Status, string Service, string Version);
}
