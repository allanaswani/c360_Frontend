'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtValue, kesFull } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';

const C_IN = 'var(--cat-1)';
const C_OUT = 'var(--cat-2)';
const C_NET = 'var(--ink-2)';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Money in (up) and money out (down) per month on ONE axis, with the net as a line.
 *  In and out are a polarity, so they take the two poles of the categorical pair -
 *  never the status green/red, which mean "good/bad" elsewhere in the app. The last
 *  month is labelled as to-date when the window ends mid-month. */
export function CashFlowChart({ months, to, height = 220 }: {
  months: { period: string; in: number; out: number; net: number }[];
  to: string;
  height?: number;
}) {
  const last = months[months.length - 1]?.period;
  const partial = last && to.slice(0, 7) === last.slice(0, 7) && to.slice(8, 10) !== lastDay(to);
  const label = (p: string) => {
    const m = MONTHS[Number(p.slice(5, 7)) - 1];
    return p === last && partial ? `${m} to ${Number(to.slice(8, 10))}` : `${m} ${p.slice(2, 4)}`;
  };
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={-14} barCategoryGap="28%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickFormatter={(v) => label(String(v))} tickLine={false} axisLine={false}
                 interval="preserveStartEnd" minTickGap={18} dy={6} />
          <YAxis tickFormatter={(v) => fmtValue(Number(v), 'kes')} tickLine={false} axisLine={false} width={56} dx={-2} />
          <ReferenceLine y={0} stroke="var(--hairline-strong)" />
          <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--teal) 6%, transparent)' }}
                   content={({ active, payload, label: l }) => active && payload?.length ? (
                     <ChartTooltip label={label(String(l))} rows={[
                       { key: 'Money in', color: C_IN, value: kesFull(Number(payload.find((p) => p.dataKey === 'in')?.value ?? 0)) },
                       { key: 'Money out', color: C_OUT, value: kesFull(Number(payload.find((p) => p.dataKey === 'out')?.value ?? 0)) },
                       { key: 'Net', color: C_NET, value: kesFull(Number(payload.find((p) => p.dataKey === 'net')?.value ?? 0)) },
                     ]} />) : null} />
          <Bar dataKey="in" fill={C_IN} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive />
          <Bar dataKey="out" fill={C_OUT} radius={[0, 0, 4, 4]} maxBarSize={14} isAnimationActive />
          <Line dataKey="net" stroke={C_NET} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, strokeWidth: 0, fill: C_NET }} isAnimationActive />
        </ComposedChart>
      </ResponsiveContainer>
      <Legend items={[{ label: 'Money in', color: C_IN }, { label: 'Money out', color: C_OUT }, { label: 'Net', color: C_NET }]} />
    </div>
  );
}

function lastDay(iso: string): string {
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
  return String(new Date(y, m, 0).getDate()).padStart(2, '0');
}
