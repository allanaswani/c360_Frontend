// Exporting a table to CSV, Excel or PDF.
//
// Two routes, deliberately:
//
//  * `exportServer()` asks the API for the whole filtered dataset as one file. Use
//    it wherever the screen paginates — the audit trail can be tens of thousands of
//    rows and the browser only ever holds fifty of them, so a client-side export
//    would quietly hand over page one and call it the report.
//  * `exportRows()` builds the file in the browser from rows already on screen. Use
//    it where the screen genuinely has everything (a health check list, a routes
//    table).
//
// Both produce the same three formats and the same filename convention, so the
// Export button behaves identically wherever it appears.
//
// The heavy writers (SheetJS, jsPDF) are imported dynamically: they are ~1MB
// together and nobody pays for them until they actually click Export.

import { apiBase, tokens } from './api';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportColumn {
  key: string;
  label: string;
  /** Numeric types are written as numbers, so Excel can sort and sum them. */
  type?: 'num' | 'ms' | 'pct' | 'datetime' | 'text';
}

export interface ExportRequest {
  /** Used for the filename, the sheet name and the PDF heading. */
  title: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  /** Small print under the PDF/Excel title — the filters that produced this. */
  subtitle?: string;
  /** Shown as "Exported by …" in the PDF. */
  exportedBy?: string;
}

const NUMERIC = new Set(['num', 'ms', 'pct']);

/** A cell as it should land in the file: numbers numeric, blanks blank. */
function cell(value: unknown, type?: string): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return value;
  if (type && NUMERIC.has(type)) {
    const text = String(value).trim();
    if (text !== '' && /^-?\d+(\.\d+)?$/.test(text)) {
      const n = Number(text);
      if (Number.isFinite(n)) return n;
    }
  }
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return ''; }
  }
  return String(value);
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function exportFilename(title: string, ext: string): string {
  return `c360-${slug(title)}-${stamp()}.${ext}`;
}

/** Hand a built file to the browser as a download. */
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on a later tick — revoking synchronously cancels the download in
  // Safari and older Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function matrix(req: ExportRequest): { headers: string[]; body: (string | number)[][] } {
  return {
    headers: req.columns.map((c) => c.label),
    body: req.rows.map((row) => req.columns.map((c) => cell(row[c.key], c.type))),
  };
}

// --- client-side writers ----------------------------------------------------

async function writeCsv(req: ExportRequest): Promise<void> {
  const { headers, body } = matrix(req);
  const escape = (v: string | number) => {
    const text = String(v ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers, ...body].map((r) => r.map(escape).join(',')).join('\r\n');
  // The BOM is what stops Excel on Windows reading UTF-8 as the system codepage
  // and mangling every accented name.
  download(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }),
           exportFilename(req.title, 'csv'));
}

async function writeXlsx(req: ExportRequest): Promise<void> {
  const XLSX = await import('xlsx');
  const { headers, body } = matrix(req);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  sheet['!cols'] = req.columns.map((c, i) => ({
    wch: Math.min(52, Math.max(10, Math.max(
      c.label.length,
      ...body.slice(0, 400).map((r) => String(r[i] ?? '').length),
    ) + 2)),
  }));
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, req.title.replace(/[[\]:*?/\\]/g, '-').slice(0, 31) || 'Data');
  XLSX.writeFile(book, exportFilename(req.title, 'xlsx'));
}

async function writePdf(req: ExportRequest): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableModule as unknown as { default: (doc: unknown, opts: unknown) => void }).default;
  const { headers, body } = matrix(req);
  const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(8, 75, 101);                       // HFCB navy
  doc.text(req.title, 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 122, 130);
  const when = new Date().toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const meta = [req.subtitle, req.exportedBy ? `Exported by ${req.exportedBy}` : '', when]
    .filter(Boolean).join('  ·  ');
  doc.text(meta, 14, 21);

  autoTable(doc, {
    head: headers.length ? [headers] : [],
    body,
    startY: 26,
    styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', overflow: 'linebreak' },
    headStyles: { fillColor: [8, 75, 101], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 247, 248] },
    margin: { left: 14, right: 14 },
  });

  doc.save(exportFilename(req.title, 'pdf'));
}

/** Build a file in the browser from rows the screen already holds. */
export async function exportRows(format: ExportFormat, req: ExportRequest): Promise<void> {
  if (format === 'xlsx') return writeXlsx(req);
  if (format === 'pdf') return writePdf(req);
  return writeCsv(req);
}

// --- server-side export -----------------------------------------------------

/** Dataset names the API will build server-side. Must match `EXPORTABLE`
 *  in `backend/c360/reports/datasets.py`. */
export type ServerDataset =
  | 'activity' | 'changes' | 'traffic' | 'routes' | 'errors' | 'health_history' | 'users';

/**
 * Ask the API for a whole filtered dataset as one file.
 *
 * CSV and XLSX are produced by the backend (identical to the emailed attachments).
 * PDF has no server-side writer, so the rows are fetched as CSV and rendered here
 * — which also keeps the PDF's branding in one place.
 */
export async function exportServer(
  format: ExportFormat,
  dataset: ServerDataset,
  params: Record<string, string | number | undefined>,
  meta: { title: string; subtitle?: string; exportedBy?: string },
): Promise<void> {
  const query = new URLSearchParams({ dataset });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) query.set(k, String(v));
  }
  // `fmt`, not `format` — DRF reserves `format` for content negotiation and
  // answers 404 for a value it has no renderer for.
  query.set('fmt', format === 'pdf' ? 'csv' : format);

  const access = tokens.access();
  const response = await fetch(`${apiBase()}/observability/export/?${query.toString()}`, {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!response.ok) {
    let detail = `Export failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body?.error?.detail || detail;
    } catch { /* a non-JSON error body — keep the status message */ }
    throw new Error(detail);
  }

  if (format === 'pdf') {
    const text = await response.text();
    const { headers, rows } = parseCsv(text);
    return writePdf({
      title: meta.title,
      subtitle: meta.subtitle,
      exportedBy: meta.exportedBy,
      columns: headers.map((h) => ({ key: h, label: h })),
      rows: rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))),
    });
  }

  const blob = await response.blob();
  download(blob, filenameFrom(response) ?? exportFilename(meta.title, format));
}

/** Prefer the filename the server chose, so a download matches the emailed file. */
function filenameFrom(response: Response): string | null {
  const header = response.headers.get('Content-Disposition') || '';
  const match = /filename="([^"]+)"/.exec(header);
  return match ? match[1] : null;
}

/** Minimal RFC-4180 CSV reader — enough for our own output (quoted fields,
 *  doubled quotes, CRLF rows). Only ever fed a file this app produced. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const headers = rows.shift() ?? [];
  return { headers, rows: rows.filter((r) => r.some((c) => c !== '')) };
}
