'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { count } from '@/lib/format';
import { ChartTooltip, Legend } from '../charts/ChartTooltip';
import { TYPE } from '@/lib/type';

/** Opportunity rule -> fixed categorical colour (validated palette, fixed order), so a
 *  rule keeps its colour whichever branch or RM is on screen. */
export const RULE_COLORS: Record<string, string> = {
  T1: 'var(--cat-1)', T2: 'var(--cat-2)', T3: 'var(--cat-3)', T4: 'var(--cat-4)',
  T5: 'var(--cat-5)', T6: 'var(--cat-6)', T7: 'var(--cat-7)',
};

/** Opportunities per branch (or RM), stacked by rule. Horizontal so long branch names
 *  read; a click picks that branch for the list below. */
export function CallListChart({ rows, rules, onPick }: {
  rows: { name: string; total: number; by_rule: Record<string, number> }[];
  rules: { rule_id: string; product_name: string }[];
  onPick?: (name: string) => void;
}) {
  const data = rows.map((r) => ({ name: r.name, total: r.total, ...r.by_rule }));
  const height = Math.max(160, rows.length * 26 + 30);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false}
                 tick={{ fontSize: TYPE.xxs, fill: 'var(--ink-2)' }}
                 tickFormatter={(v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v)} />
          <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--teal) 6%, transparent)' }}
                   content={({ active, payload, label }) => active && payload?.length ? (
                     <ChartTooltip label={String(label)} rows={rules
                       .filter((r) => Number((payload[0].payload as Record<string, number>)[r.rule_id] ?? 0) > 0)
                       .map((r) => ({ key: r.product_name, color: RULE_COLORS[r.rule_id],
                                      value: count(Number((payload[0].payload as Record<string, number>)[r.rule_id])) }))} />
                   ) : null} />
          {rules.map((r, i) => (
            <Bar key={r.rule_id} dataKey={r.rule_id} stackId="a" fill={RULE_COLORS[r.rule_id] ?? 'var(--cat-other)'}
                 stroke="var(--chart-surface)" strokeWidth={1}
                 radius={i === rules.length - 1 ? [0, 4, 4, 0] : 0}
                 cursor={onPick ? 'pointer' : undefined}
                 onClick={onPick ? (d: { payload?: { name?: string } }) => d?.payload?.name && onPick(d.payload.name) : undefined}
                 isAnimationActive />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <Legend items={rules.map((r) => ({ label: r.product_name, color: RULE_COLORS[r.rule_id] ?? 'var(--cat-other)' }))} />
    </div>
  );
}
