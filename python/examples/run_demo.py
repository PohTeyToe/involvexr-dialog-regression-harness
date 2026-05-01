"""One-line runnable demo: python examples/run_demo.py [--live]"""

from __future__ import annotations

import argparse
from pathlib import Path

from dialog_harness.mock_llm import MockLLMClient
from dialog_harness.report import render_report
from dialog_harness.runner import ProbeRunner
from dialog_harness.scenario import load_scenario


def main() -> None:
    parser = argparse.ArgumentParser(description="Dialog harness demo")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Use the real Anthropic LLM client instead of the deterministic mock.",
    )
    parser.add_argument(
        "--model",
        default="claude-sonnet-4-5",
        help="Model id when running with --live (default: claude-sonnet-4-5).",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent.parent
    scenarios_dir = repo_root / "scenarios"
    reports_dir = repo_root / "python" / "reports"

    for fname in (
        "difficult_airway.yaml",
        "code_blue_pediatric.yaml",
        "breaking_bad_news.yaml",
    ):
        scenario = load_scenario(scenarios_dir / fname)
        if args.live:
            from dialog_harness.real_llm import RealLLMClient

            client = RealLLMClient(persona=scenario.patient, model=args.model)
        else:
            client = MockLLMClient(persona=scenario.patient)
        runner = ProbeRunner(client)
        report = runner.run(scenario)
        out = render_report(report, out_dir=reports_dir)
        status = "PASS" if report.passed else "FAIL"
        print(f"[{status}] {scenario.id} -> {out}")


if __name__ == "__main__":
    main()
