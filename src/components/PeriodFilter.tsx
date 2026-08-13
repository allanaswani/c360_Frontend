'use client';

import s from './ui.module.css';

const PRESETS = ['7D', '30D', 'QTD', 'YTD'] as const;

/** One global period control per page. Drives every chart on the page from a
 *  single source, so a card and its chart can never disagree (consistency rule).
 *  The selection lives in the URL, so a view is bookmarkable/shareable. */
export function PeriodFilter({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  return (
    <div className={s.segment} role="group" aria-label="Period">
      {PRESETS.map((p) => (
        <button
          key={p}
          className={`${s.segItem} ${value === p ? s.segItemActive : ''}`}
          aria-pressed={value === p}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
