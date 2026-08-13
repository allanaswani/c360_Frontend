'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisDateFormatter, dayMonth, fmtValue, seriesColor } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';

interface S { name: string; dataKey: string; colorRole: number }

/** Stacked area — the parts stack, so the total height reads as the whole while
 *  each band shows its split. Used for the relationship trend (deposits + loans). */
export function StackedAreaChart({
  data, series, fmt, height = 196,
}: {
  data: Record<string, number | string>[];
  series: S[];
  fmt: 'kes' | 'count' | 'pct';
  height?: number;
}) {
  const colors = series.map((s) => seriesColor(s.colorRole));
  const tickFmt = axisDateFormatter(data);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.dataKey} id={`sa-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[i]} stopOpacity={0.42} />
                <stop offset="100%" stopColor={colors[i]} stopOpacity={0.08} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickFormatter={(v) => tickFmt(v)} tickLine={false} axisLine={false} minTickGap={38} dy={6} />
          <YAxis tickFormatter={(v) => fmtValue(Number(v), fmt)} tickLine={false} axisLine={false} width={fmt === 'kes' ? 52 : 34} dx={-2} />
          <Tooltip cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }} content={<T series={series} colors={colors} fmt={fmt} />} />
          {series.map((s, i) => (
            <Area key={s.dataKey} type="monotone" dataKey={s.dataKey} stackId="1" stroke={colors[i]} strokeWidth={2}
                  fill={`url(#sa-${s.dataKey})`} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
                  isAnimationActive animationDuration={1000} animationEasing="ease-out" animationBegin={i * 120} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <Legend items={series.map((s, i) => ({ label: s.name, color: colors[i] }))} />
    </div>
  );
}

interface TP { active?: boolean; label?: string | number; payload?: { dataKey: string; value: number }[] }
function T({ series, colors, fmt, active, label, payload }: { series: S[]; colors: string[]; fmt: 'kes' | 'count' | 'pct' } & TP) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + (p.value ?? 0), 0);
  return (
    <ChartTooltip
      label={dayMonth(String(label))}
      rows={[
        ...series.map((s, i) => ({ key: s.name, color: colors[i], value: fmtValue(payload.find((p) => p.dataKey === s.dataKey)?.value ?? 0, fmt) })),
        { key: 'Total', color: 'var(--ink-2)', value: fmtValue(total, fmt) },
      ]}
    />
  );
}
