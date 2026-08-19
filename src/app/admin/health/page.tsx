'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type DataHealth, type HealthCheck } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorState, Skeleton } from '@/components/States';
import ui from '@/components/ui.module.css';
import s from './health.module.css';

const STATUS_LABEL: Record<string, string> = { ok: 'OK', empty: 'Empty', error: 'Error', stale: 'Stale' };

export default function DataHealthPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DataHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.dataHealth()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.is_admin) load();
  }, [user, load]);

  if (!user) return null;
  if (!user.is_admin) {
    return (
      <main className={ui.content}>
        <div className={ui.card}>
          <div style={{ padding: 32 }}>
            <h2 style={{ marginBottom: 8 }}>Administrators only</h2>
            <p style={{ color: 'var(--ink-3)' }}>Data health is available to administrators. If you need access, contact the Customer&nbsp;360 administrator.</p>
          </div>
        </div>
      </main>
    );
  }

  const grouped = groupBy(data?.checks ?? [], (c) => c.group);
  const anyProblem = (data?.checks ?? []).some((c) => c.status !== 'ok') || data?.freshness?.status === 'stale';

  return (
    <main className={ui.content}>
      <div className={s.head}>
        <div>
          <div className="microlabel" style={{ color: 'var(--teal)' }}>Operations</div>
          <h1 className={s.title}>Data health</h1>
          <p className={s.lede}>
            Live view of the warehouse Customer&nbsp;360 reads from — how fresh it is, and whether each
            source the app depends on is reachable and populated. This is where a stale date or an emptied
            table shows up first.
          </p>
        </div>
        <div className={s.headSide}>
          <button className={s.refreshBtn} onClick={load} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />
            </svg>
            {loading ? 'Checking…' : 'Refresh'}
          </button>
          {data?.generated_at && (
            <div className={s.stamp}>Checked {new Date(data.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
          )}
        </div>
      </div>

      {error ? (
        <div className={ui.card} style={{ marginTop: 16 }}><ErrorState title="Couldn't load data health" detail={error} /></div>
      ) : !data ? (
        <Skeleton height={220} radius={12} />
      ) : data.data_mode !== 'live' ? (
        <div className={ui.card} style={{ marginTop: 16, padding: 28 }}>
          <div className={s.mockNote}>{data.note ?? 'Preview (mock) data — connect the live warehouse to see source health.'}</div>
        </div>
      ) : (
        <>
          {data.freshness && (
            <div className={`${s.freshCard} ${s[`fresh_${data.freshness.status}`] ?? ''}`}>
              <div>
                <span className="microlabel">Data as of (bank close)</span>
                <div className={s.freshDate}>
                  {data.freshness.as_of
                    ? new Date(data.freshness.as_of).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'}
                </div>
              </div>
              <div className={s.freshRight}>
                <StatusPill status={data.freshness.status} />
                <div className={s.freshSub}>
                  {data.freshness.days_behind == null
                    ? (data.freshness.detail ?? 'freshness unknown')
                    : data.freshness.days_behind <= 1
                      ? 'Up to date'
                      : `${data.freshness.days_behind} days behind — the warehouse close hasn’t advanced`}
                </div>
              </div>
            </div>
          )}

          {anyProblem && (
            <div className={s.alertLine}>
              Some sources need attention — rows marked <b>Empty</b> mean the table has no data loaded (a
              pipeline issue upstream), not a Customer&nbsp;360 fault.
            </div>
          )}

          {Object.entries(grouped).map(([group, checks]) => (
            <div key={group} className={s.group}>
              <div className={s.groupHead}>{group}</div>
              <div className={ui.card} style={{ padding: 0 }}>
                {checks.map((c) => (
                  <div key={c.key} className={s.row}>
                    <div className={s.rowMain}>
                      <div className={s.rowLabel}>{c.label}</div>
                      <code className={s.rowTable}>{c.table}</code>
                    </div>
                    <div className={s.rowDetail}>{c.detail}</div>
                    <StatusPill status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`${s.pill} ${s[`pill_${status}`] ?? ''}`}>{STATUS_LABEL[status] ?? status}</span>;
}

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) (out[key(it)] ??= []).push(it);
  return out;
}
