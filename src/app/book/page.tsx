'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type BookSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatStrip, type Stat } from '@/components/StatStrip';
import { ErrorState, Skeleton } from '@/components/States';
import { count, initials, kes } from '@/lib/format';
import ui from '@/components/ui.module.css';
import s from './book.module.css';

export default function BookPage() {
  const { user } = useAuth();
  const [data, setData] = useState<BookSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    api.book().then((d) => live && setData(d)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, []);

  if (!user) return null;
  if (error) {
    return (
      <main className={ui.content}>
        <div className={ui.card} style={{ marginTop: 16 }}><ErrorState title="Couldn't load your book" detail={error} /></div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className={ui.content}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton height={92} radius={12} />
          <Skeleton height={260} radius={12} />
        </div>
      </main>
    );
  }

  if (!data.available) {
    return (
      <main className={ui.content}>
        <div className={s.head}><h1 className={s.title}>My book</h1></div>
        <div className={ui.card} style={{ padding: 28 }}>
          <p style={{ color: 'var(--ink-3)' }}>{data.detail ?? 'Book analytics are not available.'}</p>
        </div>
      </main>
    );
  }

  const maxSeg = Math.max(1, ...(data.segments ?? []).map((x) => x.aum));
  const stats: Stat[] = [
    { label: 'AUM', lead: true, countTo: data.aum ?? 0, fmt: (n) => kes(n), value: kes(data.aum ?? 0), meta: 'assets under management' },
    { label: 'Customers', countTo: data.customers ?? 0, fmt: (n) => count(Math.round(n)), value: count(data.customers ?? 0) },
    { label: 'Deposits', countTo: data.deposits ?? 0, fmt: (n) => kes(n), value: kes(data.deposits ?? 0) },
    { label: 'Loans', countTo: data.loans ?? 0, fmt: (n) => kes(n), value: kes(data.loans ?? 0) },
    { label: 'Net contribution', countTo: data.contribution ?? 0, fmt: (n) => kes(n), value: kes(data.contribution ?? 0), tone: (data.contribution ?? 0) >= 0 ? 'pos' : 'neg' },
    { label: 'NPL customers', countTo: data.npl_customers ?? 0, fmt: (n) => count(Math.round(n)), value: count(data.npl_customers ?? 0), tone: (data.npl_customers ?? 0) > 0 ? 'neg' : undefined },
  ];

  return (
    <main className={ui.content}>
      <div className={s.head}>
        <div className="microlabel" style={{ color: 'var(--teal)' }}>{data.whole_book ? 'Whole book' : 'Relationship manager'}</div>
        <h1 className={s.title}>{data.whole_book ? 'Whole book' : 'My book'}</h1>
        <p className={s.lede}>
          Your customers rolled up — assets, lending, contribution, and where the value sits.
          {data.sales_code ? ` Sales code ${data.sales_code}.` : ''}
        </p>
      </div>

      <StatStrip stats={stats} />

      <div className={ui.chartGrid}>
        <div className={ui.card}>
          <div className={s.cardTitle}>AUM by segment</div>
          <div className={s.bars}>
            {(data.segments ?? []).map((sg) => (
              <div key={sg.segment} className={s.barRow}>
                <div className={s.barLabel}>{sg.segment}<span className={s.barCount}>{count(sg.customers)}</span></div>
                <div className={s.barTrack}><div className={s.barFill} style={{ width: `${(sg.aum / maxSeg) * 100}%` }} /></div>
                <div className={`${s.barVal} tnum`}>{kes(sg.aum)}</div>
              </div>
            ))}
            {(data.segments ?? []).length === 0 && <div className={s.muted}>No segment data.</div>}
          </div>
        </div>

        <div className={ui.card}>
          <div className={s.cardTitle}>Top customers by AUM</div>
          <div className={s.top}>
            {(data.top_customers ?? []).map((c) => (
              <Link key={c.cust_id} href={`/customers/${c.cust_id}`} className={s.topRow}>
                <span className={s.avatar}>{initials(c.name ?? c.cust_id)}</span>
                <span className={s.topMain}>
                  <span className={s.topName}>
                    {c.name ?? `Customer ${c.cust_id}`}
                    {c.npl && <span className={s.nplTag}>NPL</span>}
                  </span>
                  <span className={s.topSeg}>{c.segment ?? 'Unsegmented'}</span>
                </span>
                <span className={`${s.topAum} tnum`}>{kes(c.aum)}</span>
              </Link>
            ))}
            {(data.top_customers ?? []).length === 0 && <div className={s.muted}>No customers in this book.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
