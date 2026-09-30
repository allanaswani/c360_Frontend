'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ActivityProspects } from '@/lib/types';
import { count, shortDate } from '@/lib/format';
import { EmptyState, UnavailableState } from '../States';
import s from '../ui.module.css';
import ins from '../insights.module.css';

const PER_RULE = 40;

/** Customers across the book whose last 90 days of transactions point to a product
 *  they do not hold: salary with no personal loan, a large idle balance with no fixed
 *  deposit, cash only with no digital banking, and so on. Each row carries the
 *  evidence, so the call starts from a fact rather than a guess. */
export function ActivityCallList({ data }: { data: ActivityProspects }) {
  const [rule, setRule] = useState('');
  const [branch, setBranch] = useState('');
  const branches = useMemo(
    () => [...new Set(data.results.map((r) => r.branch).filter(Boolean) as string[])].sort(),
    [data.results]);

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

  const rows = data.results.filter((r) => (!rule || r.rule_id === rule) && (!branch || r.branch === branch));

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
      <div className={s.worklistBar}>
        <div className={s.worklistCount}>
          <span className="tnum" style={{ fontWeight: 700 }}>{rows.length}</span> shown
          <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>
            {' '}· strongest {PER_RULE} per opportunity
            {data.from && data.to ? `, activity ${shortDate(data.from)} to ${shortDate(data.to)}` : ''}
          </span>
        </div>
        <div className={s.worklistFilters}>
          <label className={s.selectWrap}>
            <span className="microlabel">Branch</span>
            <select className={s.select} value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Customer</th><th>Segment</th><th>Branch</th><th>RM</th><th>Offer</th><th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
