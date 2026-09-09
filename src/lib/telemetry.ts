// Client interaction telemetry — buffers clicks/navigations and flushes them in
// batches to the backend collector, so a click never blocks on the network. Flush is
// time-based + on tab-hide/page-hide (via fetch keepalive), and only ever runs for a
// signed-in session. Silent on failure — telemetry must never affect the user.
import { sendTelemetry } from './api';

export type TrackEvent = {
  kind: 'click' | 'nav' | 'page_view';
  route?: string;
  path?: string;
  target?: string;
  meta?: Record<string, unknown>;
};

let buffer: TrackEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

const FLUSH_MS = 10_000;
const MAX_BUFFER = 25;   // flush early once a batch fills, so nothing sits too long

export function track(ev: TrackEvent): void {
  buffer.push(ev);
  if (buffer.length >= MAX_BUFFER) flush();
}

export function flush(keepalive = false): void {
  if (!buffer.length) return;
  const events = buffer;
  buffer = [];
  sendTelemetry(events, keepalive);
}

/** Start the periodic + lifecycle flush. Returns a stop function. Idempotent. */
export function startTelemetry(): () => void {
  if (timer) return () => {};
  timer = setInterval(() => flush(), FLUSH_MS);
  const onVisibility = () => { if (document.visibilityState === 'hidden') flush(true); };
  const onPageHide = () => flush(true);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    if (timer) { clearInterval(timer); timer = null; }
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    flush(true);
  };
}
