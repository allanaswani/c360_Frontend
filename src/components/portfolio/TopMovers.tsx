'use client';

import Link from 'next/link';
import type { MoverRow } from '@/lib/types';
import { kes, pct } from '@/lib/format';
import s from '../ui.module.css';

/** Top movers — "who needs attention this period?". A ranked, clickable list with
 *  a signed magnitude bar, doubling as a bridge into a customer's Level 2. */
export function TopMovers({ rows }: { rows: MoverRow[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.delta_value)), 1);
  return (
    <div className={s.moverList}>
      {rows.map((m) => {
        const up = m.direction === 'up';
        const w = (Math.abs(m.delta_value) / max) * 100;
        return (
          <Link key={m.cust_id} href={`/customers/${m.cust_id}`} className={s.moverRow}>
            <div className={s.moverMain}>
              <div className={s.moverName}>{m.name}</div>
              <div className={s.moverMeta}>{m.segment} · {kes(m.value)}</div>
            </div>
            <div className={s.moverBarWrap}>
              <div className={s.moverBar} style={{ width: `${w}%`, background: up ? 'var(--pos)' : 'var(--neg)' }} />
            </div>
            <div className={`${s.moverDelta} tnum`} style={{ color: up ? 'var(--pos)' : 'var(--neg)' }}>
              {up ? '▲' : '▼'} {pct(Math.abs(m.delta_pct), 1)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
