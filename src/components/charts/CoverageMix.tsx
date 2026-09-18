'use client';

import s from './coverageMix.module.css';

export interface MixSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * A part-to-whole where one part is "we don't know".
 *
 * The risk panel drew a donut whose largest slice — 77% — was *Unclassified*, with
 * High at 0%. Read as a risk chart that says the book is almost risk-free; read
 * honestly it says risk grading is missing for three quarters of the book, which is
 * a data-coverage finding wearing a risk chart's clothes. A donut also spends a
 * 180px circle plus a legend to encode four numbers.
 *
 * So coverage leads: how much of the book can be graded at all, stated first and in
 * words. The mix is then shown only across the part that IS graded — a percentage of
 * the classified population, which is the only population it describes — with the
 * ungraded remainder drawn to scale beside it so nobody mistakes the picture for the
 * whole book.
 */
export function CoverageMix({ slices, unknownLabel = 'Unclassified', unit = 'customers' }: {
  slices: MixSlice[];
  /** The slice that means "not known", pulled out of the mix. Matched case-insensitively. */
  unknownLabel?: string;
  unit?: string;
}) {
  const total = slices.reduce((acc, x) => acc + x.value, 0);
  if (total <= 0) return null;

  const unknown = slices.find((x) => x.label.toLowerCase() === unknownLabel.toLowerCase());
  const known = slices.filter((x) => x !== unknown);
  const knownTotal = known.reduce((acc, x) => acc + x.value, 0);
  const coverage = (knownTotal / total) * 100;
  const gap = unknown ? (unknown.value / total) * 100 : 0;

  const fmt = (n: number) => n.toLocaleString('en-KE');
  // Zero is zero. `<0.1%` is for a real but tiny share; using it for an absent
  // category says something is there when nothing is.
  const pct = (n: number) => {
    if (n <= 0) return '0%';
    return n >= 0.1 ? `${n.toFixed(n < 10 ? 1 : 0)}%` : '<0.1%';
  };

  return (
    <div className={s.wrap}>
      {/* The finding, in words, before any geometry. */}
      <div className={s.head}>
        <span className={s.headline} data-thin={coverage < 50 || undefined}>{pct(coverage)}</span>
        <span className={s.headlineNote}>
          of the book is graded, {fmt(knownTotal)} of {fmt(total)} {unit}
          {gap > 0 && <> · <b>{pct(gap)} ungraded</b></>}
        </span>
      </div>

      {/* One bar across the whole book: the graded mix at its true scale, then the
          ungraded remainder. A donut hid this by giving every slice equal prominence. */}
      <div className={s.bar} role="img"
           aria-label={`${pct(coverage)} graded, ${pct(gap)} ungraded`}>
        {known.map((x) => (
          <span key={x.label} className={s.seg} title={`${x.label}: ${fmt(x.value)}`}
                style={{ width: `${(x.value / total) * 100}%`, background: x.color }} />
        ))}
        {unknown && (
          <span className={`${s.seg} ${s.segUnknown}`} title={`${unknown.label}: ${fmt(unknown.value)}`}
                style={{ width: `${gap}%` }} />
        )}
      </div>

      <ul className={s.legend}>
        {known.map((x) => (
          <li key={x.label} className={s.legendRow}>
            <span className={s.dot} style={{ background: x.color }} />
            <span className={s.legendLabel}>{x.label}</span>
            <span className={s.legendVal}>{fmt(x.value)}</span>
            {/* Share OF THE GRADED POPULATION — the only group this describes. A
                share of the whole book would be dominated by the unknown slice and
                say nothing about risk. */}
            <span className={s.legendPct}>{knownTotal > 0 ? pct((x.value / knownTotal) * 100) : '—'}</span>
          </li>
        ))}
        {unknown && unknown.value > 0 && (
          <li className={`${s.legendRow} ${s.legendUnknown}`}>
            <span className={`${s.dot} ${s.dotUnknown}`} />
            <span className={s.legendLabel}>{unknown.label}</span>
            <span className={s.legendVal}>{fmt(unknown.value)}</span>
            <span className={s.legendPct}>{pct(gap)}</span>
          </li>
        )}
      </ul>
      {known.length > 0 && (
        <div className={s.foot}>Percentages are of the {fmt(knownTotal)} graded {unit}, not the whole book.</div>
      )}
    </div>
  );
}
