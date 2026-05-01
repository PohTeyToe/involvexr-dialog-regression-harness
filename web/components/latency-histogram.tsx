"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

type Props = {
  latencies: number[];
  budgetMs: number;
};

export function LatencyHistogram({ latencies, budgetMs }: Props) {
  if (!latencies.length) return null;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies, budgetMs);
  const buckets = 8;
  const step = Math.max(50, Math.ceil((max - min) / buckets));
  const data = Array.from({ length: buckets }, (_, i) => {
    const lo = min + i * step;
    const hi = lo + step;
    const count = latencies.filter((l) => l >= lo && l < hi).length;
    return { range: `${lo}`, label: `${lo}-${hi}`, count };
  });
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            stroke="var(--border)"
            tickLine={false}
            label={{ value: "ms", position: "insideBottom", offset: -2, fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            stroke="var(--border)"
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            formatter={(v: number, _n, p) => [`${v} probe(s)`, (p.payload as { label: string }).label + " ms"]}
            labelFormatter={() => ""}
          />
          <ReferenceLine
            x={budgetMs.toString()}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            label={{ value: "budget", fill: "var(--warning)", fontSize: 10, position: "top" }}
          />
          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
