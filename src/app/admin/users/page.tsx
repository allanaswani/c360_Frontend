'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type AdminUser, type NewUser, type Role } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorState, Skeleton } from '@/components/States';
import ui from '@/components/ui.module.css';
import s from './admin.module.css';

const TIER_CLASS: Record<string, string> = {
  admin: s.tier_admin, manager: s.tier_manager, officer: s.tier_officer, customer: s.tier_customer,
};

export default function UsersAdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState<{ branches: string[]; segments: string[] }>({ branches: [], segments: [] });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);

  const load = useCallback((q = '') => {
    api.users(q).then(setUsers).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!user?.is_admin) return;
    load();
    api.roles().then(setRoles).catch(() => {});
    api.userMeta().then(setMeta).catch(() => {});
  }, [user, load]);

  // Debounced search.
  useEffect(() => {
    if (!user?.is_admin) return;
    const t = setTimeout(() => load(search), 200);
    return () => clearTimeout(t);
  }, [search, user, load]);

  if (!user) return null;
  if (!user.is_admin) {
    return (
      <main className={ui.content}>
        <div className={ui.card}><div className={s.denied}>
          <h2 className={s.title} style={{ marginBottom: 8 }}>Administrators only</h2>
          <p>Managing users requires administrator access. If you need it, contact the Customer&nbsp;360 administrator.</p>
        </div></div>
      </main>
    );
  }

  async function setPassword(u: AdminUser) {
    try {
      const res = await api.setUserPassword(u.id);   // auto-generate
      window.prompt(`New password for ${u.username} — copy and share securely:`, res.password);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Could not reset password.');
    }
  }

  async function deactivate(u: AdminUser) {
    if (!confirm(`Deactivate ${u.username}? They will no longer be able to sign in.`)) return;
    try {
      await api.deactivateUser(u.id);
      load(search);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Could not deactivate user.');
    }
  }

  return (
    <main className={ui.content}>
      <div className={`${s.head} fadeUp`}>
        <div>
          <div className="microlabel" style={{ color: 'var(--teal)' }}>Administration</div>
          <h1 className={s.title}>Users &amp; access</h1>
          <p className={s.sub}>Provision Customer 360 accounts, assign roles, and reset passwords — no Django admin.</p>
        </div>
        <button className={s.primaryBtn} onClick={() => setPanelOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          New user
        </button>
      </div>

      <div className={s.toolbar}>
        <input className={s.search} placeholder="Search by name, username or email…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {users && <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{users.length} users</span>}
      </div>

      {error ? (
        <div className={ui.card}><ErrorState title="Can't load users" detail={error} /></div>
      ) : !users ? (
        <Skeleton height={220} radius={12} />
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>User</th><th>Roles</th><th>Tier</th><th>Branch</th><th>Sales code</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={s.uName}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</div>
                    <div className={s.uSub}><span className={s.mono}>{u.username}</span>{u.email ? ` · ${u.email}` : ''}</div>
                  </td>
                  <td>{u.groups.length ? u.groups.map((g) => <span key={g} className={s.roleChip}>{g}</span>) : <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                  <td><span className={`${s.tierBadge} ${TIER_CLASS[u.role_tier] ?? ''}`}>{u.role_tier}</span></td>
                  <td>{u.branch || <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                  <td className={s.mono}>{u.sales_code || <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                  <td>
                    <span className={s.statusDot}>
                      <span className={s.dot} style={{ background: u.is_active ? 'var(--pos)' : 'var(--ink-3)' }} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className={s.rowActions}>
                      <button className={s.ghostBtn} onClick={() => setPassword(u)}>Reset password</button>
                      {u.is_active && u.username !== user.username && (
                        <button className={`${s.ghostBtn} ${s.ghostDanger}`} onClick={() => deactivate(u)}>Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {panelOpen && (
        <CreateUserPanel roles={roles} meta={meta}
          onClose={() => setPanelOpen(false)}
          onCreated={() => { setPanelOpen(false); load(search); }} />
      )}
    </main>
  );
}

function CreateUserPanel({ roles, meta, onClose, onCreated }:
  { roles: Role[]; meta: { branches: string[]; segments: string[] }; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<NewUser>({ username: '', email: '', first_name: '', last_name: '', groups: [], branch: '', segment: '', sales_code: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Promote the two Customer 360 roles as choice cards; tuck legacy roles away.
  const C360_ROLES = ['c360_management', 'c360_rm'];
  const primaryRoles = C360_ROLES.map((n) => roles.find((r) => r.name === n)).filter(Boolean) as Role[];
  const legacyRoles = roles.filter((r) => !C360_ROLES.includes(r.name));

  function set<K extends keyof NewUser>(k: K, v: NewUser[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function toggleRole(name: string) {
    setForm((f) => {
      const has = f.groups?.includes(name);
      return { ...f, groups: has ? f.groups!.filter((g) => g !== name) : [...(f.groups ?? []), name] };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    // Send only non-empty optional fields.
    const payload: NewUser = { username: form.username.trim() };
    for (const k of ['email', 'first_name', 'last_name', 'branch', 'segment', 'sales_code', 'password'] as const) {
      const v = (form[k] as string)?.trim();
      if (v) (payload as unknown as Record<string, unknown>)[k] = v;
    }
    if (form.groups?.length) payload.groups = form.groups;
    try {
      const created = await api.createUser(payload);
      if (created.generated_password) setGenerated(created.generated_password);
      else onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not create user.');
      setBusy(false);
    }
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <aside className={s.panel} role="dialog" aria-label="New user">
        <div className={s.panelHead}>
          <span className={s.panelIcon}>
            {generated
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>}
          </span>
          <div style={{ flex: 1 }}>
            <div className={s.panelTitle}>{generated ? 'User created' : 'New user'}</div>
            <div className={s.panelTitleSub}>{generated ? 'Share the temporary password securely' : 'Provision access to Customer 360'}</div>
          </div>
          <button className={s.closeBtn} onClick={generated ? onCreated : onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {generated ? (
          <div className={s.panelBody}>
            <div className={s.revealCard}>
              <div className={s.revealTitle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Temporary password
              </div>
              <div className={s.revealPw}>
                <span>{generated}</span>
                <button className={s.copyBtn} onClick={() => navigator.clipboard?.writeText(generated)}>Copy</button>
              </div>
              <p className={s.revealNote}>
                Shown once. Share it securely with <b>{form.username}</b>; they should change it after first sign-in.
                We never email passwords.
              </p>
            </div>
            <button className={s.primaryBtn} onClick={onCreated}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'contents' }}>
            <div className={s.panelBody}>
              {err && <div className={s.formError}>{err}</div>}

              {/* Identity */}
              <div className={s.section}>
                <div className={s.sectionLabel}>Identity</div>
                <div className={s.field}>
                  <label className={s.label}>Username <span className={s.reqStar}>*</span></label>
                  <input className={s.input} value={form.username} required
                    onChange={(e) => set('username', e.target.value)} placeholder="e.g. jkamau" autoFocus />
                </div>
                <div className={s.grid2}>
                  <div className={s.field}>
                    <label className={s.label}>First name</label>
                    <input className={s.input} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Last name</label>
                    <input className={s.input} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
                  </div>
                </div>
                <div className={s.field} style={{ marginBottom: 0 }}>
                  <label className={s.label}>Email</label>
                  <input className={s.input} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="For 2FA codes & password reset" />
                </div>
              </div>

              {/* Role & access */}
              <div className={s.section}>
                <div className={s.sectionLabel}>Role &amp; access</div>
                <div className={s.roleCards}>
                  {primaryRoles.map((r) => {
                    const on = form.groups?.includes(r.name);
                    return (
                      <button type="button" key={r.name} onClick={() => toggleRole(r.name)}
                        className={`${s.roleCard} ${on ? s.roleCardOn : ''}`}>
                        <span className={s.roleCheck}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                        </span>
                        <span className={s.roleCardBody}>
                          <span className={s.roleCardTop}>
                            <span className={s.roleCardName}>{r.name === 'c360_management' ? 'Management / Analytics' : 'Relationship Manager'}</span>
                            <span className={s.roleCardTier}>{r.tier}</span>
                          </span>
                          <span className={s.roleCardDesc}>
                            {r.name === 'c360_management'
                              ? 'Whole-book portfolio dashboard + every customer 360.'
                              : 'Looks up any customer’s 360 and next best product (no portfolio dashboard).'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {legacyRoles.length > 0 && (
                  <>
                    <button type="button" className={s.moreToggle} onClick={() => setShowMore((v) => !v)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                        style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6" /></svg>
                      {showMore ? 'Hide' : 'Assign additional HFCB roles'}
                    </button>
                    {showMore && (
                      <div className={s.legacyChips}>
                        {legacyRoles.map((r) => (
                          <button type="button" key={r.name} title={r.description}
                            className={`${s.roleOpt} ${form.groups?.includes(r.name) ? s.roleOptOn : ''}`}
                            onClick={() => toggleRole(r.name)}>{r.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Book scope */}
              <div className={s.section}>
                <div className={s.sectionLabel}>Book scope <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· optional</span></div>
                <div className={s.grid2}>
                  <div className={s.field}>
                    <label className={s.label}>Branch</label>
                    <select className={s.select} value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                      <option value="">—</option>
                      {meta.branches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Segment</label>
                    <select className={s.select} value={form.segment} onChange={(e) => set('segment', e.target.value)}>
                      <option value="">—</option>
                      {meta.segments.map((sg) => <option key={sg} value={sg}>{sg}</option>)}
                    </select>
                  </div>
                </div>
                <div className={s.field} style={{ marginBottom: 0 }}>
                  <label className={s.label}>Sales code</label>
                  <input className={s.input} value={form.sales_code} onChange={(e) => set('sales_code', e.target.value)} placeholder="RM’s book code, for a ‘my book’ lens" />
                </div>
              </div>

              {/* Password */}
              <div className={s.section}>
                <div className={s.sectionLabel}>Password</div>
                <div className={s.field} style={{ marginBottom: 0 }}>
                  <input className={s.input} type="text" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Leave blank to auto-generate" />
                  <p className={s.hint}>If blank, a strong temporary password is generated and shown once for you to share.</p>
                </div>
              </div>
            </div>
            <div className={s.panelFoot}>
              <button type="button" className={s.cancelBtn} onClick={onClose}>Cancel</button>
              <button type="submit" className={s.primaryBtn} disabled={busy || !form.username.trim()}>
                {busy ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}
