'use client';

import { useEffect, useState } from 'react';
import s from './ui.module.css';

type Mode = 'light' | 'dark';

/** Theme toggle. Persists to localStorage and stamps data-theme on <html>, which
 *  every token in globals.css keys off — so light and dark are both deliberately
 *  designed, not an automatic invert. */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const stored = (localStorage.getItem('c360-theme') as Mode | null);
    const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setMode(initial);
  }, []);

  useEffect(() => {
    if (!mode) return;
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('c360-theme', mode);
  }, [mode]);

  return (
    <button
      className={s.iconBtn}
      aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
    >
      {mode === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
