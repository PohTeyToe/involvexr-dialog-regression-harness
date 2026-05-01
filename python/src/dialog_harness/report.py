"""Self-contained HTML report renderer.

Inline CSS, inline SVG charts, no external network dependencies. The output
is one HTML file that can be opened in any browser, attached to a CI
artifact, or screenshotted into a slide.
"""

from __future__ import annotations

import html
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Template

from dialog_harness.coverage import CoverageReport
from dialog_harness.runner import RunReport


def _latency_histogram_svg(latencies: list[int], width: int = 720, height: int = 160) -> str:
    """Render an inline SVG histogram + p50/p95 markers. No external libs."""
    if not latencies:
        return ""
    samples = sorted(latencies)
    lo, hi = samples[0], samples[-1]
    if hi == lo:
        hi = lo + 1
    bins = 12
    bin_w = (hi - lo) / bins
    counts = [0] * bins
    for s in samples:
        idx = min(bins - 1, int((s - lo) / bin_w)) if bin_w else 0
        counts[idx] += 1
    max_count = max(counts) or 1

    pad_l, pad_r, pad_t, pad_b = 32, 16, 16, 28
    inner_w = width - pad_l - pad_r
    inner_h = height - pad_t - pad_b
    bar_w = inner_w / bins

    bars: list[str] = []
    for i, c in enumerate(counts):
        bh = (c / max_count) * inner_h if max_count else 0
        bars.append(
            f'<rect x="{pad_l + i * bar_w:.1f}" '
            f'y="{pad_t + inner_h - bh:.1f}" '
            f'width="{bar_w - 2:.1f}" height="{bh:.1f}" rx="2" '
            f'fill="#4f46e5" opacity="0.85"></rect>'
        )

    def pct(p: float) -> int:
        rank = p * (len(samples) - 1)
        a, b = int(rank), min(int(rank) + 1, len(samples) - 1)
        frac = rank - a
        return int(round(samples[a] + (samples[b] - samples[a]) * frac))

    p50, p95 = pct(0.5), pct(0.95)

    def to_x(value: int) -> float:
        if hi == lo:
            return pad_l + inner_w / 2
        return pad_l + ((value - lo) / (hi - lo)) * inner_w

    def vline(x: float, label: str, color: str) -> str:
        return (
            f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{pad_t}" '
            f'y2="{pad_t + inner_h}" stroke="{color}" stroke-width="2" '
            f'stroke-dasharray="4 3"></line>'
            f'<text x="{x + 4:.1f}" y="{pad_t + 12}" font-size="11" '
            f'fill="{color}">{html.escape(label)}</text>'
        )

    axis = (
        f'<text x="{pad_l}" y="{height - 8}" font-size="11" fill="#666">'
        f'{lo} ms</text>'
        f'<text x="{width - pad_r}" y="{height - 8}" font-size="11" '
        f'text-anchor="end" fill="#666">{hi} ms</text>'
    )
    return (
        f'<svg viewBox="0 0 {width} {height}" width="100%" '
        f'preserveAspectRatio="xMidYMid meet" role="img" '
        f'aria-label="latency histogram">'
        f'{"".join(bars)}'
        f'{vline(to_x(p50), f"p50={p50}ms", "#0ea5e9")}'
        f'{vline(to_x(p95), f"p95={p95}ms", "#dc2626")}'
        f'{axis}'
        f'</svg>'
    )


def _highlight_yaml(text: str) -> str:
    """Tiny YAML highlighter, no external deps. Colors keys and comments."""
    out: list[str] = []
    for raw in text.splitlines():
        escaped = html.escape(raw)
        if "#" in escaped:
            head, comment = escaped.split("#", 1)
            escaped = f'{head}<span class="yc">#{comment}</span>'
        if ":" in escaped:
            i = escaped.find(":")
            key, rest = escaped[:i], escaped[i:]
            escaped = f'<span class="yk">{key}</span>{rest}'
        out.append(escaped)
    return "\n".join(out)


_TEMPLATE = Template(
    """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Dialog Regression Report - {{ report.scenario.title }}</title>
<style>
 :root { --bg: #f8fafc; --fg: #0f172a; --muted: #475569; --line: #e2e8f0;
   --pass: #15803d; --pass-bg: #dcfce7; --fail: #b91c1c; --fail-bg: #fee2e2;
   --accent: #4f46e5; --warn: #ca8a04; }
 * { box-sizing: border-box; }
 body { font-family: -apple-system, "Segoe UI", Roboto, Inter, sans-serif;
   max-width: 1080px; margin: 2rem auto; padding: 0 1.25rem; color: var(--fg);
   background: var(--bg); line-height: 1.5; }
 h1 { margin: 0 0 0.25rem; font-size: 1.6rem; letter-spacing: -0.01em; }
 h2 { margin: 2rem 0 0.75rem; font-size: 1.05rem; color: var(--muted);
   text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
 .meta { color: var(--muted); margin-bottom: 1.5rem; font-size: 0.9rem; }
 code { font: 0.85rem ui-monospace, Menlo, Consolas, monospace;
   background: #fff; padding: 1px 6px; border-radius: 4px;
   border: 1px solid var(--line); }
 .summary { padding: 1rem 1.25rem; border-radius: 10px; margin-bottom: 1.5rem;
   border: 1px solid var(--line); display: flex; align-items: center;
   gap: 1.5rem; flex-wrap: wrap; }
 .summary.pass { background: var(--pass-bg); border-color: #86efac; }
 .summary.fail { background: var(--fail-bg); border-color: #fca5a5; }
 .verdict { font-weight: 700; font-size: 1.1rem; }
 .verdict.pass { color: var(--pass); }
 .verdict.fail { color: var(--fail); }
 .stat { display: flex; flex-direction: column; }
 .stat .lbl { font-size: 0.75rem; text-transform: uppercase;
   color: var(--muted); letter-spacing: 0.06em; }
 .stat .val { font-weight: 600; font-size: 1rem; }
 table { width: 100%; border-collapse: separate; border-spacing: 0;
   margin-bottom: 1.5rem; background: #fff; border: 1px solid var(--line);
   border-radius: 8px; overflow: hidden; font-size: 0.9rem; }
 th, td { text-align: left; padding: 0.6rem 0.85rem;
   border-bottom: 1px solid var(--line); vertical-align: top; }
 tr:last-child td { border-bottom: none; }
 th { background: #f1f5f9; font-weight: 600; color: var(--muted);
   font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
 .badge { display: inline-block; padding: 1px 8px; border-radius: 999px;
   font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em; }
 .badge.pass { background: var(--pass); color: #fff; }
 .badge.fail { background: var(--fail); color: #fff; }
 .assertion { margin: 4px 0; font-size: 0.85rem; }
 .assertion .det { color: var(--muted); margin-left: 6px; }
 .chart { background: #fff; border: 1px solid var(--line); border-radius: 8px;
   padding: 0.75rem 1rem; }
 pre.yaml { background: #0f172a; color: #e2e8f0; padding: 1rem;
   border-radius: 8px; overflow-x: auto;
   font: 0.82rem ui-monospace, Menlo, Consolas, monospace; line-height: 1.45; }
 pre.yaml .yk { color: #93c5fd; }
 pre.yaml .yc { color: #94a3b8; font-style: italic; }
 .row-fail { background: #fef2f2; }
 .coverage-bar { background: var(--line); border-radius: 999px; height: 8px;
   overflow: hidden; margin: 4px 0 8px; }
 .coverage-fill { background: var(--pass); height: 100%; }
 .sub { color: var(--muted); font-size: 0.85rem; }
</style>
</head>
<body>
<h1>{{ report.scenario.title }}</h1>
<div class="meta">
  Scenario <code>{{ report.scenario.id }}</code>
  &middot; languages {{ report.scenario.languages | join(", ") }}
  &middot; generated {{ generated_at }}
</div>

<div class="summary {{ 'pass' if report.passed else 'fail' }}">
  <div class="verdict {{ 'pass' if report.passed else 'fail' }}">
    {{ 'PASS' if report.passed else 'FAIL' }}
  </div>
  <div class="stat"><span class="lbl">probes</span>
    <span class="val">{{ pass_count }} / {{ total }}</span></div>
  {% if report.latency_assertion %}
  <div class="stat"><span class="lbl">latency</span>
    <span class="val">{{ report.latency_assertion.detail }}</span></div>
  {% endif %}
  {% if report.language_assertion %}
  <div class="stat"><span class="lbl">language</span>
    <span class="val">
      {% if report.language_assertion.passed %}all anchors present
      {% else %}{{ report.language_assertion.detail }}{% endif %}
    </span></div>
  {% endif %}
  {% if coverage %}
  <div class="stat"><span class="lbl">coverage</span>
    <span class="val">{{ "%.0f"|format(coverage.percent) }}%
      ({{ covered_count }}/{{ coverage.objectives|length }})</span></div>
  {% endif %}
</div>

{% if latency_chart %}
<h2>Latency distribution</h2>
<div class="chart">{{ latency_chart | safe }}</div>
{% endif %}

<h2>Probe results</h2>
<table>
<thead><tr><th>#</th><th>Probe</th><th>Response</th><th>Latency</th>
  <th>Assertions</th></tr></thead>
<tbody>
{% for r in report.probe_results %}
<tr class="{{ 'row-fail' if not r.passed else '' }}">
  <td>{{ loop.index }}</td>
  <td>{{ r.probe.prompt }}</td>
  <td>{{ r.response }}</td>
  <td>{{ r.latency_ms }} ms</td>
  <td>
    {% for a in r.assertions %}
    <div class="assertion">
      <span class="badge {{ 'pass' if a.passed else 'fail' }}">{{ a.name }}</span>
      <span class="det">{{ a.detail }}</span>
    </div>
    {% endfor %}
  </td>
</tr>
{% endfor %}
</tbody>
</table>

{% if coverage %}
<h2>Coverage of learner objectives</h2>
<div class="coverage-bar">
  <div class="coverage-fill" style="width: {{ coverage.percent }}%"></div>
</div>
<table>
<thead><tr><th>Objective</th><th>Status</th><th>Probes</th>
  <th>Best similarity</th></tr></thead>
<tbody>
{% for o in coverage.objectives %}
<tr class="{{ 'row-fail' if not o.covered else '' }}">
  <td>{{ o.objective }}</td>
  <td><span class="badge {{ 'pass' if o.covered else 'fail' }}">
    {{ 'covered' if o.covered else 'uncovered' }}</span></td>
  <td>{{ o.matched_probes | join(", ") if o.matched_probes else "-" }}</td>
  <td>{{ "%.2f"|format(o.semantic_score) }}</td>
</tr>
{% endfor %}
</tbody>
</table>
{% endif %}

<h2>Scenario YAML</h2>
<pre class="yaml">{{ scenario_yaml | safe }}</pre>

<p class="sub">Generated by dialog-harness {{ version }} &middot;
  see <a href="https://github.com/PohTeyToe/involvexr-dialog-regression-harness">
  github.com/PohTeyToe/involvexr-dialog-regression-harness</a></p>
</body>
</html>
"""
)


def _scenario_to_yaml(report: RunReport) -> str:
    import yaml as _yaml

    payload = {
        "id": report.scenario.id,
        "title": report.scenario.title,
        "patient": report.scenario.patient,
        "learner_objectives": report.scenario.learner_objectives,
        "languages": report.scenario.languages,
        "latency_budget_ms": report.scenario.latency_budget_ms,
        "probes": [p.model_dump() for p in report.scenario.probes],
    }
    return _highlight_yaml(
        _yaml.safe_dump(payload, sort_keys=False, allow_unicode=True)
    )


def render_report(
    report: RunReport,
    out_dir: str | Path = "reports",
    *,
    coverage: CoverageReport | None = None,
) -> Path:
    """Write a self-contained HTML report and return its path."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = out / f"regression_{ts}.html"
    pass_count = sum(1 for r in report.probe_results if r.passed)
    latencies = [r.latency_ms for r in report.probe_results]
    chart_svg = _latency_histogram_svg(latencies) if latencies else ""

    cov = coverage
    if cov is None:
        try:
            from dialog_harness.coverage import analyze_coverage

            cov = analyze_coverage(report.scenario)
        except Exception:
            cov = None

    covered_count = (
        sum(1 for o in cov.objectives if o.covered) if cov is not None else 0
    )

    html_doc = _TEMPLATE.render(
        report=report,
        generated_at=ts,
        pass_count=pass_count,
        total=len(report.probe_results),
        latency_chart=chart_svg,
        coverage=cov,
        covered_count=covered_count,
        scenario_yaml=_scenario_to_yaml(report),
        version="0.2.0",
    )
    path.write_text(html_doc, encoding="utf-8")
    return path
