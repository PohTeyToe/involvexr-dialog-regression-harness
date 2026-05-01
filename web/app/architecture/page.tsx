import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArchDiagram } from "@/components/arch-diagram";

export const metadata = { title: "Architecture · Dialog Regression Harness" };

export default function ArchitecturePage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 space-y-8">
      <div className="space-y-2">
        <Badge variant="outline" className="font-mono text-[10px]">
          how this fits InvolveXR&apos;s stack
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Architecture</h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
          The harness sits one layer above the gRPC surface, exercising the
          dialog service end-to-end like any other client. Existing tenancy,
          tracing, and CI plumbing keep working without changes.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ArchDiagram />
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-sm font-semibold">Integration points</h2>
            <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                <strong className="text-[var(--foreground)]">CI:</strong> harness runs in
                GitHub Actions / Azure Pipelines as a single command, uploads HTML report
                as build artifact, and fails the build on regression.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">OpenTelemetry:</strong>{" "}
                probes propagate <code className="font-mono text-xs">traceparent</code> so
                LLM spans show up alongside the existing service traces in App Insights.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">xUnit / SpecFlow:</strong>{" "}
                the .NET wrapper exposes the harness as a Theory data source, so existing
                fixtures can drive scenarios without rewriting assertions in C#.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">AAD B2C tenancy:</strong>{" "}
                a per-tenant scenario folder lets faculty in Hospital A and Hospital B
                evolve probes independently while sharing the harness binary.
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-sm font-semibold">What this is not</h2>
            <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                Not a replacement for SpecFlow. It augments behavior tests with
                non-deterministic-aware assertions; existing scenarios stay where they
                are.
              </li>
              <li>
                Not a load tester. Latency budgets are correctness checks, not throughput
                ones — pair with k6 / Azure Load Testing for that.
              </li>
              <li>
                Not a faculty CMS. Scenario YAML is the source of truth; an editor surface
                would belong in InvolveXR proper.
              </li>
              <li>
                Not a replacement for human review. The harness catches drift; clinical
                accuracy still needs a faculty sign-off loop.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
