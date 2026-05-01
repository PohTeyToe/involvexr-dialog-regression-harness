// Minimal YAML rendering for displaying scenarios. We don't need to round-trip
// arbitrary YAML -- we just produce a stable, readable representation of our
// known Scenario shape.

import type { Scenario } from "./types";

export function renderScenarioYaml(s: Scenario): string {
  const lines: string[] = [];
  lines.push(`id: ${s.id}`);
  lines.push(`title: ${quote(s.title)}`);
  lines.push(`patient: >`);
  for (const para of s.patient.split(/\s*\n\s*/)) {
    lines.push(`  ${para}`);
  }
  lines.push(`learner_objectives:`);
  for (const o of s.learner_objectives) {
    lines.push(`  - ${o}`);
  }
  lines.push(`latency_budget_ms: ${s.latency_budget_ms}`);
  lines.push(`languages: [${s.languages.join(", ")}]`);
  if (s.keyword_translations) {
    lines.push(`keyword_translations:`);
    for (const [key, langs] of Object.entries(s.keyword_translations)) {
      lines.push(`  ${key}:`);
      for (const [lang, term] of Object.entries(langs)) {
        lines.push(`    ${lang}: ${term}`);
      }
    }
  }
  lines.push(`probes:`);
  for (const p of s.probes) {
    lines.push(`  - prompt: ${quote(p.prompt)}`);
    if (p.must_mention?.length) {
      lines.push(`    must_mention: [${p.must_mention.map(quoteShort).join(", ")}]`);
    }
    if (p.must_not_mention?.length) {
      lines.push(`    must_not_mention: [${p.must_not_mention.map(quoteShort).join(", ")}]`);
    }
    if (p.persona_check) {
      lines.push(`    persona_check: true`);
    }
  }
  return lines.join("\n");
}

function quote(s: string): string {
  if (/[:{}\[\],&*#?|<>=!%@`]/.test(s) || s.includes('"')) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return `"${s}"`;
}
function quoteShort(s: string): string {
  return `"${s}"`;
}
