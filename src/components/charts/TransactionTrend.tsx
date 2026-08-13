'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Series } from '@/lib/types';
import { axisDateFormatter, count, dayMonth } from '@/lib/format';
import { ChartTooltip } from './ChartTooltip';

// Single series → no legend box; the card title names it.
const C = 'var(--series-1)';

export function TransactionTrend({ series }: { series: Series }) {
  const data = series.points.map((p) => ({ period: String(p.period), count: Number(p.count) }));
  const tickFmt = axisDateFormatter(data);
  return (
    <ResponsiveContainer width="100%" height={168}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="txnFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickFormatter={(v) => tickFmt(v)} tickLine={false} axisLine={false} minTickGap={40} dy={6} />
        <YAxis tickFormatter={(v) => count(v)} tickLine={false} axisLine={false} width={36} dx={-2} />
        <Tooltip cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }} content={<TxnTooltip />} />
        <Area type="monotone" dataKey="count" stroke={C} strokeWidth={2} fill="url(#txnFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }} isAnimationActive animationDuration={1200} animationEasing="ease-out" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface TP { active?: boolean; label?: string | number; payload?: { value: number }[] }
function TxnTooltip({ active, label, payload }: TP) {
  if (!active || !payload?.length) return null;
  return <ChartTooltip label={dayMonth(String(label))} rows={[{ key: 'Transactions', color: C, value: count(payload[0].value) }]} />;
}
