import type { ReactNode } from 'react';
import type { Provenance } from '@/lib/types';
import { ProvenanceBadge } from './ProvenanceBadge';
import s from './ui.module.css';

/** Chart/section card. Every chart states the question it answers (a hard product
 *  rule — no decorative charts), and carries its provenance badge in the header. */
export function Card({
  title,
  question,
  status,
  note,
  right,
  className,
  children,
}: {
  title: string;
  question?: string;
  status?: Provenance;
  note?: string;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${s.card} ${className ?? ''}`}>
      <header className={s.cardHead}>
        <div>
          <div className={s.cardTitle}>{title}</div>
          {question && <div className={s.cardQ}>{question}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status && <ProvenanceBadge status={status} note={note} />}
          {right}
        </div>
      </header>
      <div className={s.cardBody}>{children}</div>
    </section>
  );
}
