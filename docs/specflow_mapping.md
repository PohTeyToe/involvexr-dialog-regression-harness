# SpecFlow Mapping

Last updated: 2026-04-30

**TL;DR:** The YAML scenarios in `scenarios/` map cleanly onto SpecFlow `.feature` files. YAML was the right choice for a Python prototype because it's faster for engineers to iterate on. Gherkin is the right choice for a Lumeto production deployment because faculty and clinical SMEs can read and edit it, and the team already runs SpecFlow alongside xUnit. This doc shows the translation, the step-definition shape, and a parameterized example for multilingual probes.

## 1. The two scenario formats compared

|Aspect|YAML (current)|Gherkin (SpecFlow)|
|-|-|-|
|Author|Engineer|Engineer or clinical SME|
|Tooling|`yaml.safe_load` + Pydantic|SpecFlow generator + xUnit runner|
|Diff readability|High|High|
|Branching logic|Awkward (requires custom keys)|Natural (`When ... And ... Then`)|
|Reusable steps|Manual (Python helpers)|First-class (`[Given]`, `[When]`, `[Then]`)|
|Reporting|JSON + markdown|LivingDoc HTML report (out of the box)|
|Multilingual|Custom `keyword_translations` block|Native via `Examples` table|
|Onboarding cost|Low for engineers|Medium — team must learn step-def patterns|

The YAML format is faster for **us** because we can edit a Python dict and run pytest. The Gherkin format is faster for **the team** because it slots into the existing SpecFlow + xUnit suite, and the LivingDoc HTML output is something faculty and PMs can review without setting up a Python venv.

See [ADR-004](./adr/ADR-004-scenario-yaml-vs-gherkin.md) for the full decision record.

## 2. `difficult_airway.yaml` translated to Gherkin

### YAML source (current shape)

```yaml
id: difficult_airway_v1
title: Difficult Airway — 65yo with OSA and limited neck extension
patient: >
  65 year old male presenting for elective surgery. History of obstructive sleep apnea,
  prior failed intubation, limited neck extension, Mallampati class IV.
  Anxious, soft spoken, prefers short answers.
learner_objectives:
  - Recognize predictors of difficult airway
  - Take a focused airway history
  - Communicate calmly with an anxious patient
latency_budget_ms: 2500
probes:
  - prompt: "Have you ever had trouble being put to sleep for surgery before?"
    must_mention: ["difficult airway"]
    must_not_mention: ["fictomycin"]
    persona_check: true
  - prompt: "Tell me about your breathing at night."
    must_mention: ["sleep apnea"]
    must_not_mention: ["fictomycin"]
  - prompt: "Can you tilt your head back for me?"
    must_mention: ["neck"]
    must_not_mention: ["fictomycin"]
```

### Gherkin equivalent (`features/DifficultAirway.feature`)

```gherkin
Feature: Difficult Airway scenario
  As a clinical educator running an InvolveXR session,
  I want the patient agent to behave consistently for the difficult-airway scenario
  So that learner regression coverage holds across model and prompt updates.

  Background:
    Given the patient persona is "65yo male with OSA, prior failed intubation, Mallampati IV, anxious"
    And the latency budget is 2500 ms
    And the LLM client is mocked

  Scenario: Patient discloses prior difficult airway history
    When the learner says "Have you ever had trouble being put to sleep for surgery before?"
    Then the response should mention "difficult airway"
    And the response should not mention "fictomycin"
    And the response should stay in character

  Scenario: Patient discusses overnight breathing
    When the learner says "Tell me about your breathing at night."
    Then the response should mention "sleep apnea"
    And the response should not mention "fictomycin"

  Scenario: Patient is asked to demonstrate neck extension
    When the learner says "Can you tilt your head back for me?"
    Then the response should mention "neck"
    And the response should not mention "fictomycin"

  Scenario: P95 latency under budget
    When the learner runs the full probe set 10 times
    Then the p95 latency should be under 2500 ms
```

The `Background` block holds shared setup — persona, latency budget, mock setup — so each `Scenario` is short and reads like the YAML probe block. The `Then` steps map 1:1 onto the assertion library.

## 3. Step definitions

```csharp
using TechTalk.SpecFlow;
using FluentAssertions;
using Moq;

[Binding]
public sealed class DialogSteps
{
    private readonly ScenarioContext _ctx;
    private readonly Mock<ILlmClient> _llm;
    private string _persona = string.Empty;
    private int _latencyBudgetMs;
    private DialogueResponse? _last;
    private List<int> _latencies = new();

    public DialogSteps(ScenarioContext ctx, Mock<ILlmClient> llm)
    {
        _ctx = ctx;
        _llm = llm;
    }

    [Given(@"the patient persona is ""(.*)""")]
    public void GivenPersona(string persona) => _persona = persona;

    [Given(@"the latency budget is (\d+) ms")]
    public void GivenLatencyBudget(int ms) => _latencyBudgetMs = ms;

    [Given(@"the LLM client is mocked")]
    public void GivenLlmMocked()
    {
        _llm.Setup(x => x.CompleteAsync(It.IsAny<string>(), default))
            .ReturnsAsync((string prompt, CancellationToken _) =>
                MockLlmResponses.For(prompt, _persona));
    }

    [When(@"the learner says ""(.*)""")]
    public async Task WhenLearnerSays(string utterance)
    {
        var sw = Stopwatch.StartNew();
        _last = await _ctx.DialogClient().SendUtteranceAsync(utterance);
        _latencies.Add((int)sw.ElapsedMilliseconds);
    }

    [When(@"the learner runs the full probe set (\d+) times")]
    public async Task WhenFullProbeSet(int times)
    {
        for (int i = 0; i < times; i++)
        {
            await WhenLearnerSays("Have you ever had trouble being put to sleep for surgery before?");
            await WhenLearnerSays("Tell me about your breathing at night.");
            await WhenLearnerSays("Can you tilt your head back for me?");
        }
    }

    [Then(@"the response should mention ""(.*)""")]
    public void ThenMentions(string term)
    {
        var result = DialogAssertions.AssertMentions(_last!.Text, new[] { term });
        result.Passed.Should().BeTrue(result.Detail);
    }

    [Then(@"the response should not mention ""(.*)""")]
    public void ThenDoesNotMention(string term)
    {
        var result = DialogAssertions.AssertDoesNotMention(_last!.Text, new[] { term });
        result.Passed.Should().BeTrue(result.Detail);
    }

    [Then(@"the response should stay in character")]
    public async Task ThenStaysInCharacter()
    {
        var assertion = _ctx.Get<CharacterAssertion>();
        var result = await assertion.AssertStaysInCharacterAsync(_last!.Text, _persona);
        result.Passed.Should().BeTrue(result.Detail);
    }

    [Then(@"the p95 latency should be under (\d+) ms")]
    public void ThenP95Below(int ceiling)
    {
        var result = LatencyAssertions.AssertP95Below(_latencies, ceiling);
        result.Passed.Should().BeTrue(result.Detail);
    }
}
```

The step definitions are the only place where SpecFlow knows about the assertion library. Adding a new `Then` term — say, `the response should escalate concern` — is one regex + one method call into the assertion library. Faculty editing the `.feature` file never see this code.

## 4. Multilingual scenarios via `Examples` table

Multilingual coverage in YAML requires a `keyword_translations` block. In Gherkin it's a native `Scenario Outline` with an `Examples` table — which is the right shape because each row is an independently-executed test case in the LivingDoc report.

```gherkin
Feature: Multilingual breathing-difficulty disclosure

  Background:
    Given the patient persona is "65yo with OSA, anxious"
    And the LLM client is mocked

  Scenario Outline: Patient discloses sleep apnea in <language>
    When the learner says "<utterance>" in language "<language>"
    Then the response should mention "<expected_term>"
    And the response should be in language "<language>"
    And the response should not mention "fictomycin"

    Examples:
      | language | utterance                              | expected_term          |
      | en       | Tell me about your breathing at night. | sleep apnea            |
      | fr       | Parlez-moi de votre respiration la nuit. | apnée du sommeil    |
      | es       | Cuénteme sobre su respiración de noche. | apnea del sueño      |
      | de       | Erzählen Sie mir von Ihrer Atmung nachts. | Schlafapnoe       |
```

Step definitions for the multilingual variant:

```csharp
[When(@"the learner says ""(.*)"" in language ""(.*)""")]
public async Task WhenLearnerSaysInLanguage(string utterance, string language)
{
    _ctx.Set(language, "current_language");
    _last = await _ctx.DialogClient().SendUtteranceAsync(utterance, language);
}

[Then(@"the response should be in language ""(.*)""")]
public async Task ThenResponseInLanguage(string expected)
{
    var detected = await _ctx.Get<ILanguageDetector>().DetectAsync(_last!.Text);
    detected.Should().Be(expected);
}
```

Each row in `Examples` becomes a separate scenario in the LivingDoc report. A flake in French shows up as a single failing row, not as a buried error inside a multi-language Python loop.

## 5. Tradeoff: when YAML still wins

There are two cases where the YAML format is genuinely better than Gherkin:

1. **Programmatic scenario generation.** If a tool (LLM, fuzzer, coverage analyzer) is producing scenarios from a higher-level spec, emitting YAML is one line. Emitting Gherkin requires templating with the right whitespace and step-definition awareness. For ML-driven scenario generation — which is on the [v0_5 roadmap](./v0_5_roadmap.md) — YAML is the easier sink.

2. **Non-natural-language probes.** If a probe is a structured payload (a tool-call argument, a raw gRPC field), Gherkin's prose-style `"<utterance>"` becomes ugly. YAML keeps the payload nested and typed.

The pragmatic answer is: keep both. Gherkin for the human-readable scenarios that faculty review. YAML for the engineering-internal probe sets that are generated or come from log mining. The harness should accept either, with a converter between them. That's a v0.5 task, not a v0.4 one.
