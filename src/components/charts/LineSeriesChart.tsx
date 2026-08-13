'use client';

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisDateFormatter, dayMonth, fmtValue, seriesColor } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';

interface S { name: string; dataKey: string; colorRole: number }

/** Generic 1–2 series line/area chart on a shared axis (never dual-axis). Used for
 *  balance trends, activity, and profitability across domains. */
export function LineSeriesChart({
  data, series, fmt, xKey = 'period', height = 170,
}: {
  data: Record<string, number | string>[];
  series: S[];
  fmt: 'kes' | 'count' | 'pct';
  xKey?: string;
  height?: number;
}) {
  const colors = series.map((s) => seriesColor(s.colorRole));
  const tickFmt = xKey === 'period' ? axisDateFormatter(data, xKey) : (v: unknown) => String(v);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.dataKey} id={`g-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[i]} stopOpacity={i === 0 ? 0.18 : 0.08} />
                <stop offset="100%" stopColor={colors[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={(v) => tickFmt(v)} tickLine={false} axisLine={false} minTickGap={38} dy={6} />
          <YAxis tickFormatter={(v) => fmtValue(Number(v), fmt)} tickLine={false} axisLine={false} width={fmt === 'kes' ? 52 : 34} dx={-2} />
          <Tooltip cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }} content={<T series={series} colors={colors} fmt={fmt} xKey={xKey} />} />
          {series.map((s) => (
            <Area key={`a-${s.dataKey}`} type="monotone" dataKey={s.dataKey} stroke="none" fill={`url(#g-${s.dataKey})`} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
          ))}
          {series.map((s, i) => (
            <Line key={`l-${s.dataKey}`} type="monotone" dataKey={s.dataKey} stroke={colors[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }} isAnimationActive animationDuration={1100} animationEasing="ease-out" animationBegin={i * 120} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      {series.length > 1 && <Legend items={series.map((s, i) => ({ label: s.name, color: colors[i] }))} />}
    </div>
  );
}

interface TP { active?: boolean; label?: string | number; payload?: { dataKey: string; value: number }[] }
function T({ series, colors, fmt, xKey, active, label, payload }: { series: S[]; colors: string[]; fmt: 'kes' | 'count' | 'pct'; xKey: string } & TP) {
  if (!active || !payload?.length) return null;
  const lbl = xKey === 'period' ? dayMonth(String(label)) : String(label);
  return (
    <ChartTooltip
      label={lbl}
      rows={series.map((s, i) => ({ key: s.name, color: colors[i], value: fmtValue(payload.find((p) => p.dataKey === s.dataKey)?.value ?? 0, fmt) }))}
    />
  );
}
