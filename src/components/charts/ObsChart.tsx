'use client';

import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type ObsSeries = { key: string; color: string; label: string };
type Pt = Record<string, number | string>;

const timeFmt = (v: string) =>
  new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** A compact time-series for the ops console — area (traffic) or lines (latency/errors).
 *  Animation is OFF so the 5s live refresh doesn't re-tween on every poll (a Grafana-grade
 *  board updates in place, it doesn't replay). Monospaced ticks, hairline grid. */
export function ObsChart({
  data, xKey, series, height = 170, area = false, unit = '',
}: {
  data: Pt[];
  xKey: string;
  series: ObsSeries[];
  height?: number;
  area?: boolean;
  unit?: string;
}) {
  const Chart = area ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
        {area && (
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`obsg-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
        )}
        <CartesianGrid vertical={false} stroke="var(--hairline)" />
        <XAxis dataKey={xKey} tickFormatter={timeFmt} tickLine={false} axisLine={false}
               minTickGap={54} dy={6} tick={{ fontSize: 10, fill: 'var(--ink-3)' }} />
        <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false}
               tickFormatter={(v) => `${v}${unit}`} tick={{ fontSize: 10, fill: 'var(--ink-3)' }} />
        <Tooltip cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }}
                 content={<ObsTip series={series} unit={unit} />} />
        {series.map((s) => area ? (
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.8}
                fill={`url(#obsg-${s.key})`} isAnimationActive={false} dot={false} />
        ) : (
          <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.8}
                dot={false} isAnimationActive={false} />
        ))}
      </Chart>
    </ResponsiveContainer>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey: string; value: number }[];
  series: ObsSeries[];
  unit: string;
}

function ObsTip({ active, label, payload, series, unit }: TipProps) {
  if (!active || !payload || !payload.length) return null;
  const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline-strong)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 11.5, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
      <div style={{ color: 'var(--ink-3)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
        {label ? new Date(String(label)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </div>
      {series.map((s) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--ink-2)', minWidth: 66 }}>{s.label}</span>
          <b style={{ fontFamily: 'var(--font-num)', color: 'var(--ink-1)' }}>
            {byKey[s.key] ?? 0}{unit}
          </b>
        </div>
      ))}
    </div>
  );
}
