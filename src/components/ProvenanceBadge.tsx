import type { Provenance } from '@/lib/types';
import s from './ui.module.css';

const LABEL: Record<Provenance, string> = {
  live: 'Live',
  preview: 'Preview',
  derived: 'Derived',
  to_source: 'Not sourced',
};
const CLASS: Record<Provenance, string> = {
  live: s.badgeLive,
  preview: s.badgePreview,
  derived: s.badgeDerived,
  to_source: s.badgeSource,
};
const DOT: Record<Provenance, string> = {
  live: 'var(--prov-live)',
  preview: 'var(--prov-preview)',
  derived: 'var(--prov-derived)',
  to_source: 'var(--prov-source)',
};

/** The honest data-provenance badge. Every non-live value in the app wears one,
 *  so a preview or unsourced number is never mistaken for a live figure — and a
 *  bare "--" never appears. */
export function ProvenanceBadge({ status, note }: { status: Provenance; note?: string }) {
  if (status === 'live') return null; // live is the default; badge only the exceptions
  return (
    <span className={`${s.badge} ${CLASS[status]}`} title={note ?? LABEL[status]}>
      <span className={s.badgeDot} style={{ background: DOT[status] }} />
      {LABEL[status]}
    </span>
  );
}

export function ProvenanceDotOnly({ status }: { status: Provenance }) {
  return <span className={s.badgeDot} style={{ background: DOT[status] }} title={LABEL[status]} />;
}
