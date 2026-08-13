'use client';

import { fmtValue, pct } from '@/lib/format';
import s from '../ui.module.css';

interface D { label: string; value: number }

/** A single 100%-stacked composition bar — the alternate to the donut for a
 *  part-to-whole. Segment widths animate in; a breakdown lists value + share. */
export function StackedBar({ data, fmt, colors }: { data: D[]; fmt: 'kes' | 'count' | 'pct'; colors: string[] }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <div>
      <div className={s.stackBar}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className={s.stackSeg}
            style={{ width: `${(d.value / total) * 100}%`, background: colors[i % colors.length], animationDelay: `${i * 90}ms` }}
            title={`${d.label}: ${fmtValue(d.value, fmt)} (${pct(d.value / total)})`}
          />
        ))}
      </div>
      <div className={s.stackLegend}>
        {data.map((d, i) => (
          <div key={d.label} className={s.stackLegendRow}>
            <span className={s.tooltipKey} style={{ fontSize: 12.5 }}>
              <span className={s.swatch} style={{ background: colors[i % colors.length] }} />
              {d.label}
            </span>
            <span className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              {fmtValue(d.value, fmt)} <span style={{ color: 'var(--ink-3)' }}>· {pct(d.value / total)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
