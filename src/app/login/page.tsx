'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { asset } from '@/lib/asset';
import s from './login.module.css';

type Step = 'signin' | 'otp' | 'forgot' | 'forgotConfirm';

function msgFrom(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) {
    return err.status === 0 ? 'Can’t reach the server. Check your connection and try again.' : err.message;
  }
  return fallback;
}

export default function LoginPage() {
  const { loginStart, loginVerify, completeWithTokens } = useAuth();
  const [step, setStep] = useState<Step>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [ticket, setTicket] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function go(next: Step) { setStep(next); setError(null); }

  async function submitSignin(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const r = await loginStart(username.trim(), password);
      if (r.mfa_required && r.ticket) {
        setTicket(r.ticket); setSentTo(r.sent_to ?? 'your email'); setDevOtp(r.dev_otp ?? null);
        setOtp(''); go('otp'); setBusy(false);
      } else if (r.access && r.refresh) {
        await completeWithTokens(r.access, r.refresh);   // 2FA disabled → straight in
      }
    } catch (err) {
      setError(msgFrom(err, 'Wrong username or password.')); setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      await loginVerify(ticket, otp.trim());   // success → shell routes into the app
    } catch (err) {
      setError(msgFrom(err, 'That code is wrong or has expired.')); setBusy(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const { api } = await import('@/lib/api');
      const r = await api.passwordResetRequest(username.trim());
      setDevOtp(r.dev_otp ?? null); setResetCode(''); setNewPw('');
      setNotice('If that account exists, a reset code has been sent to its email.');
      go('forgotConfirm');
    } finally { setBusy(false); }
  }

  async function submitForgotConfirm(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const { api } = await import('@/lib/api');
      await api.passwordResetConfirm(username.trim(), resetCode.trim(), newPw);
      setNotice('Password updated. You can now sign in.');
      setPassword(''); go('signin');
    } catch (err) {
      setError(msgFrom(err, 'That reset code is wrong or has expired.'));
    } finally { setBusy(false); }
  }

  return (
    <div className={s.screen}>
      <aside className={s.brandPanel}>
        <div className={s.brandTop}>
          <span className={s.brandLogo}><img src={asset('/hfcb-mark.png')} alt="HFCB" width={22} height={21} /></span>
          <span className={s.brandWordmark}>Customer <b>360</b></span>
          <span className={s.brandTag}>HFCB</span>
        </div>
        <div className={s.brandMid}>
          <h1 className={s.brandHeadline}>Everything the bank knows about a customer.</h1>
          <p className={s.brandLede}>
            Holdings, value and the next best product — across every product line, in one
            instrument, for any customer you serve.
          </p>
        </div>
        <div className={s.legend}>
          <span className={s.legendItem}><span className={s.legendDot} style={{ background: 'var(--prov-live)' }} /> Live</span>
          <span className={s.legendItem}><span className={s.legendDot} style={{ background: 'var(--prov-derived)' }} /> Derived</span>
          <span className={s.legendItem}><span className={s.legendDot} style={{ background: 'var(--prov-preview)' }} /> Preview</span>
          <span className={s.legendItem}><span className={s.legendDot} style={{ background: 'var(--prov-source)' }} /> To source</span>
        </div>
      </aside>

      <main className={s.formSide}>
        {step === 'signin' && (
          <form className={`${s.form} fadeUp`} onSubmit={submitSignin}>
            <div className={`microlabel ${s.kicker}`}>Relationship intelligence</div>
            <h2 className={s.title}>Sign in</h2>
            <p className={s.subtitle}>Use your HFCB username and password to continue.</p>
            {notice && <Banner kind="success" text={notice} />}
            {error && <Banner kind="error" text={error} />}
            <Field id="username" label="Username" value={username} onChange={setUsername} placeholder="e.g. jkamau" autoComplete="username" autoFocus />
            <div className={s.field}>
              <div className={s.rowBetween}>
                <label className={s.label} htmlFor="password">Password</label>
                <button type="button" className={s.linkBtn} onClick={() => { setNotice(null); go('forgot'); }}>Forgot password?</button>
              </div>
              <input id="password" className={s.input} type="password" value={password} autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Submit busy={busy} label="Continue" busyLabel="Checking…" />
            <p className={s.footnote}>Accounts are provisioned by your administrator. Contact them if you can’t sign in.</p>
          </form>
        )}

        {step === 'otp' && (
          <form className={`${s.form} fadeUp`} onSubmit={submitOtp}>
            <button type="button" className={s.backBtn} onClick={() => go('signin')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg> Back
            </button>
            <h2 className={s.title}>Verify it’s you</h2>
            <p className={s.subtitle}>We sent a 6-digit code to <span className={s.sentTo}>{sentTo}</span>. Enter it to finish signing in.</p>
            {error && <Banner kind="error" text={error} />}
            <div className={s.field}>
              <label className={s.label} htmlFor="otp">Sign-in code</label>
              <input id="otp" className={`${s.input} ${s.otpInput}`} value={otp} inputMode="numeric" maxLength={6} autoFocus
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              {devOtp && <div className={s.devHint}>Dev mode — your code is <b>{devOtp}</b> (also printed in the server log).</div>}
            </div>
            <Submit busy={busy} label="Sign in" busyLabel="Verifying…" disabled={otp.length < 6} />
          </form>
        )}

        {step === 'forgot' && (
          <form className={`${s.form} fadeUp`} onSubmit={submitForgot}>
            <button type="button" className={s.backBtn} onClick={() => go('signin')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg> Back to sign in
            </button>
            <h2 className={s.title}>Reset your password</h2>
            <p className={s.subtitle}>Enter your username or email. If the account exists, we’ll send a reset code.</p>
            <Field id="account" label="Username or email" value={username} onChange={setUsername} placeholder="e.g. jkamau" autoComplete="username" autoFocus />
            <Submit busy={busy} label="Send reset code" busyLabel="Sending…" />
          </form>
        )}

        {step === 'forgotConfirm' && (
          <form className={`${s.form} fadeUp`} onSubmit={submitForgotConfirm}>
            <button type="button" className={s.backBtn} onClick={() => go('forgot')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg> Back
            </button>
            <h2 className={s.title}>Set a new password</h2>
            <p className={s.subtitle}>Enter the code sent to your email and choose a new password.</p>
            {notice && <Banner kind="success" text={notice} />}
            {error && <Banner kind="error" text={error} />}
            <div className={s.field}>
              <label className={s.label} htmlFor="rcode">Reset code</label>
              <input id="rcode" className={`${s.input} ${s.otpInput}`} value={resetCode} inputMode="numeric" maxLength={6} autoFocus
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              {devOtp && <div className={s.devHint}>Dev mode — your code is <b>{devOtp}</b>.</div>}
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="npw">New password</label>
              <input id="npw" className={s.input} type="password" value={newPw} autoComplete="new-password"
                onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <Submit busy={busy} label="Update password" busyLabel="Updating…" disabled={resetCode.length < 6 || newPw.length < 8} />
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder, autoComplete, autoFocus }:
  { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; autoFocus?: boolean }) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>{label}</label>
      <input id={id} className={s.input} value={value} autoComplete={autoComplete} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Submit({ busy, label, busyLabel, disabled }: { busy: boolean; label: string; busyLabel: string; disabled?: boolean }) {
  return (
    <button className={s.submit} type="submit" disabled={busy || disabled}>
      {busy && <span className={s.spinner} />}
      {busy ? busyLabel : label}
    </button>
  );
}

function Banner({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  return (
    <div className={kind === 'error' ? s.error : s.success} role={kind === 'error' ? 'alert' : 'status'}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
        {kind === 'error'
          ? (<><circle cx="12" cy="12" r="10" /><path d="M12 8v5" /><path d="M12 16h.01" /></>)
          : (<><path d="M20 6 9 17l-5-5" /></>)}
      </svg>
      <span>{text}</span>
    </div>
  );
}
