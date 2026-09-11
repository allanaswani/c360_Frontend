'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type DataHealth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorState, Skeleton } from '@/components/States';
import { LineSeriesChart } from '@/components/charts/LineSeriesChart';
import { ExportMenu } from '@/components/ExportMenu';
import {
  AdminHeader, AdminNav, AdminOnly, Empty, Panel, SectionLabel,
} from '@/components/admin/AdminChrome';
import ui from '@/components/ui.module.css';
import s from './health.module.css';

const STATUS_LABEL: Record<string, string> = {
  ok: 'OK', empty: 'Empty', error: 'Error', stale: 'Stale', warn: 'Warn', unknown: 'Not checked',
};

/** One overall verdict from every check + freshness: down if anything errored, degraded
 *  if anything is empty/stale/warn/not-checked, otherwise healthy. */
function overallStatus(data: DataHealth): { key: 'healthy' | 'degraded' | 'down'; word: string; counts: { ok: number; warn: number; down: number } } {
  const checks = data.checks ?? [];
  const ok = checks.filter((c) => c.status === 'ok').length;
  const down = checks.filter((c) => c.status === 'error').length + (data.freshness?.status === 'error' ? 1 : 0);
  const warn = checks.filter((c) => c.status === 'empty' || c.status === 'warn' || c.status === 'unknown').length
    + (data.freshness?.status === 'stale' ? 1 : 0);
  const key = down > 0 ? 'down' : warn > 0 ? 'degraded' : 'healthy';
  const word = key === 'down' ? 'Service degraded' : key === 'degraded' ? 'Needs attention' : 'All systems healthy';
  return { key, word, counts: { ok, warn, down } };
}

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

  const grouped = groupBy(data?.checks ?? [], (c) => c.group);
  const anyProblem = (data?.checks ?? []).some((c) => c.status !== 'ok')
    || (data?.freshness != null && data.freshness.status !== 'ok');

  // Trend data for the native (in-app) monitoring graphs — accrues one point per
  // capture (throttled to ~10 min), so the charts fill in over time.
  const history = data?.history ?? [];
  const freshTrend = history
    .filter((h) => h.days_behind != null)
    .map((h) => ({ t: shortTime(h.at), days: h.days_behind as number }));
  const sparkFor = (key: string): number[] =>
    history.map((h) => h.checks[key]?.value).filter((v): v is number => typeof v === 'number');

  return (
    <main className={ui.content}>
      <AdminOnly what="Data health">
      <AdminHeader
        title="Data health"
        sub="How fresh the warehouse is, and whether every source the app reads is reachable and populated."
        meta={data?.generated_at
          ? `Checked ${new Date(data.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
          : undefined}
        actions={(
          <>
          {data && (data.checks ?? []).length > 0 && (
            <ExportMenu
              title="Data health"
              subtitle={data.freshness?.as_of ? `Warehouse as of ${data.freshness.as_of}` : 'Warehouse source checks'}
              count={data.checks.length}
              source={{
                kind: 'rows',
                build: () => ({
                  title: 'Data health',
                  subtitle: data.freshness?.as_of ? `Warehouse as of ${data.freshness.as_of}` : undefined,
                  columns: [
                    { key: 'group', label: 'Group' },
                    { key: 'label', label: 'Check' },
                    { key: 'table', label: 'Table' },
                    { key: 'status', label: 'Status' },
                    { key: 'value', label: 'Value', type: 'num' },
                    { key: 'delta_pct', label: 'Change vs last', type: 'pct' },
                    { key: 'latency_ms', label: 'Latency', type: 'ms' },
                    { key: 'detail', label: 'Detail' },
                  ],
                  rows: data.checks as unknown as Record<string, unknown>[],
                }),
              }}
            />
          )}
          <button className={s.refreshBtn} onClick={load} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />
            </svg>
            {loading ? 'Checking…' : 'Refresh'}
          </button>
          </>
        )}
      />
      <AdminNav current="/admin/health" />

      {error ? (
        <Panel><ErrorState title="Couldn't load data health" detail={error} /></Panel>
      ) : !data ? (
        <Skeleton height={200} radius={12} />
      ) : data.data_mode !== 'live' ? (
        <Panel>
          <Empty title="Source health is measured against the live warehouse">
            {data.note ?? 'This instance is running on preview (mock) data. Set C360_DATA_MODE=live to see real source health.'}
          </Empty>
        </Panel>
      ) : (
        <>
          {/* Verdict, counts and the as-of date on ONE bar. These were two stacked
              cards, each a single line of content in a tall box — the bank date is
              part of "is the data healthy", not a separate question. */}
          {(() => {
            const o = overallStatus(data);
            const f = data.freshness;
            return (
              <div className={`${s.statusBar} ${s[`summary_${o.key}`]}`}>
                <div className={s.statusVerdict}>
                  <span className={s.statusDot} data-key={o.key} />
                  <span className={s.summaryWord}>{o.word}</span>
                </div>
                <div className={s.statusCounts}>
                  <Count n={o.counts.ok} label="Healthy" />
                  <Count n={o.counts.warn} label="Attention" tone={o.counts.warn ? 'warn' : undefined} />
                  <Count n={o.counts.down} label="Down" tone={o.counts.down ? 'bad' : undefined} />
                </div>
                {f && (
                  <div className={s.statusFresh}>
                    <span className="microlabel">Data as of (bank close)</span>
                    <div className={s.statusFreshRow}>
                      <span className={s.freshDate}>
                        {f.as_of
                          ? new Date(f.as_of).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </span>
                      <StatusPill status={f.status} />
                    </div>
                    <span className={s.freshSub}>{freshnessWording(f)}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {freshTrend.length >= 2 ? (
            <Panel
              title="Freshness trend" note="days behind the warehouse close"
              action={(
                <ExportMenu
                  title="Data-health history"
                  subtitle="Stored snapshots, oldest first"
                  source={{ kind: 'server', dataset: 'health_history', params: {} }}
                />
              )}
            >
              <LineSeriesChart
                data={freshTrend}
                series={[{ name: 'Days behind', dataKey: 'days', colorRole: 1 }]}
                fmt="count"
                xKey="t"
                height={140}
                wholeNumbers
              />
            </Panel>
          ) : (
            <div className={s.trendHint}>
              Trend graphs build up as this page is checked over time — one point per check, so come
              back later to see freshness, row-count and latency history.
            </div>
          )}

          {anyProblem && (
            <div className={s.alertLine}>
              Some sources need attention — rows marked <b>Empty</b> mean the table has no data loaded (a
              pipeline issue upstream), not a Customer&nbsp;360 fault.
            </div>
          )}

          {Object.entries(grouped).map(([group, checks]) => (
            <div key={group}>
              <SectionLabel aside={`${checks.length} check${checks.length === 1 ? '' : 's'}`}>{group}</SectionLabel>
              <div className={s.groupCard}>
                {checks.map((c) => (
                  <div key={c.key} className={s.row}>
                    <div className={s.rowMain}>
                      <div className={s.rowLabel}>{c.label}</div>
                      <code className={s.rowTable}>{c.table}</code>
                    </div>
                    <div className={s.rowDetail}>
                      {c.detail}
                      {typeof c.delta_pct === 'number' && c.delta_pct <= -1 && (
                        <span className={`${s.delta} ${s.deltaDown}`}>▼ {Math.abs(c.delta_pct)}%</span>
                      )}
                      {typeof c.latency_ms === 'number' && <span className={s.latency}> · {c.latency_ms} ms</span>}
                    </div>
                    <Sparkline values={sparkFor(c.key)} />
                    <StatusPill status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      </AdminOnly>
    </main>
  );
}

/** What to say about the as-of date, keyed off the status the backend decided.
 *
 *  A bank close legitimately sits a day or two back, and further over a weekend or a
 *  public holiday, so a lag is only news once it passes the staleness threshold —
 *  the same one the alert emails use (C360_ALERT_DATA_STALE_DAYS). */
function freshnessWording(f: { days_behind: number | null; status: string; detail?: string; stale_after_days?: number }): string {
  if (f.days_behind == null) return f.detail ?? 'freshness unknown';
  const days = f.days_behind;
  const plural = days === 1 ? 'day' : 'days';
  if (f.status === 'stale') {
    return `${days} ${plural} behind — past the ${f.stale_after_days ?? 3}-day threshold; the close has stopped advancing`;
  }
  if (days <= 0) return 'Up to date — today’s close';
  if (days === 1) return 'Up to date — yesterday’s close';
  return `${days} ${plural} behind — within the normal close lag`;
}

function Count({ n, label, tone }: { n: number; label: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className={s.statusStat}>
      <span className={s.statusStatN} data-tone={tone}>{n}</span>
      <span className={s.summaryStatL}>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`${s.pill} ${s[`pill_${status}`] ?? ''}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** A tiny inline row-count/latency sparkline — no chart library, just an SVG polyline. */
function Sparkline({ values, w = 88, h = 22 }: { values: number[]; w?: number; h?: number }) {
  if (values.length < 2) return <span className={s.sparkEmpty} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 2) + 1;
      const y = h - 1 - ((v - min) / span) * (h - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg className={s.spark} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={rising ? 'var(--teal)' : 'var(--coral)'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) (out[key(it)] ??= []).push(it);
  return out;
}
