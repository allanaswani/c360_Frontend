'use client';

import { fmtValue, pct } from '@/lib/format';
import s from '../ui.module.css';

interface D { label: string; value: number; paid?: number; total?: number }

/** Payment-progress meters — one filled track per unit, showing how far it is toward
 *  fully paid. Unlike magnitude bars, a 0%-paid unit still renders a full (empty) track
 *  with a "0%" read-out, so it reads as "nothing paid yet", never as a broken/blank chart.
 *  The optional paid/total drive a KES sub-caption. */
export function MeterList({ data }: { data: D[]; fmt?: 'kes' | 'count' | 'pct' }) {
  return (
    <div className={s.meterList}>
      {data.map((d, i) => {
        const frac = Math.min(Math.max(d.value, 0), 1);
        const hasKes = d.paid !== undefined && d.total !== undefined;
        return (
          <div key={i} className={s.meterRow}>
            <span className={s.meterLabel} title={d.label}>{d.label}</span>
            <span className={s.meterPct}>{pct(frac)}</span>
            <div className={s.meterTrack} role="progressbar" aria-valuenow={Math.round(frac * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${d.label} paid`}>
              <div className={s.meterFill} style={{ width: `${frac * 100}%` }} />
            </div>
            {hasKes && (
              <span className={s.meterSub}>
                {fmtValue(d.paid!, 'kes')} paid of {fmtValue(d.total!, 'kes')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
