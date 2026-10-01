'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtValue } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';
import { TYPE } from '@/lib/type';

interface D { label: string; a: number; b?: number }
const C_A = 'var(--series-1)';
const C_B = 'var(--series-3)';

/** Vertical bars over a category axis: one series (payments per month) or two side by
 *  side on the same value scale (received vs sent, paid vs outstanding). Same scale,
 *  so one shared axis. A single series needs no legend - the card title names it. */
export function GroupedBarChart({ data, seriesNames, fmt }: {
  data: D[]; seriesNames: [string] | [string, string]; fmt: 'kes' | 'count' | 'pct';
}) {
  const two = seriesNames.length === 2;
  // Many buckets (months, quarters): thin the axis labels instead of overlapping them.
  const every = data.length > 16 ? Math.ceil(data.length / 12) - 1 : 0;
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={4} barCategoryGap={data.length > 16 ? 4 : 18}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: TYPE.xxs, fill: 'var(--ink-3)' }}
                 interval={every} height={38} tickFormatter={(v) => trunc(String(v))} />
          <YAxis tickFormatter={(v) => fmtValue(Number(v), fmt)} tickLine={false} axisLine={false} width={52} dx={-2} />
          <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--teal) 6%, transparent)' }} content={<T names={seriesNames} fmt={fmt} />} />
          <Bar dataKey="a" fill={C_A} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive />
          {two && <Bar dataKey="b" fill={C_B} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive />}
        </BarChart>
      </ResponsiveContainer>
      {two && <Legend items={[{ label: seriesNames[0], color: C_A }, { label: seriesNames[1]!, color: C_B }]} />}
    </div>
  );
}

function trunc(s: string): string {
  return s.length > 16 ? `${s.slice(0, 15)}…` : s;
}

interface TP { active?: boolean; label?: string; payload?: { payload: D }[] }
function T({ names, fmt, active, payload }: { names: [string] | [string, string]; fmt: 'kes' | 'count' | 'pct' } & TP) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows = [{ key: names[0], color: C_A, value: fmtValue(d.a, fmt) }];
  if (names.length === 2) rows.push({ key: names[1]!, color: C_B, value: fmtValue(d.b ?? 0, fmt) });
  return <ChartTooltip label={d.label} rows={rows} />;
}
