'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { WorklistRow } from '@/lib/types';
import { kes } from '@/lib/format';
import { useTableSort } from '../useTableSort';
import s from '../ui.module.css';
import t from '../table.module.css';

/** Cross-sell worklist — the engine's output ranked across the book, filterable by
 *  RM and branch, so an RM opens the tool and sees their own call list. */
export function Worklist({ rows }: { rows: WorklistRow[] }) {
  const [rm, setRm] = useState('');
  const [branch, setBranch] = useState('');

  const rms = useMemo(() => uniq(rows.map((r) => r.rm_name).filter(Boolean) as string[]), [rows]);
  const branches = useMemo(() => uniq(rows.map((r) => r.branch)), [rows]);

  const filtered = useMemo(() => rows.filter((r) => (!rm || r.rm_name === rm) && (!branch || r.branch === branch)),
                           [rows, rm, branch]);
  const { shown, th, search } = useTableSort(filtered, WL_COLS, wlSearch);

  return (
    <div>
      <div className={s.worklistBar}>
        <div className={s.worklistCount}>
          <span className="tnum" style={{ fontWeight: 700 }}>{shown.length}</span> opportunities
          {shown.length !== rows.length && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> of {rows.length}</span>}
        </div>
        <div className={s.worklistFilters}>
          {search}
          <Select label="RM" value={rm} onChange={setRm} options={rms} />
          <Select label="Branch" value={branch} onChange={setBranch} options={branches} />
        </div>
      </div>
      <div className={`${s.tableWrap} ${shown.length > 15 ? t.scroll : ''}`} style={shown.length > 15 ? { maxHeight: 560 } : undefined}>
        <table className={`${s.table} ${t.sticky}`}>
          <thead>
            <tr>
              {th('name', 'Customer')}
              {th('value', 'Value', { numeric: true, className: s.tRight })}
              {th('segment', 'Segment')}
              {th('branch', 'Branch')}
              {th('rm', 'RM')}
              {th('product', 'Recommend')}
              <th className={s.wl_reason}>Why</th>
              {th('status', 'Status')}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              // A customer can appear once per recommendation, so the row key must
              // include the product (and index) — cust_id alone collides.
              <tr key={`${r.cust_id}-${r.recommendation.product}-${i}`}>
                <td>
                  <Link href={`/customers/${r.cust_id}`} className={s.wl_cust}>{r.name}</Link>
                  <div className={s.wl_id}>{r.cust_id}</div>
                </td>
                <td className={`${s.tRight} tnum`}>{kes(r.value)}</td>
                <td className={s.tMuted}>{r.segment}</td>
                <td className={s.tMuted}>{r.branch}</td>
                <td className={s.tMuted}>{r.rm_name ?? '—'}</td>
                <td>
                  <span className={s.wl_product}>{r.recommendation.product_name}</span>
                  {r.recommendation.rule_id.startsWith('ml.') && r.recommendation.score !== null
                    ? <span className={s.recPropTag} style={{ marginLeft: 6 }} title="Model-estimated propensity">{Math.round(r.recommendation.score * 100)}%</span>
                    : <span className={s.recDomainTag} style={{ marginLeft: 6 }}>{r.recommendation.domain}</span>}
                </td>
                {/* The SHORT reason. The full sentence opens with the same boilerplate
                    on every model-generated row, so a truncated column showed every
                    customer the identical string and the driver never appeared. */}
                <td className={`${s.wl_reason} ${s.tMuted}`} title={r.recommendation.reason}>
                  {r.recommendation.reason_short || r.recommendation.reason}
                </td>
                <td>
                  {r.recommendation_status !== 'ok' ? (
                    <span className={`${s.badge} ${s.badgePreview}`} title={r.recommendation_status === 'eligibility_hold' ? 'Blocked by the derived risk/KYC gate' : 'No risk/KYC profile available'}><span className={s.badgeDot} style={{ background: 'var(--prov-preview)' }} />Held</span>
                  ) : (
                    <span className={`${s.badge} ${s.badgeLive}`}><span className={s.badgeDot} style={{ background: 'var(--prov-live)' }} />Ready</span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={8} className={s.tMuted} style={{ textAlign: 'center', padding: 28 }}>No opportunities match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className={s.selectWrap}>
      <span className="microlabel">{label}</span>
      <select className={s.select} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}

// Module-level so the sort hook's memo is stable across renders.
const WL_COLS: Record<string, (r: WorklistRow) => string | number | null | undefined> = {
  name: (r) => r.name, value: (r) => r.value, segment: (r) => r.segment, branch: (r) => r.branch,
  rm: (r) => r.rm_name, product: (r) => r.recommendation.product_name, status: (r) => r.recommendation_status,
};
const wlSearch = (r: WorklistRow) => [r.name, r.cust_id, r.branch, r.rm_name, r.segment, r.recommendation.product_name];
