import Link from "next/link";
import {
  Boxes,
  GitFork,
  Languages,
  Sparkles,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/yaml-block";
import { ArchDiagram } from "@/components/arch-diagram";
import { ConsensusVisual } from "@/components/consensus-visual";
import { PresentLiveRun } from "@/components/present-live-run";
import { PresentSidebar, type PresentSection } from "@/components/present-sidebar";
import { listScenarios } from "@/lib/api";
import type { ScenarioSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Walkthrough · Dialog Regression Harness",
  description:
    "Comprehensive walkthrough of the dialog regression harness — the framing, the assumptions, and the architecture.",
};

const SECTIONS: PresentSection[] = [
  { id: "hero", label: "Opening" },
  { id: "problem", label: "The problem" },
  { id: "approach", label: "Why not the obvious" },
  { id: "scenarios", label: "Scenarios" },
  { id: "live-run", label: "Live run" },
  { id: "assertions", label: "Assertions" },
  { id: "consensus", label: "Consensus voting" },
  { id: "architecture", label: "Architecture" },
  { id: "csharp", label: "Python ↔ C#" },
  { id: "specflow", label: "SpecFlow mapping" },
  { id: "decisions", label: "Assumptions" },
  { id: "stack", label: "Stack" },
  { id: "close", label: "Close" },
];

const ASSERTIONS: { name: string; purpose: string; signature: string }[] = [
  {
    name: "assert_mentions",
    purpose: "Response must contain each anchor term — case-insensitive substring.",
    signature:
      "def assert_mentions(response: str, terms: list[str]) -> AssertionResult",
  },
  {
    name: "assert_does_not_mention",
    purpose: "Response must contain none of the banned terms — catches hallucinated meds and contraindications.",
    signature:
      "def assert_does_not_mention(response: str, banned: list[str]) -> AssertionResult",
  },
  {
    name: "assert_stays_in_character",
    purpose: "Cosine similarity between response and persona — TF-IDF fallback when embeddings are unavailable.",
    signature:
      "def assert_stays_in_character(response: str, persona: str, threshold: float = 0.05) -> AssertionResult",
  },
  {
    name: "assert_latency_p95",
    purpose: "p95 latency over a sample must stay under the scenario's budget.",
    signature:
      "def assert_latency_p95(latencies_ms: list[int], ceiling_ms: int) -> AssertionResult",
  },
  {
    name: "assert_language_consistency",
    purpose: "Every translated variant must surface the translated form of each anchor concept.",
    signature:
      "def assert_language_consistency(\n    responses_by_lang: dict[str, str],\n    keyword_translations: dict[str, dict[str, str]],\n) -> AssertionResult",
  },
];

const PY_MENTIONS = `def assert_mentions(response: str, terms: list[str]) -> AssertionResult:
    body = response.lower()
    missing = [t for t in terms if t.lower() not in body]
    return AssertionResult(
        name="mentions",
        passed=not missing,
        detail=f"missing: {missing}" if missing else "all terms present",
    )`;

const CS_MENTIONS = `public static class DialogAssertions
{
    public static AssertionResult AssertMentions(
        string response,
        IEnumerable<string> terms)
    {
        var body = response.ToLowerInvariant();
        var missing = terms
            .Where(t => !body.Contains(
                t.ToLowerInvariant(),
                StringComparison.Ordinal))
            .ToList();

        return new AssertionResult(
            Name: "mentions",
            Passed: missing.Count == 0,
            Detail: missing.Count == 0
                ? "all terms present"
                : $"missing: [{string.Join(", ", missing)}]");
    }
}`;

const GHERKIN_EXAMPLE = `Feature: Difficult Airway scenario
  As a learner running anesthesia simulation
  I want the patient agent to behave consistently
  So that my pre-op assessment practice is clinically grounded

  Background:
    Given the patient persona is "65yo male with OSA, prior failed intubation, Mallampati IV, anxious"
    And the latency budget is 2500 ms
    And the LLM client is mocked

  Scenario: Patient discloses prior difficult airway history
    When the learner says "Have you ever had trouble being put to sleep for surgery before?"
    Then the response should mention "difficult airway"
    And the response should not mention "fictomycin"
    And the response should stay in character

  Scenario: Patient discusses overnight breathing
    When the learner says "Tell me about your breathing at night."
    Then the response should mention "sleep apnea"
    And the response should not mention "fictomycin"

  Scenario: P95 latency under budget
    When the learner runs the full probe set 10 times
    Then the p95 latency should be under 2500 ms`;

const TOP_DECISIONS: { title: string; assumed: string; might: string; would: string }[] = [
  {
    title: "N-of-M consensus voting",
    assumed:
      "Flake handling for LLM dialog should be N-of-M consensus voting — run the same assertion N times, require M to pass.",
    might:
      "Consensus eats N times the API budget. If a temperature-zero shadow backend exists, asserting against that once is cheaper.",
    would:
      "Ship both: a strict suite against a temp-zero reference (catches code regressions) and a drift suite running N-of-M against production (catches model regressions).",
  },
  {
    title: "Semantic similarity for persona drift",
    assumed:
      "Persona fidelity is cosine similarity between response and persona description, with a TF-IDF offline fallback.",
    might:
      "TF-IDF on short responses is shallow. \"I am an OpenAI language model\" can score similarly to a real persona on word overlap.",
    would:
      "Ask if faculty-flagged out-of-character recordings exist; if yes, fine-tune a tiny classifier; if not, add an LLM-as-judge tier for high-stakes scenarios.",
  },
  {
    title: "Scenario YAML, not Gherkin",
    assumed:
      "Scenarios are best authored as YAML — pure data, no imperative steps — because semantic assertions don't compose as Given/When/Then.",
    might:
      "Lumeto lists SpecFlow under skills useful for the role. Faculty already writing Gherkin would be context-switched into a second DSL.",
    would:
      "Keep the harness core driven by structured probes but add a Gherkin → YAML transpiler so .feature files can be the source of truth.",
  },
  {
    title: "Python core, C# wrapper, JS surface",
    assumed:
      "The harness lives in Python (because embeddings and eval tooling do) with a thin C# wrapper for existing xUnit / SpecFlow suites.",
    might:
      "If the production stack is .NET top-to-bottom, a Python sidecar is operational tax — second runtime, second deploy lane, second pipeline.",
    would:
      "Ask how aggressively a unified .NET stack matters; if the answer is firm, port the assertion library to C# directly. The data structures are simple.",
  },
  {
    title: "Offline by default",
    assumed:
      "CI portability beats realism, so the default uses MockLLMClient and disables embeddings. Live runs are gated behind env flags.",
    might:
      "An offline mock can drift from real provider failure modes silently — it never returns 429, never times out, never produces a stylistically unfaithful response.",
    would:
      "Add a nightly job against the real provider with results posted to Slack and a flake budget enforced (e.g. fail if mock-vs-real divergence exceeds 5% week-over-week).",
  },
];

export default async function PresentPage() {
  const { scenarios }: { scenarios: ScenarioSummary[] } = await listScenarios();

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
      <div className="flex gap-10">
        <PresentSidebar sections={SECTIONS} />

        <div className="min-w-0 flex-1 max-w-4xl">
          {/* Hero */}
          <section id="hero" className="scroll-mt-24">
            <div className="space-y-6">
              <Badge variant="outline" className="font-mono text-[10px]">
                walkthrough · 15-20 min
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
                Regression-testing non-deterministic
                <br />
                <span className="text-[var(--muted-foreground)]">AI patient dialog.</span>
              </h1>
              <p className="text-lg text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
                A sketch of the test harness for an InvolveXR-style platform.
              </p>
              <Card className="border-l-2 border-l-[var(--primary)]">
                <CardContent className="p-6">
                  <p className="text-base leading-relaxed italic">
                    &ldquo;The framing for me on this project was — what does it mean
                    to regression-test a non-deterministic AI patient? Because the
                    obvious approaches don&apos;t work.&rdquo;
                  </p>
                </CardContent>
              </Card>
              <div className="flex flex-wrap gap-2 pt-2">
                <StatPill label="43 Python tests" />
                <StatPill label="53 .NET tests" />
                <StatPill label="3 clinical scenarios" />
              </div>
            </div>
          </section>

          {/* Problem */}
          <section id="problem" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="01 · the problem"
              title="Four orthogonal sources of regression"
              caption="Every one of these can break the patient dialog. Most test stacks address at most one."
            />
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <ProblemCard
                icon={Boxes}
                title="Multi-surface"
                body="VR · Web · Desktop · OnScreen Pixel Streaming. The same scenario must hold across renderers with very different latency and modality affordances."
              />
              <ProblemCard
                icon={Languages}
                title="Multi-language"
                body="Five languages at NYC H+H Queens alone. Clinical anchors must surface in EN, ES, FR, DE, JA without rewriting assertions per locale."
              />
              <ProblemCard
                icon={Sparkles}
                title="Non-deterministic LLM dialog"
                body="The same learner utterance can yield a clinically correct answer Monday and a hallucinated medication Tuesday. Surface text rerolls every run."
              />
              <ProblemCard
                icon={GitFork}
                title="Faculty-customized scenarios"
                body="Hospital A's faculty edits probes that Hospital B never sees. Tenancy means the scenario set is per-customer and changes weekly."
              />
            </div>
          </section>

          {/* Approach */}
          <section id="approach" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="02 · why not the obvious"
              title="Three patterns that fail here"
              caption="Each of these works for deterministic systems. Each breaks for AI dialog in a specific, predictable way."
            />
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <FailCard
                title="Record-and-replay"
                body="Breaks the second the model version bumps. The clinical content stays correct; the surface text rerolls. The replay diff is 100% noise."
              />
              <FailCard
                title="Snapshot testing"
                body="Brittle when surface text rerolls. Snapshots that capture model output force you to rewrite goldens every release — they stop catching real regressions."
              />
              <FailCard
                title="String matching"
                body="Misses semantic equivalence. The patient may say 'I have trouble breathing at night' or 'I struggle to breathe overnight' — both correct, neither identical."
              />
            </div>
          </section>

          {/* Scenarios */}
          <section id="scenarios" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="03 · scenarios"
              title="Three clinical scenarios in the demo"
              caption="Each is structured probes, must-mention anchors, must-not-mention bans, and learner objectives."
            />
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              {scenarios.slice(0, 3).map((s) => (
                <ScenarioMiniCard key={s.name} scenario={s} />
              ))}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-4">
              Pulled live from the FastAPI backend at <code className="font-mono">/api/scenarios</code>;
              falls back to bundled mock data if the backend is unreachable.
            </p>
          </section>

          {/* Live run */}
          <section id="live-run" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="04 · live run"
              title="Watch the harness work"
              caption="Pick a scenario. The page subscribes to the FastAPI backend over Server-Sent Events; if the backend is offline, a scripted mock stream renders the same UI."
            />
            <div className="mt-6">
              <PresentLiveRun scenarios={scenarios} />
            </div>
          </section>

          {/* Assertions */}
          <section id="assertions" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="05 · assertions"
              title="Five primitives the scenarios compose from"
              caption="Each assertion returns a structured AssertionResult — name, passed, detail — so the runner, the consensus layer, and the report can all consume them uniformly."
            />
            <div className="space-y-5 mt-6">
              {ASSERTIONS.map((a) => (
                <Card key={a.name}>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-baseline justify-between gap-4 flex-wrap">
                      <h3 className="font-mono text-sm font-semibold text-[var(--primary)]">
                        {a.name}
                      </h3>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {a.purpose}
                      </span>
                    </div>
                    <CodeBlock code={a.signature} language="python" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Consensus */}
          <section id="consensus" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="06 · consensus voting"
              title="Tolerate variance, catch drift"
              caption="Run the assertion N times. Pass if M succeed. The threshold is per-scenario — high-stakes anchors get tight thresholds, soft persona checks get looser ones."
            />
            <Card className="mt-6">
              <CardContent className="p-8">
                <ConsensusVisual />
              </CardContent>
            </Card>
            <p className="text-sm text-[var(--muted-foreground)] mt-4 leading-relaxed max-w-2xl">
              The consensus utility ships a single primitive —{" "}
              <code className="font-mono text-xs">consensus(fn, runs=5, threshold=4)</code> —
              and a latency dual that takes p95 across runs. Run A passes (4/5 ≥ threshold);
              Run B fails (2/5) — the drift signal you actually want to investigate.
            </p>
          </section>

          {/* Architecture */}
          <section id="architecture" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="07 · architecture"
              title="Where the harness sits"
              caption="One layer above the gRPC surface — exercising the dialog service end-to-end like any other client."
            />
            <Card className="mt-6">
              <CardContent className="p-6">
                <ArchDiagram />
              </CardContent>
            </Card>
            <p className="text-sm text-[var(--muted-foreground)] mt-4 leading-relaxed max-w-2xl">
              Blue marks harness additions; gray marks the existing Lumeto stack.
              The integration point is the same gRPC / HTTPS edge that VR, Web,
              Desktop, and Pixel Streaming clients hit — no new auth path, no new
              tenancy logic, no schema migration. Existing tracing and CI plumbing
              keep working unchanged.
            </p>
          </section>

          {/* C# */}
          <section id="csharp" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="08 · python ↔ c#"
              title="The patterns translate cleanly"
              caption="Same shape, same name, same return type — only the standard library differs. Shown here for assert_mentions; the full mapping covers all five."
            />
            <div className="grid gap-4 lg:grid-cols-2 mt-6">
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-mono">
                  python
                </div>
                <CodeBlock code={PY_MENTIONS} language="python" />
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-mono">
                  c#
                </div>
                <CodeBlock code={CS_MENTIONS} language="csharp" />
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-4 leading-relaxed max-w-2xl">
              The patterns translate cleanly to your stack — see{" "}
              <code className="font-mono text-xs">dotnet/</code> and{" "}
              <code className="font-mono text-xs">docs/csharp_equivalents.md</code> for
              the full mapping across all five assertions.
            </p>
          </section>

          {/* SpecFlow */}
          <section id="specflow" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="09 · specflow mapping"
              title="If faculty already write Gherkin"
              caption="The harness's structured probes are isomorphic to a Background + Scenario block. SpecFlow .feature files can act as the source of truth via a thin transpiler."
            />
            <div className="mt-6">
              <CodeBlock code={GHERKIN_EXAMPLE} language="gherkin" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-4 leading-relaxed max-w-2xl">
              <code className="font-mono text-xs">Background</code> holds shared
              setup (persona, latency budget, mock client) so each{" "}
              <code className="font-mono text-xs">Scenario</code> reads as short as
              the YAML probe block. The <code className="font-mono text-xs">Then</code>{" "}
              steps map 1:1 onto the assertion library above.
            </p>
          </section>

          {/* Decisions */}
          <section id="decisions" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="10 · assumptions"
              title="Top five things I assumed"
              caption="Every entry is the same shape: I assumed X · this might be wrong because Y · with access to your systems I would Z."
            />
            <div className="space-y-4 mt-6">
              {TOP_DECISIONS.map((d, i) => (
                <Card key={d.title}>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-base font-semibold tracking-tight">
                        {d.title}
                      </h3>
                    </div>
                    <DecisionRow label="Assumed" body={d.assumed} />
                    <DecisionRow label="Might be wrong" body={d.might} />
                    <DecisionRow label="Would do with access" body={d.would} />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-6 border-l-2 border-l-[var(--primary)]">
              <CardContent className="p-6">
                <p className="text-base italic leading-relaxed">
                  &ldquo;This is where I&apos;d want your feedback most. Where do
                  you think I&apos;m off?&rdquo;
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Stack */}
          <section id="stack" className="scroll-mt-24 mt-32">
            <SectionHeader
              eyebrow="11 · stack"
              title="What's actually in the repo"
              caption="Both stacks live here. Both are CI-validated."
            />
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <StackCard
                title="Python harness"
                rows={[
                  ["Tests", "43"],
                  ["Lines of code", "~1,500"],
                  ["CI", "green on Python 3.11 and 3.12"],
                  ["Surface", "FastAPI + SSE for the live runner"],
                ]}
              />
              <StackCard
                title=".NET wrapper"
                rows={[
                  ["Tests", "53 (Core 36 · Api 14 · Specs 3)"],
                  ["Runtime", ".NET 8"],
                  ["CI", "green on Windows + Linux"],
                  ["Surface", "thin REST + xUnit + SpecFlow steps"],
                ]}
              />
            </div>
          </section>

          {/* Close */}
          <section id="close" className="scroll-mt-24 mt-32 mb-20">
            <Card className="border-l-2 border-l-[var(--primary)]">
              <CardContent className="p-8 space-y-5">
                <h2 className="text-2xl font-semibold tracking-tight">
                  That&apos;s the tour.
                </h2>
                <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
                  The DECISIONS file is where I&apos;d most want your feedback.
                  Where do you think I&apos;m off?
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <CloseLink
                    href="https://github.com/PohTeyToe/involvexr-dialog-regression-harness"
                    label="Repo"
                    external
                  />
                  <CloseLink
                    href="https://github.com/PohTeyToe/involvexr-dialog-regression-harness/blob/main/python/DECISIONS.md"
                    label="DECISIONS.md"
                    external
                  />
                  <CloseLink href="/architecture" label="Architecture long-form" />
                  <CloseLink
                    href="https://github.com/PohTeyToe/involvexr-dialog-regression-harness/blob/main/docs/csharp_equivalents.md"
                    label="C# equivalents"
                    external
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function StatPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 font-mono text-[11px] text-[var(--foreground)]">
      {label}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-mono">
        {eyebrow}
      </div>
      <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h2>
      {caption && (
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
          {caption}
        </p>
      )}
    </div>
  );
}

function ProblemCard({
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
      <CardContent className="p-6 space-y-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--primary)]">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}

function FailCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--error)_18%,transparent)] text-[var(--error)]">
          <X className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}

function ScenarioMiniCard({ scenario }: { scenario: ScenarioSummary }) {
  return (
    <Link
      href={`/scenarios/${encodeURIComponent(scenario.name)}`}
      className="group block"
    >
      <Card className="h-full transition-colors group-hover:border-[var(--primary)]">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold tracking-tight leading-snug">
            {scenario.title}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {scenario.languages.map((lang) => (
              <span
                key={lang}
                className="font-mono text-[10px] rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-[var(--muted-foreground)]"
              >
                {lang}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] pt-1">
            <span>
              <span className="font-mono">{scenario.probe_count}</span> probes
            </span>
            <span>
              <span className="font-mono">{scenario.objective_count}</span> objectives
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DecisionRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-mono pt-0.5">
        {label}
      </span>
      <p className="text-sm leading-relaxed text-[var(--foreground)]">{body}</p>
    </div>
  );
}

function StackCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <dl className="space-y-2">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] pb-1.5 last:border-b-0"
            >
              <dt className="text-xs text-[var(--muted-foreground)]">{k}</dt>
              <dd className="text-sm font-mono text-[var(--foreground)] text-right">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function CloseLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
      >
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
