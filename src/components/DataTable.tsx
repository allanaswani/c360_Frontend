import type { DomainTable, TableBlock } from '@/lib/types';
import { kesFull, pct, shortDate } from '@/lib/format';
import s from './ui.module.css';

const HEADERS: Record<string, string> = {
  product: 'Product', account_no: 'Account', balance: 'Balance', status: 'Status',
  date: 'Date', description: 'Description', channel: 'Channel', amount: 'Amount',
  project: 'Project', unit: 'Unit', value: 'Value', loan_balance: 'Loan balance', ltv: 'LTV',
  paid_pct: 'Paid', mortgage: 'Mortgage',
  policy: 'Policy', premium: 'Premium', monthly: 'Monthly', sum_insured: 'Sum insured',
};
const NUMERIC = new Set(['balance', 'amount', 'value', 'loan_balance', 'ltv', 'paid_pct', 'premium', 'monthly', 'sum_insured']);

/** Generic table renderer for the supporting drill-down tables. Formats known
 *  columns (money → KES, dates → short form) so figures read consistently. */
export function DataTable({ block }: { block: TableBlock | DomainTable }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            {block.columns.map((c) => (
              <th key={c} className={NUMERIC.has(c) ? s.tRight : undefined}>{HEADERS[c] ?? c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i}>
              {block.columns.map((c) => (
                <td key={c} className={`${NUMERIC.has(c) ? `${s.tRight} tnum` : ''} ${c === 'account_no' ? `${s.tMuted} tnum` : ''}`}>
                  {renderCell(c, row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const KES_COLS = new Set(['balance', 'value', 'loan_balance', 'premium', 'monthly', 'sum_insured']);

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
