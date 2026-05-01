import { Suspense } from "react";
import { listScenarios } from "@/lib/api";
import { RunPageClient } from "./run-client";

export const dynamic = "force-dynamic";

export default async function RunPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const sp = await searchParams;
  const { scenarios } = await listScenarios();
  const initial = sp.scenario ?? scenarios[0]?.name;
  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Live regression run</h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
          Pick a scenario, click Run, watch the harness exercise each probe in
          real time. The page subscribes to the FastAPI backend over Server-Sent
          Events when the API URL is configured. With no backend, the same UI
          replays a scripted mock stream so the demo always works.
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-[var(--muted-foreground)]">Loading...</div>}>
        <RunPageClient initialScenarioName={initial} scenarios={scenarios} />
      </Suspense>
    </div>
  );
}
