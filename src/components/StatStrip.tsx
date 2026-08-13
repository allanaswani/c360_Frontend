import type { ReactNode } from 'react';
import type { Provenance } from '@/lib/types';
import { ProvenanceDotOnly } from './ProvenanceBadge';
import { CountUp } from './CountUp';
import s from './ui.module.css';

export interface Stat {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  status?: Provenance;
  lead?: boolean;
  tone?: 'pos' | 'neg';
  // When provided, the value animates (count-up) using this formatter.
  countTo?: number;
  fmt?: (n: number) => string;
}

/** Headline metric strip. Deliberately NOT five identical icon-in-a-circle cards:
 *  one lead figure carries extra visual weight, the rest recede — a real
 *  hierarchy, hairline-separated, the way a designed instrument reads. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  // First (lead) column a touch wider; the rest equal. Adapts to any count so a
  // 4-metric domain never leaves a trailing empty column.
  const cols = stats.map((st, i) => (st.lead || i === 0 ? '1.4fr' : '1fr')).join(' ');
  return (
    <div className={s.statStrip} style={{ gridTemplateColumns: cols }}>
      {stats.map((st, i) => (
        <div key={i} className={`${s.stat} ${st.lead ? s.statLead : ''}`}>
          <div className={s.statLabelRow}>
            <span className={s.statLabel}>{st.label}</span>
            {st.status && st.status !== 'live' && <ProvenanceDotOnly status={st.status} />}
          </div>
          <div className={`${s.statValue} ${st.lead ? s.statValueLead : ''} tnum ${st.tone === 'pos' ? s.statPos : st.tone === 'neg' ? s.statNeg : ''}`}>
            {st.countTo !== undefined && st.fmt ? <CountUp value={st.countTo} format={st.fmt} /> : st.value}
          </div>
          {st.meta && <div className={s.statMeta}>{st.meta}</div>}
        </div>
      ))}
    </div>
  );
}
