import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Globe, Clock, Target, ListChecks, User } from "lucide-react";
import { getScenario } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/yaml-block";
import { renderScenarioYaml } from "@/lib/yaml";

export const dynamic = "force-dynamic";

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const data = await getScenario(name);
  if (!data) return notFound();
  const { scenario, source } = data;
  const yaml = renderScenarioYaml(scenario);

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/scenarios"
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            scenarios
          </Link>
          <span className="text-xs text-[var(--muted-foreground)]">/</span>
          <span className="text-xs font-mono">{scenario.name}</span>
          <Badge variant="outline" className="font-mono text-[10px] ml-2">
            source {source}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{scenario.title}</h1>
        <div className="flex flex-wrap gap-2">
          {scenario.languages.map((l) => (
            <Badge key={l} variant="outline">
              <Globe className="h-3 w-3" /> {l.toUpperCase()}
            </Badge>
          ))}
          <Badge variant="outline">
            <Clock className="h-3 w-3" /> {scenario.latency_budget_ms} ms budget
          </Badge>
          <Badge variant="outline">
            <ListChecks className="h-3 w-3" /> {scenario.probes.length} probes
          </Badge>
          <Badge variant="outline">
            <Target className="h-3 w-3" /> {scenario.learner_objectives.length} objectives
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[5fr_4fr]">
        {/* YAML pane */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-mono">{scenario.name}.yaml</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock code={yaml} language="yaml" />
          </CardContent>
        </Card>

        {/* Tabs pane */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="persona">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="persona">Persona</TabsTrigger>
                <TabsTrigger value="objectives">Objectives</TabsTrigger>
                <TabsTrigger value="probes">Probes</TabsTrigger>
                <TabsTrigger value="languages">Languages</TabsTrigger>
              </TabsList>
              <TabsContent value="persona">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                    <User className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {scenario.patient}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="objectives">
                <ul className="space-y-2">
                  {scenario.learner_objectives.map((o, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-md border border-[var(--border)] p-3 text-sm"
                    >
                      <span className="font-mono text-xs text-[var(--muted-foreground)] mt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="probes">
                <ul className="space-y-2">
                  {scenario.probes.map((p, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-[var(--border)] p-3 space-y-2"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs text-[var(--muted-foreground)]">
                          #{i + 1}
                        </span>
                        <p className="text-sm flex-1">{p.prompt}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-7">
                        {p.must_mention?.map((m, j) => (
                          <Badge key={`m-${j}`} variant="success">
                            mentions: {m}
                          </Badge>
                        ))}
                        {p.must_not_mention?.map((m, j) => (
                          <Badge key={`n-${j}`} variant="error">
                            forbids: {m}
                          </Badge>
                        ))}
                        {p.persona_check && <Badge variant="primary">persona check</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="languages">
                <div className="space-y-3 text-sm">
                  <div>
                    Primary language:{" "}
                    <Badge variant="outline" className="font-mono">
                      {scenario.languages[0]?.toUpperCase()}
                    </Badge>
                  </div>
                  {scenario.languages.length > 1 && (
                    <div>
                      Translated targets:{" "}
                      {scenario.languages.slice(1).map((l) => (
                        <Badge key={l} variant="outline" className="ml-1 font-mono">
                          {l.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {scenario.keyword_translations && (
                    <div className="pt-2">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                        Keyword translations
                      </div>
                      <table className="w-full text-xs font-mono">
                        <tbody>
                          {Object.entries(scenario.keyword_translations).map(([k, v]) => (
                            <tr key={k} className="border-t border-[var(--border)]">
                              <td className="py-1.5 pr-3 text-[var(--muted-foreground)]">{k}</td>
                              {Object.entries(v).map(([lang, term]) => (
                                <td key={lang} className="py-1.5 pr-3">
                                  <span className="text-[var(--muted-foreground)]">{lang}:</span>{" "}
                                  {term}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href={`/run?scenario=${scenario.name}`}>
            Run this scenario <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
