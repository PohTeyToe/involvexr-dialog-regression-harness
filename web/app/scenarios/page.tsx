import { listScenarios, getScenario } from "@/lib/api";
import { ScenarioCard } from "@/components/scenario-card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-static";
export const revalidate = 60;

export default async function ScenariosPage() {
  const { scenarios, source } = await listScenarios();
  // Hydrate full details for cards
  const fullScenarios = (
    await Promise.all(scenarios.map((s) => getScenario(s.name)))
  )
    .filter((x): x is { scenario: import("@/lib/types").Scenario; source: "live" | "mock" } => !!x)
    .map((x) => x.scenario);

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-[10px]">
            {scenarios.length} scenarios · source {source}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Scenario library</h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
          Each scenario is a YAML file checked into the repo. Probes are
          structured prompts with semantic assertions on the patient&apos;s
          response. Faculty edit the YAML, the harness runs everything else.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fullScenarios.map((s) => (
          <ScenarioCard key={s.name} scenario={s} />
        ))}
      </div>
    </div>
  );
}
