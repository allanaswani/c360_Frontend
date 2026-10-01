'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Maturities } from '@/lib/types';
import { count, fmtValue, kesFull, shortDate } from '@/lib/format';
import { ChartTooltip } from '../charts/ChartTooltip';
import { TableExport } from '../ExportMenu';
import { EmptyState, UnavailableState } from '../States';
import { useTableSort } from '../useTableSort';
import s from '../ui.module.css';
import t from '../table.module.css';

/** Fixed and call deposits maturing soon - who to call before the money leaves. */
export function MaturitiesList({ data }: { data: Maturities }) {
  const [branch, setBranch] = useState('');
  const branches = useMemo(() => [...new Set(data.results.map((r) => r.branch).filter(Boolean) as string[])].sort(), [data.results]);
  const rows = useMemo(() => data.results.filter((r) => !branch || r.branch === branch), [data.results, branch]);
  const { shown, th, search } = useTableSort(rows, MAT_COLS, matSearch);
  if (data.unavailable) {
    return <UnavailableState title="The maturity list could not be built">{data.detail ?? 'Try again shortly.'}</UnavailableState>;
  }
  if (!data.count) {
    return <EmptyState title={`No deposits mature in the next ${data.days ?? 30} days`} />;
  }
  const exportBlock = {
    columns: ['matures', 'name', 'cust_id', 'product', 'account_no', 'balance', 'branch', 'rm_name'],
    rows: shown.map((r) => ({ matures: r.matures, name: r.name ?? '', cust_id: r.cust_id, product: r.product,
                             account_no: r.account_no ?? '', balance: r.balance, branch: r.branch ?? '', rm_name: r.rm_name ?? '' })),
  };
  return (
    <div>
      <div className={t.totals} style={{ padding: '0 2px 8px' }}>
        <span className={t.totalsLabel}>
          {shortDate(data.as_of ?? null)} to {shortDate(data.until ?? null)}
        </span>
        <span className={t.total}>Deposits maturing <b className="tnum">{count(data.count)}</b></span>
        <span className={t.total}>Value <b className="tnum">{kesFull(data.value ?? 0)}</b></span>
      </div>
      {data.by_week && data.by_week.length > 0 && (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data.by_week} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} dy={6} />
            <YAxis tickFormatter={(v) => fmtValue(Number(v), 'kes')} tickLine={false} axisLine={false} width={56} />
            <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--teal) 6%, transparent)' }}
                     content={({ active, payload, label }) => active && payload?.length ? (
                       <ChartTooltip label={String(label)} rows={[
                         { key: 'Value maturing', color: 'var(--cat-1)', value: kesFull(Number(payload[0].value)) },
                         { key: 'Deposits', color: 'var(--cat-1)', value: count(Number((payload[0].payload as { count: number }).count)) },
                       ]} />) : null} />
            <Bar dataKey="value" fill="var(--cat-1)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      )}
      {(data.past_due_count ?? 0) > 0 && (
        <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', margin: '6px 0 10px' }}>
          A further {count(data.past_due_count!)} deposits ({kesFull(data.past_due_value ?? 0)}) show a maturity date
          that has already passed while still holding a balance. The data does not say whether they were rolled over,
          so they are not listed here.
        </div>
      )}
      <div className={t.tools}>
        {search}
        <select className={t.filter} value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Filter by branch">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className={t.count}>
          {shown.length} shown{data.results.length < (data.count ?? 0) ? `, earliest ${data.results.length} of ${data.count} listed` : ''}
        </span>
        <TableExport title="Deposits maturing" block={exportBlock}
                     headers={{ matures: 'Matures', name: 'Customer', cust_id: 'Customer no', product: 'Product',
                                account_no: 'Account', balance: 'Balance', branch: 'Branch', rm_name: 'RM' }} />
      </div>
      <div className={`${s.tableWrap} ${t.scroll}`} style={{ maxHeight: 460 }}>
        <table className={`${s.table} ${t.sticky}`}>
          <thead>
            <tr>
              {th('matures', 'Matures')}{th('name', 'Customer')}{th('product', 'Product')}{th('branch', 'Branch')}
              {th('rm', 'RM')}{th('balance', 'Balance', { numeric: true, className: s.tRight })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.cust_id}-${r.account_no}`}>
                <td>{shortDate(r.matures)}<div className={s.wl_id}>{r.days_left === 0 ? 'today' : `in ${r.days_left} days`}</div></td>
                <td>
                  <Link href={`/customers/${r.cust_id}`} className={s.wl_cust}>{r.name ?? r.cust_id}</Link>
                  <div className={s.wl_id}>{r.cust_id} · {r.segment}</div>
                </td>
                <td>{r.product}<div className={s.wl_id}>{r.account_no}</div></td>
                <td className={s.tMuted}>{r.branch ?? '—'}</td>
                <td className={s.tMuted}>{r.rm_name ?? '—'}</td>
                <td className={`${s.tRight} tnum`}>{kesFull(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type MatRow = Maturities['results'][number];
// Module-level so the sort hook's memo is stable across renders.
const MAT_COLS: Record<string, (r: MatRow) => string | number | null | undefined> = {
  matures: (r) => r.matures, name: (r) => r.name, product: (r) => r.product, branch: (r) => r.branch,
  rm: (r) => r.rm_name, balance: (r) => r.balance,
};
const matSearch = (r: MatRow) => [r.name, r.cust_id, r.account_no, r.branch, r.rm_name, r.product];
