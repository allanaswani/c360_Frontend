'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { exportRows, exportServer, type ExportFormat, type ExportRequest, type ServerDataset } from '@/lib/export';
import s from './ui.module.css';

/**
 * An export for one of the drill-down tables (`DataTable`'s block shape).
 *
 * Those blocks are already whole — the API sends the full table, the screen does
 * not paginate them — so they export client-side from the rows on screen. Column
 * labels are reused from the table's own header map so the file reads the same as
 * the screen did.
 */
export function TableExport({ title, block, headers }: {
  title: string;
  block: { columns: string[]; rows: Record<string, string | number | undefined>[] };
  headers?: Record<string, string>;
}) {
  if (!block.rows.length) return null;
  return (
    <ExportMenu
      title={title}
      count={block.rows.length}
      source={{
        kind: 'rows',
        build: () => ({
          title,
          columns: block.columns.map((c) => ({
            key: c,
            label: headers?.[c] ?? c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            type: typeof block.rows[0]?.[c] === 'number' ? ('num' as const) : ('text' as const),
          })),
          rows: block.rows as Record<string, unknown>[],
        }),
      }}
    />
  );
}

const FORMATS: { key: ExportFormat; label: string; note: string }[] = [
  { key: 'xlsx', label: 'Excel', note: 'formatted, sortable' },
  { key: 'csv', label: 'CSV', note: 'for analysis' },
  { key: 'pdf', label: 'PDF', note: 'to share' },
];

type Source =
  /** Rows the screen already holds in full. */
  | { kind: 'rows'; build: () => Omit<ExportRequest, 'exportedBy'> }
  /** A paginated table — the server builds the whole filtered set. */
  | { kind: 'server'; dataset: ServerDataset; params: Record<string, string | number | undefined> };

/**
 * The Export control: one button, three formats.
 *
 * Every table on an admin screen gets one of these. Where the screen paginates it
 * MUST use `kind: 'server'` — exporting the fifty rows currently rendered and
 * calling it the audit trail is worse than having no export at all, because the
 * file looks complete.
 *
 * State is honest: the button shows progress while a large export is built and
 * surfaces the failure inline rather than silently doing nothing, which is how a
 * blocked download usually presents.
 */
export function ExportMenu({ title, subtitle, source, disabled, count }: {
  title: string;
  subtitle?: string;
  source: Source;
  disabled?: boolean;
  /** Row count, shown on the menu so it's clear how much is coming. */
  count?: number;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape — a menu that traps the page is worse than no menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(format: ExportFormat) {
    if (busy) return;
    setBusy(format);
    setError(null);
    const who = user ? (user.name || user.username) : undefined;
    try {
      if (source.kind === 'server') {
        await exportServer(format, source.dataset, source.params,
                           { title, subtitle, exportedBy: who });
      } else {
        await exportRows(format, { ...source.build(), exportedBy: who });
      }
      setOpen(false);
    } catch (e) {
      setError((e as Error).message || 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={s.exportWrap} ref={wrap}>
      <button
        type="button"
        className={s.exportBtn}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || !!busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? (
          <span className={s.exportSpinner} aria-hidden />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
          </svg>
        )}
        {busy ? 'Preparing…' : 'Export'}
        <svg className={s.exportCaret} width="11" height="11" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div className={s.exportMenu} role="menu">
          <div className={s.exportMenuHead}>
            {typeof count === 'number'
              ? `${count.toLocaleString()} row${count === 1 ? '' : 's'}`
              : 'Download'}
            {source.kind === 'server' && <span className={s.exportAll}>· all matching rows</span>}
          </div>
          {FORMATS.map((f) => (
            <button key={f.key} type="button" role="menuitem" className={s.exportItem}
                    disabled={!!busy} onClick={() => run(f.key)}>
              <span className={s.exportItemLabel}>{f.label}</span>
              <span className={s.exportItemNote}>{f.note}</span>
            </button>
          ))}
          {error && <div className={s.exportError}>{error}</div>}
        </div>
      )}
    </div>
  );
}
