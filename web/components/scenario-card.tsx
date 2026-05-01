import Link from "next/link";
import { ArrowRight, Globe, ListChecks, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Scenario } from "@/lib/types";

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  return (
    <Link
      href={`/scenarios/${scenario.name}`}
      className="group block focus-visible:outline-none"
    >
      <Card className="h-full transition-colors group-hover:border-[var(--primary)]/40 group-focus-visible:border-[var(--primary)]/60">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{shortenTitle(scenario.title)}</CardTitle>
            <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </div>
          <CardDescription className="line-clamp-3">{scenario.patient}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {scenario.languages.map((l) => (
              <Badge key={l} variant="outline">
                <Globe className="h-3 w-3" /> {l.toUpperCase()}
              </Badge>
            ))}
          </div>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Probes" icon={ListChecks} value={scenario.probes.length} />
            <Stat label="Objectives" icon={Target} value={scenario.learner_objectives.length} />
            <Stat
              label="Latency"
              icon={() => null}
              value={`${scenario.latency_budget_ms} ms`}
              monoValue
            />
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({
  label,
  icon: Icon,
  value,
  monoValue,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  monoValue?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        <Icon className="h-3 w-3" />
        {label}
      </dt>
      <dd className={monoValue ? "font-mono text-xs" : "text-sm font-medium"}>{value}</dd>
    </div>
  );
}

function shortenTitle(t: string): string {
  // Trim very long full titles for cards
  return t.length > 70 ? t.slice(0, 67) + "..." : t;
}
