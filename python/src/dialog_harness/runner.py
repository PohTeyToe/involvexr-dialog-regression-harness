from __future__ import annotations

from dataclasses import dataclass, field

from dialog_harness import assertions
from dialog_harness.assertions import AssertionResult
from dialog_harness.mock_llm import LLMClient
from dialog_harness.scenario import Probe, Scenario


@dataclass
class ProbeResult:
    probe: Probe
    language: str
    response: str
    latency_ms: int
    assertions: list[AssertionResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(a.passed for a in self.assertions)


@dataclass
class RunReport:
    scenario: Scenario
    probe_results: list[ProbeResult]
    latency_assertion: AssertionResult | None = None
    language_assertion: AssertionResult | None = None

    @property
    def passed(self) -> bool:
        if not all(r.passed for r in self.probe_results):
            return False
        if self.latency_assertion and not self.latency_assertion.passed:
            return False
        if self.language_assertion and not self.language_assertion.passed:
            return False
        return True


class ProbeRunner:
    """Drives a scenario's probes against an LLMClient and collects results."""

    def __init__(self, client: LLMClient) -> None:
        self.client = client

    def run(self, scenario: Scenario) -> RunReport:
        results: list[ProbeResult] = []
        latencies: list[int] = []

        primary_lang = scenario.languages[0]
        for probe in scenario.probes:
            response, latency = self.client.complete(probe.prompt, language=primary_lang)
            latencies.append(latency)
            checks: list[AssertionResult] = []
            if probe.must_mention:
                checks.append(assertions.assert_mentions(response, probe.must_mention))
            if probe.must_not_mention:
                checks.append(
                    assertions.assert_does_not_mention(response, probe.must_not_mention)
                )
            if probe.persona_check:
                checks.append(
                    assertions.assert_stays_in_character(response, scenario.patient)
                )
            results.append(
                ProbeResult(
                    probe=probe,
                    language=primary_lang,
                    response=response,
                    latency_ms=latency,
                    assertions=checks,
                )
            )

        latency_check = assertions.assert_latency_p95(
            latencies, scenario.latency_budget_ms
        )

        language_check: AssertionResult | None = None
        if len(scenario.languages) > 1 and scenario.keyword_translations:
            # for each anchor, run the probe that elicits it in every language
            failures: list[str] = []
            for anchor, by_lang in scenario.keyword_translations.items():
                eliciting = next(
                    (
                        p
                        for p in scenario.probes
                        if anchor.lower() in {m.lower() for m in p.must_mention}
                    ),
                    scenario.probes[0],
                )
                for lang in scenario.languages:
                    response, _ = self.client.complete(eliciting.prompt, language=lang)
                    term = by_lang.get(lang, anchor)
                    if term.lower() not in response.lower():
                        failures.append(f"{lang} missing '{term}' for anchor '{anchor}'")
            language_check = assertions.AssertionResult(
                name="language_consistency",
                passed=not failures,
                detail="; ".join(failures) if failures else "all anchors present",
            )

        return RunReport(
            scenario=scenario,
            probe_results=results,
            latency_assertion=latency_check,
            language_assertion=language_check,
        )
