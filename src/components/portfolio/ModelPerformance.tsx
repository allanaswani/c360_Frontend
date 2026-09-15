'use client';

import { useEffect, useState } from 'react';
import { api, type RecFeedbackStats } from '@/lib/api';
import s from '../ui.module.css';

const OUTCOMES: { key: string; label: string; tone?: 'good' | 'bad' }[] = [
  { key: 'pitched', label: 'Pitched' },
  { key: 'accepted', label: 'Accepted', tone: 'good' },
  { key: 'declined', label: 'Declined', tone: 'bad' },
  { key: 'not_relevant', label: 'Not relevant', tone: 'bad' },
];

/**
 * Model performance from the outcome-logging loop — the honest production check.
 *
 * This panel used to gate its whole display on `labelled === 0` and say "No
 * outcomes logged yet". But `labelled` counts only accepted / declined /
 * not-relevant: **Pitched is deliberately excluded**, because a pitch with no
 * answer yet is not a training label. So an RM who marked recommendations as
 * Pitched — the first button, and the honest answer on the day you pitch — saw
 * the panel insist nothing had been logged, and reasonably concluded the feature
 * was broken.
 *
 * It now reports what was actually recorded first, and treats "no labels yet" as
 * a separate, smaller statement about the acceptance rate specifically.
 */
export function ModelPerformance() {
  const [stats, setStats] = useState<RecFeedbackStats | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    api.recFeedbackStats().then((d) => live && setStats(d)).catch(() => live && setErr(true));
    return () => { live = false; };
  }, []);

  if (err) return null;
  if (!stats) return <div className={s.mpEmpty}>Loading outcome data…</div>;

  // Nothing at all has been recorded — the only case where "none logged" is true.
  if (stats.total === 0) {
    return (
      <div className={s.mpEmpty}>
        <b>No outcomes logged yet.</b> Mark a recommendation Pitched, Accepted, Declined or
        Not relevant on any customer page and it lands here.
      </div>
    );
  }

  const pending = stats.total - stats.labelled;
  const bands = stats.acceptance_by_score_band.filter((b) => b.n > 0);

  return (
    <div className={s.mpWrap}>
      {/* What was recorded, always — this is the part that has to move the moment
          an RM clicks anything, or the loop looks dead. */}
      <div className={s.mpCounts}>
        {OUTCOMES.map((o) => {
          const n = stats.by_outcome[o.key] ?? 0;
          return (
            <div key={o.key} className={s.mpCount} data-zero={n === 0 || undefined}>
              <span className={`${s.mpCountVal} tnum`} data-tone={o.tone}>{n}</span>
              <span className={s.mpCountLabel}>{o.label}</span>
            </div>
          );
        })}
        <div className={s.mpCountRule} />
        <div className={s.mpCount}>
          <span className={`${s.mpCountVal} tnum`} data-tone={stats.acceptance_rate === null ? undefined : 'accent'}>
            {stats.acceptance_rate === null ? '—' : `${Math.round(stats.acceptance_rate * 100)}%`}
          </span>
          <span className={s.mpCountLabel}>Acceptance</span>
        </div>
      </div>

      {stats.labelled === 0 ? (
        // Recorded, but nothing decided yet. Say precisely that — the previous copy
        // claimed nothing had been logged at all.
        <div className={s.mpNote}>
          {pending} recommendation{pending === 1 ? '' : 's'} pitched, none resolved yet. An
          acceptance rate needs outcomes marked <b>Accepted</b> or <b>Declined</b>; until then
          there is nothing to score the model against.
        </div>
      ) : (
        <>
          <div className={s.mpNote}>
            {stats.labelled} of {stats.total} resolved
            {pending > 0 && <> · {pending} still awaiting an answer</>}
            {' · '}
            {stats.ready_to_retrain
              ? 'enough labels to retrain on real outcomes'
              : `${Math.max(0, 500 - stats.labelled)} more labels before a retrain on real outcomes`}
          </div>

          {bands.length > 0 && (
            <div className={s.mpBands}>
              <div className={s.mpBandsHead}>
                Acceptance by model score band
                <span className={s.mpBandsHint}>higher bands should accept more — that’s the model working</span>
              </div>
              {bands.map((b) => {
                const pct = b.acceptance_rate !== null ? Math.round(b.acceptance_rate * 100) : 0;
                return (
                  <div key={b.band} className={s.mpBandRow}>
                    <span className={s.mpBandLabel}>{b.band}</span>
                    <span className={s.mpBandTrack}>
                      <span className={s.mpBandFill} style={{ width: `${Math.max(3, pct)}%` }} />
                    </span>
                    <span className={s.mpBandVal}>
                      {b.acceptance_rate !== null ? `${pct}%` : '—'} <em>({b.n})</em>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
