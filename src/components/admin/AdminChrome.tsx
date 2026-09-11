'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import s from './adminChrome.module.css';

/**
 * The shared furniture for the four Operations screens.
 *
 * They were each built on their own: three different title sizes in two different
 * fonts, three sub-heading treatments, breadcrumbs on two of four, and `.head`,
 * `.title`, `.sub` redefined in every stylesheet. That inconsistency is most of why
 * the section read as a generic admin template rather than part of this product —
 * nothing was wrong on any single page, but no two agreed.
 *
 * It is also where the wasted space lived. A page opened with an eyebrow, a 26px
 * title, a three-line paragraph and a 20px margin before anything with data in it.
 * Here the whole header is one band roughly 60px tall, actions inline on the right,
 * and the first real content starts immediately under it.
 */

// --- page header ------------------------------------------------------------

export function AdminHeader({ title, sub, actions, meta, back = true }: {
  title: string;
  /** One line. If it needs two, it belongs in the page, not the header. */
  sub?: ReactNode;
  /** Controls — export, refresh, a window picker. Right-aligned, vertically centred. */
  actions?: ReactNode;
  /** Small print under the actions (a "checked at" stamp, a live indicator). */
  meta?: ReactNode;
  back?: boolean;
}) {
  return (
    <header className={s.head}>
      <div className={s.headMain}>
        <div className={s.eyebrow}>
          {back && (
            <>
              <Link href="/" className={s.eyebrowLink}>Customer 360</Link>
              <span className={s.eyebrowSep}>/</span>
            </>
          )}
          <span>Operations</span>
        </div>
        <h1 className={s.title}>{title}</h1>
        {sub && <p className={s.sub}>{sub}</p>}
      </div>
      {(actions || meta) && (
        <div className={s.headSide}>
          {actions && <div className={s.headActions}>{actions}</div>}
          {meta && <div className={s.headMeta}>{meta}</div>}
        </div>
      )}
    </header>
  );
}

// --- tabs across the Operations section -------------------------------------

const SECTIONS = [
  { href: '/admin/observability', label: 'Monitoring' },
  { href: '/admin/audit', label: 'Audit trail' },
  { href: '/admin/health', label: 'Data health' },
  { href: '/admin/users', label: 'Users & access' },
];

/**
 * One nav for the whole section. Each screen previously linked to one or two of the
 * others in prose ("· Monitoring →"), so which screens existed depended on which one
 * you happened to open.
 */
export function AdminNav({ current }: { current: string }) {
  return (
    <nav className={s.nav} aria-label="Operations">
      {SECTIONS.map((sec) => (
        <Link key={sec.href} href={sec.href} className={s.navItem}
              aria-current={sec.href === current ? 'page' : undefined}>
          {sec.label}
        </Link>
      ))}
    </nav>
  );
}

// --- toolbar ----------------------------------------------------------------

/** The filter row. `trailing` is pinned right — a count, an export, a live dot. */
export function Toolbar({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className={s.toolbar}>
      {children}
      {trailing && <><span className={s.toolbarSpacer} />{trailing}</>}
    </div>
  );
}

/** A segmented control — time window, range, period. One idiom, used everywhere. */
export function Segmented<T>({ options, value, onChange, label }: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className={s.segmented} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} role="tab" aria-selected={o.value === value}
                className={s.segment} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --- content ----------------------------------------------------------------

/** A small uppercase rule-label above a block, so sections read without a card each. */
export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={s.sectionLabel}>
      <span>{children}</span>
      {aside && <span className={s.sectionAside}>{aside}</span>}
    </div>
  );
}

/** A bordered content panel with an optional header row. */
export function Panel({ title, note, action, children, flush }: {
  title?: string; note?: string; action?: ReactNode; children: ReactNode;
  /** No body padding — for a table that should meet the panel's edges. */
  flush?: boolean;
}) {
  return (
    <section className={s.panel}>
      {(title || action) && (
        <div className={s.panelHead}>
          <div className={s.panelTitleWrap}>
            {title && <span className={s.panelTitle}>{title}</span>}
            {note && <span className={s.panelNote}>{note}</span>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? s.panelBodyFlush : s.panelBody}>{children}</div>
    </section>
  );
}

/** The empty state. Says what would be here and why it isn't — never just "No data". */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      <b>{title}</b>
      {children && <span>{children}</span>}
    </div>
  );
}

// --- access gate ------------------------------------------------------------

/**
 * Wraps an Operations screen. Returns null while the session is still resolving,
 * the refusal when the user is not an administrator, and the page otherwise — the
 * same three-branch dance each screen was repeating with slightly different copy.
 */
export function AdminOnly({ what, children }: { what: string; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!user.is_admin) {
    return (
      <div className={s.denied}>
        <h2>Administrators only</h2>
        <p>{what} is available to administrators. Ask the Customer&nbsp;360 administrator if you need access.</p>
      </div>
    );
  }
  return <>{children}</>;
}
