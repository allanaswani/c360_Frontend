'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type BookSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatStrip, type Stat } from '@/components/StatStrip';
import { PartToWhole } from '@/components/charts/PartToWhole';
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

  const aum = data.aum ?? 0;
  const deposits = data.deposits ?? 0;
  const loans = data.loans ?? 0;
  const customers = data.customers ?? 0;
  const nplCust = data.npl_customers ?? 0;
  const nplAum = data.npl_aum ?? 0;
  const nplShare = customers ? Math.round((nplCust / customers) * 100) : 0;
  const nplAumShare = aum ? Math.min(100, Math.round((nplAum / aum) * 100)) : 0;
  const topMax = Math.max(1, ...(data.top_customers ?? []).map((c) => c.aum));
  const multiSegment = (data.segments ?? []).length > 1;
  const maxSeg = Math.max(1, ...(data.segments ?? []).map((x) => x.aum));

  const stats: Stat[] = [
    { label: 'AUM', lead: true, countTo: aum, fmt: (n) => kes(n), value: kes(aum), meta: 'assets under management' },
    { label: 'Customers', countTo: customers, fmt: (n) => count(Math.round(n)), value: count(customers) },
    { label: 'Deposits', countTo: deposits, fmt: (n) => kes(n), value: kes(deposits) },
    { label: 'Loans', countTo: loans, fmt: (n) => kes(n), value: kes(loans) },
    { label: 'Net contribution', countTo: data.contribution ?? 0, fmt: (n) => kes(n), value: kes(data.contribution ?? 0), tone: (data.contribution ?? 0) >= 0 ? 'pos' : 'neg' },
    { label: 'NPL customers', countTo: nplCust, fmt: (n) => count(Math.round(n)), value: count(nplCust), tone: nplCust > 0 ? 'neg' : undefined },
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

      <div className={s.grid2}>
        {/* Book composition — deposits vs loans, always meaningful */}
        <div className={ui.card}>
          <div className={s.cardTitle}>Book composition</div>
          <div className={s.cardSub}>How the {kes(aum)} of AUM splits between funding and lending.</div>
          <PartToWhole
            fmt="kes"
            data={[{ label: 'Deposits', value: deposits }, { label: 'Loans', value: loans }]}
            colors={['var(--teal)', 'var(--series-2)']}
            centerLabel="AUM"
          />
        </div>

        {/* NPL exposure — the actionable risk read */}
        <div className={ui.card}>
          <div className={s.cardTitle}>Non-performing exposure</div>
          <div className={s.cardSub}>Customers flagged non-performing, and the AUM that sits with them.</div>
          <div className={s.nplWrap}>
            <div className={s.nplBig}>
              <span className={s.nplNum}>{count(nplCust)}</span>
              <span className={s.nplOf}>of {count(customers)} customers · {nplShare}%</span>
            </div>
            <div className={s.nplBar}><div className={s.nplBarFill} style={{ width: `${nplShare}%` }} /></div>
            <div className={s.nplRow}>
              <span>AUM at risk</span>
              <span className={`${s.nplAum} tnum`}>{kes(nplAum)}</span>
            </div>
            <div className={s.nplBar}><div className={s.nplBarFill} style={{ width: `${nplAumShare}%` }} /></div>
            <div className={s.nplHint}>{nplAumShare}% of book AUM is with non-performing customers.</div>
          </div>
        </div>
      </div>

      {/* Top customers — the meat, with a share-of-book bar per row */}
      <div className={ui.card} style={{ marginTop: 16 }}>
        <div className={s.cardTitle}>Top customers by AUM</div>
        <div className={s.topGrid}>
          {(data.top_customers ?? []).map((c, i) => (
            <Link key={c.cust_id} href={`/customers/${c.cust_id}`} className={s.topRow}>
              <span className={s.rank}>{i + 1}</span>
              <span className={s.avatar}>{initials(c.name ?? c.cust_id)}</span>
              <span className={s.topMain}>
                <span className={s.topName}>
                  {c.name ?? `Customer ${c.cust_id}`}
                  {c.npl && <span className={s.nplTag}>NPL</span>}
                </span>
                <span className={s.shareTrack}><span className={s.shareFill} style={{ width: `${(c.aum / topMax) * 100}%` }} /></span>
              </span>
              <span className={`${s.topAum} tnum`}>{kes(c.aum)}</span>
            </Link>
          ))}
          {(data.top_customers ?? []).length === 0 && <div className={s.muted}>No customers in this book.</div>}
        </div>
      </div>

      {multiSegment && (
        <div className={ui.card} style={{ marginTop: 16 }}>
          <div className={s.cardTitle}>AUM by segment</div>
          <div className={s.bars}>
            {(data.segments ?? []).map((sg) => (
              <div key={sg.segment} className={s.barRow}>
                <div className={s.barLabel}>{sg.segment}<span className={s.barCount}>{count(sg.customers)}</span></div>
                <div className={s.barTrack}><div className={s.barFill} style={{ width: `${(sg.aum / maxSeg) * 100}%` }} /></div>
                <div className={`${s.barVal} tnum`}>{kes(sg.aum)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
