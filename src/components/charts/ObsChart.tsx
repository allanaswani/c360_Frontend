'use client';

import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import s from './obsChart.module.css';

export type ObsSeries = {
  key: string;
  color: string;
  label: string;
  /** Drawn as a dashed rule with a label — the level at which this series is a
   *  problem. A threshold that only tints a number elsewhere on the page makes the
   *  reader do the comparison in their head. */
  threshold?: number;
};
/** A missing sample is `null`, not 0 — that is the whole point of the gap handling
 *  below, so the point type has to admit it. */
type Pt = Record<string, number | string | null>;

const timeFmt = (v: string) =>
  new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * A time-series panel for the operations console.
 *
 * Built against the things a Grafana panel does and a naive Recharts panel doesn't:
 *
 * * **A legend that carries the numbers.** last / mean / peak per series, which is
 *   what someone actually quotes. Reading them off a sparkline is guesswork.
 * * **Gaps stay gaps.** A minute with no sample is `null`, not zero and not
 *   interpolated. The previous version drew a straight diagonal between two samples
 *   an hour apart and presented it as a trend.
 * * **A y-domain that fits the data.** Auto-scaling to a round number four times
 *   the peak turned a flat line into a stripe along the bottom of an empty box.
 * * **Thresholds on the plot**, so "is this bad" is answered by looking.
 *
 * Animation is off: the board refreshes every five seconds and should update in
 * place rather than replay a tween each time.
 */
export function ObsChart({
  data, xKey, series, height = 210, area = false, unit = '', showLegend = true,
}: {
  data: Pt[];
  xKey: string;
  series: ObsSeries[];
  height?: number;
  area?: boolean;
  unit?: string;
  showLegend?: boolean;
}) {
  const Chart = area ? AreaChart : LineChart;
  const stats = series.map((ser) => ({ ...ser, ...summarise(data, ser.key) }));
  const dataPeak = Math.max(0, ...stats.map((st) => st.max ?? 0));
  // A threshold expands the scale only when it is within reach of the data. A 2,000ms
  // limit drawn above an 885ms peak would push the axis to 3,000 and squash every real
  // value into the bottom third — the line you came to read becomes unreadable in
  // order to show a limit nothing is near.
  const thresholds = series
    .map((ser) => ser.threshold)
    .filter((v): v is number => v != null);
  const reachable = thresholds.filter((v) => dataPeak > 0 && v <= dataPeak * 2);
  const peak = Math.max(dataPeak, ...reachable, 0);
  const ceiling = yMax(peak);

  return (
    <div className={s.wrap}>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          {area && (
            <defs>
              {series.map((ser) => (
                <linearGradient key={ser.key} id={`obsg-${ser.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ser.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={ser.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
          )}
          <CartesianGrid vertical={false} stroke="var(--hairline)" strokeDasharray="2 4" />
          <XAxis dataKey={xKey} tickFormatter={timeFmt} tickLine={false} axisLine={false}
                 minTickGap={54} dy={6} tick={{ fontSize: 10, fill: 'var(--ink-3)' }} />
          <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false}
                 domain={[0, ceiling]}
                 tickFormatter={(v) => `${compact(Number(v))}${unit}`}
                 tick={{ fontSize: 10, fill: 'var(--ink-3)' }} />
          <Tooltip cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }}
                   content={<ObsTip series={series} unit={unit} />} />
          {series.filter((ser) => ser.threshold != null && ser.threshold <= ceiling).map((ser) => (
            <ReferenceLine
              key={`t-${ser.key}`} y={ser.threshold} stroke={ser.color}
              strokeDasharray="4 4" strokeOpacity={0.55}
              label={{ value: `${ser.label} limit`, position: 'insideTopRight',
                       fill: 'var(--ink-3)', fontSize: 9.5 }}
            />
          ))}
          {series.map((ser) => area ? (
            <Area key={ser.key} type="monotone" dataKey={ser.key} stroke={ser.color} strokeWidth={1.8}
                  fill={`url(#obsg-${ser.key})`} isAnimationActive={false} dot={false}
                  connectNulls={false} />
          ) : (
            <Line key={ser.key} type="monotone" dataKey={ser.key} stroke={ser.color} strokeWidth={1.8}
                  dot={false} isAnimationActive={false} connectNulls={false} />
          ))}
        </Chart>
      </ResponsiveContainer>

      {showLegend && (
        <table className={s.legend}>
          <thead>
            <tr>
              <th />
              <th>Last</th><th>Mean</th><th>Peak</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((st) => (
              <tr key={st.key}>
                <td className={s.legendName}>
                  <span className={s.swatch} style={{ background: st.color }} />
                  {st.label}
                </td>
                <td className={s.legendVal}>{st.last == null ? '—' : `${compact(st.last)}${unit}`}</td>
                <td className={s.legendVal}>{st.mean == null ? '—' : `${compact(st.mean)}${unit}`}</td>
                <td className={s.legendVal}>{st.max == null ? '—' : `${compact(st.max)}${unit}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** last / mean / peak across the points that actually carry a value. */
function summarise(data: Pt[], key: string): { last: number | null; mean: number | null; max: number | null } {
  const values = data
    .map((d) => d[key])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!values.length) return { last: null, mean: null, max: null };
  const sum = values.reduce((acc, v) => acc + v, 0);
  return {
    last: values[values.length - 1],
    mean: Math.round((sum / values.length) * 10) / 10,
    max: Math.max(...values),
  };
}

/** A "nice" top tick just above the peak.
 *
 *  Rounding up to the next power of ten is what produced an axis of 20 for a peak of
 *  9: the data then occupies the bottom half of the panel for no reason. Stepping
 *  through 1 / 2 / 2.5 / 5 / 10 per decade keeps the ceiling close to the data while
 *  still landing on a round number a person can read off. */
function yMax(peak: number): number {
  if (peak <= 0) return 1;
  // Small counts get an integer ceiling — a domain of 1.2 on an axis of whole
  // responses per minute is nonsense.
  if (peak <= 10) return Math.max(1, Math.ceil(peak * 1.15));
  const headroom = peak * 1.1;
  const decade = 10 ** Math.floor(Math.log10(headroom));
  const normalised = headroom / decade;
  // Fine steps near the bottom of a decade: coarse ones round a peak of 99 up to
  // 200 and waste half the panel.
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((c) => normalised <= c) ?? 10;
  return step * decade;
}

function compact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1e3)}K`;
  return Number.isInteger(n) ? n.toLocaleString('en-KE') : String(n);
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey: string; value: number | null }[];
  series: ObsSeries[];
  unit: string;
}

function ObsTip({ active, label, payload, series, unit }: TipProps) {
  if (!active || !payload || !payload.length) return null;
  const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));
  return (
    <div className={s.tip}>
      <div className={s.tipTime}>
        {label ? new Date(String(label)).toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit',
        }) : ''}
      </div>
      {series.map((ser) => (
        <div key={ser.key} className={s.tipRow}>
          <span className={s.swatch} style={{ background: ser.color }} />
          <span className={s.tipLabel}>{ser.label}</span>
          <b className={s.tipVal}>
            {byKey[ser.key] == null ? 'no data' : `${compact(Number(byKey[ser.key]))}${unit}`}
          </b>
        </div>
      ))}
    </div>
  );
}
