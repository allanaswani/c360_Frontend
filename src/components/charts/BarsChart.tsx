'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtValue, seriesColor } from '@/lib/format';
import { ChartTooltip } from './ChartTooltip';

interface D { label: string; value: number; colorRole: number }

/** Generic horizontal magnitude bars with value labels and rounded data-ends. */
export function BarsChart({ data, fmt }: { data: D[]; fmt: 'kes' | 'count' | 'pct' }) {
  const rows = [...data].sort((a, b) => b.value - a.value);
  const height = Math.max(130, rows.length * 34 + 18);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 52, bottom: 0, left: 4 }} barCategoryGap={9}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} tick={{ fontSize: 12, fill: 'var(--ink-2)' }} />
        <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--teal) 7%, transparent)' }} content={<T fmt={fmt} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive>
          {rows.map((d, i) => (
            <Cell key={i} fill={seriesColor(d.colorRole)} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v) => fmtValue(Number(v), fmt)} style={{ fill: 'var(--ink-2)', fontSize: 11, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TP { active?: boolean; payload?: { payload: D }[] }
function T({ fmt, active, payload }: { fmt: 'kes' | 'count' | 'pct' } & TP) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return <ChartTooltip label={d.label} rows={[{ key: 'Value', color: seriesColor(d.colorRole), value: fmtValue(d.value, fmt) }]} />;
}
