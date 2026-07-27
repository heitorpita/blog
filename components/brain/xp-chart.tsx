"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { XpPoint } from "@/lib/brain";
import { formatDayLabel } from "@/lib/time";

// Série única: não precisa de legenda (o título já a nomeia) e a cor é a de
// destaque do app, validada em 3:1 contra a superfície escura.
const SERIES_COLOR = "#7c9dff";

export function XpChart({ data }: { data: XpPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        Ainda não há histórico suficiente para desenhar a curva.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />

        <XAxis
          dataKey="day"
          tickFormatter={formatDayLabel}
          stroke="var(--muted)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          stroke="var(--muted)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />

        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.2)" }}
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(day) => formatDayLabel(String(day))}
          formatter={(value, _name, item) => {
            const gained = (item?.payload as XpPoint | undefined)?.gained ?? 0;
            return [
              `${value} XP acumulados${gained ? ` (+${gained} no dia)` : ""}`,
              "Total",
            ];
          }}
        />

        <Area
          type="monotone"
          dataKey="total"
          stroke={SERIES_COLOR}
          strokeWidth={2}
          fill="url(#xpFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
