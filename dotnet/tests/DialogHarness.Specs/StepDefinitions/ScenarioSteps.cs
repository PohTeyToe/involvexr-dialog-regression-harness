using DialogHarness.Core.Assertions;
using DialogHarness.Core.Consensus;
using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;
using DialogHarness.Core.Scenarios;
using FluentAssertions;
using Reqnroll;

namespace DialogHarness.Specs.StepDefinitions;

[Binding]
public sealed class ScenarioSteps
{
    private readonly ScenarioContext _ctx;

    public ScenarioSteps(ScenarioContext ctx) => _ctx = ctx;

    [Given(@"the AI patient is configured with the (.*) scenario")]
    public async Task Given_the_AI_patient_is_configured(string scenarioId)
    {
        var loader = new ScenarioLoader();
        var dir = Path.Combine(AppContext.BaseDirectory, "scenarios");
        var all = await loader.LoadAllFromDirectoryAsync(dir);
        var scenario = all.FirstOrDefault(s =>
            string.Equals(s.Id, scenarioId, StringComparison.OrdinalIgnoreCase));
        scenario.Should().NotBeNull($"scenario '{scenarioId}' should be loadable");
        _ctx["scenario"] = scenario!;
    }

    [Given(@"consensus voting is set to (\d+) of (\d+) runs")]
    public void Given_consensus_voting(int threshold, int runs)
    {
        _ctx["runs"] = runs;
        _ctx["threshold"] = threshold;
    }

    [When(@"I probe with ""(.*)""")]
    public async Task When_I_probe_with(string prompt)
    {
        var scenario = (Scenario)_ctx["scenario"];
        var runs = (int)_ctx["runs"];
        var threshold = (int)_ctx["threshold"];

        // Order matters: most specific phrases first; MockLLMClient picks the first match.
        var llm = new MockLLMClient(scriptedResponses: new()
        {
            ["put to sleep"] = "They flagged a difficult airway during my last intubation.",
            ["breathing at night"] = "I have sleep apnea and labored breathing at night.",
            ["diagnosis"] = "Please tell me honestly about the diagnosis and the news.",
            ["news"] = "Please be honest with me about the news and diagnosis.",
            ["breath"] = "I have labored breathing and stridor at night and sleep apnea.",
            ["sleep"] = "I have sleep apnea diagnosed years ago."
        });
        var embeddings = new HashingEmbeddingProvider();

        // Use the scenario's first probe as the assertion source for must_mention.
        var probe = scenario.Probes.First();
        var assertion = new SemanticMentionAssertion(probe.MustMention, embeddings);
        var consensus = new ConsensusRunner();
        var lastResponse = await llm.CompleteAsync(new LlmRequest(scenario.Patient, prompt));
        _ctx["lastResponse"] = lastResponse;

        var result = await consensus.RunWithConsensusAsync(
            async ct => await llm.CompleteAsync(new LlmRequest(scenario.Patient, prompt), ct),
            assertion, runs, threshold);
        _ctx["consensus"] = result;
    }

    [Then(@"the response should mention at least one of ""(.*)""")]
    public void Then_the_response_should_mention_one_of(string csv)
    {
        var response = (LlmResponse)_ctx["lastResponse"];
        var concepts = csv.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        var assertion = new SemanticMentionAssertion(concepts, new HashingEmbeddingProvider());
        var result = assertion.Evaluate(response);
        result.Passed.Should().BeTrue($"expected one of: {csv}; got: {response.Text}");
    }

    [Then(@"the response should not mention ""(.*)""")]
    public void Then_the_response_should_not_mention(string banned)
    {
        var response = (LlmResponse)_ctx["lastResponse"];
        var assertion = new BannedMentionAssertion(new[] { banned });
        assertion.Evaluate(response).Passed.Should().BeTrue();
    }

    [Then(@"the response latency should be under (\d+) ms")]
    public void Then_the_response_latency_should_be_under(long ms)
    {
        var response = (LlmResponse)_ctx["lastResponse"];
        response.LatencyMs.Should().BeLessThan(ms);
    }
}
