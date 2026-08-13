// Formatting helpers. All money is KES; figures are compacted for cards and
// shown in full in tables/tooltips. Consistent everywhere so the instrument
// reads as one system.

export function kes(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const s = sign(value);
  if (opts.compact !== false) {
    // Roll magnitudes up so a book total reads "KES 112.3B", never "KES 112326.8M".
    if (abs >= 1_000_000_000_000) return `${s}KES ${(abs / 1e12).toFixed(abs >= 1e13 ? 1 : 2)}T`;
    if (abs >= 1_000_000_000) return `${s}KES ${(abs / 1e9).toFixed(abs >= 1e10 ? 1 : 2)}B`;
    if (abs >= 1_000_000) return `${s}KES ${(abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2)}M`;
    if (abs >= 1_000) return `${s}KES ${(abs / 1e3).toFixed(0)}K`;
  }
  return `${s}KES ${abs.toLocaleString('en-KE')}`;
}

export function kesFull(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value < 0 ? '-' : ''}KES ${Math.abs(value).toLocaleString('en-KE')}`;
}

function sign(v: number): string {
  return v < 0 ? '-' : '';
}

export function count(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-KE');
}

export function pct(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dayMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function monthShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { month: 'short' });
}

function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

/** Pick an axis tick formatter matched to the visible time span, so the period
 *  filter actually changes the axis granularity: days for short ranges, month
 *  names across a quarter/year, month+year for multi-year. */
export function axisDateFormatter(data: { period?: unknown }[], xKey = 'period'): (v: unknown) => string {
  const times = data
    .map((d) => new Date(String((d as Record<string, unknown>)[xKey])).getTime())
    .filter((t) => !Number.isNaN(t));
  if (times.length < 2) return (v) => dayMonth(String(v));
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  if (spanDays > 400) return (v) => monthYear(String(v));
  if (spanDays > 75) return (v) => monthShort(String(v));
  return (v) => dayMonth(String(v));
}

/** Format a value by a chart/metric format token. One place so KES/count/pct read
 *  identically across every domain. */
export function fmtValue(value: number | null | undefined, fmt: 'kes' | 'count' | 'pct' | 'KES'): string {
  if (value === null || value === undefined) return '—';
  const f = fmt.toLowerCase();
  if (f === 'kes') return kes(value);
  if (f === 'pct') return pct(value);
  return count(value);
}

/** Map a chart series colorRole (1-based) to a brand series token. */
export function seriesColor(role: number): string {
  const n = ((role - 1) % 5) + 1;
  return `var(--series-${n})`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
