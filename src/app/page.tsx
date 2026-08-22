'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { CustomerSummary } from '@/lib/types';
import { ErrorState, Skeleton } from '@/components/States';
import { count, initials, kes } from '@/lib/format';
import s from './home.module.css';
import ui from '@/components/ui.module.css';

export default function Home() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<CustomerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    const t = setTimeout(() => {
      api.customers(q)
        .then((r) => live && setRows(r.results))
        .catch((e) => live && setError(e.message));
    }, 160);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const totalValue = useMemo(() => (rows ?? []).reduce((a, r) => a + (r.value ?? 0), 0), [rows]);

  return (
    <main className={ui.content}>
      <div className={s.hero}>
        <div>
          <div className="microlabel" style={{ color: 'var(--teal)' }}>Relationship intelligence</div>
          <h1 className={s.title}>Find a customer</h1>
          <p className={s.lede}>
            Everything HFCB knows about a customer, in one place — holdings, value, and the next
            product to pitch. Search by name, customer ID, or ID document to open a full 360.
          </p>
        </div>
        {rows && (
          <div className={s.heroStat}>
            <span className="microlabel">In view</span>
            <div className={`${s.heroStatVal} tnum`}>{rows.length} <span>customers</span></div>
            <div className={`${s.heroStatSub} tnum`}>{kes(totalValue)} relationship value</div>
          </div>
        )}
      </div>

      <div className={s.searchWrap}>
        <svg className={s.searchIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          className={s.search}
          placeholder="Search by name, customer ID, or ID document (national ID, passport, company reg.)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>

      {error ? (
        <div className={ui.card} style={{ marginTop: 16 }}>
          <ErrorState title="Can't load customers" detail={error} />
        </div>
      ) : (
        <div className={s.list}>
          {!rows
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={s.rowSkeleton}><Skeleton height={40} radius={8} /></div>
              ))
            : rows.map((c) => <CustomerRow key={c.cust_id} c={c} />)}
          {rows && rows.length === 0 && (
            <div className={ui.card} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
              No customers match “{q}”.
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function CustomerRow({ c }: { c: CustomerSummary }) {
  return (
    <Link href={`/customers/${c.cust_id}`} className={s.row}>
      <div className={s.rowAvatar}>{initials(c.name)}</div>
      <div className={s.rowMain}>
        <div className={s.rowName}>{c.name}</div>
        <div className={s.rowMeta}>
          <span className="tnum">{c.cust_id}</span> · {c.segment} · {c.branch}
          {c.rm_name && <> · RM {c.rm_name}</>}
          {c.id_no && (
            <span className={ui.idHit} title={`${c.id_type ?? 'ID'}: ${c.id_no}`}>
              {c.id_type ?? 'ID'} <b className="tnum">{c.id_no}</b>
            </span>
          )}
        </div>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Value</span>
        <span className={`${s.rowFigVal} tnum`}>{kes(c.value)}</span>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Products</span>
        <span className={`${s.rowFigVal} tnum`}>{count(c.products_held)}</span>
      </div>
      <svg className={s.rowChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
    </Link>
  );
}
