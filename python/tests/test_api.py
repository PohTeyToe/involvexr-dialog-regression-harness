"""Smoke tests for the FastAPI wrapper."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from dialog_harness_api.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_banner(client: TestClient) -> None:
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "dialog-harness-api"
    assert "scenarios" in body


def test_healthz(client: TestClient) -> None:
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_list_scenarios_returns_three(client: TestClient) -> None:
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    names = [s["name"] for s in r.json()["scenarios"]]
    assert "difficult_airway" in names
    assert "code_blue_pediatric" in names
    assert "breaking_bad_news" in names


def test_get_scenario_returns_yaml(client: TestClient) -> None:
    r = client.get("/api/scenarios/difficult_airway")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "difficult_airway"
    assert body["scenario"]["id"]
    assert body["raw"]["probes"]


def test_get_scenario_404(client: TestClient) -> None:
    r = client.get("/api/scenarios/nonexistent")
    assert r.status_code == 404


def test_coverage_endpoint(client: TestClient) -> None:
    r = client.get("/api/coverage/difficult_airway")
    assert r.status_code == 200
    body = r.json()
    assert "percent" in body
    assert isinstance(body["objectives"], list)
    assert body["objectives"]


def test_start_run_and_poll(client: TestClient) -> None:
    r = client.post("/api/runs", json={"scenario": "difficult_airway"})
    assert r.status_code == 200
    run_id = r.json()["run_id"]
    assert run_id

    # Poll until done. Mock LLM is fast; give it 5 seconds.
    deadline = time.time() + 5
    state = None
    while time.time() < deadline:
        s = client.get(f"/api/runs/{run_id}")
        assert s.status_code == 200
        state = s.json()
        if state["status"] in {"done", "failed"}:
            break
        time.sleep(0.1)
    assert state is not None
    assert state["status"] == "done"
    assert state["summary"] is not None
    assert state["summary"]["passed"] is True
    types = {e["type"] for e in state["events"]}
    assert {"started", "probe", "latency", "coverage", "done"} <= types


def test_start_run_unknown_scenario(client: TestClient) -> None:
    r = client.post("/api/runs", json={"scenario": "missing"})
    assert r.status_code == 404


def test_get_run_404(client: TestClient) -> None:
    r = client.get("/api/runs/does-not-exist")
    assert r.status_code == 404
