"""FastAPI server exposing the dialog harness over HTTP + Server-Sent Events.

Endpoints:
    GET  /                          -> service banner
    GET  /healthz                   -> liveness probe
    GET  /api/scenarios             -> list scenarios
    GET  /api/scenarios/{name}      -> raw YAML for one scenario
    GET  /api/coverage/{name}       -> objective-coverage table for one scenario
    POST /api/runs                  -> start a regression run, returns {run_id}
    GET  /api/runs/{run_id}         -> snapshot run status + results
    GET  /api/runs/{run_id}/stream  -> SSE stream of run events
"""

from __future__ import annotations

import asyncio
import os
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from dialog_harness import assertions
from dialog_harness.coverage import analyze_coverage
from dialog_harness.mock_llm import MockLLMClient
from dialog_harness.runner import ProbeRunner
from dialog_harness.scenario import Scenario, load_scenario


# ---- scenario discovery ----

def _scenarios_dir() -> Path:
    """Resolve the scenarios directory.

    Order of resolution:
      1) ``DIALOG_HARNESS_SCENARIOS_DIR`` environment variable
      2) repo-root ``scenarios/`` (../../scenarios from this file)
      3) cwd/scenarios
    """
    env = os.environ.get("DIALOG_HARNESS_SCENARIOS_DIR")
    if env:
        return Path(env)
    here = Path(__file__).resolve()
    # python/src/dialog_harness_api/main.py -> repo root is parents[3]
    candidate = here.parents[3] / "scenarios"
    if candidate.exists():
        return candidate
    return Path.cwd() / "scenarios"


def _list_scenarios() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for path in sorted(_scenarios_dir().glob("*.yaml")):
        try:
            scenario = load_scenario(path)
        except Exception:
            continue
        out.append(
            {
                "name": path.stem,
                "id": scenario.id,
                "title": scenario.title,
                "languages": scenario.languages,
                "probe_count": len(scenario.probes),
                "objective_count": len(scenario.learner_objectives),
            }
        )
    return out


def _load_by_name(name: str) -> tuple[Scenario, Path]:
    safe = name.replace("..", "").replace("/", "").replace("\\", "")
    if not safe.endswith(".yaml"):
        safe = f"{safe}.yaml"
    path = _scenarios_dir() / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"scenario {name!r} not found")
    return load_scenario(path), path


# ---- run state ----

@dataclass
class RunEvent:
    seq: int
    type: str  # started | probe | latency | language | done | error
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class RunState:
    run_id: str
    scenario_name: str
    started_at: float
    status: str = "pending"  # pending | running | done | failed
    finished_at: float | None = None
    events: list[RunEvent] = field(default_factory=list)
    summary: dict[str, Any] | None = None
    queue: asyncio.Queue[RunEvent] = field(default_factory=asyncio.Queue)


_RUNS: dict[str, RunState] = {}


# ---- runner coroutine ----

async def _execute_run(state: RunState) -> None:
    state.status = "running"
    seq = 0

    def emit(event_type: str, payload: dict[str, Any]) -> None:
        nonlocal seq
        seq += 1
        ev = RunEvent(seq=seq, type=event_type, payload=payload)
        state.events.append(ev)
        state.queue.put_nowait(ev)

    try:
        scenario, _path = _load_by_name(state.scenario_name)
        emit("started", {"scenario_id": scenario.id, "title": scenario.title,
                          "probe_count": len(scenario.probes)})
        client = MockLLMClient(persona=scenario.patient)
        runner = ProbeRunner(client)
        # Run synchronously but yield to the event loop between probes so
        # SSE consumers see incremental progress.
        primary_lang = scenario.languages[0]
        latencies: list[int] = []
        probe_results: list[dict[str, Any]] = []
        for idx, probe in enumerate(scenario.probes):
            response, latency = client.complete(probe.prompt, language=primary_lang)
            latencies.append(latency)
            checks = []
            if probe.must_mention:
                checks.append(assertions.assert_mentions(response, probe.must_mention))
            if probe.must_not_mention:
                checks.append(
                    assertions.assert_does_not_mention(response, probe.must_not_mention)
                )
            if probe.persona_check:
                checks.append(
                    assertions.assert_stays_in_character(response, scenario.patient)
                )
            payload = {
                "index": idx,
                "prompt": probe.prompt,
                "response": response,
                "latency_ms": latency,
                "passed": all(c.passed for c in checks),
                "assertions": [
                    {"name": c.name, "passed": c.passed, "detail": c.detail}
                    for c in checks
                ],
            }
            probe_results.append(payload)
            emit("probe", payload)
            await asyncio.sleep(0)

        latency_check = assertions.assert_latency_p95(
            latencies, scenario.latency_budget_ms
        )
        emit("latency", {"name": latency_check.name,
                          "passed": latency_check.passed,
                          "detail": latency_check.detail})

        coverage = analyze_coverage(scenario)
        cov_payload = {
            "percent": coverage.percent,
            "objectives": [
                {
                    "objective": o.objective,
                    "covered": o.covered,
                    "matched_probes": o.matched_probes,
                    "semantic_score": o.semantic_score,
                }
                for o in coverage.objectives
            ],
        }
        emit("coverage", cov_payload)

        passed = (
            all(p["passed"] for p in probe_results)
            and latency_check.passed
        )
        # We do NOT run multilingual consistency here over the API by default
        # because it doubles the run length; the in-process runner does.
        state.summary = {
            "passed": passed,
            "probe_results": probe_results,
            "latency": {"name": latency_check.name,
                          "passed": latency_check.passed,
                          "detail": latency_check.detail},
            "coverage": cov_payload,
        }
        state.status = "done"
        emit("done", {"passed": passed})
    except Exception as exc:  # pragma: no cover - defensive
        state.status = "failed"
        emit("error", {"message": str(exc)})
    finally:
        state.finished_at = time.time()
        # Sentinel so SSE consumers can break their loop.
        state.queue.put_nowait(RunEvent(seq=-1, type="__end__"))


# ---- request models ----

class StartRunRequest(BaseModel):
    scenario: str


class StartRunResponse(BaseModel):
    run_id: str


# ---- app ----

app = FastAPI(
    title="Dialog Regression Harness API",
    description=(
        "HTTP wrapper around the dialog-harness Python core. Used by the "
        "Next.js educator surface in /web."
    ),
    version="0.2.0",
)

# CORS for the Vercel front-end + local dev.
_default_origins = [
    "http://localhost:3000",
    "https://involvexr-dialog-harness.vercel.app",
]
extra_origins = [
    o.strip()
    for o in os.environ.get("DIALOG_HARNESS_CORS_ORIGINS", "").split(",")
    if o.strip()
]
allow_all = os.environ.get("DIALOG_HARNESS_CORS_ALLOW_ALL") == "1"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else (_default_origins + extra_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def banner() -> dict[str, Any]:
    return {
        "service": "dialog-harness-api",
        "version": "0.2.0",
        "scenarios": [s["name"] for s in _list_scenarios()],
    }


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/scenarios")
def list_scenarios() -> dict[str, Any]:
    return {"scenarios": _list_scenarios()}


@app.get("/api/scenarios/{name}")
def get_scenario(name: str) -> dict[str, Any]:
    scenario, path = _load_by_name(name)
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return {
        "name": path.stem,
        "raw": raw,
        "scenario": scenario.model_dump(),
    }


@app.get("/api/coverage/{name}")
def get_coverage(name: str) -> dict[str, Any]:
    scenario, _path = _load_by_name(name)
    coverage = analyze_coverage(scenario)
    return {
        "scenario": scenario.id,
        "percent": coverage.percent,
        "threshold": coverage.threshold,
        "objectives": [asdict(o) for o in coverage.objectives],
    }


@app.post("/api/runs", response_model=StartRunResponse)
async def start_run(req: StartRunRequest) -> StartRunResponse:
    # Validate scenario name early so the caller gets a 404 synchronously.
    _load_by_name(req.scenario)
    run_id = uuid.uuid4().hex
    state = RunState(
        run_id=run_id, scenario_name=req.scenario, started_at=time.time()
    )
    _RUNS[run_id] = state
    asyncio.create_task(_execute_run(state))
    return StartRunResponse(run_id=run_id)


@app.get("/api/runs/{run_id}")
def get_run(run_id: str) -> dict[str, Any]:
    state = _RUNS.get(run_id)
    if not state:
        raise HTTPException(status_code=404, detail="run not found")
    return {
        "run_id": state.run_id,
        "scenario": state.scenario_name,
        "status": state.status,
        "started_at": state.started_at,
        "finished_at": state.finished_at,
        "events": [asdict(e) for e in state.events],
        "summary": state.summary,
    }


@app.get("/api/runs/{run_id}/stream")
async def stream_run(run_id: str) -> EventSourceResponse:
    state = _RUNS.get(run_id)
    if not state:
        raise HTTPException(status_code=404, detail="run not found")

    async def event_generator():
        # Replay any events that have already happened so a late subscriber
        # doesn't miss anything.
        for ev in list(state.events):
            yield {"event": ev.type, "data": _json(ev.payload)}
        while True:
            ev = await state.queue.get()
            if ev.type == "__end__":
                break
            yield {"event": ev.type, "data": _json(ev.payload)}

    return EventSourceResponse(event_generator())


def _json(payload: dict[str, Any]) -> str:
    import json

    return json.dumps(payload, default=str)
