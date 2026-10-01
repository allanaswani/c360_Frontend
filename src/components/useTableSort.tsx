'use client';

import { type ReactNode, useMemo, useState } from 'react';
import t from './table.module.css';

type Val = string | number | null | undefined;

/**
 * Sort and search for the hand-built book-wide lists (worklist, call list, maturities),
 * with the same behaviour as DataTable: click a header to sort (numbers start highest
 * first), click again to flip, a third time to return to the list's own order; blanks
 * always sort last; the search matches any of the given text fields.
 */
export function useTableSort<R>(rows: R[], cols: Record<string, (r: R) => Val>, searchIn: (r: R) => Val[]) {
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle
      ? rows.filter((r) => searchIn(r).some((v) => v != null && String(v).toLowerCase().includes(needle)))
      : rows;
    if (sort && cols[sort.col]) {
      const get = cols[sort.col];
      out = [...out].sort((a, b) => {
        const av = get(a), bv = get(b);
        const ae = av == null || av === '', be = bv == null || bv === '';
        if (ae || be) return ae === be ? 0 : ae ? 1 : -1;
        if (typeof av === 'number' && typeof bv === 'number') return sort.dir * (av - bv);
        return sort.dir * String(av).localeCompare(String(bv), undefined, { numeric: true });
      });
    }
    return out;
  }, [rows, q, sort, cols, searchIn]);

  const toggle = (col: string, numeric: boolean) => setSort((cur) =>
    !cur || cur.col !== col ? { col, dir: numeric ? -1 : 1 }
      : cur.dir === (numeric ? -1 : 1) ? { col, dir: numeric ? 1 : -1 } : null);

  /** A sortable header cell (a render function, not a component, so it never remounts). */
  const th = (col: string, label: ReactNode, opts: { numeric?: boolean; className?: string } = {}) => {
    const active = sort?.col === col;
    return (
      <th key={col} className={opts.className} aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={t.sortBtn} onClick={() => toggle(col, !!opts.numeric)}>
          {label}
          <span className={t.arrow} aria-hidden>{active ? (sort!.dir === 1 ? '▲' : '▼') : ''}</span>
        </button>
      </th>
    );
  };

  const search = (
    <input className={t.search} type="search" placeholder="Search name, number, branch, RM" value={q}
           onChange={(e) => setQ(e.target.value)} aria-label="Search this list" />
  );

  return { shown, th, search };
}
