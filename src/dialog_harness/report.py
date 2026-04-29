from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Template

from dialog_harness.runner import RunReport

_TEMPLATE = Template(
    """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Dialog Regression Report — {{ report.scenario.title }}</title>
<style>
 body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 980px; margin: 2rem auto; color: #1a1a1a; }
 h1 { margin-bottom: 0.25rem; }
 .meta { color: #666; margin-bottom: 1.5rem; }
 .summary { padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; }
 .pass { background: #e6f4ea; color: #1e6e3a; }
 .fail { background: #fdecea; color: #a02525; }
 table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
 th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #eee; vertical-align: top; }
 th { background: #f7f7f9; font-weight: 600; }
 .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.8rem; }
 .badge.pass { background: #1e6e3a; color: #fff; }
 .badge.fail { background: #a02525; color: #fff; }
 code { background: #f4f4f6; padding: 1px 4px; border-radius: 3px; }
</style>
</head>
<body>
<h1>{{ report.scenario.title }}</h1>
<div class="meta">Scenario <code>{{ report.scenario.id }}</code> &middot; generated {{ generated_at }}</div>

<div class="summary {{ 'pass' if report.passed else 'fail' }}">
  <strong>{{ 'PASS' if report.passed else 'FAIL' }}</strong>
  &mdash; {{ pass_count }}/{{ total }} probes passed
  {% if report.latency_assertion %} &middot; latency: {{ report.latency_assertion.detail }}{% endif %}
  {% if report.language_assertion %} &middot; language: {{ report.language_assertion.detail }}{% endif %}
</div>

<table>
<thead><tr><th>#</th><th>Probe</th><th>Response</th><th>Latency</th><th>Assertions</th></tr></thead>
<tbody>
{% for r in report.probe_results %}
<tr>
  <td>{{ loop.index }}</td>
  <td>{{ r.probe.prompt }}</td>
  <td>{{ r.response }}</td>
  <td>{{ r.latency_ms }} ms</td>
  <td>
    {% for a in r.assertions %}
    <div><span class="badge {{ 'pass' if a.passed else 'fail' }}">{{ a.name }}</span> {{ a.detail }}</div>
    {% endfor %}
  </td>
</tr>
{% endfor %}
</tbody>
</table>
</body>
</html>
"""
)


def render_report(report: RunReport, out_dir: str | Path = "reports") -> Path:
    """Write a self-contained HTML report and return its path."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = out / f"regression_{ts}.html"
    pass_count = sum(1 for r in report.probe_results if r.passed)
    html = _TEMPLATE.render(
        report=report,
        generated_at=ts,
        pass_count=pass_count,
        total=len(report.probe_results),
    )
    path.write_text(html, encoding="utf-8")
    return path
