from __future__ import annotations

from pathlib import Path

from dialog_harness.mock_llm import MockLLMClient
from dialog_harness.report import render_report
from dialog_harness.runner import ProbeRunner
from dialog_harness.scenario import load_scenario

SCENARIO_DIR = Path(__file__).parent.parent.parent / "scenarios"


def test_difficult_airway_runs_and_passes() -> None:
    scenario = load_scenario(SCENARIO_DIR / "difficult_airway.yaml")
    runner = ProbeRunner(MockLLMClient(persona=scenario.patient))
    report = runner.run(scenario)
    assert report.probe_results
    assert report.passed, [
        (r.probe.prompt, [(a.name, a.passed, a.detail) for a in r.assertions])
        for r in report.probe_results
    ]


def test_hallucinated_medication_is_caught() -> None:
    """Seed the mock to inject a banned med; harness must flag it."""
    scenario = load_scenario(SCENARIO_DIR / "difficult_airway.yaml")
    runner = ProbeRunner(
        MockLLMClient(persona=scenario.patient, inject_hallucination=True)
    )
    report = runner.run(scenario)
    assert not report.passed
    failing = [r for r in report.probe_results if not r.passed]
    assert failing, "expected at least one probe to fail"
    assert any(
        a.name == "does_not_mention" and not a.passed
        for r in failing
        for a in r.assertions
    )


def test_html_report_written(tmp_path: Path) -> None:
    scenario = load_scenario(SCENARIO_DIR / "breaking_bad_news.yaml")
    runner = ProbeRunner(MockLLMClient(persona=scenario.patient))
    report = runner.run(scenario)
    out = render_report(report, out_dir=tmp_path)
    assert out.exists()
    body = out.read_text(encoding="utf-8")
    assert "Breaking Bad News" in body
    assert "PASS" in body or "FAIL" in body


def test_pediatric_multilingual_consistency() -> None:
    scenario = load_scenario(SCENARIO_DIR / "code_blue_pediatric.yaml")
    runner = ProbeRunner(MockLLMClient(persona=scenario.patient))
    report = runner.run(scenario)
    assert report.language_assertion is not None
    assert report.latency_assertion is not None
