using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace DialogHarness.Api.Tests;

public class ScenariosEndpointTests : IClassFixture<ApiTestFixture>
{
    private readonly HttpClient _client;

    public ScenariosEndpointTests(ApiTestFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task List_returns_at_least_three_scenarios()
    {
        var response = await _client.GetAsync("/api/scenarios");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await response.Content.ReadFromJsonAsync<List<ScenarioSummary>>();
        list.Should().NotBeNull();
        list!.Should().HaveCountGreaterOrEqualTo(3);
        list.Select(s => s.Id).Should().Contain("difficult_airway_v1");
    }

    [Fact]
    public async Task Get_by_id_returns_full_scenario()
    {
        var response = await _client.GetAsync("/api/scenarios/difficult_airway_v1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        json.Should().Contain("sleep apnea");
    }

    [Fact]
    public async Task Get_by_unknown_id_returns_404()
    {
        var response = await _client.GetAsync("/api/scenarios/nope_v999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private sealed record ScenarioSummary(string Id, string Title, int LatencyBudgetMs, List<string> Languages, int ProbeCount);
}
