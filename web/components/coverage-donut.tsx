"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export function CoverageDonut({
  covered,
  total,
}: {
  covered: number;
  total: number;
}) {
  const remaining = Math.max(0, total - covered);
  const data = [
    { name: "Covered", value: covered, color: "var(--success)" },
    { name: "Uncovered", value: remaining, color: "var(--border)" },
  ];
  const pct = total === 0 ? 0 : Math.round((covered / total) * 100);
  return (
    <div className="relative h-44 w-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={56}
            outerRadius={78}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold">{pct}%</span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {covered} of {total}
        </span>
      </div>
    </div>
  );
}
