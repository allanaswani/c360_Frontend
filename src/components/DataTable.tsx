'use client';

import { useMemo, useState } from 'react';
import type { DomainTable, TableBlock } from '@/lib/types';
import { kesFull, pct, shortDate } from '@/lib/format';
import s from './ui.module.css';
import t from './table.module.css';

/** Column labels, shared with the export so a downloaded file reads like the
 *  table it came from. */
export const HEADERS: Record<string, string> = {
  product: 'Product', account_no: 'Account', balance: 'Balance', status: 'Status',
  date: 'Date', description: 'Description', channel: 'Channel', amount: 'Amount',
  project: 'Project', unit: 'Unit', value: 'Value', loan_balance: 'Loan balance', ltv: 'LTV',
  paid_pct: 'Paid', mortgage: 'Mortgage',
  policy: 'Policy', premium: 'Premium', monthly: 'Monthly', sum_insured: 'Sum insured',
  account: 'Account',
};
const NUMERIC = new Set(['balance', 'amount', 'value', 'loan_balance', 'ltv', 'paid_pct', 'premium', 'monthly', 'sum_insured']);
const KES_COLS = new Set(['balance', 'value', 'loan_balance', 'premium', 'monthly', 'sum_insured']);
// Columns worth a dropdown filter when they hold a handful of distinct values.
const FILTERABLE = ['channel', 'account', 'status', 'product'];
const SEARCH_FROM = 8;     // rows before a search box earns its place
const SCROLL_FROM = 12;    // rows before the body scrolls under a sticky header

type Row = Record<string, string | number | undefined>;

/**
 * The table every drill-down uses. Sort by any column, search, filter by the
 * low-cardinality columns, and - only when the caller says the sums mean something -
 * a totals line:
 *
 * - ``flow``: the ``amount`` column is a SIGNED money movement, so the line reads
 *   money in, money out and net over the rows currently shown.
 * - ``sumColumns``: plain sums for columns where adding them up is meaningful.
 *
 * Never on by default: a product table mixes deposits and loans, and a total of
 * the two is a number nobody should read.
 */
export function DataTable({ block, flow = false, sumColumns = [], maxHeight = 440 }: {
  block: TableBlock | DomainTable;
  flow?: boolean;
  sumColumns?: string[];
  maxHeight?: number;
}) {
  const rows = block.rows as Row[];
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterCols = useMemo(() => FILTERABLE.filter((c) => {
    if (!block.columns.includes(c)) return false;
    const n = new Set(rows.map((r) => String(r[c] ?? ''))).size;
    return n >= 2 && n <= 15;
  }), [block.columns, rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) =>
      Object.entries(filters).every(([c, v]) => !v || String(r[c] ?? '') === v)
      && (!needle || block.columns.some((c) => String(r[c] ?? '').toLowerCase().includes(needle))));
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.col], bv = b[sort.col];
        const ae = av === undefined || av === null || av === '', be = bv === undefined || bv === null || bv === '';
        if (ae || be) return ae === be ? 0 : ae ? 1 : -1;      // blanks last, either direction
        return sort.dir * compare(av, bv, sort.col);
      });
    }
    return out;
  }, [rows, filters, q, sort, block.columns]);

  const toggle = (col: string) => setSort((cur) =>
    !cur || cur.col !== col ? { col, dir: NUMERIC.has(col) || col === 'date' ? -1 : 1 }
      : cur.dir === -1 ? { col, dir: 1 } : null);

  const showTools = rows.length > SEARCH_FROM || filterCols.length > 0;
  const scroll = shown.length > SCROLL_FROM;

  return (
    <div>
      {showTools && (
        <div className={t.tools}>
          {rows.length > SEARCH_FROM && (
            <input className={t.search} type="search" placeholder="Search this table" value={q}
                   onChange={(e) => setQ(e.target.value)} aria-label="Search this table" />
          )}
          {filterCols.map((c) => (
            <select key={c} className={t.filter} value={filters[c] ?? ''} aria-label={`Filter by ${HEADERS[c] ?? c}`}
                    onChange={(e) => setFilters((f) => ({ ...f, [c]: e.target.value }))}>
              <option value="">All {(HEADERS[c] ?? c).toLowerCase()}s</option>
              {[...new Set(rows.map((r) => String(r[c] ?? '')))].filter(Boolean).sort().map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ))}
          <span className={t.count}>
            {shown.length === rows.length ? `${rows.length} rows` : `Showing ${shown.length} of ${rows.length}`}
          </span>
        </div>
      )}
      <div className={`${s.tableWrap} ${scroll ? t.scroll : ''}`} style={scroll ? { maxHeight } : undefined}>
        <table className={`${s.table} ${t.sticky}`}>
          <thead>
            <tr>
              {block.columns.map((c) => {
                const active = sort?.col === c;
                return (
                  <th key={c} className={NUMERIC.has(c) ? s.tRight : undefined}
                      aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className={t.sortBtn} onClick={() => toggle(c)}>
                      {HEADERS[c] ?? c}
                      <span className={t.arrow} aria-hidden>{active ? (sort!.dir === 1 ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                {block.columns.map((c) => (
                  <td key={c} className={`${NUMERIC.has(c) ? `${s.tRight} tnum` : ''} ${c === 'account_no' ? `${s.tMuted} tnum` : ''}`}>
                    {renderCell(c, row[c])}
                  </td>
                ))}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={block.columns.length} className={s.tMuted}>No rows match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {(flow || sumColumns.length > 0) && shown.length > 0 && <Totals rows={shown} flow={flow} sumColumns={sumColumns} />}
    </div>
  );
}

function Totals({ rows, flow, sumColumns }: { rows: Row[]; flow: boolean; sumColumns: string[] }) {
  const parts: { label: string; value: number; tone?: 'pos' | 'neg' }[] = [];
  if (flow) {
    const amounts = rows.map((r) => Number(r.amount ?? 0));
    const inn = amounts.filter((a) => a > 0).reduce((x, y) => x + y, 0);
    const out = amounts.filter((a) => a < 0).reduce((x, y) => x + y, 0);
    parts.push({ label: 'In', value: inn, tone: 'pos' }, { label: 'Out', value: out, tone: 'neg' },
               { label: 'Net', value: inn + out });
  }
  for (const c of sumColumns) {
    parts.push({ label: HEADERS[c] ?? c, value: rows.reduce((x, r) => x + Number(r[c] ?? 0), 0) });
  }
  return (
    <div className={t.totals}>
      <span className={t.totalsLabel}>Total of the {rows.length} rows shown</span>
      {parts.map((p) => (
        <span key={p.label} className={t.total}>
          {p.label}{' '}
          <b className="tnum" style={{ color: p.tone === 'pos' ? 'var(--pos)' : p.tone === 'neg' ? 'var(--neg)' : undefined }}>
            {kesFull(p.value)}
          </b>
        </span>
      ))}
    </div>
  );
}

function compare(a: unknown, b: unknown, col: string): number {
  if (NUMERIC.has(col)) return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function renderCell(col: string, val: string | number | undefined) {
  if (val === undefined || val === null) return '—';
  if (KES_COLS.has(col)) return kesFull(Number(val));
  if (col === 'ltv' || col === 'paid_pct') return pct(Number(val), 0);
  if (col === 'mortgage') return val ? 'Yes' : '—';
  if (col === 'amount') {
    const n = Number(val);
    return <span style={{ color: n < 0 ? 'var(--neg)' : 'var(--pos)' }}>{kesFull(n)}</span>;
  }
  if (col === 'date') return shortDate(String(val));
  return String(val);
}
