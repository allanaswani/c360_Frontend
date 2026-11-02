'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AlertKind, BookAlert, BookAlerts } from '@/lib/types';
import { count, kesFull, shortDate } from '@/lib/format';
import { TableExport } from './ExportMenu';
import { EmptyState, Skeleton, UnavailableState } from './States';
import { useTableSort } from './useTableSort';
import ui from './ui.module.css';
import t from './table.module.css';

const TONE: Record<AlertKind, string> = { arrears: 'var(--neg)', deposit_drop: 'color-mix(in srgb, var(--gold) 55%, var(--ink-1))', maturity: 'var(--teal)' };

/** What changed in the book since the RM last looked: loans that fell into arrears
 *  this week, deposits that halved in 30 days, deposits maturing in 14 days. One
 *  book-wide read an hour (backend c360/alerts.py); each RM sees their own book. */
export function BookAlertsPanel() {
  const [data, setData] = useState<BookAlerts | null>(null);
  const [kind, setKind] = useState<AlertKind | ''>('');
  useEffect(() => {
    let live = true;
    api.alerts().then((d) => live && setData(d)).catch((e) => live && setData({ available: false, detail: e.message }));
    return () => { live = false; };
  }, []);
  const all = useMemo(() => data?.alerts ?? [], [data]);
  const rows = useMemo(() => all.filter((a) => !kind || a.kind === kind), [all, kind]);
  const { shown, th, search } = useTableSort(rows, COLS, searchIn);

  if (!data) return <Skeleton height={160} radius={12} />;
  return (
    <div className={ui.card} style={{ padding: 'var(--s-4) var(--s-5)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 'var(--t-sm)', fontWeight: 700 }}>
          Alerts{data.whole_book ? ', whole book' : ' in your book'}
        </div>
        {data.loan_as_of && (
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)' }}>
            Loans and deposits at {shortDate(data.loan_as_of)}. Checked hourly.
          </span>
        )}
      </div>
      {!data.available ? (
        <UnavailableState title="Alerts could not be loaded">{data.detail ?? 'Try again shortly.'}</UnavailableState>
      ) : all.length === 0 ? (
        <EmptyState title="Nothing new in your book: no fresh arrears, no sharp deposit falls, no deposits maturing in the next 14 days" />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
            {(data.summary ?? []).map((sm) => (
              <button key={sm.kind} type="button" onClick={() => setKind(kind === sm.kind ? '' : sm.kind)}
                      aria-pressed={kind === sm.kind}
                      style={{
                        border: `1px solid ${kind === sm.kind ? TONE[sm.kind] : 'var(--hairline)'}`, borderRadius: 10,
                        background: kind === sm.kind ? 'color-mix(in srgb, var(--teal) 6%, transparent)' : 'var(--surface)',
                        padding: '8px 12px', cursor: 'pointer', textAlign: 'left', minWidth: 170, color: 'var(--ink-1)',
                      }}>
                <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{sm.label}</div>
                <div className="tnum" style={{ fontSize: 'var(--t-lg)', fontWeight: 700, color: sm.count ? TONE[sm.kind] : 'var(--ink-3)' }}>
                  {count(sm.count)}
                </div>
                <div className="tnum" style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)' }}>{kesFull(sm.amount)}</div>
              </button>
            ))}
          </div>
          <div className={t.tools}>
            {search}
            <span className={t.count}>{shown.length} shown</span>
            <TableExport title="Alerts" block={{
              columns: ['date', 'kind', 'name', 'cust_id', 'title', 'detail', 'amount', 'branch', 'rm_name'],
              rows: shown.map((a) => ({ date: a.date, kind: LABEL[a.kind], name: a.name ?? '', cust_id: a.cust_id, title: a.title,
                                        detail: a.detail, amount: a.amount, branch: a.branch ?? '', rm_name: a.rm_name ?? '' })),
            }} headers={{ date: 'Date', kind: 'Alert', name: 'Customer', cust_id: 'Customer no', title: 'What happened',
                          detail: 'Detail', amount: 'KES', branch: 'Branch', rm_name: 'RM' }} />
          </div>
          <div className={`${ui.tableWrap} ${t.scroll}`} style={{ maxHeight: 420 }}>
            <table className={`${ui.table} ${t.sticky}`}>
              <thead>
                <tr>
                  {th('date', 'Date')}{th('name', 'Customer')}{th('title', 'What happened')}
                  {data.whole_book && th('rm', 'RM')}{th('amount', 'KES', { numeric: true, className: ui.tRight })}
                </tr>
              </thead>
              <tbody>
                {shown.map((a, i) => (
                  <tr key={`${a.kind}-${a.cust_id}-${a.account_no ?? ''}-${i}`}>
                    <td>{shortDate(a.date)}</td>
                    <td>
                      <Link href={`/customers/${a.cust_id}`} className={ui.wl_cust}>{a.name ?? a.cust_id}</Link>
                      <div className={ui.wl_id}>{a.cust_id} · {a.segment}{a.branch ? ` · ${a.branch}` : ''}</div>
                    </td>
                    <td style={{ whiteSpace: 'normal', minWidth: 260 }}>
                      <span style={{ color: TONE[a.kind], fontWeight: 600 }}>{a.title}</span>
                      <div className={ui.wl_id}>{a.detail}</div>
                    </td>
                    {data.whole_book && <td className={ui.tMuted}>{a.rm_name ?? '—'}</td>}
                    <td className={`${ui.tRight} tnum`}>{kesFull(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.whole_book && (data.unassigned ?? 0) > 0 && (
            <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', marginTop: 6 }}>
              {count(data.unassigned!)} of these customers have no RM on record, so no RM sees them in their own book.
            </div>
          )}
        </>
      )}
    </div>
  );
}

const LABEL: Record<AlertKind, string> = { arrears: 'Fell into arrears', deposit_drop: 'Deposits fell sharply', maturity: 'Deposit maturing' };
// Module-level so the sort hook's memo is stable across renders.
const COLS: Record<string, (a: BookAlert) => string | number | null | undefined> = {
  date: (a) => a.date, name: (a) => a.name, title: (a) => a.title, rm: (a) => a.rm_name, amount: (a) => a.amount,
};
const searchIn = (a: BookAlert) => [a.name, a.cust_id, a.branch, a.rm_name, a.title, a.account_no];
