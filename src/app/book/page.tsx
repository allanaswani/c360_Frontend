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
          <Skeleton height={214} radius={12} />
          <div className={s.layout}>
            <Skeleton height={420} radius={12} />
            <div className={s.rail}>
              <Skeleton height={180} radius={12} />
              <Skeleton height={200} radius={12} />
            </div>
          </div>
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
  const contribution = data.contribution ?? 0;
  const nplCust = data.npl_customers ?? 0;
  const nplAum = data.npl_aum ?? 0;
  const nplShare = customers ? Math.round((nplCust / customers) * 100) : 0;
  const nplAumShare = aum ? Math.min(100, Math.round((nplAum / aum) * 100)) : 0;
  const ltd = deposits > 0 ? loans / deposits : null;

  const top = data.top_customers ?? [];
  const topMax = Math.max(1, ...top.map((c) => c.aum));
  const segments = data.segments ?? [];
  const multiSegment = segments.length > 1;
  const maxSeg = Math.max(1, ...segments.map((x) => x.aum));

  const bsTotal = deposits + loans;
  const depPct = bsTotal > 0 ? (deposits / bsTotal) * 100 : 0;
  const loanPct = bsTotal > 0 ? (loans / bsTotal) * 100 : 0;

  const stats: Stat[] = [
    { label: 'AUM', lead: true, countTo: aum, fmt: (n) => kes(n), value: kes(aum), meta: 'allocation snapshot' },
    { label: 'Customers', countTo: customers, fmt: (n) => count(Math.round(n)), value: count(customers) },
    { label: 'Deposits', countTo: deposits, fmt: (n) => kes(n), value: kes(deposits) },
    { label: 'Loans', countTo: loans, fmt: (n) => kes(n), value: kes(loans) },
    { label: 'Net contribution', countTo: contribution, fmt: (n) => kes(n), value: kes(contribution), tone: contribution >= 0 ? 'pos' : 'neg' },
    { label: 'Non-performing', countTo: nplCust, fmt: (n) => count(Math.round(n)), value: count(nplCust), tone: nplCust > 0 ? 'neg' : undefined, meta: `${nplShare}% of customers` },
  ];

  return (
    <main className={ui.content}>
      <div className={s.headRow}>
        <h1 className={s.title}>{data.whole_book ? 'Whole book' : 'My book'}</h1>
        <div className={s.headMeta}>
          {data.sales_code && <span>Sales code {data.sales_code}</span>}
          <span className={s.snapChip} title="Every figure on this page is rolled up from the allocation base — a periodic management upload, not the live deposit/loan ledger. It refreshes when a new allocation file is loaded.">Allocation snapshot</span>
        </div>
      </div>
      <StatStrip stats={stats} />

      {/* ---- working area ---- */}
      <div className={s.layout}>
        {/* primary: top customers */}
        <div className={ui.card}>
          <div className={s.cardPad}>
            <div className={s.cardTitle}>
              Top customers by AUM
              <span className={s.count}>{top.length ? `top ${top.length}` : ''}</span>
            </div>
            <div className={s.cardSub}>Where the book&apos;s value concentrates — largest relationships first. Open any to drill in.</div>
            <div className={s.topList}>
              {top.map((c, i) => (
                <Link key={c.cust_id} href={`/customers/${c.cust_id}`} className={s.topRow}>
                  <span className={s.rank}>{i + 1}</span>
                  <span className={s.avatar}>{initials(c.name ?? c.cust_id)}</span>
                  <span className={s.topMain}>
                    <span className={s.topName}>
                      {c.name ?? `Customer ${c.cust_id}`}
                      {c.segment && <span className={s.topSeg}>{c.segment}</span>}
                      {c.npl && <span className={s.nplTag}>NPL</span>}
                    </span>
                    <span className={s.shareTrack}>
                      <span className={`${s.shareFill} ${c.npl ? s.shareFillNpl : ''}`} style={{ width: `${(c.aum / topMax) * 100}%` }} />
                    </span>
                  </span>
                  <span className={s.topFig}>
                    <span className={`${s.topAum} tnum`}>{kes(c.aum)}</span>
                    <span className={`${s.topContrib} ${c.contribution >= 0 ? s.topContribPos : s.topContribNeg} tnum`}>
                      {c.contribution >= 0 ? '+' : ''}{kes(c.contribution)} contrib.
                    </span>
                  </span>
                </Link>
              ))}
              {top.length === 0 && <div className={s.muted}>No customers in this book.</div>}
            </div>
          </div>
        </div>

        {/* right rail: risk + composition */}
        <div className={s.rail}>
          {/* non-performing exposure */}
          <div className={ui.card}>
            <div className={s.cardPad}>
              <div className={s.cardTitle}>Non-performing exposure</div>
              {nplCust > 0 ? (
                <>
                  <div className={s.cardSub}>Customers flagged non-performing, and the AUM that sits with them.</div>
                  <div className={s.nplWrap}>
                    <div className={s.nplBig}>
                      <span className={`${s.nplNum} tnum`}>{count(nplCust)}</span>
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
                </>
              ) : (
                <div className={s.nplClear}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6L9 17l-5-5" /></svg>
                  No non-performing customers in this book.
                </div>
              )}
            </div>
          </div>

          {/* balance-sheet mix — a single split bar, not a 2-slice donut */}
          <div className={ui.card}>
            <div className={s.cardPad}>
              <div className={s.cardTitle}>Balance-sheet mix{ltd != null && <span className={s.count}>{ltd.toFixed(2)}× loan-to-deposit</span>}</div>
              <div className={s.cardSub}>Deposits (funding) against loans (lending) — {kes(bsTotal)} of balances.</div>
              {bsTotal > 0 ? (
                <>
                  <div className={s.bsBar}>
                    <div className={s.bsSeg} style={{ width: `${depPct}%`, background: 'var(--teal)' }}>{depPct >= 12 ? `${Math.round(depPct)}%` : ''}</div>
                    <div className={s.bsSeg} style={{ width: `${loanPct}%`, background: 'var(--series-2)' }}>{loanPct >= 12 ? `${Math.round(loanPct)}%` : ''}</div>
                  </div>
                  <div className={s.bsLegend}>
                    <div className={s.bsLegendRow}>
                      <span className={s.bsKey}><span className={s.bsSwatch} style={{ background: 'var(--teal)' }} />Deposits<span className={s.bsPct}>{Math.round(depPct)}%</span></span>
                      <span className={`${s.bsVal} tnum`}>{kes(deposits)}</span>
                    </div>
                    <div className={s.bsLegendRow}>
                      <span className={s.bsKey}><span className={s.bsSwatch} style={{ background: 'var(--series-2)' }} />Loans<span className={s.bsPct}>{Math.round(loanPct)}%</span></span>
                      <span className={`${s.bsVal} tnum`}>{kes(loans)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className={s.muted}>No deposit or loan balances in this book.</div>
              )}
            </div>
          </div>

          {/* AUM by segment — only when the book spans more than one */}
          {multiSegment && (
            <div className={ui.card}>
              <div className={s.cardPad}>
                <div className={s.cardTitle}>AUM by segment</div>
                <div className={s.bars}>
                  {segments.map((sg) => (
                    <div key={sg.segment} className={s.barRow}>
                      <div className={s.barLabel}><span className="name">{sg.segment}</span><span className={s.barCount}>{count(sg.customers)}</span></div>
                      <div className={`${s.barVal} tnum`}>{kes(sg.aum)}</div>
                      <div className={s.barTrack}><div className={s.barFill} style={{ width: `${(sg.aum / maxSeg) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
