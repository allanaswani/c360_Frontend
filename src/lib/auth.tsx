'use client';

// Client-side auth context. Auth is JWT (tokens in localStorage, see api.ts); this
// context mirrors *who* is signed in (from /auth/me/) so the shell can gate routes
// and the top bar can greet the user. All real enforcement is server-side.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adoptPortfolioSession, api, type AuthUser, consumeSsoHandoff, type LoginStart, tokens } from './api';

type Status = 'loading' | 'authed' | 'anon';

interface AuthState {
  user: AuthUser | null;
  status: Status;
  /** Step 1 — verify password. Returns the server's start payload (ticket / mfa flag). */
  loginStart: (username: string, password: string) => Promise<LoginStart>;
  /** Step 2 — verify the emailed OTP and sign in. */
  loginVerify: (ticket: string, otp: string) => Promise<void>;
  /** Complete a sign-in when 2FA is disabled and step 1 already returned tokens. */
  completeWithTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  // Boot: adopt a portfolio single-sign-on session — first an explicit URL handoff,
  // else the shared login cookie on this host — then, if we hold a token, confirm it
  // with /me (refreshing silently if the access token has expired); otherwise we're
  // signed out and the login page is shown.
  useEffect(() => {
    let live = true;
    consumeSsoHandoff();
    adoptPortfolioSession();
    if (!tokens.access() && !tokens.refresh()) {
      setStatus('anon');
      return;
    }
    api.me()
      .then((u) => { if (live) { setUser(u); setStatus('authed'); } })
      .catch(() => { if (live) { tokens.clear(); setUser(null); setStatus('anon'); } });
    return () => { live = false; };
  }, []);

  const loginStart = useCallback((username: string, password: string) => api.loginStart(username, password), []);

  const loginVerify = useCallback(async (ticket: string, otp: string) => {
    const u = await api.loginVerify(ticket, otp);
    setUser(u); setStatus('authed');
  }, []);

  const completeWithTokens = useCallback(async (access: string, refresh: string) => {
    const u = await api.completeWithTokens(access, refresh);
    setUser(u); setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setUser(null); setStatus('anon'); }
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, loginStart, loginVerify, completeWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
