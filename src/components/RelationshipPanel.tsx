'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Relationship, TimelineEvent } from '@/lib/types';
import { count, kesFull, shortDate } from '@/lib/format';
import { Card } from './Card';
import { EmptyState, Skeleton, UnavailableState } from './States';
import { Legend } from './charts/ChartTooltip';
import ui from './ui.module.css';
import r from './relationship.module.css';

// One colour per event kind, from the validated categorical palette, fixed order.
const KIND: Record<TimelineEvent['kind'], { label: string; color: string }> = {
  joined: { label: 'Joined', color: 'var(--cat-1)' },
  account: { label: 'Account', color: 'var(--cat-5)' },
  loan: { label: 'Loan', color: 'var(--cat-2)' },
  mobile_loan: { label: 'Mobile loans', color: 'var(--cat-4)' },
  digital: { label: 'Digital', color: 'var(--cat-3)' },
};
const SHOW = 20;

/** Overview-tab panel: how the relationship has grown, and where the customer stands
 *  among their segment. Loads on its own so the rest of the tab never waits. */
export function RelationshipPanel({ custId }: { custId: string }) {
  // The answer is stored with the customer it belongs to, so switching customer
  // shows loading (the stored answer no longer matches) without resetting state.
  const [res, setRes] = useState<{ key: string; data?: Relationship; failed?: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    api.relationship(custId)
      .then((d) => live && setRes({ key: custId, data: d }))
      .catch(() => live && setRes({ key: custId, failed: true }));
    return () => { live = false; };
  }, [custId]);
  const current = res?.key === custId ? res : null;
  const data = current?.data ?? null;
  const failed = !!current?.failed;

  if (failed) {
    return (
      <div className={ui.card} style={{ padding: 8, marginTop: 12 }}>
        <UnavailableState title="Timeline and peer comparison could not be loaded">Reload the page to try again.</UnavailableState>
      </div>
    );
  }
  if (!data) {
    return <div className={ui.chartGrid}><Skeleton height={260} radius={12} /><Skeleton height={260} radius={12} /></div>;
  }
  return (
    <div className={ui.chartGrid}>
      <PeersCard data={data} />
      <TimelineCard data={data} />
    </div>
  );
}

function PeersCard({ data }: { data: Relationship }) {
  const b = data.peers;
  const p = b.data;
  return (
    <Card title="Against their peers" status={b.status === 'live' ? 'live' : undefined}
          question="How does this customer compare with others in the same segment?"
          note={p ? `Ranked among ${count(p.customers)} ${p.segment} customers with a balance at the latest close.` : undefined}>
      {b.status === 'unavailable' ? (
        <UnavailableState title="The comparison could not be loaded">Reload to try again.</UnavailableState>
      ) : !p ? (
        <EmptyState title="No comparison for this segment">The segment is too small, or the customer has no segment.</EmptyState>
      ) : (
        <div className={r.peers}>
          {p.measures.map((m) => {
            const fmt = (v: number | null) => v == null ? '—' : m.fmt === 'kes' ? kesFull(v) : count(v);
            return (
              <div key={m.key} className={r.peer}>
                <div className={r.peerHead}>
                  <span className={r.peerLabel}>{m.label}</span>
                  <span className={r.peerStanding}>{m.standing}</span>
                </div>
                <div className={r.track} aria-label={`${m.label}: ${m.standing}`}>
                  <span className={r.median} style={{ left: '50%' }} title="Segment median" />
                  {m.percentile != null && (
                    <span className={r.marker} style={{ left: `${Math.min(99, Math.max(1, m.percentile * 100))}%` }} />
                  )}
                </div>
                <div className={r.peerSub}>
                  {fmt(m.value)} <span>· segment median {fmt(m.median)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TimelineCard({ data }: { data: Relationship }) {
  const b = data.timeline;
  const t = b.data;
  const [all, setAll] = useState(false);
  const kinds = t ? (Object.keys(KIND) as TimelineEvent['kind'][]).filter((k) => t.events.some((e) => e.kind === k)) : [];
  const events = t ? (all ? t.events : t.events.slice(0, SHOW)) : [];
  return (
    <Card title="Relationship timeline" status={b.status === 'live' ? 'live' : undefined}
          question="How has the relationship grown, and what has been closed?"
          note="From the core-banking account and loan registers, closed accounts included. Repeated products and mobile loans are grouped.">
      {b.status === 'unavailable' ? (
        <UnavailableState title="The timeline could not be loaded">Reload to try again.</UnavailableState>
      ) : !t ? <EmptyState title="No dated records for this customer" /> : (
        <>
          <div className={r.counts}>
            <span>Customer since <b>{shortDate(t.since)}</b></span>
            <span><b>{count(t.counts.accounts_opened)}</b> accounts opened, <b>{count(t.counts.accounts_open)}</b> open</span>
            <span><b>{count(t.counts.loans_taken)}</b> loans</span>
            {t.counts.mobile_loans > 0 && <span><b>{count(t.counts.mobile_loans)}</b> mobile loans</span>}
          </div>
          <Legend items={kinds.map((k) => ({ label: KIND[k].label, color: KIND[k].color }))} />
          <ol className={r.timeline}>
            {events.map((e, i) => {
              const y = e.date.slice(0, 4);
              const head = i === 0 || events[i - 1].date.slice(0, 4) !== y;
              return (
                <li key={`${e.date}-${e.title}-${i}`} className={r.event}>
                  {head && <div className={r.year}>{y}</div>}
                  <div className={r.row}>
                    <span className={r.dot} style={{ background: KIND[e.kind].color, opacity: e.open ? 1 : 0.55 }} />
                    <span className={r.date}>{shortDate(e.date)}</span>
                    <span className={r.title}>{e.title}</span>
                    {e.detail && <span className={r.detail}>{e.detail}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          {t.events.length > SHOW && (
            <button type="button" className={r.more} onClick={() => setAll((v) => !v)}>
              {all ? 'Show fewer' : `Show all ${t.events.length} events`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
