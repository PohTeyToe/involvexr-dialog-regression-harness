import Link from "next/link";
import { ArrowRight, Brain, GitBranch, Languages, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-3xl space-y-6">
            <Badge variant="outline" className="font-mono text-[10px]">
              v0.2 · sketch · for a conversation with Lumeto
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
              Regression-testing non-deterministic
              <br />
              <span className="text-[var(--muted-foreground)]">AI patient dialog.</span>
            </h1>
            <p className="text-lg text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
              A sketch of the test harness for an InvolveXR-style platform — built while
              preparing for a conversation with Lumeto. Scenario YAML, structured probes,
              semantic assertions, N-of-M consensus voting, and coverage tied to learner
              objectives.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/scenarios">
                  Open a scenario <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/run">Run a regression</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a
                  href="https://github.com/PohTeyToe/involvexr-dialog-regression-harness"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  View source
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature trio */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <Feature
            icon={Brain}
            title="Semantic assertions"
            body="Test that the patient says clinically true things, not exact strings. Mention checks, banned-term checks, and a persona-fidelity score keep tests stable when the LLM rerolls its surface text every run."
          />
          <Feature
            icon={ShieldCheck}
            title="Consensus voting"
            body="Tolerate variance, catch drift. M-of-N pass thresholds across multiple samples reduce flake without sweeping real regressions under the rug."
          />
          <Feature
            icon={Languages}
            title="Multi-language"
            body="Five-language support with concept-presence checks across translations. The same scenario can ship in EN, ES, FR, DE, JA without rewriting assertions."
          />
        </div>
      </section>

      {/* Why this exists */}
      <section className="border-t border-[var(--border)] bg-[var(--card)]/40">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              context
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight">Why this exists</h2>
          </div>
          <div className="prose-sm space-y-4 text-[var(--muted-foreground)] leading-relaxed">
            <p>
              The hard part isn&apos;t running tests — it&apos;s deciding what
              &quot;passes&quot; means when the same learner utterance can produce a
              clinically correct answer on Monday and a hallucinated medication on Tuesday,
              across English, Spanish, and French, across VR, web, desktop, and the
              browser-based modality, and across faculty-customized scenarios.
            </p>
            <p>
              Record-and-replay falls over because the surface text changes every run while
              the clinical content is what actually has to stay correct. This repo is one
              shape of an answer: scenario YAML, structured probes, semantic assertions,
              N-of-M consensus voting for flake control, and a coverage view tied to
              learner objectives.
            </p>
            <p>
              The clinical scenarios and assertion patterns are public-knowledge
              approximations — the real value would come from grounding them in actual
              InvolveXR scenario data and faculty assessment rubrics.
            </p>
          </div>
        </div>
      </section>

      {/* Repo tour */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16">
        <div className="space-y-2 mb-8">
          <Badge variant="outline" className="font-mono text-[10px]">
            structure
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">Repository</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <RepoRow
            path="python/"
            blurb="Harness core: scenario loader, probe runner, semantic & latency assertions, consensus voting, coverage, FastAPI server. The real logic."
          />
          <RepoRow
            path="scenarios/"
            blurb="YAML scenarios shared by every language target. Three sample scenarios: difficult airway, pediatric code blue, breaking bad news."
          />
          <RepoRow
            path="web/"
            blurb="This Next.js educator surface — streams live runs over SSE, renders coverage, shows past reports."
          />
          <RepoRow
            path="dotnet/"
            blurb="Thin C#/ASP.NET wrapper so a Lumeto-style backend can shell out to the harness from existing SpecFlow or xUnit suites."
          />
          <RepoRow
            path="docs/"
            blurb="Design tradeoffs, SpecFlow/Gherkin mapping, ACF integration sketch, sketch-to-production gap analysis."
          />
          <RepoRow
            path="reports/"
            blurb="Generated HTML reports. CI artifact upload-friendly. One file per run, side-by-side diffs across runs."
          />
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-base mt-2">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function RepoRow({ path, blurb }: { path: string; blurb: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
      <GitBranch className="h-4 w-4 mt-0.5 text-[var(--muted-foreground)] shrink-0" />
      <div>
        <div className="font-mono text-sm font-medium">{path}</div>
        <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">{blurb}</p>
      </div>
    </div>
  );
}
