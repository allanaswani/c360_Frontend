'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ui from './ui.module.css';

const SUGGESTED = [
  'Brief me before I meet this customer.',
  'How have they repaid their loans this year?',
  'What does the bank earn from them, and is it rising?',
];

/** Ask C360 - a question about this customer, answered from their record only
 *  (backend c360/assistant.py). Renders nothing until the server switches it on.
 *  Keyed by customer where it is used, so a new customer starts with a clean panel. */
export function AskPanel({ custId }: { custId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ q: string; text?: string; error?: string; truncated?: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    api.askStatus(custId).then((d) => live && setEnabled(!!d.enabled)).catch(() => live && setEnabled(false));
    return () => { live = false; };
  }, [custId]);

  if (!enabled) return null;

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setAnswer({ q: text });
    api.ask(custId, text)
      .then((d) => setAnswer({
        q: text, text: d.answer, truncated: d.truncated,
        error: d.answer ? undefined : typeof d.error === 'string' ? d.error : d.error?.detail ?? 'No answer came back.',
      }))
      .catch((e) => setAnswer({ q: text, error: e.message }))
      .finally(() => setBusy(false));
  };

  return (
    <div className={ui.card} style={{ padding: 'var(--s-4)' }}>
      <div style={{ fontSize: 'var(--t-sm)', fontWeight: 700 }}>Ask C360</div>
      <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', margin: '2px 0 8px', lineHeight: 1.45 }}>
        Answers come only from this customer&apos;s record on this page. Check any figure against its section before you use it.
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} style={{ display: 'flex', gap: 6 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} disabled={busy}
               placeholder="e.g. Why might their limit have dropped?" aria-label="Question about this customer"
               style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid var(--hairline)', borderRadius: 8,
                        background: 'var(--surface)', color: 'var(--ink-1)', fontSize: 'var(--t-xs)' }} />
        <button type="submit" disabled={busy || !q.trim()}
                style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--teal)', color: '#fff',
                         fontWeight: 600, fontSize: 'var(--t-xs)', cursor: busy ? 'wait' : 'pointer', opacity: busy || !q.trim() ? 0.6 : 1 }}>
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </form>
      {!answer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {SUGGESTED.map((s) => (
            <button key={s} type="button" onClick={() => { setQ(s); ask(s); }}
                    style={{ textAlign: 'left', background: 'none', border: '1px solid var(--hairline)', borderRadius: 8,
                             padding: '6px 9px', fontSize: 'var(--t-2xs)', color: 'var(--ink-2)', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      )}
      {answer && (
        <div style={{ marginTop: 10, fontSize: 'var(--t-xs)', lineHeight: 1.55 }} aria-live="polite">
          <div style={{ color: 'var(--ink-3)', fontSize: 'var(--t-2xs)', marginBottom: 4 }}>{answer.q}</div>
          {busy ? <div style={{ color: 'var(--ink-3)' }}>Reading the record…</div>
            : answer.error ? <div style={{ color: 'var(--neg)' }}>{answer.error}</div>
            : <div style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-1)' }}>{answer.text}</div>}
          {answer.truncated && <div style={{ color: 'var(--ink-3)', fontSize: 'var(--t-2xs)' }}>The answer was cut short.</div>}
        </div>
      )}
    </div>
  );
}
