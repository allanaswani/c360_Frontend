'use client';

import type { LendingHealth, Delinquency, CollateralHeld } from '@/lib/types';
import { kes } from '@/lib/format';
import s from './ui.module.css';

/** Credit standing & collateral — the bank's own delinquency classification (NPL / watch
 *  + IFRS impairment) and the collateral securing the customer's lending. Rendered only
 *  when the customer has one or the other. Display-only: it does NOT feed the recommendation
 *  risk gate (that wiring is the deliberate 'critical' step, kept separate). */
export function LendingPanel({ lending }: { lending: LendingHealth }) {
  const d = lending.delinquency;
  const c = lending.collateral;
  if (!d && !c) return null;

  return (
    <div className={`${s.card} fadeUp`}>
      <div className={s.lendHead}>
        <span className={s.lendTitle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
          </svg>
          Credit standing &amp; collateral
        </span>
      </div>

      <div className={s.lendBody}>
        {d && <StandingBlock d={d} />}
        {c && <CollateralBlock c={c} />}
      </div>
    </div>
  );
}

function StandingBlock({ d }: { d: Delinquency }) {
  const tone = d.severity >= 2 ? 'var(--coral)' : 'var(--gold)';
  const isNpl = d.status === 'npl';
  return (
    <section className={`${s.lendBlock} ${s.lendStanding}`}>
      <header className={s.lendBlockHead}>
        <span className={s.lendBlockTitle}>Credit standing</span>
        <span className={s.lendSrc} title="Bank credit classification (non-performing / watch list).">core banking</span>
      </header>

      <div className={s.lendStatusRow}>
        <span className={s.lendBadge} style={{ color: tone, borderColor: tone }}>
          <span className={s.lendDot} style={{ background: tone }} />
          {isNpl ? d.classification : 'Watch list'}
        </span>
        <span className={s.lendStatusNote}>
          {isNpl ? 'Non-performing' : 'Early-warning — not yet non-performing'}
          {d.month ? ` · ${d.month}` : ''}
        </span>
      </div>

      {isNpl && (
        <div className={s.lendStats}>
          <div className={s.lendStat}>
            <span className="microlabel">IFRS impairment</span>
            <span className={s.lendStatVal}>{kes(d.impairment)}</span>
          </div>
          <div className={s.lendStat}>
            <span className="microlabel">Classified accounts</span>
            <span className={s.lendStatVal}>{d.accounts}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function CollateralBlock({ c }: { c: CollateralHeld }) {
  return (
    <section className={`${s.lendBlock} ${s.lendCollateral}`}>
      <header className={s.lendBlockHead}>
        <span className={s.lendBlockTitle}>Collateral held</span>
        <span className={s.lendSrc} title="Collateral types securing this customer's facilities. Counts are records, not valued.">{c.distinct} type{c.distinct === 1 ? '' : 's'}</span>
      </header>
      <div className={s.lendChips}>
        {c.types.map((t) => (
          <span key={t.type} className={s.lendChip}>
            {t.type}
            {t.count > 1 && <span className={s.lendChipCount}>{t.count}</span>}
          </span>
        ))}
      </div>
    </section>
  );
}
