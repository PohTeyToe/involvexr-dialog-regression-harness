"use client";

import * as React from "react";
import { LiveRunStream } from "@/components/live-run-stream";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getScenario } from "@/lib/api";
import type { Scenario, ScenarioSummary } from "@/lib/types";

type Props = {
  initialScenarioName?: string;
  scenarios: ScenarioSummary[];
};

export function RunPageClient({ initialScenarioName, scenarios }: Props) {
  const [scenarioName, setScenarioName] = React.useState(
    initialScenarioName ?? scenarios[0]?.name
  );
  const [scenario, setScenario] = React.useState<Scenario | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!scenarioName) return;
    let cancelled = false;
    setLoading(true);
    getScenario(scenarioName).then((res) => {
      if (cancelled) return;
      setScenario(res?.scenario ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [scenarioName]);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5 space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            Scenario
          </label>
          <Select
            value={scenarioName ?? ""}
            options={scenarios.map((s) => ({ value: s.name, label: s.title }))}
            onChange={setScenarioName}
            aria-label="Select a scenario"
          />
        </CardContent>
      </Card>
      {loading && (
        <div className="text-sm text-[var(--muted-foreground)]">Loading scenario...</div>
      )}
      {!loading && scenario && <LiveRunStream key={scenario.name} scenario={scenario} />}
      {!loading && !scenario && (
        <div className="text-sm text-[var(--error)]">Could not load scenario.</div>
      )}
    </div>
  );
}
