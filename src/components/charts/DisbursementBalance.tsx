'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Series } from '@/lib/types';
import { axisDateFormatter, dayMonth, kes } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';

// Both series are KES → a single shared y-axis (never a dual-axis chart).
const C_DISB = 'var(--series-2)'; // gold — cumulative disbursed
const C_BAL = 'var(--series-1)'; // teal — outstanding balance

export function DisbursementBalance({ disbursed, balance }: { disbursed: Series; balance: Series }) {
  const data = mergeByPeriod(disbursed, balance);
  const tickFmt = axisDateFormatter(data);
  return (
    <div>
      <ResponsiveContainer width="100%" height={184}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis dataKey="period" tickFormatter={(v) => tickFmt(v)} tickLine={false} axisLine={false} minTickGap={40} dy={6} />
          <YAxis tickFormatter={(v) => kes(v)} tickLine={false} axisLine={false} width={56} dx={-2} />
          <Tooltip cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }} content={<DBTooltip />} />
          <Area type="monotone" dataKey="balance" stroke="none" fill="url(#balFill)" isAnimationActive animationDuration={1000} animationEasing="ease-out" />
          <Line type="monotone" dataKey="disbursed" stroke={C_DISB} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }} strokeDasharray="5 3" isAnimationActive animationDuration={1200} animationEasing="ease-out" />
          <Line type="monotone" dataKey="balance" stroke={C_BAL} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)' }} isAnimationActive animationDuration={1100} animationEasing="ease-out" animationBegin={140} />
        </ComposedChart>
      </ResponsiveContainer>
      <Legend items={[{ label: 'Cumulative disbursed', color: C_DISB }, { label: 'Outstanding balance', color: C_BAL }]} />
    </div>
  );
}

interface TP { active?: boolean; label?: string | number; payload?: { dataKey: string; value: number }[] }
function DBTooltip({ active, label, payload }: TP) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value;
  return (
    <ChartTooltip
      label={dayMonth(String(label))}
      rows={[
        { key: 'Disbursed', color: C_DISB, value: kes(get('disbursed')) },
        { key: 'Balance', color: C_BAL, value: kes(get('balance')) },
      ]}
    />
  );
}

function mergeByPeriod(a: Series, b: Series) {
  const map = new Map<string, { period: string; disbursed?: number; balance?: number }>();
  for (const p of a.points) map.set(String(p.period), { period: String(p.period), disbursed: Number(p.amount) });
  for (const p of b.points) {
    const row = map.get(String(p.period)) ?? { period: String(p.period) };
    row.balance = Number(p.amount);
    map.set(String(p.period), row);
  }
  return [...map.values()].sort((x, y) => x.period.localeCompare(y.period));
}
