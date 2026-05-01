"""Tests for objective coverage analysis."""

from __future__ import annotations

from pathlib import Path

import pytest

from dialog_harness.coverage import analyze_coverage
from dialog_harness.scenario import Probe, Scenario, load_scenario


SCENARIO_DIR = Path(__file__).parent.parent.parent / "scenarios"


def test_coverage_full_when_objectives_share_keywords() -> None:
    scenario = Scenario(
        id="t",
        title="t",
        patient="patient with sleep apnea",
        learner_objectives=[
            "recognize obstructive sleep apnea",
            "identify difficult airway features",
        ],
        probes=[
            Probe(prompt="Tell me about your sleep apnea", must_mention=["sleep"]),
            Probe(prompt="Any difficult airway history", must_mention=["airway"]),
        ],
    )
    report = analyze_coverage(scenario)
    assert report.percent == 100.0
    assert all(o.covered for o in report.objectives)


def test_coverage_partial_when_objective_unprobed() -> None:
    scenario = Scenario(
        id="t",
        title="t",
        patient="x",
        learner_objectives=[
            "recognize obstructive sleep apnea",
            "manage post-operative nausea and vomiting",
        ],
        probes=[
            Probe(prompt="Tell me about your sleep apnea"),
        ],
    )
    report = analyze_coverage(scenario, threshold=0.99)
    assert report.percent == pytest.approx(50.0)
    covered = [o for o in report.objectives if o.covered]
    assert len(covered) == 1
    assert "sleep apnea" in covered[0].objective


def test_coverage_table_renders() -> None:
    scenario = load_scenario(SCENARIO_DIR / "difficult_airway.yaml")
    report = analyze_coverage(scenario)
    table = report.as_table()
    assert "Coverage" in table
    assert scenario.id in table


@pytest.mark.parametrize(
    "fname",
    ["difficult_airway.yaml", "code_blue_pediatric.yaml", "breaking_bad_news.yaml"],
)
def test_coverage_runs_against_all_sample_scenarios(fname: str) -> None:
    scenario = load_scenario(SCENARIO_DIR / fname)
    report = analyze_coverage(scenario)
    assert report.objectives
    assert 0.0 <= report.percent <= 100.0
