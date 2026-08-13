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

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number; width?: number | string; radius?: number }) {
  return <div className={s.skeleton} style={{ height, width, borderRadius: radius }} />;
}
