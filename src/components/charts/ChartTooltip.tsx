import type { ReactNode } from 'react';
import s from '../ui.module.css';

interface Row {
  key: string;
  color: string;
  value: ReactNode;
}

/** Our own tooltip — the Recharts default is disabled in globals.css. Crosshair
 *  tooltips ship by default on line/area per the dataviz interaction spec. */
export function ChartTooltip({ label, rows }: { label: string; rows: Row[] }) {
  return (
    <div className={s.tooltip}>
      <div className={s.tooltipLabel}>{label}</div>
      {rows.map((r) => (
        <div key={r.key} className={s.tooltipRow}>
          <span className={s.tooltipKey}>
            <span className={s.swatch} style={{ background: r.color, width: 9, height: 9 }} />
            {r.key}
          </span>
          <span className="tnum" style={{ fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className={s.legend}>
      {items.map((it) => (
        <span key={it.label} className={s.legendItem}>
          <span className={s.swatch} style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
