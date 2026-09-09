'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ObsOverview } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/States';
import { ObsChart } from '@/components/charts/ObsChart';
import ui from '@/components/ui.module.css';
import s from './observability.module.css';

const WINDOWS: { label: string; minutes: number }[] = [
  { label: '15m', minutes: 15 },
  { label: '1h', minutes: 60 },
  { label: '6h', minutes: 360 },
  { label: '24h', minutes: 1440 },
];
const REFRESH_MS = 5000;

export default function ObservabilityPage() {
  const { user } = useAuth();
  const [win, setWin] = useState(60);
  const [data, setData] = useState<ObsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const winRef = useRef(win);
  winRef.current = win;

  const load = useCallback(async () => {
    try {
      const d = await api.observability(winRef.current);
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
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [user, win, load]);

  if (!user) return null;
  if (!user.is_admin) return <AdminOnly />;

  const sm = data?.summary;
  const series = data?.series ?? [];
  const trafficData = series.map((p) => ({ minute: p.minute, requests: p.count, errors: p.errors }));
  const latencyData = series.map((p) => ({ minute: p.minute, p95: p.p95_ms, p99: p.p99_ms, avg: p.avg_ms }));
  const errorData = series.map((p) => ({ minute: p.minute, errors: p.errors, client: p.client_errors }));
  const hasTraffic = series.some((p) => p.count > 0);

  return (
    <main className={ui.content}>
      <div className={s.head}>
        <div>
          <div className={s.crumbs}>
            <Link href="/" className={s.crumb}>Customer 360</Link><span className={s.crumbSep}>/</span>
            <span>Monitoring</span>
          </div>
          <h1 className={s.title}>Monitoring</h1>
          <p className={s.sub}>Live traffic, latency, errors and uptime across all workers · in-app, and scraped at <code>/metrics</code>.</p>
        </div>
        <div className={s.headRight}>
          <div className={s.windowTabs} role="tablist" aria-label="Time window">
            {WINDOWS.map((w) => (
              <button key={w.minutes} role="tab" aria-selected={win === w.minutes}
                      className={`${s.winTab} ${win === w.minutes ? s.winTabActive : ''}`}
                      onClick={() => setWin(w.minutes)}>{w.label}</button>
            ))}
          </div>
          <div className={s.liveTag} title={updatedAt ? `Last updated ${updatedAt.toLocaleTimeString()}` : 'Connecting…'}>
            <span className={s.liveDot} data-live={!error || undefined} />
            {error ? 'Reconnecting' : 'Live'}
          </div>
        </div>
      </div>

      {error && !data && (
        <div className={ui.card}><div style={{ padding: 20, color: 'var(--coral)' }}>Couldn’t load monitoring: {error}</div></div>
      )}

      {!data ? (
        <Skeleton height={120} radius={12} />
      ) : (
        <>
          <div className={s.tiles}>
            <Tile label="Requests / min" value={fmtNum(sm?.rps_now ? sm.rps_now * 60 : 0)} sub={`${sm?.rps_now ?? 0} rps now`} />
            <Tile label="Error rate" value={`${sm?.error_rate_pct ?? 0}%`}
                  tone={(sm?.error_rate_pct ?? 0) >= 5 ? 'bad' : (sm?.error_rate_pct ?? 0) >= 1 ? 'warn' : 'good'}
                  sub={`${sm?.errors ?? 0} of ${fmtNum(sm?.requests ?? 0)}`} />
            <Tile label="p95 latency" value={`${sm?.p95_now_ms ?? 0}`} unit="ms"
                  tone={(sm?.p95_now_ms ?? 0) >= 800 ? 'bad' : (sm?.p95_now_ms ?? 0) >= 400 ? 'warn' : 'good'} />
            <Tile label="p99 latency" value={`${sm?.p99_now_ms ?? 0}`} unit="ms"
                  tone={(sm?.p99_now_ms ?? 0) >= 1500 ? 'bad' : (sm?.p99_now_ms ?? 0) >= 800 ? 'warn' : 'good'} />
            <Tile label="Uptime" value={`${sm?.uptime_pct ?? 0}%`}
                  tone={(sm?.uptime_pct ?? 100) >= 99 ? 'good' : (sm?.uptime_pct ?? 100) >= 95 ? 'warn' : 'bad'}
                  sub={`last ${win >= 60 ? win / 60 + 'h' : win + 'm'}`} />
            <Tile label="Active users" value={fmtNum(sm?.active_users ?? 0)} />
            <Tile label="Workers" value={`${sm?.instances ?? 0}`} sub="live" />
            <Tile label="Requests" value={fmtNum(sm?.requests ?? 0)} sub="in window" />
          </div>

          {!hasTraffic ? (
            <div className={ui.card}>
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>
                No traffic recorded in this window yet. Metrics accrue as requests come in — this board updates in place.
              </div>
            </div>
          ) : (
            <>
              <div className={s.chartsGrid}>
                <Panel title="Traffic" note="requests / min">
                  <ObsChart data={trafficData} xKey="minute" area
                            series={[{ key: 'requests', color: 'var(--teal)', label: 'Requests' }]} />
                </Panel>
                <Panel title="Latency" note="ms per minute">
                  <ObsChart data={latencyData} xKey="minute" unit="ms"
                            series={[
                              { key: 'p99', color: 'var(--coral)', label: 'p99' },
                              { key: 'p95', color: 'var(--gold)', label: 'p95' },
                              { key: 'avg', color: 'var(--teal)', label: 'avg' },
                            ]} />
                </Panel>
                <Panel title="Errors" note="responses / min">
                  <ObsChart data={errorData} xKey="minute" area
                            series={[
                              { key: 'errors', color: 'var(--coral)', label: '5xx' },
                              { key: 'client', color: 'var(--gold)', label: '4xx' },
                            ]} />
                </Panel>
              </div>

              <div className={s.split}>
                <Panel title="Top routes" note="by volume, this window">
                  <div className={s.routes}>
                    <div className={`${s.routeRow} ${s.routeHead}`}>
                      <span>Route</span><span>Calls</span><span>Avg</span><span>Err</span>
                    </div>
                    {(data.top_routes ?? []).map((r) => (
                      <div key={r.method + r.route} className={s.routeRow}>
                        <span className={s.routeName}><b className={s.method}>{r.method}</b> {r.route}</span>
                        <span className={s.num}>{fmtNum(r.count)}</span>
                        <span className={s.num}>{r.avg_ms}ms</span>
                        <span className={`${s.num} ${r.errors ? s.numBad : ''}`}>{r.errors}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Recent errors" note="4xx / 5xx"
                       action={<Link href="/admin/audit?status=500" className={s.panelLink}>Open audit →</Link>}>
                  <div className={s.errFeed}>
                    {(data.recent_errors ?? []).length === 0 && <div className={s.errEmpty}>No errors in this window.</div>}
                    {(data.recent_errors ?? []).map((e) => (
                      <div key={e.id} className={s.errRow}>
                        <span className={`${s.statusPill} ${(e.status ?? 0) >= 500 ? s.status5 : s.status4}`}>{e.status}</span>
                        <span className={s.errRoute}>{e.method} {e.route}</span>
                        <span className={s.errMeta}>{e.username || '—'} · {clock(e.ts)}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

function Tile({ label, value, unit, sub, tone }: {
  label: string; value: string; unit?: string; sub?: string; tone?: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className={s.tile}>
      <span className="microlabel">{label}</span>
      <span className={s.tileVal} data-tone={tone}>
        {value}{unit && <span className={s.tileUnit}>{unit}</span>}
      </span>
      {sub && <span className={s.tileSub}>{sub}</span>}
    </div>
  );
}

function Panel({ title, note, action, children }: {
  title: string; note?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`${ui.card} ${s.panel}`}>
      <div className={s.panelHead}>
        <div><span className={s.panelTitle}>{title}</span>{note && <span className={s.panelNote}>{note}</span>}</div>
        {action}
      </div>
      <div className={s.panelBody}>{children}</div>
    </div>
  );
}

function AdminOnly() {
  return (
    <main className={ui.content}>
      <div className={ui.card}>
        <div style={{ padding: 32 }}>
          <h2 style={{ marginBottom: 8 }}>Administrators only</h2>
          <p style={{ color: 'var(--ink-3)' }}>Monitoring is available to administrators.</p>
        </div>
      </div>
    </main>
  );
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
