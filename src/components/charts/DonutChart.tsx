'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { fmtValue, pct } from '@/lib/format';
import { ChartTooltip } from './ChartTooltip';
import s from '../ui.module.css';

interface D { label: string; value: number }
// Validated categorical order; direct labels + 2px gaps carry identity too.
const PALETTE = ['var(--series-1)', 'var(--series-2)', 'var(--coral)', 'var(--series-3)', 'var(--series-5)'];

/** Generic part-to-whole donut with legend and a centred total. */
export function DonutChart({ data, fmt, centerLabel, colors, center }: { data: D[]; fmt: 'kes' | 'count' | 'pct'; centerLabel?: string; colors?: string[]; center?: { label: string; value: string } }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const palette = colors ?? PALETTE;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-5)', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 156, height: 156, flex: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={74} paddingAngle={2} stroke="var(--chart-surface)" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive animationDuration={900} animationEasing="ease-out">
              {data.map((d, i) => (
                <Cell key={d.label} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip content={<T total={total} fmt={fmt} />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="microlabel">{center?.label ?? centerLabel ?? 'Total'}</div>
            <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink-1)' }}>{center?.value ?? fmtValue(total, fmt)}</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 150 }}>
        {data.map((d, i) => (
          <div key={d.label} className={s.tooltipRow} style={{ marginTop: 7 }}>
            <span className={s.tooltipKey} style={{ fontSize: 12.5 }}>
              <span className={s.swatch} style={{ background: palette[i % palette.length] }} />
              {d.label}
            </span>
            <span className="tnum" style={{ fontWeight: 600, fontSize: 12.5 }}>{total ? pct(d.value / total) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TP { active?: boolean; payload?: { payload: D }[] }
function T({ total, fmt, active, payload }: { total: number; fmt: 'kes' | 'count' | 'pct' } & TP) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return <ChartTooltip label={d.label} rows={[{ key: fmtValue(d.value, fmt), color: 'var(--ink-2)', value: total ? pct(d.value / total, 1) : '—' }]} />;
}
