'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { kes } from '@/lib/format';
import { ChartTooltip, Legend } from './ChartTooltip';

interface Bar_ { product: string; balance: number; side: 'deposit' | 'loan' }
const C_DEP = 'var(--series-1)'; // teal
const C_LOAN = 'var(--series-3)'; // slate

/** Horizontal bars — deposit vs loan holdings by balance. Deposit/loan is a
 *  two-category identity, so colour carries it and the legend names it. Rounded
 *  data-ends anchored to the baseline, per the mark spec. */
export function ProductHoldingsBar({ bars }: { bars: Bar_[] }) {
  const data = [...bars].sort((a, b) => b.balance - a.balance);
  const height = Math.max(140, data.length * 34 + 24);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 0, left: 4 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => kes(v)} tickLine={false} axisLine={false} hide />
          <YAxis type="category" dataKey="product" tickLine={false} axisLine={false} width={128} tick={{ fontSize: 12, fill: 'var(--ink-2)' }} />
          <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--teal) 7%, transparent)' }} content={<PHTooltip />} />
          <Bar dataKey="balance" radius={[0, 4, 4, 0]} isAnimationActive>
            {data.map((d, i) => (
              <Cell key={i} fill={d.side === 'deposit' ? C_DEP : C_LOAN} />
            ))}
            <LabelList dataKey="balance" position="right" formatter={(v) => kes(Number(v))} style={{ fill: 'var(--ink-2)', fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Legend items={[{ label: 'Deposit', color: C_DEP }, { label: 'Loan', color: C_LOAN }]} />
    </div>
  );
}

interface TP { active?: boolean; payload?: { payload: Bar_ }[] }
function PHTooltip({ active, payload }: TP) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return <ChartTooltip label={d.product} rows={[{ key: d.side === 'deposit' ? 'Deposit' : 'Loan', color: d.side === 'deposit' ? C_DEP : C_LOAN, value: kes(d.balance) }]} />;
}
