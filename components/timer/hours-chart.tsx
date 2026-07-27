"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type HoursDatum = { name: string; hours: number; color: string };

export function HoursChart({ data }: { data: HoursDatum[] }) {
  if (data.every((item) => item.hours === 0)) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        Nenhuma sessão registrada ainda.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
        <XAxis
          dataKey="name"
          stroke="var(--muted)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--muted)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit="h"
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}h`, "Estudado"]}
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
