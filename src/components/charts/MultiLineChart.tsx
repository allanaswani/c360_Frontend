'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisDateFormatter, dayMonth, fmtValue, seriesColor } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';

/** Multi-series line — up to ~5 lines on one shared axis (never dual-axis). Used
 *  for the segment value trend. Colour follows the entity (fixed order), and a
 *  legend always names them so identity is never colour-alone. */
export function MultiLineChart({
  data, keys, fmt, height = 200,
}: {
  data: Record<string, number | string>[];
  keys: string[];
  fmt: 'kes' | 'count' | 'pct';
  height?: number;
}) {
  const colors = keys.map((_, i) => seriesColor(i + 1));
  const tickFmt = axisDateFormatter(data, 'period');
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickFormatter={(v) => tickFmt(v)} tickLine={false} axisLine={false} minTickGap={40} dy={6} />
          <YAxis tickFormatter={(v) => fmtValue(Number(v), fmt)} tickLine={false} axisLine={false} width={fmt === 'kes' ? 52 : 34} dx={-2} />
          <Tooltip cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }} content={<T keys={keys} colors={colors} fmt={fmt} />} />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={colors[i]} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
                  isAnimationActive animationDuration={1000} animationEasing="ease-out" animationBegin={i * 90} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <Legend items={keys.map((k, i) => ({ label: k, color: colors[i] }))} />
    </div>
  );
}

interface TP { active?: boolean; label?: string | number; payload?: { dataKey: string; value: number }[] }
function T({ keys, colors, fmt, active, label, payload }: { keys: string[]; colors: string[]; fmt: 'kes' | 'count' | 'pct' } & TP) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltip
      label={dayMonth(String(label))}
      rows={keys.map((k, i) => ({ key: k, color: colors[i], value: fmtValue(payload.find((p) => p.dataKey === k)?.value ?? 0, fmt) }))}
    />
  );
}
