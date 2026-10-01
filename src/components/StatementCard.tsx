'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Statement } from '@/lib/types';
import { kesFull, shortDate } from '@/lib/format';
import { Card } from './Card';
import { DataTable, HEADERS } from './DataTable';
import { TableExport } from './ExportMenu';
import { EmptyState, Skeleton, UnavailableState } from './States';
import ui from './ui.module.css';
import t from './table.module.css';

const PRESETS = [30, 90, 180, 365];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The customer's statement for any range up to a year: every money movement on every
 *  account, signed, with totals over the WHOLE range from the server (the table shows
 *  up to 2,000 rows). Sort, search, filter by account or channel, export. */
export function StatementCard({ custId, latest }: { custId: string; latest: string | null }) {
  const end0 = latest ?? iso(new Date());
  const [days, setDays] = useState<number | null>(90);
  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const e = new Date(end0); const f = new Date(e); f.setDate(e.getDate() - 89);
    return { from: iso(f), to: end0 };
  });
  // Stored with the request it answers: a new range shows loading because the
  // stored answer no longer matches, without resetting state inside the effect.
  const reqKey = `${custId}|${range.from}|${range.to}`;
  const [res, setRes] = useState<{ key: string; data?: Statement; failed?: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    const key = `${custId}|${range.from}|${range.to}`;
    api.statement(custId, range.from, range.to)
      .then((d) => live && setRes({ key, data: d }))
      .catch(() => live && setRes({ key, failed: true }));
    return () => { live = false; };
  }, [custId, range.from, range.to]);
  const current = res?.key === reqKey ? res : null;
  const data = current?.data ?? null;
  const failed = !!current?.failed;

  const preset = (n: number) => {
    const e = new Date(end0); const f = new Date(e); f.setDate(e.getDate() - (n - 1));
    setDays(n);
    setRange({ from: iso(f), to: end0 });
  };

  const block = data ? {
    status: 'live' as const, columns: ['date', 'description', 'account', 'channel', 'amount'],
    rows: data.rows.map((r) => ({ date: r.date, description: r.description, account: r.account ?? '',
                                  channel: r.channel, amount: r.amount })),
  } : null;

  return (
    <Card className={ui.spanFull} title="Statement" status={data && !data.unavailable ? 'live' : undefined}
          question="Every movement on every account, for any period up to a year"
          note="Money out is negative and includes any charge. Totals cover the whole period chosen."
          right={block && block.rows.length ? <TableExport title={`Statement ${range.from} to ${range.to}`} block={block} headers={HEADERS} /> : undefined}>
      <div className={t.tools}>
        {PRESETS.map((n) => (
          <button key={n} type="button" onClick={() => preset(n)} aria-pressed={days === n}
                  className={t.filter} style={{ cursor: 'pointer', fontWeight: days === n ? 700 : 400,
                    borderColor: days === n ? 'var(--teal)' : undefined }}>
            {n === 365 ? '1 year' : `${n} days`}
          </button>
        ))}
        <input type="date" className={t.filter} value={range.from} max={range.to} aria-label="From"
               onChange={(e) => { if (e.target.value) { setDays(null); setRange((r) => ({ ...r, from: e.target.value })); } }} />
        <input type="date" className={t.filter} value={range.to} min={range.from} max={end0} aria-label="To"
               onChange={(e) => { if (e.target.value) { setDays(null); setRange((r) => ({ ...r, to: e.target.value })); } }} />
      </div>
      {failed || data?.unavailable ? (
        <UnavailableState title="The statement could not be loaded">
          {data?.detail ?? 'Try again shortly.'}
        </UnavailableState>
      ) : !data ? <Skeleton height={220} radius={8} /> : data.total_count === 0 ? (
        <EmptyState title={`No money moved between ${shortDate(data.from)} and ${shortDate(data.to)}`} />
      ) : (
        <>
          <div className={t.totals} style={{ padding: '0 2px 8px' }}>
            <span className={t.totalsLabel}>
              {data.total_count.toLocaleString()} movements, {shortDate(data.from)} to {shortDate(data.to)}
              {data.rows.length < data.total_count ? ` (newest ${data.rows.length.toLocaleString()} listed)` : ''}
            </span>
            <span className={t.total}>In <b className="tnum" style={{ color: 'var(--pos)' }}>{kesFull(data.total_in)}</b></span>
            <span className={t.total}>Out <b className="tnum" style={{ color: 'var(--neg)' }}>{kesFull(-data.total_out)}</b></span>
            <span className={t.total}>Net <b className="tnum">{kesFull(data.total_in - data.total_out)}</b></span>
          </div>
          <DataTable block={block!} flow />
        </>
      )}
    </Card>
  );
}
