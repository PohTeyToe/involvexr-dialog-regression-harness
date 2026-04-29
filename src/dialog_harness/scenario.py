from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field, field_validator


class Probe(BaseModel):
    """A single learner utterance plus the assertions it must satisfy."""

    prompt: str
    must_mention: list[str] = Field(default_factory=list)
    must_not_mention: list[str] = Field(default_factory=list)
    persona_check: bool = False


class Scenario(BaseModel):
    """A clinical simulation scenario, parsed from YAML."""

    id: str
    title: str
    patient: str
    learner_objectives: list[str]
    probes: list[Probe]
    latency_budget_ms: int = 2500
    languages: list[str] = Field(default_factory=lambda: ["en"])
    keyword_translations: dict[str, dict[str, str]] = Field(default_factory=dict)

    @field_validator("probes")
    @classmethod
    def _at_least_one_probe(cls, v: list[Probe]) -> list[Probe]:
        if not v:
            raise ValueError("scenario must define at least one probe")
        return v


def load_scenario(path: str | Path) -> Scenario:
    """Load and validate a scenario YAML file."""
    raw: dict[str, Any] = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return Scenario.model_validate(raw)
