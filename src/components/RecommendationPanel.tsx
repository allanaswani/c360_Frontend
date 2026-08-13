'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type RecFeedback, type RecOutcome } from '@/lib/api';
import type { Recommendations, RecommendationItem } from '@/lib/types';
import { EmptyState } from './States';
import s from './ui.module.css';

/** Next Best Product — the most RM-facing part of the app. Shows 1–3 products, each
 *  with a reason and (for the ML engine) a propensity %. Each recommendation now
 *  carries the outcome-logging loop: the RM marks what happened (pitched / accepted /
 *  declined / not relevant), which becomes the real training label for the next model.
 *  When the derived risk/KYC gate blocks a customer, recommendations are *withheld*
 *  (not faked): the reasons show, flagged with the blocking reason. */
export function RecommendationPanel({ data, custId, layout = 'stack' }:
  { data: Recommendations; custId?: string; layout?: 'stack' | 'row' }) {
  const held = data.status !== 'ok';
  const items = held ? data.withheld : data.items;
  const row = layout === 'row';
  const blocked = data.status === 'eligibility_hold';

  // Outcomes already recorded for this customer, keyed by product.
  const [outcomes, setOutcomes] = useState<Record<string, RecOutcome>>({});

  useEffect(() => {
    if (!custId) return;
    let live = true;
    api.recFeedbackList(custId)
      .then((r) => { if (live) setOutcomes(Object.fromEntries((r.results as RecFeedback[]).map((f) => [f.product, f.outcome]))); })
      .catch(() => {});
    return () => { live = false; };
  }, [custId]);

  const record = useCallback(async (item: RecommendationItem, outcome: RecOutcome) => {
    if (!custId) return;
    const prev = outcomes[item.product];
    setOutcomes((o) => ({ ...o, [item.product]: outcome }));   // optimistic
    try {
      await api.recFeedbackRecord({
        cust_id: custId, product: item.product, product_name: item.product_name,
        domain: item.domain, score: item.score, rule_id: item.rule_id,
        engine_version: data.engine_version, outcome,
      });
    } catch {
      setOutcomes((o) => ({ ...o, [item.product]: prev }));    // revert on failure
    }
  }, [custId, outcomes, data.engine_version]);

  return (
    <div className={s.recPanel}>
      <div className={s.recHead}>
        <span className={s.recTitle}>
          <svg className={s.recSpark} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z" />
          </svg>
          Next best product
        </span>
        <span className="microlabel">{data.engine_version}</span>
      </div>

      {held && (
        <div className={s.withheldBanner}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" style={{ flex: 'none', marginTop: 1 }}>
            <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <span>
            {blocked ? (
              <>
                <b>{data.eligibility.note ?? 'Held by the eligibility gate.'}</b>{' '}
                Generated from live product signals but blocked by the derived risk/KYC gate
                (risk {String(data.eligibility.risk_class)} · KYC {String(data.eligibility.kyc_status)}) — shown, not cleared to pitch.
              </>
            ) : (
              <>
                <b>Held pending eligibility data.</b> Generated from live product signals, but no risk/KYC profile is available for this customer — shown for preview, not yet cleared to pitch.
              </>
            )}
          </span>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No products to suggest">This customer already holds the products the model would suggest.</EmptyState>
      ) : (
        <div className={row ? s.recGrid : s.recList}>
          {items.map((item, i) => (
            <RecCard key={`${item.domain}-${item.product}`} item={item} index={i + 1} row={row}
              canLog={!!custId} outcome={outcomes[item.product]} onRecord={record} />
          ))}
        </div>
      )}
    </div>
  );
}

const OUTCOME_OPTS: { key: RecOutcome; label: string }[] = [
  { key: 'pitched', label: 'Pitched' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'not_relevant', label: 'Not relevant' },
];

function RecCard({ item, index, row, canLog, outcome, onRecord }: {
  item: RecommendationItem; index: number; row: boolean;
  canLog: boolean; outcome?: RecOutcome; onRecord: (item: RecommendationItem, o: RecOutcome) => void;
}) {
  const isMl = item.rule_id.startsWith('ml.');
  const pct = isMl && item.score !== null ? Math.round(item.score * 100) : null;
  return (
    <div className={`${s.recItem} ${row ? s.recItemTile : ''}`} style={{ animationDelay: `${index * 70}ms` }}>
      <span className={s.recIndex}>{index}</span>
      <div className={s.recMain}>
        <div className={s.recProduct}>
          {item.product_name}
          <span className={s.recDomainTag}>{item.domain}</span>
          {pct !== null && <span className={s.recPropTag} title="Model-estimated propensity to take this product">{pct}% fit</span>}
        </div>
        <div className={s.recReason}>{item.reason}</div>
        {pct !== null && (
          <div className={s.recMeter} aria-hidden>
            <span className={s.recMeterFill} style={{ width: `${Math.max(4, pct)}%` }} />
          </div>
        )}
        <div className={s.recRule}>
          {isMl
            ? <>Model {item.rule_id.replace('ml.', '')} · propensity {pct}%</>
            : <>Rule {item.rule_id} · {item.score === null ? 'score n/a (rules)' : `score ${item.score}`}</>}
        </div>

        {canLog && (
          <div className={s.recOutcomes}>
            <span className={s.recOutcomeLabel}>{outcome ? 'Outcome' : 'Log outcome'}</span>
            {OUTCOME_OPTS.map((o) => (
              <button key={o.key}
                className={`${s.recOutcomeBtn} ${outcome === o.key ? s[`recOutcome_${o.key}`] : ''}`}
                aria-pressed={outcome === o.key}
                onClick={() => onRecord(item, o.key)}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
