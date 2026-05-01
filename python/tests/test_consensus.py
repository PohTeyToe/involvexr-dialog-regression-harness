"""Tests for N-of-M consensus voting."""

from __future__ import annotations

import itertools

import pytest

from dialog_harness.assertions import AssertionResult
from dialog_harness.consensus import (
    consensus,
    consensus_decorator,
    latency_consensus,
)


def test_consensus_passes_when_threshold_met() -> None:
    pattern = iter([True, True, False, True, True])

    def fn() -> AssertionResult:
        return AssertionResult(name="x", passed=next(pattern))

    out = consensus(fn, runs=5, threshold=4)
    assert out.passed
    assert out.pass_count == 4
    assert out.runs == 5
    assert "4/5" in out.detail


def test_consensus_fails_when_threshold_unmet() -> None:
    pattern = iter([True, False, False, True, False])

    def fn() -> AssertionResult:
        return AssertionResult(name="x", passed=next(pattern))

    out = consensus(fn, runs=5, threshold=4)
    assert not out.passed
    assert out.pass_count == 2


def test_consensus_records_per_run() -> None:
    flags = [True, True, True]

    def fn() -> AssertionResult:
        return AssertionResult(name="x", passed=flags.pop(0))

    out = consensus(fn, runs=3, threshold=2)
    assert len(out.per_run) == 3
    assert all(r.passed for r in out.per_run)


def test_consensus_validates_args() -> None:
    with pytest.raises(ValueError):
        consensus(lambda: AssertionResult("x", True), runs=0, threshold=1)
    with pytest.raises(ValueError):
        consensus(lambda: AssertionResult("x", True), runs=3, threshold=4)
    with pytest.raises(ValueError):
        consensus(lambda: AssertionResult("x", True), runs=3, threshold=0)


def test_consensus_decorator() -> None:
    counter = itertools.count()

    @consensus_decorator(runs=5, threshold=3)
    def check() -> AssertionResult:
        i = next(counter)
        return AssertionResult(name="check", passed=i % 2 == 0)

    out = check()
    assert out.runs == 5
    assert out.pass_count == 3  # i = 0,1,2,3,4 -> evens at 0,2,4
    assert out.passed
    assert out.name == "check@3of5"


def test_consensus_outcome_projects_to_assertion_result() -> None:
    pattern = iter([True, True, True, True, True])

    out = consensus(
        lambda: AssertionResult(name="probe", passed=next(pattern)),
        runs=5,
        threshold=4,
    )
    projected = out.as_assertion()
    assert projected.passed
    assert projected.name == out.name


def test_latency_consensus_passes_under_ceiling() -> None:
    samples = iter([100, 110, 120, 130, 140])

    def sample() -> int:
        return next(samples)

    result = latency_consensus(sample, runs=5, ceiling_ms=200)
    assert result.passed
    assert "p95" in result.detail


def test_latency_consensus_fails_over_ceiling() -> None:
    samples = iter([900, 910, 920, 930, 940])

    def sample() -> int:
        return next(samples)

    result = latency_consensus(sample, runs=5, ceiling_ms=500)
    assert not result.passed
