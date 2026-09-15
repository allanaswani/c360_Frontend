'use client';

import { fmtValue } from '@/lib/format';
import s from './rankedBars.module.css';

export interface RankedRow {
  label: string;
  value: number;
  /** A second fact per row — the customer count behind a segment's value, say.
   *  A magnitude chart that drops it wastes the row it already paid for. */
  meta?: string;
}

/**
 * A ranked-magnitude list. Replaces a Recharts bar chart for the "which of these is
 * biggest" question.
 *
 * The chart it replaces put eleven bars in one colour at 34px with 9px gaps — 530px
 * of panel to rank eleven things, with every bar the same weight so the only encoding
 * was length, and the smallest row (0.5% of the leader) rendered as an invisible
 * sliver. Value labels floated in a right-hand gutter, detached from their bars.
 *
 * This is ~26px a row, so the same eleven fit in half the height. Rank is encoded
 * twice — length and colour intensity — so the order reads without comparing lengths,
 * the value sits at the end of its own bar, and a share percentage answers "how much
 * of the total" without arithmetic. A row too small to draw still gets a visible
 * minimum, because "present but tiny" and "absent" are different facts.
 */
export function RankedBars({ rows, fmt, total, max = 12 }: {
  rows: RankedRow[];
  fmt: 'kes' | 'count' | 'pct';
  /** Denominator for the share column. Defaults to the sum of the rows shown. */
  total?: number;
  /** Rows beyond this collapse into one "others" line rather than scrolling. */
  max?: number;
}) {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, max);
  const rest = sorted.slice(max);
  const sum = total ?? sorted.reduce((acc, r) => acc + r.value, 0);
  const peak = shown[0]?.value || 1;

  const line = (r: RankedRow, rank: number, muted = false) => {
    const share = sum > 0 ? (r.value / sum) * 100 : 0;
    // Intensity steps down the ranking so order is legible without measuring bars.
    // Floored well above zero — a faded bar must still read as a bar.
    const weight = muted ? 0.28 : Math.max(0.42, 1 - rank * 0.06);
    return (
      <li key={r.label} className={s.row}>
        <span className={s.label} title={r.label}>{r.label}</span>
        <span className={s.track}>
          <span
            className={s.fill}
            style={{
              // Minimum 2px of bar: a row that exists but is tiny must not look absent.
              width: `max(2px, ${(r.value / peak) * 100}%)`,
              background: `color-mix(in srgb, var(--teal) ${Math.round(weight * 100)}%, transparent)`,
            }}
          />
          <span className={s.value}>{fmtValue(r.value, fmt)}</span>
        </span>
        <span className={s.share}>{share >= 0.1 ? `${share.toFixed(1)}%` : '<0.1%'}</span>
        {r.meta !== undefined && <span className={s.meta}>{r.meta}</span>}
      </li>
    );
  };

  return (
    <ul className={s.list}>
      {shown.map((r, i) => line(r, i))}
      {rest.length > 0 && line(
        {
          label: `${rest.length} more`,
          value: rest.reduce((acc, r) => acc + r.value, 0),
        },
        shown.length,
        true,
      )}
    </ul>
  );
}
