import s from '../ui.module.css';

/** A tiny inline trend line for a stat tile — no axes, no labels, just the shape of
 *  the recent movement. Renders nothing for fewer than two points (a flat dot would
 *  mislead). A muted line with a dot on the latest value. */
export function Sparkline({ data, color = 'var(--teal)', width = 74, height = 22 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const pts = data.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lastX = (data.length - 1) * stepX;
  const lastY = y(data[data.length - 1]);
  return (
    <svg className={s.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="1.7" fill={color} />
    </svg>
  );
}
