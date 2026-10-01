'use client';

import { useState } from 'react';
import { DonutChart } from './DonutChart';
import { StackedBar } from './StackedBar';
import { MAX_CATEGORIES, OTHER_COLOR } from '@/lib/format';
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
  // More slices than the palette has colours: keep the largest six, fold the rest
  // into a grey "Other" - never a repeated colour. A slice keeps the colour it was
  // given, so folding never repaints the survivors.
  const palette = colors ?? DEFAULT;
  const folded = fold(data, palette);
  data = folded.data;
  colors = folded.colors;
  // For share-based charts the "total" is 100%, so surface the top slice instead.
  const top = fmt === 'pct' ? [...data].sort((a, b) => b.value - a.value)[0] : undefined;


  return (
    <div>
      <div className={s.p2wToggleRow}>
        <ViewToggle view={view} onChange={setView} />
      </div>
      {view === 'donut'
        ? <DonutChart data={data} fmt={fmt} colors={colors} centerLabel={centerLabel}
                      center={top ? { label: 'Top', value: top.label } : undefined} />
        : <StackedBar data={data} fmt={fmt} colors={colors} />}
    </div>
  );
}

function fold(data: D[], palette: string[]): { data: D[]; colors: string[] } {
  const withColor = data.map((d, i) => ({ d, c: palette[i % palette.length] }));
  if (data.length <= MAX_CATEGORIES) return { data, colors: withColor.map((x) => x.c) };
  const sorted = [...withColor].sort((a, b) => b.d.value - a.d.value);
  const keep = sorted.slice(0, MAX_CATEGORIES - 1);
  const rest = sorted.slice(MAX_CATEGORIES - 1);
  return {
    data: [...keep.map((x) => x.d), { label: `Other (${rest.length})`, value: rest.reduce((t, x) => t + x.d.value, 0) }],
    colors: [...keep.map((x) => x.c), OTHER_COLOR],
  };
}

// The validated palette in fixed order; coral (status) no longer stands in as a category.
const DEFAULT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)'];

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
