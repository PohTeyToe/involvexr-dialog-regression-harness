"""Coverage of learner objectives by probes.

A scenario lists ``learner_objectives`` (e.g. "recognize obstructive sleep
apnea") and a list of probes (e.g. "How is your breathing at night?"). We
want to answer: which objectives are exercised by at least one probe?

The naive answer is keyword matching against the probe prompt and its
``must_mention`` anchors. The slightly-less-naive answer is semantic
similarity between the objective text and each probe. This module ships
both, with the keyword check as the cheap gate and the embedding check as
the tiebreaker.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from dialog_harness import embeddings
from dialog_harness.scenario import Scenario


_STOPWORDS = frozenset(
    {
        "a", "an", "the", "of", "to", "in", "on", "and", "or", "for", "with",
        "is", "are", "be", "been", "being", "as", "at", "by", "from", "into",
        "that", "this", "these", "those", "their", "what", "when", "where",
        "how", "why", "do", "does", "did", "have", "has", "had", "must",
        "can", "could", "should", "would", "will", "shall", "may", "might",
        "your", "you", "i", "we", "they", "it",
    }
)


def _tokens(text: str) -> set[str]:
    return {
        t for t in re.findall(r"[A-Za-z][A-Za-z\-]+", text.lower())
        if t not in _STOPWORDS and len(t) > 2
    }


@dataclass
class ObjectiveCoverage:
    objective: str
    keyword_hit: bool
    semantic_score: float
    covered: bool
    matched_probes: list[int]


@dataclass
class CoverageReport:
    scenario_id: str
    objectives: list[ObjectiveCoverage]
    threshold: float

    @property
    def percent(self) -> float:
        if not self.objectives:
            return 0.0
        covered = sum(1 for o in self.objectives if o.covered)
        return 100.0 * covered / len(self.objectives)

    def as_table(self) -> str:
        if not self.objectives:
            return "(no objectives defined)"
        lines = [f"Coverage for {self.scenario_id}: {self.percent:.0f}%"]
        lines.append("-" * 60)
        for o in self.objectives:
            mark = "PASS" if o.covered else "MISS"
            probes = ",".join(str(i) for i in o.matched_probes) or "-"
            lines.append(
                f"[{mark}] sim={o.semantic_score:.2f} probes={probes} | {o.objective}"
            )
        return "\n".join(lines)


def analyze_coverage(scenario: Scenario, *, threshold: float = 0.30) -> CoverageReport:
    """Return per-objective coverage for the scenario's probes.

    An objective is considered covered if either:
    - any probe's prompt or ``must_mention`` shares a non-stopword token, or
    - any probe's prompt has cosine similarity >= ``threshold`` to the objective.
    """
    results: list[ObjectiveCoverage] = []
    for objective in scenario.learner_objectives:
        obj_tokens = _tokens(objective)
        matched_probes: list[int] = []
        best_sim = 0.0
        keyword_hit = False
        for idx, probe in enumerate(scenario.probes):
            haystack = " ".join([probe.prompt, *probe.must_mention])
            probe_tokens = _tokens(haystack)
            if obj_tokens & probe_tokens:
                keyword_hit = True
                matched_probes.append(idx)
                continue
            sim = embeddings.similarity(objective, haystack)
            if sim > best_sim:
                best_sim = sim
            if sim >= threshold:
                matched_probes.append(idx)
        covered = keyword_hit or best_sim >= threshold
        results.append(
            ObjectiveCoverage(
                objective=objective,
                keyword_hit=keyword_hit,
                semantic_score=best_sim,
                covered=covered,
                matched_probes=matched_probes,
            )
        )
    return CoverageReport(
        scenario_id=scenario.id, objectives=results, threshold=threshold
    )
