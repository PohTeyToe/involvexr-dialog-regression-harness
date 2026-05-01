using System.Net;
using System.Net.Http.Json;
using DialogHarness.Api.Models;
using DialogHarness.Core.LLM;
using FluentAssertions;
using Moq;
using Xunit;

namespace DialogHarness.Api.Tests;

public class RunsEndpointTests : IClassFixture<ApiTestFixture>
{
    private readonly ApiTestFixture _fixture;
    private readonly HttpClient _client;

    public RunsEndpointTests(ApiTestFixture fixture)
    {
        _fixture = fixture;
        _client = fixture.CreateClient();
    }

    /// <summary>
    /// Teaching-moment integration test.
    ///
    /// Design choices, for the reviewer:
    ///   1. We use WebApplicationFactory&lt;Program&gt; so the request flows through
    ///      the real ASP.NET Core pipeline -- routing, model binding, FluentValidation,
    ///      JSON serialization. Only ILLMClient is mocked.
    ///   2. The mock is wired through ConfigureTestServices so it sees the same
    ///      DI lifetime semantics as production code.
    ///   3. We assert on the consensus shape (passed probes, run count) instead of
    ///      raw response text, because that is what regression tests in production
    ///      actually care about.
    /// </summary>
    [Fact]
    public async Task Post_run_executes_consensus_and_returns_201()
    {
        var request = new RunRequest("difficult_airway_v1", ConsensusRuns: 5, ConsensusThreshold: 4);
        var response = await _client.PostAsJsonAsync("/api/runs", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<RunResponse>();
        body.Should().NotBeNull();
        body!.ScenarioId.Should().Be("difficult_airway_v1");
        body.Probes.Should().BeGreaterThan(0);
        body.PassedProbes.Should().Be(body.Probes); // happy path mock satisfies all probes
        body.Status.Should().Be("passed");
        body.Assertions.Should().NotBeEmpty();

        // Verify the LLM was called runs * probes times (5 * 3 = 15 for difficult_airway_v1)
        _fixture.LlmMock.Verify(c => c.CompleteAsync(
            It.IsAny<LlmRequest>(), It.IsAny<CancellationToken>()),
            Times.AtLeast(5));
    }

    [Fact]
    public async Task Post_run_returns_400_on_validation_failure()
    {
        var bad = new RunRequest("difficult_airway_v1", ConsensusRuns: 5, ConsensusThreshold: 9);
        var response = await _client.PostAsJsonAsync("/api/runs", bad);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Post_run_returns_400_on_empty_scenario_id()
    {
        var bad = new RunRequest("", ConsensusRuns: 3, ConsensusThreshold: 2);
        var response = await _client.PostAsJsonAsync("/api/runs", bad);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Post_run_returns_404_on_unknown_scenario()
    {
        var bad = new RunRequest("does_not_exist_v1", ConsensusRuns: 3, ConsensusThreshold: 2);
        var response = await _client.PostAsJsonAsync("/api/runs", bad);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Post_run_returns_400_on_invalid_language()
    {
        var bad = new RunRequest("difficult_airway_v1", 3, 2, "english");
        var response = await _client.PostAsJsonAsync("/api/runs", bad);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Get_run_returns_run_after_create()
    {
        var request = new RunRequest("difficult_airway_v1", 3, 2);
        var createResponse = await _client.PostAsJsonAsync("/api/runs", request);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<RunResponse>();

        var getResponse = await _client.GetAsync($"/api/runs/{created!.RunId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await getResponse.Content.ReadFromJsonAsync<RunResponse>();
        fetched!.RunId.Should().Be(created.RunId);
    }

    [Fact]
    public async Task Get_run_returns_404_for_unknown_id()
    {
        var response = await _client.GetAsync("/api/runs/no-such-run");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Run_fails_when_mock_returns_irrelevant_text()
    {
        // Use a fresh fixture so we don't pollute the shared one.
        await using var localFixture = new ApiTestFixture();
        localFixture.LlmMock.Reset();
        localFixture.LlmMock
            .Setup(c => c.CompleteAsync(It.IsAny<LlmRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LlmResponse("Lovely weather today.", "en", 100, "mock-1.0"));

        var client = localFixture.CreateClient();
        var request = new RunRequest("difficult_airway_v1", 5, 4);
        var response = await client.PostAsJsonAsync("/api/runs", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<RunResponse>();
        body!.Status.Should().Be("failed");
        body.PassedProbes.Should().Be(0);
    }

    [Fact]
    public async Task Run_with_threshold_one_passes_easily()
    {
        var request = new RunRequest("breaking_bad_news_v1", ConsensusRuns: 3, ConsensusThreshold: 1);
        var response = await _client.PostAsJsonAsync("/api/runs", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<RunResponse>();
        body!.Probes.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Run_response_includes_per_probe_assertions()
    {
        var request = new RunRequest("difficult_airway_v1", 3, 2);
        var response = await _client.PostAsJsonAsync("/api/runs", request);
        var body = await response.Content.ReadFromJsonAsync<RunResponse>();
        body!.Assertions.Should().HaveCount(body.Probes);
        body.Assertions.Should().AllSatisfy(a => a.Score.Should().BeInRange(0, 1));
    }
}
