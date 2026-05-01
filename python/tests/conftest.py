"""Pytest configuration: skip live LLM tests by default."""

from __future__ import annotations

import os

import pytest


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if os.environ.get("RUN_LIVE_LLM_TESTS") == "1":
        return
    skip_live = pytest.mark.skip(
        reason="live LLM tests disabled; set RUN_LIVE_LLM_TESTS=1 to enable"
    )
    for item in items:
        if "live" in item.keywords:
            item.add_marker(skip_live)
