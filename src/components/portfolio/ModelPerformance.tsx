'use client';

import { useEffect, useState } from 'react';
import { api, type RecFeedbackStats } from '@/lib/api';
import s from '../ui.module.css';

/** Model performance from the outcome-logging loop — the honest, production check.
 *  As RMs mark outcomes, this shows the overall acceptance rate and, crucially,
 *  acceptance by the model's score band: if the model works, acceptance rises with
 *  the band. Until labels accumulate it says so plainly rather than showing a
 *  fabricated accuracy. */
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

  if (stats.labelled === 0) {
    return (
      <div className={s.mpEmpty}>
        <b>No outcomes logged yet.</b> As RMs mark recommendations as accepted or declined on
        the customer page, this panel will report the real acceptance rate and validate the
        model’s propensity scores against what actually happened.
      </div>
    );
  }

  const bands = stats.acceptance_by_score_band.filter((b) => b.n > 0);
  return (
    <div className={s.mpWrap}>
      <div className={s.mpTiles}>
        <Tile label="Outcomes logged" value={String(stats.total)} />
        <Tile label="Labelled" value={String(stats.labelled)} sub="accepted + declined" />
        <Tile label="Acceptance rate" value={stats.acceptance_rate !== null ? `${Math.round(stats.acceptance_rate * 100)}%` : '—'} accent />
        <Tile label="Retrain ready" value={stats.ready_to_retrain ? 'Yes' : 'Building'} sub={stats.ready_to_retrain ? undefined : 'need ≥500 labels'} />
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
                <span className={s.mpBandTrack}><span className={s.mpBandFill} style={{ width: `${Math.max(3, pct)}%` }} /></span>
                <span className={s.mpBandVal}>{b.acceptance_rate !== null ? `${pct}%` : '—'} <em>({b.n})</em></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={s.mpTile}>
      <span className="microlabel">{label}</span>
      <span className={`${s.mpTileVal} tnum`} style={accent ? { color: 'var(--teal)' } : undefined}>{value}</span>
      {sub && <span className={s.mpTileSub}>{sub}</span>}
    </div>
  );
}
