'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ObsOverview, ObsSeriesPoint } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/States';
import { ObsChart } from '@/components/charts/ObsChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { ExportMenu } from '@/components/ExportMenu';
import {
  AdminHeader, AdminNav, AdminOnly, Empty, Panel, SectionLabel, Segmented,
} from '@/components/admin/AdminChrome';
import a from '@/components/admin/adminChrome.module.css';
import ui from '@/components/ui.module.css';
import s from './observability.module.css';

const WINDOWS = [
  { label: '15m', value: 15 }, { label: '1h', value: 60 },
  { label: '6h', value: 360 }, { label: '24h', value: 1440 },
];
const REFRESH_MS = 5000;

export default function ObservabilityPage() {
  const { user } = useAuth();
  const [win, setWin] = useState(60);
  const [data, setData] = useState<ObsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // The window is passed in rather than read from a ref. Writing a ref during
  // render is a rule violation and, more practically, the poll and the render can
  // then disagree about which window is on screen.
  const load = useCallback(async (minutes: number) => {
    try {
      const d = await api.observability(minutes);
      setData(d);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Live polling — reloads on window change and every REFRESH_MS, paused when the tab
  // is hidden (no point polling a board nobody is looking at).
  useEffect(() => {
    if (!user?.is_admin) return;
    load(win);
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(win); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [user, win, load]);

  const sm = data?.summary;
  const series = data?.series ?? [];
  const hasTraffic = series.some((p) => p.count > 0);
  // The API returns only the minutes that recorded traffic. Handing those straight
  // to a chart draws a line between two samples an hour apart and calls it a trend.
  // Expand to every minute in the window, with null where nothing was recorded, so
  // a gap is drawn as a gap.
  const plot = densify(series, win, data?.generated_at);

  return (
    <main className={ui.content}>
      <AdminOnly what="Monitoring">
        <AdminHeader
          title="Monitoring"
          sub={<>Traffic, latency, errors and uptime across every worker · also exposed for scraping at <code>/metrics</code>.</>}
          actions={(
            <>
              <Segmented label="Time window" options={WINDOWS} value={win} onChange={setWin} />
              <ExportMenu
                title="Traffic and latency"
                subtitle={`Last ${winLabel(win)} · per minute`}
                count={series.length}
                source={{ kind: 'server', dataset: 'traffic', params: { window: win } }}
              />
            </>
          )}
          meta={(
            <span className={s.liveTag} title={updatedAt ? `Last updated ${updatedAt.toLocaleTimeString()}` : 'Connecting…'}>
              <span className={s.liveDot} data-live={!error || undefined} />
              {error ? 'Reconnecting' : `Live · ${updatedAt ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '…'}`}
            </span>
          )}
        />
        <AdminNav current="/admin/observability" />

        {error && !data && (
          <Panel><div style={{ color: 'var(--coral)' }}>Couldn’t load monitoring: {error}</div></Panel>
        )}

        {!data ? <Skeleton height={96} radius={12} /> : (
          <>
            {/* Read in priority order. Uptime is the question the board exists to
                answer, so it leads at full size; the rest carry their own trend,
                because "1.2%" means nothing without where it was five minutes ago. */}
            <div className={s.statusStrip}>
              <Lead
                label="Uptime"
                value={sm?.uptime_pct == null ? 'Not measured' : `${sm.uptime_pct}%`}
                tone={sm?.uptime_pct == null ? undefined
                  : sm.uptime_pct >= 99 ? 'good' : sm.uptime_pct >= 95 ? 'warn' : 'bad'}
                sub={sm?.uptime_pct == null
                  ? 'no heartbeats recorded yet'
                  : `${sm?.instances ?? 0} worker${(sm?.instances ?? 0) === 1 ? '' : 's'} live · ${uptimeSpan(sm, win)}`}
              />
              <Metric
                label="Error rate" value={`${sm?.error_rate_pct ?? 0}%`}
                tone={(sm?.error_rate_pct ?? 0) >= 5 ? 'bad' : (sm?.error_rate_pct ?? 0) >= 1 ? 'warn' : 'good'}
                sub={`${fmtNum(sm?.errors ?? 0)} server · ${fmtNum(sm?.client_errors ?? 0)} client`}
                spark={series.map((p) => p.errors)} sparkColor="var(--coral)"
              />
              <Metric
                label="p95 latency" value={fmtNum(sm?.p95_now_ms ?? 0)} unit="ms"
                tone={(sm?.p95_now_ms ?? 0) >= 800 ? 'bad' : (sm?.p95_now_ms ?? 0) >= 400 ? 'warn' : 'good'}
                sub={`p99 ${fmtNum(sm?.p99_now_ms ?? 0)} ms`}
                spark={series.map((p) => p.p95_ms)} sparkColor="var(--gold)"
              />
              <Metric
                label="Throughput" value={fmtNum(sm?.rps_now ? sm.rps_now * 60 : 0)} unit="/min"
                sub={`${fmtNum(sm?.requests ?? 0)} in window`}
                spark={series.map((p) => p.count)} sparkColor="var(--teal)"
              />
              <Metric
                label="Active users" value={fmtNum(sm?.active_users ?? 0)}
                sub={sm?.active_users ? 'signed in, this window' : 'nobody in this window'}
              />
            </div>

            {!hasTraffic ? (
              <Panel>
                <Empty title="No traffic in this window">
                  Metrics accrue as requests come in and this board updates in place, so
                  nothing needs refreshing. If you expected traffic, the app may not be
                  reachable.
                </Empty>
              </Panel>
            ) : (
              <>
                <SectionLabel aside={`per minute · last ${winLabel(win)}`}>Trend</SectionLabel>
                <div className={s.chartsGrid}>
                  <Panel title="Latency" note="percentiles, ms">
                    <ObsChart
                      data={plot} xKey="minute" unit="ms" height={224}
                      series={[
                        { key: 'p99', color: 'var(--coral)', label: 'p99' },
                        { key: 'p95', color: 'var(--gold)', label: 'p95', threshold: P95_LIMIT_MS },
                        { key: 'avg', color: 'var(--teal)', label: 'avg' },
                      ]}
                    />
                  </Panel>
                  <Panel title="Traffic & errors" note="responses / min">
                    <ObsChart
                      data={plot} xKey="minute" area height={224}
                      series={[
                        { key: 'requests', color: 'var(--teal)', label: 'Requests' },
                        { key: 'client', color: 'var(--gold)', label: '4xx' },
                        { key: 'errors', color: 'var(--coral)', label: '5xx' },
                      ]}
                    />
                  </Panel>
                </div>

                <SectionLabel aside="what is being called, and what is failing">Detail</SectionLabel>
                <div className={s.split}>
                  <Panel
                    title="Endpoints" note="by volume" flush
                    action={<ExportMenu title="Endpoints" subtitle={`Last ${winLabel(win)}`}
                                        source={{ kind: 'server', dataset: 'routes', params: { window: win } }} />}
                  >
                    <div className={a.tableWrap}>
                      <table className={a.table}>
                        <thead>
                          <tr>
                            <th>Route</th>
                            <th className={a.num}>Calls</th>
                            <th className={a.num}>Avg</th>
                            <th className={a.num}>5xx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.top_routes ?? []).map((r) => (
                            <tr key={r.method + r.route}>
                              <td className={s.routeCell}>
                                <b className={s.method}>{r.method}</b> {r.route}
                              </td>
                              <td className={a.num}>{fmtNum(r.count)}</td>
                              <td className={a.num}>{r.avg_ms} ms</td>
                              <td className={`${a.num} ${r.errors ? s.numBad : ''}`}>{r.errors || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>

                  <Panel
                    title="Recent errors" note="4xx / 5xx" flush
                    action={(
                      <div className={s.panelActions}>
                        <Link href="/admin/audit?status=500" className={s.panelLink}>Open audit →</Link>
                        <ExportMenu title="Error log" subtitle={`Last ${winLabel(win)}`}
                                    source={{ kind: 'server', dataset: 'errors', params: { window: win } }} />
                      </div>
                    )}
                  >
                    {(data.recent_errors ?? []).length === 0 ? (
                      <Empty title="No errors in this window" />
                    ) : (
                      <div className={a.tableWrap}>
                        <table className={a.table}>
                          <tbody>
                            {(data.recent_errors ?? []).map((e) => (
                              <tr key={e.id}>
                                <td style={{ width: 52 }}>
                                  <span className={`${s.statusPill} ${(e.status ?? 0) >= 500 ? s.status5 : s.status4}`}>{e.status}</span>
                                </td>
                                <td className={s.errRoute}>{e.method} {e.route}</td>
                                <td className={s.errMeta}>{e.username || '—'}</td>
                                <td className={`${s.errMeta} ${a.num}`}>{clock(e.ts)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>
                </div>
              </>
            )}
          </>
        )}
      </AdminOnly>
    </main>
  );
}

/** The headline the board answers first: is the service up? */
function Lead({ label, value, sub, tone }: {
  label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className={`${s.tile} ${s.tileLead}`}>
      <span className="microlabel">{label}</span>
      <span className={`${s.tileVal} ${s.tileValLead}`} data-tone={tone}>{value}</span>
      {sub && <span className={s.tileSub}>{sub}</span>}
    </div>
  );
}

function Metric({ label, value, unit, sub, tone, spark, sparkColor }: {
  label: string; value: string; unit?: string; sub?: string;
  tone?: 'good' | 'warn' | 'bad'; spark?: number[]; sparkColor?: string;
}) {
  // A flat line drawn from one point implies a trend that isn't there.
  const trend = spark && spark.length >= 2 ? spark.slice(-40) : null;
  return (
    <div className={s.tile}>
      <span className="microlabel">{label}</span>
      <span className={s.tileVal} data-tone={tone}>
        {value}{unit && <span className={s.tileUnit}>{unit}</span>}
      </span>
      {sub && <span className={s.tileSub}>{sub}</span>}
      {trend && <Sparkline data={trend} color={sparkColor} width={96} height={18} />}
    </div>
  );
}

/** p95 above this is the level the alert emails fire at (C360_ALERT_P95_MS). Drawn
 *  on the latency plot so "is this bad" is answered by looking at it. */
const P95_LIMIT_MS = 2000;

type PlotPoint = {
  minute: string;
  requests: number | null; errors: number | null; client: number | null;
  p95: number | null; p99: number | null; avg: number | null;
};

/** One row per minute across the window; null for minutes with no sample. */
function densify(series: ObsSeriesPoint[], windowMinutes: number, generatedAt?: string): PlotPoint[] {
  const end = generatedAt ? new Date(generatedAt) : new Date();
  end.setSeconds(0, 0);
  const byMinute = new Map(series.map((p) => [new Date(p.minute).setSeconds(0, 0), p]));
  const out: PlotPoint[] = [];
  for (let i = windowMinutes - 1; i >= 0; i -= 1) {
    const at = new Date(end.getTime() - i * 60_000);
    const hit = byMinute.get(at.getTime());
    out.push({
      minute: at.toISOString(),
      requests: hit ? hit.count : null,
      errors: hit ? hit.errors : null,
      client: hit ? hit.client_errors : null,
      p95: hit ? hit.p95_ms : null,
      p99: hit ? hit.p99_ms : null,
      avg: hit ? hit.avg_ms : null,
    });
  }
  return out;
}

/** Say what uptime was measured over. When the app has less history than the
 *  window, claiming "last 1h" would imply the missing time was downtime. */
function uptimeSpan(sm: { uptime_measured_minutes?: number } | undefined, win: number): string {
  const measured = sm?.uptime_measured_minutes;
  if (measured == null || measured >= win) return `last ${winLabel(win)}`;
  return `measured over ${winLabel(measured)} of history`;
}

function winLabel(minutes: number): string {
  return minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;
}
function fmtNum(n: number): string {
  const v = Math.round(n);
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString('en-KE');
}
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
