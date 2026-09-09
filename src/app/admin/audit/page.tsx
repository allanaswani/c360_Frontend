'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { AuditPage, AuditRow } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/States';
import ui from '@/components/ui.module.css';
import s from './audit.module.css';

const KINDS = ['', 'api', 'click', 'nav', 'page_view', 'auth'];
const RANGES: { label: string; minutes: number | null }[] = [
  { label: '1h', minutes: 60 }, { label: '24h', minutes: 1440 },
  { label: '7d', minutes: 10080 }, { label: 'All', minutes: null },
];
const PAGE = 50;

export default function AuditPage2() {
  const { user } = useAuth();
  const initialStatus = useSearchParams().get('status') ?? '';
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [statusF, setStatusF] = useState(initialStatus);
  const [range, setRange] = useState<number | null>(1440);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (kind) params.set('kind', kind);
    if (statusF) params.set('status', statusF);
    if (range != null) params.set('since', new Date(Date.now() - range * 60_000).toISOString());
    params.set('limit', String(PAGE));
    params.set('offset', String(offset));
    try {
      setData(await api.audit(params.toString()));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q, kind, statusF, range, offset]);

  // Debounced reload on any filter change; reset paging when filters (not offset) change.
  useEffect(() => {
    if (!user?.is_admin) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [user, load]);

  useEffect(() => { setOffset(0); }, [q, kind, statusF, range]);

  if (!user) return null;
  if (!user.is_admin) {
    return (
      <main className={ui.content}>
        <div className={ui.card}><div style={{ padding: 32 }}>
          <h2 style={{ marginBottom: 8 }}>Administrators only</h2>
          <p style={{ color: 'var(--ink-3)' }}>The audit trail is available to administrators.</p>
        </div></div>
      </main>
    );
  }

  const rows = data?.results ?? [];
  const total = data?.count ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);

  return (
    <main className={ui.content}>
      <div className={s.head}>
        <div>
          <div className={s.crumbs}>
            <Link href="/" className={s.crumb}>Customer 360</Link><span className={s.crumbSep}>/</span>
            <span>Audit trail</span>
          </div>
          <h1 className={s.title}>Audit trail</h1>
          <p className={s.sub}>Every action and interaction, in real system time · <Link href="/admin/observability" className={s.inlineLink}>Monitoring →</Link></p>
        </div>
      </div>

      <div className={s.filters}>
        <input className={s.search} placeholder="Search route, user, target…" value={q}
               onChange={(e) => setQ(e.target.value)} aria-label="Search audit" />
        <select className={s.select} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
          {KINDS.map((k) => <option key={k || 'all'} value={k}>{k ? k : 'All kinds'}</option>)}
        </select>
        <input className={s.statusInput} placeholder="Status" value={statusF}
               onChange={(e) => setStatusF(e.target.value.replace(/[^0-9]/g, ''))} aria-label="Status code" inputMode="numeric" />
        <div className={s.rangeTabs} role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r.label} role="tab" aria-selected={range === r.minutes}
                    className={`${s.rangeTab} ${range === r.minutes ? s.rangeTabActive : ''}`}
                    onClick={() => setRange(r.minutes)}>{r.label}</button>
          ))}
        </div>
        <span className={s.spacer} />
        <span className={s.count}>{loading ? '…' : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}</span>
      </div>

      <div className={`${ui.card} ${s.tableCard}`}>
        {error && <div style={{ padding: 16, color: 'var(--coral)' }}>{error}</div>}
        {!data ? <Skeleton height={300} radius={12} /> : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Time</th><th>User</th><th>Kind</th><th>Action</th>
                  <th className={s.right}>Status</th><th>Target</th><th className={s.right}>ms</th><th>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} className={s.empty}>No events match these filters.</td></tr>
                )}
                {rows.map((e) => <Row key={e.id} e={e} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={s.pager}>
        <button className={s.pageBtn} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>← Newer</button>
        <button className={s.pageBtn} disabled={to >= total} onClick={() => setOffset(offset + PAGE)}>Older →</button>
      </div>
    </main>
  );
}

function Row({ e }: { e: AuditRow }) {
  const d = new Date(e.ts);
  return (
    <tr>
      <td className={s.timeCell}>
        <span className={s.time}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        <span className={s.date}>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
      </td>
      <td className={s.userCell}>{e.username || (e.user_id != null ? `#${e.user_id}` : '—')}</td>
      <td><span className={`${s.kind} ${s['kind_' + e.kind] || ''}`}>{e.kind}</span></td>
      <td className={s.actionCell}>
        {e.method && <b className={s.method}>{e.method}</b>}
        <span className={s.route}>{e.route || e.target || '—'}</span>
      </td>
      <td className={s.right}>
        {e.status != null && (
          <span className={`${s.status} ${e.status >= 500 ? s.s5 : e.status >= 400 ? s.s4 : s.s2}`}>{e.status}</span>
        )}
      </td>
      <td className={s.targetCell} title={e.target}>{e.target || '—'}</td>
      <td className={`${s.right} ${s.ms}`}>{e.duration_ms ?? ''}</td>
      <td className={s.ipCell}>{e.ip || '—'}</td>
    </tr>
  );
}
