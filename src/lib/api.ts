// Typed API client. Auth is JWT: a short-lived access token is sent as a Bearer
// header and silently refreshed on a 401 using the refresh token; the caller's
// role + book scope are resolved server-side from that token, so the browser never
// asserts its own scope. Tokens live in localStorage (the SPA has no server to hold
// an httpOnly cookie); a leaked token's window is small (rotation + blacklist).

import type {
  CustomerDetail,
  CustomerOverview,
  CustomerSummary,
  DomainPayload,
  HFCBDomain,
  LinkedParties,
  Meta,
  PortfolioOverview,
  Recommendations,
  Worklist,
} from './types';

// API base. An explicit env var wins; otherwise target the SAME host the app was
// opened from (so opening the app on a LAN IP like http://192.168.x.y:3000 talks to
// the backend at http://192.168.x.y:8000, not the browser's own localhost).
function apiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
}
const BASE = apiBase();

const ACCESS_KEY = 'c360_access';
const REFRESH_KEY = 'c360_refresh';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// --- token store ------------------------------------------------------------
export const tokens = {
  access: (): string | null => (typeof localStorage === 'undefined' ? null : localStorage.getItem(ACCESS_KEY)),
  refresh: (): string | null => (typeof localStorage === 'undefined' ? null : localStorage.getItem(REFRESH_KEY)),
  set(access: string, refresh?: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// --- single sign-on handoff -------------------------------------------------
// Customer 360 trusts JWTs minted by the HF portfolio (see backend c360/auth/claims.py).
// When a user crosses over from the portfolio, it hands the token off in the URL
// *fragment* — `#sso_access=<jwt>&sso_refresh=<jwt>`. The fragment is deliberate: the
// browser never sends it to a server or writes it to an access log. We adopt the token
// once on boot and immediately scrub it from the URL so it can't linger in history or
// be copy-pasted. Falls through to the normal login when no handoff is present.
export function consumeSsoHandoff(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return false;
  const params = new URLSearchParams(raw);
  const access = params.get('sso_access');
  if (!access) return false;
  const refresh = params.get('sso_refresh');
  tokens.set(access, refresh ?? undefined);
  // Strip the tokens (and any other handoff params) from the visible URL at once.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}

// Because Customer 360 is served on the SAME host as the portfolio (a path on
// ceo.hfcb.co.ke publicly, and 128.2.1.25:<port> on the LAN — cookies ignore the
// port), the portfolio's login cookies are already readable here. If the user is
// signed in to the portfolio, adopt that session so they land here authenticated
// with no second login. This ONLY reads the cookies — it never writes or clears the
// portfolio's, and touches no portfolio code. Any problem (missing/expired/legacy
// token) simply falls through to Customer 360's own login.
const PORTFOLIO_ACCESS_COOKIE = 'token';
const PORTFOLIO_REFRESH_COOKIE = 'refresh';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const c = part.trim();
    if (c.startsWith(prefix)) return decodeURIComponent(c.slice(prefix.length));
  }
  return null;
}

export function adoptPortfolioSession(): boolean {
  // Never clobber a live Customer 360 session.
  if (tokens.access() || tokens.refresh()) return false;
  const access = readCookie(PORTFOLIO_ACCESS_COOKIE);
  if (!access) return false;
  tokens.set(access, readCookie(PORTFOLIO_REFRESH_COOKIE) ?? undefined);
  return true;
}

// Re-read the portfolio's login cookie and adopt it when it's newer than what we hold.
// adoptPortfolioSession() takes a ONE-TIME snapshot at boot and never overwrites it, but
// the portfolio's own frontend silently refreshes that cookie (and rotates the refresh
// token) as the user keeps working. So once 360's snapshot expires the SPA would be
// stranded — showing "token expired" — even though the user is still signed in next door.
// Calling this on a 401 lets 360 pick up the portfolio's current, still-fresh token and
// carry on. Returns true only when it actually swapped in a different (newer) access
// token, so the caller knows to replay the request. Unlike a refresh, this needs no valid
// refresh token, so it also rescues a missing or portfolio-blacklisted one.
export function reAdoptPortfolioSession(): boolean {
  const access = readCookie(PORTFOLIO_ACCESS_COOKIE);
  if (!access || access === tokens.access()) return false;
  tokens.set(access, readCookie(PORTFOLIO_REFRESH_COOKIE) ?? tokens.refresh() ?? undefined);
  return true;
}

// A single in-flight refresh shared across concurrent 401s.
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = tokens.refresh();
  if (!refresh) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        tokens.set(data.access, data.refresh);   // rotation returns a new refresh
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

interface ReqInit {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, init: ReqInit = {}, retry = true): Promise<T> {
  const access = tokens.access();
  const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers ?? {}) };
  if (access) headers.Authorization = `Bearer ${access}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, `Can't reach the API at ${BASE}. Is the Django server running?`);
  }

  // Expired access token → recover once, then replay the request. Two recovery paths,
  // tried in order: (1) our own refresh token — works even with the portfolio tab closed;
  // (2) re-adopt the portfolio's live login cookie — rescues a missing/rotated-out refresh
  // token by riding the session the portfolio keeps fresh. Only when both fail do we clear
  // and fall back to Customer 360's own login.
  if (res.status === 401 && retry) {
    if (tokens.refresh() && (await tryRefresh())) return request<T>(path, init, false);
    if (reAdoptPortfolioSession()) return request<T>(path, init, false);
    tokens.clear();
  }
  return unwrap<T>(res);
}

async function unwrap<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.error?.detail ?? body?.detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

// --- auth types -------------------------------------------------------------
export interface AuthUser {
  username: string;
  name: string;
  email: string;
  groups: string[];
  role_tier: 'admin' | 'manager' | 'officer' | 'customer';
  is_admin: boolean;
  profile: { sales_code: string | null; branch: string | null; segment: string | null };
  scope: { role: 'rm' | 'management'; whole_book: boolean; can_view_portfolio: boolean } | null;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  groups: string[];
  sales_code: string | null;
  branch: string | null;
  segment: string | null;
  role_tier: string;
  generated_password?: string;
  date_joined: string;
  last_login: string | null;
}

export interface Role {
  name: string;
  description: string;
  tier: string;
  member_count: number;
}

export interface HealthCheck {
  key: string;
  label: string;
  group: string;
  table: string;
  status: 'ok' | 'empty' | 'error';
  value: number | boolean | null;
  latency_ms?: number;
  detail: string;
}
export interface HealthPoint {
  at: string;
  days_behind: number | null;
  checks: Record<string, { value: number | null; status: string; latency_ms?: number }>;
}
export interface BookSummary {
  available: boolean;
  detail?: string;
  sales_code?: string | null;
  whole_book?: boolean;
  customers?: number;
  aum?: number;
  deposits?: number;
  loans?: number;
  contribution?: number;
  npl_customers?: number;
  npl_aum?: number;
  segments?: { segment: string; customers: number; aum: number }[];
  top_customers?: { cust_id: string; name: string | null; segment: string | null; aum: number; contribution: number; npl: boolean }[];
}
export interface DataHealth {
  data_mode: 'mock' | 'live';
  freshness: { as_of: string | null; days_behind: number | null; status: 'ok' | 'stale' | 'error'; detail?: string } | null;
  checks: HealthCheck[];
  history?: HealthPoint[];
  note?: string;
  generated_at: string;
}

export type RecOutcome = 'pitched' | 'accepted' | 'declined' | 'not_relevant';
export interface RecFeedback {
  id: number;
  cust_id: string;
  product: string;
  product_name: string;
  domain: string;
  score: number | null;
  rule_id: string;
  engine_version: string;
  outcome: RecOutcome;
  note: string;
  recorded_by_name: string | null;
  created_at: string;
  updated_at: string;
}
export interface RecFeedbackInput {
  cust_id: string;
  product: string;
  product_name?: string;
  domain?: string;
  score?: number | null;
  rule_id?: string;
  engine_version?: string;
  outcome: RecOutcome;
  note?: string;
}
export interface RecFeedbackStats {
  total: number;
  by_outcome: Record<string, number>;
  labelled: number;
  accepted: number;
  acceptance_rate: number | null;
  acceptance_by_score_band: { band: string; n: number; acceptance_rate: number | null }[];
  ready_to_retrain: boolean;
}

export interface NewUser {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  groups?: string[];
  sales_code?: string;
  branch?: string;
  segment?: string;
  password?: string;
  is_active?: boolean;
}

// Paginated or plain list — the users endpoint uses StandardPagination upstream but
// this backend returns a plain array; handle both defensively.
type Listing<T> = T[] | { results: T[]; count?: number };
function asList<T>(v: Listing<T>): T[] {
  return Array.isArray(v) ? v : v.results;
}

export interface LoginStart {
  mfa_required: boolean;
  ticket?: string;
  sent_to?: string;
  access?: string;
  refresh?: string;
  dev_otp?: string;   // only in DEBUG, for testing without a mail server
}

export const api = {
  meta: () => request<Meta>('/meta/'),

  // --- auth: two-step (password → emailed OTP) ---
  // Step 1: verify the password. Returns either tokens (2FA off) or a ticket + the
  // masked email a code was sent to.
  loginStart: (username: string, password: string) =>
    request<LoginStart>('/auth/login/', { method: 'POST', body: { username, password } }, false),
  // Step 2: exchange the ticket + code for tokens, then load the profile.
  async loginVerify(ticket: string, otp: string): Promise<AuthUser> {
    const pair = await request<{ access: string; refresh: string }>(
      '/auth/login/verify/', { method: 'POST', body: { ticket, otp } }, false);
    tokens.set(pair.access, pair.refresh);
    return request<AuthUser>('/auth/me/');
  },
  // Used when 2FA is disabled server-side (loginStart already returned tokens).
  async completeWithTokens(access: string, refresh: string): Promise<AuthUser> {
    tokens.set(access, refresh);
    return request<AuthUser>('/auth/me/');
  },
  passwordResetRequest: (account: string) =>
    request<{ detail: string; dev_otp?: string }>('/auth/password-reset/', { method: 'POST', body: { username: account } }, false),
  passwordResetConfirm: (account: string, code: string, new_password: string) =>
    request<{ detail: string }>('/auth/password-reset/confirm/', { method: 'POST', body: { username: account, code, new_password } }, false),
  me: () => request<AuthUser>('/auth/me/'),
  async logout(): Promise<void> {
    const refresh = tokens.refresh();
    try {
      if (refresh) await request<void>('/auth/logout/', { method: 'POST', body: { refresh } }, false);
    } finally {
      tokens.clear();
    }
  },

  // --- admin: user management ---
  users: (search = '') =>
    request<Listing<AdminUser>>(`/auth/users/${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(asList),
  createUser: (u: NewUser) => request<AdminUser>('/auth/users/', { method: 'POST', body: u }),
  updateUser: (id: number, patch: Partial<NewUser> & { is_active?: boolean }) =>
    request<AdminUser>(`/auth/users/${id}/`, { method: 'PATCH', body: patch }),
  deactivateUser: (id: number) => request<void>(`/auth/users/${id}/`, { method: 'DELETE' }),
  setUserPassword: (id: number, password?: string) =>
    request<{ detail: string; password: string }>(`/auth/users/${id}/set-password/`, { method: 'POST', body: { password } }),
  roles: () => request<Listing<Role>>('/auth/roles/').then(asList),
  userMeta: () => request<{ branches: string[]; segments: string[] }>('/auth/user-meta/'),
  dataHealth: () => request<DataHealth>('/admin/health/'),
  book: () => request<BookSummary>('/book/'),

  // --- data ---
  customers: (q: string) =>
    request<{ count: number; results: CustomerSummary[] }>(`/customers/?q=${encodeURIComponent(q)}`),
  customer: (id: string) => request<CustomerDetail>(`/customers/${id}/`),
  linked: (id: string) => request<LinkedParties>(`/customers/${id}/linked/`),
  overview: (id: string, period: string) =>
    request<CustomerOverview>(`/customers/${id}/overview/?period=${encodeURIComponent(period)}`),
  hfcb: (id: string, period: string) =>
    request<HFCBDomain>(`/customers/${id}/domains/hfcb/?period=${encodeURIComponent(period)}`),
  domain: (id: string, domain: string, period: string) =>
    request<DomainPayload>(`/customers/${id}/domains/${domain}/?period=${encodeURIComponent(period)}`),
  recommendations: (id: string) => request<Recommendations>(`/customers/${id}/recommendations/`),
  // recommendation outcome-logging (the feedback loop)
  recFeedbackList: (custId: string) =>
    request<{ results: RecFeedback[] }>(`/recommendations/feedback/?cust_id=${encodeURIComponent(custId)}`),
  recFeedbackRecord: (body: RecFeedbackInput) =>
    request<RecFeedback>('/recommendations/feedback/', { method: 'POST', body }),
  recFeedbackStats: () => request<RecFeedbackStats>('/recommendations/feedback/stats/'),
  portfolioOverview: (period: string) =>
    request<PortfolioOverview>(`/portfolio/overview/?period=${encodeURIComponent(period)}`),
  worklist: () => request<Worklist>('/portfolio/worklist/'),
};
