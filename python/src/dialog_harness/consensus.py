"""N-of-M consensus voting for non-deterministic assertions.

Non-determinism is a feature of LLMs, not a bug. We don't want to seed-pin
the patient agent (the InvolveXR runtime won't expose a seed in production)
and we don't want snapshot tests (the surface text rerolls every time). The
shape of the answer that scales is: run the same assertion N times, require
M-of-N to pass, and report the per-run breakdown.

Latency assertions use a dual: run N times and take p95 across the runs
rather than k-of-n boolean voting, because latency is a continuous metric.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from dialog_harness.assertions import AssertionResult, assert_latency_p95


@dataclass
class ConsensusOutcome:
    """Result of running an assertion N times under k-of-n voting."""

    name: str
    passed: bool
    runs: int
    threshold: int
    pass_count: int
    detail: str = ""
    per_run: list[AssertionResult] = field(default_factory=list)

    def as_assertion(self) -> AssertionResult:
        """Project a ConsensusOutcome onto the AssertionResult shape."""
        return AssertionResult(name=self.name, passed=self.passed, detail=self.detail)


def consensus(
    assertion_fn: Callable[[], AssertionResult],
    *,
    runs: int = 5,
    threshold: int = 4,
    name: str | None = None,
) -> ConsensusOutcome:
    """Run ``assertion_fn`` ``runs`` times; pass if ``threshold`` runs pass.

    The callable is expected to be idempotent in setup (e.g. a closure over
    response_fn() that re-rolls the LLM each call).
    """
    if runs < 1:
        raise ValueError("runs must be >= 1")
    if threshold < 1 or threshold > runs:
        raise ValueError("threshold must be in [1, runs]")

    per_run: list[AssertionResult] = []
    for _ in range(runs):
        per_run.append(assertion_fn())

    pass_count = sum(1 for r in per_run if r.passed)
    passed = pass_count >= threshold
    label = name or (per_run[0].name if per_run else "consensus")
    return ConsensusOutcome(
        name=f"{label}@{threshold}of{runs}",
        passed=passed,
        runs=runs,
        threshold=threshold,
        pass_count=pass_count,
        detail=f"{pass_count}/{runs} runs passed (need {threshold})",
        per_run=per_run,
    )


def consensus_decorator(*, runs: int = 5, threshold: int = 4):
    """Decorator wrapping a no-arg assertion callable in consensus voting.

    Example::

        @consensus_decorator(runs=5, threshold=4)
        def check():
            return assert_mentions(model.complete("..."), ["pulse"])

        outcome = check()
    """

    def decorator(fn: Callable[[], AssertionResult]) -> Callable[[], ConsensusOutcome]:
        def wrapper() -> ConsensusOutcome:
            return consensus(fn, runs=runs, threshold=threshold, name=fn.__name__)

        wrapper.__wrapped__ = fn  # type: ignore[attr-defined]
        return wrapper

    return decorator


def latency_consensus(
    sample_fn: Callable[[], int],
    *,
    runs: int = 5,
    ceiling_ms: int,
) -> AssertionResult:
    """Sample latency ``runs`` times; assert p95 <= ceiling.

    p95 over a tiny sample (5-10 runs) is noisy by definition; the point is
    to flag tail-latency regressions rather than to give a publication-grade
    SLO number.
    """
    samples = [sample_fn() for _ in range(runs)]
    return assert_latency_p95(samples, ceiling_ms)
