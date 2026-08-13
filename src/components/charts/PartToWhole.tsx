'use client';

import { useState } from 'react';
import { DonutChart } from './DonutChart';
import { StackedBar } from './StackedBar';
import s from '../ui.module.css';

interface D { label: string; value: number }

/** A part-to-whole with a built-in donut ⟷ stacked-bar toggle. Wherever the app
 *  shows a composition (value by domain, channel mix, premium mix, risk, property
 *  portfolio) it uses this, so the reading is switchable and consistent. */
export function PartToWhole({
  data, fmt, colors, centerLabel, defaultView = 'donut',
}: {
  data: D[];
  fmt: 'kes' | 'count' | 'pct';
  colors?: string[];
  centerLabel?: string;
  defaultView?: 'donut' | 'bar';
}) {
  const [view, setView] = useState<'donut' | 'bar'>(defaultView);
  // For share-based charts the "total" is 100%, so surface the top slice instead.
  const top = fmt === 'pct' ? [...data].sort((a, b) => b.value - a.value)[0] : undefined;
  const donutColors = colors ?? DEFAULT;

  return (
    <div>
      <div className={s.p2wToggleRow}>
        <ViewToggle view={view} onChange={setView} />
      </div>
      {view === 'donut'
        ? <DonutChart data={data} fmt={fmt} colors={colors} centerLabel={centerLabel}
                      center={top ? { label: 'Top', value: top.label } : undefined} />
        : <StackedBar data={data} fmt={fmt} colors={donutColors} />}
    </div>
  );
}

const DEFAULT = ['var(--series-1)', 'var(--series-2)', 'var(--coral)', 'var(--series-3)', 'var(--series-5)'];

function ViewToggle({ view, onChange }: { view: 'donut' | 'bar'; onChange: (v: 'donut' | 'bar') => void }) {
  return (
    <div className={s.viewToggle} role="group" aria-label="Chart view">
      <button className={`${s.viewToggleBtn} ${view === 'donut' ? s.viewToggleActive : ''}`} aria-label="Donut" aria-pressed={view === 'donut'} onClick={() => onChange('donut')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /></svg>
      </button>
      <button className={`${s.viewToggleBtn} ${view === 'bar' ? s.viewToggleActive : ''}`} aria-label="Stacked bar" aria-pressed={view === 'bar'} onClick={() => onChange('bar')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="10" width="18" height="5" rx="1.5" /></svg>
      </button>
    </div>
  );
}
