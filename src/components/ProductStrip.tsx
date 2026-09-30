'use client';

import type { InsightBlock, ProductMix } from '@/lib/types';
import { kes } from '@/lib/format';
import { Skeleton } from './States';
import s from './insights.module.css';

/** What the customer holds, at a glance: one tile per account type, held or not, so a
 *  gap (no savings, no fixed deposit) is as visible as a holding. Categories come from
 *  the core-banking product tree, not from product names (see backend c360/products.py). */
export function ProductStrip({ block }: { block: InsightBlock<ProductMix> | null | undefined }) {
  if (block === undefined) return null;          // not requested (e.g. a property client)
  if (block === null) return <Skeleton height={64} radius={12} />;
  if (block.status === 'unavailable') {
    return (
      <div className={s.strip}>
        <div className={s.loanRow}>Accounts held could not be loaded right now.</div>
      </div>
    );
  }
  const mix = block.data;
  if (!mix || block.status === 'none') {
    return (
      <div className={s.strip}>
        <div className={s.loanRow}>No open accounts with a balance at the latest close.</div>
      </div>
    );
  }
  return (
    <div className={s.strip} aria-label="Accounts held">
      {mix.headline.map((h) => (
        <div key={h.key} className={s.tile}>
          <div className={s.tileLabel}>
            <span className={`${s.mark} ${h.held ? s.markHeld : ''}`} aria-hidden />
            {h.label}
          </div>
          {h.held ? (
            <>
              <div className={s.tileValue}>{kes(h.balance)}</div>
              <div className={s.tileSub}>{h.accounts} {h.accounts === 1 ? 'account' : 'accounts'}</div>
            </>
          ) : (
            <div className={`${s.tileValue} ${s.tileValueNone}`}>Not held</div>
          )}
        </div>
      ))}
      <div className={s.loanRow}>
        <span>Loans</span>
        {mix.loans.length === 0 ? (
          <span>none outstanding</span>
        ) : (
          mix.loans.map((g) => (
            <span key={g.key} className={s.chip} title={g.products.join(', ')}>
              {g.label} · {kes(g.balance)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
