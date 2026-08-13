'use client';

// The gate. Everything except /login requires a signed-in session; the TopBar only
// exists for authed users. Redirects are client-side because the session is a
// cross-origin cookie owned by Django — the server-side enforcement is the API's
// job (it 401/403s), this just keeps the UI honest about what's reachable.

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { TopBar } from './TopBar';
import s from './ui.module.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === '/login';

  useEffect(() => {
    if (status === 'anon' && !onLogin) router.replace('/login');
    if (status === 'authed' && onLogin) router.replace('/');
  }, [status, onLogin, router]);

  // The sign-in screen owns the full viewport (no top bar).
  if (onLogin) return <>{children}</>;

  // Booting, or bouncing an unauthenticated visitor to /login.
  if (status !== 'authed') return <BootSplash />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      {children}
    </div>
  );
}

function BootSplash() {
  return (
    <div className={s.bootSplash} aria-busy="true">
      <div className={s.bootMark}>
        <img src="/hfcb-mark.png" alt="" width={26} height={25} />
      </div>
      <div className={s.bootPulse} />
    </div>
  );
}
