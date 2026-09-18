'use client';

import type { CreditBureau } from '@/lib/types';
import { shortDate } from '@/lib/format';
import s from './ui.module.css';

/** Credit bureau (TransUnion / CRB) — the customer's external bureau standing, matched
 *  by national ID. Real feed but a POINT-IN-TIME pull, so the pull date is shown as
 *  provenance and never presented as live-today. Two honest states: a scored record
 *  (score + grade + probability of default + adverse counts), or a 'no-hit' thin file
 *  (on the bureau, no scoreable history — not a score of zero). The parent renders this
 *  only when there IS a record; a customer with no bureau record shows nothing here. */
export function CreditBureauPanel({ bureau }: { bureau: CreditBureau }) {
  const band = bureau.pd_band;
  const tone = bandTone(band);

  return (
    <div className={`${s.card} fadeUp`}>
      <div className={s.crbHead}>
        <span className={s.crbTitle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6l7-3z" />
          </svg>
          Credit bureau
        </span>
        <span className={s.crbSource} title="Sourced from the TransUnion credit-bureau scorecard; a point-in-time pull.">
          TransUnion{bureau.as_of ? ` · as of ${shortDate(bureau.as_of)}` : ''}
        </span>
      </div>

      {bureau.no_hit ? (
        <div className={s.crbNoHit}>
          <div className={s.crbNoHitMark}>No score on file</div>
          <p>On the bureau, but with no scoreable credit history. A thin file, not a low score.</p>
        </div>
      ) : (
        <div className={s.crbBody}>
          <div className={s.crbScoreBlock}>
            <div className={s.crbScoreRow}>
              <span className={s.crbScore} style={{ color: tone }}>{bureau.score ?? '—'}</span>
              {bureau.grade && <span className={s.crbGrade}>Grade {bureau.grade}</span>}
            </div>
            {/* Meter against a 0–900 bureau reference; higher is better. */}
            <div className={s.crbMeter} aria-hidden>
              <span style={{ width: `${Math.max(3, Math.min(100, ((bureau.score ?? 0) / 900) * 100))}%`, background: tone }} />
            </div>
            {band && (
              <div className={s.crbBand}>
                <span className={s.crbBandDot} style={{ background: tone }} />
                {band} default risk
                {bureau.pd != null && <span className={s.crbBandPd}>· {bureau.pd}% PD</span>}
              </div>
            )}
          </div>

          <div className={s.crbStats}>
            <CrbStat label="Non-performing" value={bureau.non_performing} alert={bureau.non_performing > 0} />
            <CrbStat label="Accts 90+ days" value={bureau.arrears_90_days} alert={bureau.arrears_90_days > 0} />
            <CrbStat label="Enquiries" value={bureau.enquiries} sub={bureau.enquiries_90_days > 0 ? `${bureau.enquiries_90_days} in 90d` : undefined} />
          </div>
        </div>
      )}
    </div>
  );
}

function CrbStat({ label, value, sub, alert }: { label: string; value: number; sub?: string; alert?: boolean }) {
  return (
    <div className={s.crbStat}>
      <span className="microlabel">{label}</span>
      <span className={s.crbStatVal} style={alert ? { color: 'var(--coral)' } : undefined}>{value}</span>
      {sub && <span className={s.crbStatSub}>{sub}</span>}
    </div>
  );
}

/** PD band → a signal colour. Lower default risk = teal; higher = coral. Shared with
 *  the signal strip so the folded tile and the open panel never disagree on tone. */
export function bandTone(band: string | null): string {
  switch (band) {
    case 'Very low':
    case 'Low':
      return 'var(--teal)';
    case 'Moderate':
      return 'var(--gold)';
    case 'Elevated':
    case 'High':
      return 'var(--coral)';
    default:
      return 'var(--ink-2)';
  }
}
