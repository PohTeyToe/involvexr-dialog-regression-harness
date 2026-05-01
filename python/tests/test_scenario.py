from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from dialog_harness.scenario import Scenario, load_scenario

SCENARIO_DIR = Path(__file__).parent.parent / "scenarios"


@pytest.mark.parametrize(
    "fname",
    ["difficult_airway.yaml", "code_blue_pediatric.yaml", "breaking_bad_news.yaml"],
)
def test_scenario_loads(fname: str) -> None:
    s = load_scenario(SCENARIO_DIR / fname)
    assert isinstance(s, Scenario)
    assert s.id
    assert s.probes


def test_scenario_requires_probes(tmp_path: Path) -> None:
    bad = tmp_path / "bad.yaml"
    bad.write_text(
        yaml.safe_dump(
            {
                "id": "x",
                "title": "x",
                "patient": "x",
                "learner_objectives": ["x"],
                "probes": [],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(Exception):
        load_scenario(bad)


def test_scenario_pediatric_has_translations() -> None:
    s = load_scenario(SCENARIO_DIR / "code_blue_pediatric.yaml")
    assert "es" in s.languages
    assert "epinephrine" in s.keyword_translations
    assert s.keyword_translations["epinephrine"]["es"] == "epinefrina"
