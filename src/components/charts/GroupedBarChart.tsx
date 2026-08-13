'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtValue } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';

interface D { label: string; a: number; b: number }
const C_A = 'var(--series-1)';
const C_B = 'var(--series-3)';

/** Two-series grouped bars — e.g. property value vs linked loan balance, per unit.
 *  Same value scale, so a single shared axis. */
export function GroupedBarChart({ data, seriesNames, fmt }: { data: D[]; seriesNames: [string, string]; fmt: 'kes' | 'count' | 'pct' }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 58)}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={4} barCategoryGap={22}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} interval={0} height={38} tickFormatter={(v) => trunc(String(v))} />
          <YAxis tickFormatter={(v) => fmtValue(Number(v), fmt)} tickLine={false} axisLine={false} width={52} dx={-2} />
          <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--teal) 6%, transparent)' }} content={<T names={seriesNames} fmt={fmt} />} />
          <Bar dataKey="a" fill={C_A} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive />
          <Bar dataKey="b" fill={C_B} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
      <Legend items={[{ label: seriesNames[0], color: C_A }, { label: seriesNames[1], color: C_B }]} />
    </div>
  );
}

function trunc(s: string): string {
  return s.length > 16 ? `${s.slice(0, 15)}…` : s;
}

interface TP { active?: boolean; label?: string; payload?: { payload: D }[] }
function T({ names, fmt, active, payload }: { names: [string, string]; fmt: 'kes' | 'count' | 'pct' } & TP) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <ChartTooltip
      label={d.label}
      rows={[
        { key: names[0], color: C_A, value: fmtValue(d.a, fmt) },
        { key: names[1], color: C_B, value: fmtValue(d.b, fmt) },
      ]}
    />
  );
}
