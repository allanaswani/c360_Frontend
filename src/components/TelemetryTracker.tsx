'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { startTelemetry, track } from '@/lib/telemetry';

/** Mounted once in the authed shell. Records navigations and meaningful clicks (buttons,
 *  links, tabs, menu items, or anything tagged data-track) and hands them to the batched
 *  telemetry flusher. Renders nothing. Only active for a signed-in session. */
export function TelemetryTracker() {
  const { status } = useAuth();
  const pathname = usePathname();

  // Run the flush loop for the life of the session.
  useEffect(() => {
    if (status !== 'authed') return;
    return startTelemetry();
  }, [status]);

  // Navigations.
  useEffect(() => {
    if (status !== 'authed') return;
    track({ kind: 'nav', path: pathname, route: pathname });
  }, [pathname, status]);

  // Click delegation — capture phase so it sees the click regardless of stopPropagation.
  useEffect(() => {
    if (status !== 'authed') return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(
        '[data-track],button,a,[role="tab"],[role="menuitem"]') as HTMLElement | null;
      if (!el) return;
      const label = el.getAttribute('data-track')
        || el.getAttribute('aria-label')
        || (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
        || el.tagName.toLowerCase();
      track({ kind: 'click', path: pathname, target: label, meta: { tag: el.tagName.toLowerCase() } });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname, status]);

  return null;
}
