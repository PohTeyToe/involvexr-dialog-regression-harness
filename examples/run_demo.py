"""One-line runnable demo: python examples/run_demo.py"""

from __future__ import annotations

from pathlib import Path

from dialog_harness.mock_llm import MockLLMClient
from dialog_harness.report import render_report
from dialog_harness.runner import ProbeRunner
from dialog_harness.scenario import load_scenario


def main() -> None:
    repo = Path(__file__).resolve().parent.parent
    for fname in (
        "difficult_airway.yaml",
        "code_blue_pediatric.yaml",
        "breaking_bad_news.yaml",
    ):
        scenario = load_scenario(repo / "scenarios" / fname)
        runner = ProbeRunner(MockLLMClient(persona=scenario.patient))
        report = runner.run(scenario)
        out = render_report(report, out_dir=repo / "reports")
        status = "PASS" if report.passed else "FAIL"
        print(f"[{status}] {scenario.id} -> {out}")


if __name__ == "__main__":
    main()
