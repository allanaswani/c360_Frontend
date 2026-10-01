'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ActivityProspects } from '@/lib/types';
import { count, shortDate } from '@/lib/format';
import { EmptyState, UnavailableState } from '../States';
import { CallListChart } from './CallListChart';
import { useTableSort } from '../useTableSort';
import s from '../ui.module.css';
import t from '../table.module.css';
import ins from '../insights.module.css';

const PER_RULE = 40;

/** Customers across the book whose last 90 days of transactions point to a product
 *  they do not hold: salary with no personal loan, a large idle balance with no fixed
 *  deposit, cash only with no digital banking, and so on. Each row carries the
 *  evidence, so the call starts from a fact rather than a guess. */
export function ActivityCallList({ data }: { data: ActivityProspects }) {
  const [rule, setRule] = useState('');
  const [branch, setBranch] = useState('');
  const [rm, setRm] = useState('');
  const branches = useMemo(
    () => [...new Set(data.results.map((r) => r.branch).filter(Boolean) as string[])].sort(),
    [data.results]);
  const rows = useMemo(() => data.results.filter((r) => (!rule || r.rule_id === rule) && (!branch || r.branch === branch)
                                                     && (!rm || r.rm_name === rm)), [data.results, rule, branch, rm]);
  const { shown, th, search } = useTableSort(rows, CL_COLS, clSearch);

  if (data.unavailable) {
    return (
      <UnavailableState title="The call list could not be built">
        {data.detail ?? 'The transaction ledger is not available in this mode.'}
      </UnavailableState>
    );
  }
  if (data.results.length === 0) {
    return <EmptyState title="No customer’s recent activity points to a missing product" />;
  }

  const byBranch = data.by_branch ?? [];
  const byRm = data.by_rm ?? [];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <button className={`${ins.chip}`} aria-pressed={rule === ''} onClick={() => setRule('')}
                style={{ border: 'none', cursor: 'pointer', opacity: rule === '' ? 1 : 0.6 }}>
          All opportunities
        </button>
        {data.rules.map((r) => (
          <button key={r.rule_id} className={ins.chip} aria-pressed={rule === r.rule_id}
                  onClick={() => setRule(r.rule_id)} title={r.reason_short}
                  style={{ border: 'none', cursor: 'pointer', opacity: rule === r.rule_id ? 1 : 0.6 }}>
            {r.product_name} · {count(r.customers)}
          </button>
        ))}
      </div>
      {byBranch.length > 0 && (
        <div className={s.chartGrid} style={{ marginTop: 0, marginBottom: 12 }}>
          <div>
            <div className="microlabel" style={{ marginBottom: 6 }}>Opportunities by branch, top {byBranch.length} (click a bar to list that branch)</div>
            <CallListChart rows={byBranch} rules={data.rules} onPick={setBranch} />
          </div>
          <div>
            <div className="microlabel" style={{ marginBottom: 6 }}>Opportunities by current RM</div>
            {byRm.length > 0
              ? <CallListChart rows={byRm} rules={data.rules} onPick={setRm} />
              : <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>The RM allocation could not be read, so opportunities are not split by RM.</div>}
          </div>
        </div>
      )}
      <div className={s.worklistBar}>
        <div className={s.worklistCount}>
          <span className="tnum" style={{ fontWeight: 700 }}>{shown.length}</span> shown
          <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>
            {' '}· strongest {PER_RULE} per opportunity
            {data.from && data.to ? `, activity ${shortDate(data.from)} to ${shortDate(data.to)}` : ''}
          </span>
        </div>
        <div className={s.worklistFilters}>
          {search}
          {rm && (
            <button type="button" className={s.select} onClick={() => setRm('')} style={{ cursor: 'pointer' }}>
              RM: {rm} ✕
            </button>
          )}
          <label className={s.selectWrap}>
            <span className="microlabel">Branch</span>
            <select className={s.select} value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className={`${s.tableWrap} ${shown.length > 15 ? t.scroll : ''}`} style={shown.length > 15 ? { maxHeight: 560 } : undefined}>
        <table className={`${s.table} ${t.sticky}`}>
          <thead>
            <tr>
              {th('name', 'Customer')}{th('segment', 'Segment')}{th('branch', 'Branch')}{th('rm', 'RM')}
              {th('offer', 'Offer')}<th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.rule_id}-${r.cust_id}`}>
                <td>
                  <Link href={`/customers/${r.cust_id}`} className={s.wl_cust}>{r.name ?? r.cust_id}</Link>
                  <div className={s.wl_id}>{r.cust_id}</div>
                </td>
                <td className={s.tMuted}>{r.segment}</td>
                <td className={s.tMuted}>{r.branch ?? '—'}</td>
                <td className={s.tMuted}>{r.rm_name ?? '—'}</td>
                <td>
                  <span className={s.wl_product}>{r.product_name}</span>
                  <div className={s.wl_id}>{r.reason_short}</div>
                </td>
                <td style={{ whiteSpace: 'normal', minWidth: 260, fontSize: 'var(--t-2xs)', color: 'var(--ink-2)' }}>
                  {r.evidence.join(' ')}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={6} className={s.tMuted} style={{ textAlign: 'center', padding: 28 }}>No customers match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CallRow = ActivityProspects['results'][number];
// Module-level so the sort hook's memo is stable across renders.
const CL_COLS: Record<string, (r: CallRow) => string | number | null | undefined> = {
  name: (r) => r.name, segment: (r) => r.segment, branch: (r) => r.branch, rm: (r) => r.rm_name,
  offer: (r) => r.product_name,
};
const clSearch = (r: CallRow) => [r.name, r.cust_id, r.branch, r.rm_name, r.segment, r.product_name];
