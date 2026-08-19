import type { ReactNode } from 'react';
import s from './ui.module.css';

/** Honest empty state — direct and useful, never a bare "--" or a cute "Oops!".
 *  Brand tone: confident, concise, tells you exactly what's missing and why. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.6">
        <path d="M3 3v18h18" /><path d="M18 9l-5 5-3-3-4 4" />
      </svg>
      <div className={s.emptyTitle}>{title}</div>
      {children && <div className={s.emptyText}>{children}</div>}
    </div>
  );
}

export function ErrorState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className={s.empty}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.7">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
      </svg>
      <div className={s.emptyTitle}>{title}</div>
      {detail && <div className={s.emptyText}>{detail}</div>}
    </div>
  );
}

/** "Couldn't load" — distinct from EmptyState. Used when a domain's SOURCE is
 *  unavailable (error, or the source table is empty/unreachable), so we never pass
 *  a data-source problem off as "this customer has nothing". Amber, not a dead-end:
 *  it says what happened and offers a retry. */
export function UnavailableState({ title, children, onRetry }: { title: string; children?: ReactNode; onRetry?: () => void }) {
  return (
    <div className={s.empty}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.7">
        <path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <div className={s.emptyTitle}>{title}</div>
      {children && <div className={s.emptyText}>{children}</div>}
      {onRetry && (
        <button className={s.retryBtn} onClick={onRetry}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />
          </svg>
          Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number; width?: number | string; radius?: number }) {
  return <div className={s.skeleton} style={{ height, width, borderRadius: radius }} />;
}
