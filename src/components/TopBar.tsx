'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { asset } from '@/lib/asset';
import type { Meta } from '@/lib/types';
import { initials } from '@/lib/format';
import { ThemeToggle } from './ThemeToggle';
import s from './ui.module.css';

export function TopBar() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const pathname = usePathname();
  useEffect(() => {
    api.meta().then(setMeta).catch(() => setMeta(null));
  }, []);

  const onPortfolio = pathname.startsWith('/portfolio');
  const onCustomers = pathname === '/' || pathname.startsWith('/customers');
  const onBook = pathname.startsWith('/book');

  // Where "back to apps" goes — the HFCB app launcher, OUTSIDE this app's
  // /customer-360 basePath. A plain <a> (not next/link) so the prefix isn't added;
  // env-configurable so it can point at the exact launcher route. Defaults to the
  // portfolio root on the shared domain.
  const appsHome = process.env.NEXT_PUBLIC_PORTFOLIO_HOME || '/';

  return (
    <header className={s.topbar}>
      <div className={s.brand}>
        <a href={appsHome} className={s.backHome} title="Back to HFCB apps" aria-label="Back to HFCB apps">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
          <span className={s.backHomeLabel}>Apps</span>
        </a>
        <Link href="/portfolio" className={s.brandLink}>
          {/* Official HFCB mark on a white tile — brand-correct on light and dark */}
          <span className={s.logoTile}>
            <img src={asset('/hfcb-mark.png')} alt="HFCB" width={21} height={20} />
          </span>
          <span className={s.brandName}>Customer <b>360</b></span>
          <span className={s.brandTag}>HFCB</span>
        </Link>
        <nav className={s.nav}>
          <Link href="/portfolio" className={`${s.navItem} ${onPortfolio ? s.navItemActive : ''}`}>Portfolio</Link>
          <Link href="/" className={`${s.navItem} ${onCustomers ? s.navItemActive : ''}`}>Customers</Link>
          <Link href="/book" className={`${s.navItem} ${onBook ? s.navItemActive : ''}`}>My book</Link>
        </nav>
      </div>
      <div className={s.topbarRight}>
        {meta && <DataModePill mode={meta.data_mode} asOf={meta.as_of} />}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator', manager: 'Management', officer: 'Relationship Manager', customer: 'Customer',
};

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const roleLabel = ROLE_LABELS[user.role_tier] ?? 'User';
  const scopeLabel = user.scope?.whole_book ? 'Whole book' : 'All customers';
  const code = user.profile.sales_code;
  return (
    <div className={s.userWrap} onMouseLeave={() => setOpen(false)}>
      <button className={s.userChip} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={s.userAvatar}>{initials(user.name)}</span>
        <span className={s.userChipMeta}>
          <span className={s.userChipName}>{user.name}</span>
          <span className={s.userChipRole}>{roleLabel}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className={s.userMenu} role="menu">
          <div className={s.userMenuHead}>
            <div className={s.userMenuName}>{user.name}</div>
            <div className={s.userMenuSub}>
              {roleLabel}{code ? ` · ${code}` : ''}
            </div>
            <div className={s.userMenuBook}><span className="microlabel">Scope</span> {scopeLabel}</div>
          </div>
          {user.is_admin && (
            <Link href="/admin/users" className={s.userMenuItem} role="menuitem" onClick={() => setOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Manage users
            </Link>
          )}
          {user.is_admin && (
            <Link href="/admin/health" className={s.userMenuItem} role="menuitem" onClick={() => setOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              Data health
            </Link>
          )}
          <button className={s.userMenuItem} onClick={() => { setOpen(false); logout(); }} role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function DataModePill({ mode, asOf }: { mode: 'mock' | 'live'; asOf: string }) {
  const live = mode === 'live';
  return (
    <span className={s.modePill} title={live ? 'Connected to the live warehouse' : 'Preview data — swap C360_DATA_MODE=live to connect the warehouse'}>
      <span className={s.modeDot} style={{ background: live ? 'var(--prov-live)' : 'var(--prov-preview)' }} />
      {live ? 'Live data' : 'Preview data'}
      <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· {new Date(asOf).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
    </span>
  );
}
