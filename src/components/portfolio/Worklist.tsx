'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { WorklistRow } from '@/lib/types';
import { kes } from '@/lib/format';
import s from '../ui.module.css';

/** Cross-sell worklist — the engine's output ranked across the book, filterable by
 *  RM and branch, so an RM opens the tool and sees their own call list. */
export function Worklist({ rows }: { rows: WorklistRow[] }) {
  const [rm, setRm] = useState('');
  const [branch, setBranch] = useState('');

  const rms = useMemo(() => uniq(rows.map((r) => r.rm_name).filter(Boolean) as string[]), [rows]);
  const branches = useMemo(() => uniq(rows.map((r) => r.branch)), [rows]);

  const filtered = rows.filter((r) => (!rm || r.rm_name === rm) && (!branch || r.branch === branch));

  return (
    <div>
      <div className={s.worklistBar}>
        <div className={s.worklistCount}>
          <span className="tnum" style={{ fontWeight: 700 }}>{filtered.length}</span> opportunities
        </div>
        <div className={s.worklistFilters}>
          <Select label="RM" value={rm} onChange={setRm} options={rms} />
          <Select label="Branch" value={branch} onChange={setBranch} options={branches} />
        </div>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Segment</th>
              <th>Branch</th>
              <th>RM</th>
              <th>Recommend</th>
              <th className={s.wl_reason}>Why</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              // A customer can appear once per recommendation, so the row key must
              // include the product (and index) — cust_id alone collides.
              <tr key={`${r.cust_id}-${r.recommendation.product}-${i}`}>
                <td>
                  <Link href={`/customers/${r.cust_id}`} className={s.wl_cust}>{r.name}</Link>
                  <div className={s.wl_id}>{r.cust_id} · {kes(r.value)}</div>
                </td>
                <td className={s.tMuted}>{r.segment}</td>
                <td className={s.tMuted}>{r.branch}</td>
                <td className={s.tMuted}>{r.rm_name ?? '—'}</td>
                <td>
                  <span className={s.wl_product}>{r.recommendation.product_name}</span>
                  {r.recommendation.rule_id.startsWith('ml.') && r.recommendation.score !== null
                    ? <span className={s.recPropTag} style={{ marginLeft: 6 }} title="Model-estimated propensity">{Math.round(r.recommendation.score * 100)}%</span>
                    : <span className={s.recDomainTag} style={{ marginLeft: 6 }}>{r.recommendation.domain}</span>}
                </td>
                <td className={`${s.wl_reason} ${s.tMuted}`} title={r.recommendation.reason}>{r.recommendation.reason}</td>
                <td>
                  {r.recommendation_status !== 'ok' ? (
                    <span className={`${s.badge} ${s.badgePreview}`} title={r.recommendation_status === 'eligibility_hold' ? 'Blocked by the derived risk/KYC gate' : 'No risk/KYC profile available'}><span className={s.badgeDot} style={{ background: 'var(--prov-preview)' }} />Held</span>
                  ) : (
                    <span className={`${s.badge} ${s.badgeLive}`}><span className={s.badgeDot} style={{ background: 'var(--prov-live)' }} />Ready</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className={s.tMuted} style={{ textAlign: 'center', padding: 28 }}>No opportunities match these filters.</td></tr>
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
