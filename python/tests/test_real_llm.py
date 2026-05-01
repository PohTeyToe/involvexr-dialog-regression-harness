"""Tests for the live Anthropic client.

Skipped by default; run with ``RUN_LIVE_LLM_TESTS=1 pytest -m live``.
"""

from __future__ import annotations

import os

import pytest

from dialog_harness.real_llm import RealLLMClient


@pytest.mark.live
def test_real_llm_returns_text_and_latency() -> None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        pytest.skip("ANTHROPIC_API_KEY not set")
    client = RealLLMClient(persona="64-year-old man scheduled for elective surgery")
    response, latency = client.complete(
        "How is your breathing at night?", language="en"
    )
    assert isinstance(response, str)
    assert response.strip()
    assert latency > 0
    assert latency < 60_000


@pytest.mark.live
def test_real_llm_respects_language_hint() -> None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        pytest.skip("ANTHROPIC_API_KEY not set")
    client = RealLLMClient(persona="parent of a child in cardiac arrest")
    response, _ = client.complete("Que pasa con mi hijo?", language="es")
    assert response.strip()


def test_real_llm_raises_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    client = RealLLMClient(persona="x", api_key=None)
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        client.complete("hi")
