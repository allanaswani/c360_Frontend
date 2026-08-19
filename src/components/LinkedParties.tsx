'use client';

import Link from 'next/link';
import type { LinkedParties as Linked } from '@/lib/types';
import { initials, kes } from '@/lib/format';
import s from './ui.module.css';

/** Same-person linked records — other customer numbers sharing this customer's national
 *  ID (personal, joint, business signatory), stitched into one relationship. Scoped
 *  server-side to what the caller may see, so it never leaks a record outside their book. */
export function LinkedParties({ data }: { data: Linked | null }) {
  if (!data || data.count === 0) return null;
  return (
    <div className={s.linkedPanel}>
      <div className={s.linkedHead}>
        <span className={s.linkedTitle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          Linked relationships
        </span>
        <span className="microlabel" title="How these records were matched">via {data.basis ?? 'National ID'}</span>
      </div>
      <p className={s.linkedNote}>
        {data.count} other customer record{data.count === 1 ? '' : 's'} share this customer’s national ID.
        {typeof data.combined_value === 'number' && (
          <> Combined relationship value <b className="tnum">{kes(data.combined_value)}</b>.</>
        )}
      </p>
      <div className={s.linkedList}>
        {data.members.map((m) => (
          <Link key={m.cust_id} href={`/customers/${m.cust_id}`} className={s.linkedRow}>
            <span className={s.linkedAvatar}>{initials(m.name)}</span>
            <span className={s.linkedMain}>
              <span className={s.linkedName}>{m.name}</span>
              <span className={s.linkedMeta}>
                <span className="tnum">{m.cust_id}</span> · {m.segment}{m.branch ? ` · ${m.branch}` : ''}
              </span>
            </span>
            {typeof m.value === 'number' && (
              <span className={s.linkedFig}>
                <span className="microlabel">Value</span>
                <span className={`${s.linkedFigVal} tnum`}>{kes(m.value)}</span>
              </span>
            )}
            <svg className={s.linkedChevron} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
