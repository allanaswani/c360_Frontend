'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import s from './ask.module.css';

const SUGGESTED = [
  'Brief me before I meet this customer.',
  'How have they repaid their loans this year?',
  'What does the bank earn from them, and is it rising?',
  'What could explain a drop in their mobile loan limit?',
];

type Turn = { q: string; text?: string; error?: string; truncated?: boolean };

/** Ask C360 - a question about this customer, answered from their record only
 *  (backend c360/assistant.py). A launcher sits bottom-right on every customer page,
 *  so it is found the same way every time; it opens a full-height panel wide enough
 *  to read an answer in. Renders nothing until the server switches the assistant on.
 *  Keyed by customer where it is used, so a new customer starts with a clean panel. */
export function AskPanel({ custId, customerName }: { custId: string; customerName?: string | null }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    api.askStatus(custId).then((d) => live && setEnabled(!!d.enabled)).catch(() => live && setEnabled(false));
    return () => { live = false; };
  }, [custId]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [turns, busy]);

  if (!enabled) return null;

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setQ('');
    setTurns((t) => [...t, { q: text }]);
    const settle = (turn: Turn) => setTurns((t) => [...t.slice(0, -1), turn]);
    api.ask(custId, text)
      .then((d) => settle({
        q: text, text: d.answer, truncated: d.truncated,
        error: d.answer ? undefined : typeof d.error === 'string' ? d.error : d.error?.detail ?? 'No answer came back.',
      }))
      .catch((e) => settle({ q: text, error: e.message }))
      .finally(() => setBusy(false));
  };

  return (
    <>
      {!open && (
        <button type="button" className={s.launcher} onClick={() => setOpen(true)} aria-haspopup="dialog">
          <svg className={s.launcherIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
            <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
          </svg>
          <span className={s.launcherLabel}>Ask C360 about this customer</span>
        </button>
      )}
      {open && (
        <>
          <div className={s.scrim} onClick={() => setOpen(false)} aria-hidden="true" />
          <section className={s.panel} role="dialog" aria-modal="true" aria-label="Ask C360">
            <div className={s.head}>
              <div>
                <div className={s.title}>Ask C360</div>
                <div className={s.who}>{customerName ? `${customerName} · ` : ''}Customer {custId}</div>
              </div>
              <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            <div className={s.body}>
              <div className={s.intro}>
                Answers come only from this customer&apos;s record in Customer 360, with the section each figure comes
                from in brackets. Check a figure against that section before you rely on it.
              </div>
              {turns.length === 0 && (
                <div className={s.suggestions}>
                  {SUGGESTED.map((x) => (
                    <button key={x} type="button" className={s.suggestion} onClick={() => ask(x)}>{x}</button>
                  ))}
                </div>
              )}
              {turns.map((t, i) => (
                <Fragment key={i}>
                  <div className={s.q}>{t.q}</div>
                  {t.text ? (
                    <div className={s.a}>
                      <Markdown text={t.text} />
                      {t.truncated && <div className={s.meta}>The answer was cut short.</div>}
                    </div>
                  ) : t.error ? <div className={s.error}>{t.error}</div>
                    : <div className={s.thinking} aria-live="polite">Reading the record…</div>}
                </Fragment>
              ))}
              <div ref={endRef} />
            </div>

            <div className={s.foot}>
              <form className={s.form} onSubmit={(e) => { e.preventDefault(); ask(q); }}>
                <textarea ref={inputRef} className={s.input} rows={1} value={q} maxLength={500} disabled={busy}
                          onChange={(e) => setQ(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(q); } }}
                          placeholder="Ask about this customer, e.g. why might their limit have dropped?"
                          aria-label="Question about this customer" />
                <button type="submit" className={s.send} disabled={busy || !q.trim()}>{busy ? 'Asking…' : 'Ask'}</button>
              </form>
              <div className={s.hint}>Enter to send, Shift+Enter for a new line, Esc to close.</div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/** The small Markdown the assistant writes - paragraphs, "- " and "1. " lists,
 *  "#" headings and **bold** - turned into elements. Built from text, never injected
 *  as HTML, so nothing in an answer can run as markup. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    const head = line.match(/^#{1,4}\s+(.*)$/);
    if (!line) { flushPara(); flushList(); continue; }
    if (head) { flushPara(); flushList(); blocks.push(<div key={blocks.length} className={s.aHead}>{inline(head[1])}</div>); continue; }
    if (bullet || num) {
      flushPara();
      const ordered = !!num;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? num)![1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return <>{blocks}</>;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>);
}
