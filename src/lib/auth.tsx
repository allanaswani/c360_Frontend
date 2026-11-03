'use client';

// Client-side auth context. Auth is JWT (tokens in localStorage, see api.ts); this
// context mirrors *who* is signed in (from /auth/me/) so the shell can gate routes
// and the top bar can greet the user. All real enforcement is server-side.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adoptPortfolioSession, api, ApiError, type AuthUser, consumeSsoHandoff, type LoginStart, tokens } from './api';

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value read after mount; reading it during render would not match the server render (tokens live in localStorage)
      setStatus('anon');
      return;
    }
    // Only a real rejection of the session (401/403) signs the user out. A slow or
    // failing server - a 500, a 502/504 from the proxy, a 429, a dropped connection -
    // says nothing about the token, so it is retried, never answered by wiping a
    // valid session. Under a multi-user test on 2026-11-03 every hiccup on /me
    // cleared the tokens and bounced the user to the login page.
    const RETRY_MS = [1_000, 3_000, 8_000];
    const boot = (attempt: number) => {
      api.me()
        .then((u) => { if (live) { setUser(u); setStatus('authed'); } })
        .catch((e: unknown) => {
          if (!live) return;
          const status = e instanceof ApiError ? e.status : 0;
          if (status === 401 || status === 403) {
            tokens.clear(); setUser(null); setStatus('anon');
          } else if (attempt < RETRY_MS.length) {
            setTimeout(() => boot(attempt + 1), RETRY_MS[attempt]);
          } else {
            // Still unreachable: show the login page but KEEP the tokens, so the
            // next load (or the next request) resumes the session.
            setUser(null); setStatus('anon');
          }
        });
    };
    boot(0);
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
