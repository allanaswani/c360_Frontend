'use client';

import type { CustomerOverview, DomainSnapshot } from '@/lib/types';
import { kes } from '@/lib/format';
import { Card } from './Card';
import { ProvenanceBadge } from './ProvenanceBadge';
import { PartToWhole } from './charts/PartToWhole';
import { StackedAreaChart } from './charts/StackedAreaChart';
import { Skeleton } from './States';
import ui from './ui.module.css';

// Domain identity colours (fixed) for the value-by-domain donut.
const DOMAIN_COLOR: Record<string, string> = {
  HFCB: 'var(--series-1)',
  Whizz: 'var(--series-2)',
  Properties: 'var(--series-3)',
  Bancassurance: 'var(--coral)',
};

/** Level 2 overview — where value sits across domains, whether it's growing, and
 *  per-domain snapshots that drill into Level 3. */
export function OverviewView({ overview, onOpenDomain }: { overview: CustomerOverview | null; onOpenDomain: (tab: string) => void }) {
  if (!overview) return <OverviewSkeleton />;

  const slices = overview.value_by_domain.slices;
  const data = slices.map((s) => ({ label: s.domain, value: s.value }));
  const colors = slices.map((s) => DOMAIN_COLOR[s.domain] ?? 'var(--series-4)');

  return (
    <div className="fadeUp">
      <div className={ui.snapGrid}>
        {overview.domain_snapshots.map((snap) => (
          <SnapshotCard key={snap.domain} snap={snap} onOpen={() => onOpenDomain(snap.tab)} />
        ))}
      </div>

      <div className={ui.chartGrid}>
        <Card title="Value by domain" question={overview.value_by_domain.question} note={overview.value_by_domain.note}>
          <PartToWhole data={data} fmt="kes" colors={colors} centerLabel="Total" />
        </Card>
        <Card
          title="Relationship trend"
          question={overview.relationship_trend.question}
          status={overview.relationship_trend.status}
          note={overview.relationship_trend.note}
        >
          <StackedAreaChart
            data={overview.relationship_trend.series}
            series={[
              { name: 'Deposits', dataKey: 'deposits', colorRole: 1 },
              { name: 'Loans', dataKey: 'loans', colorRole: 2 },
            ]}
            fmt="kes"
            height={196}
          />
        </Card>
      </div>
    </div>
  );
}

function SnapshotCard({ snap, onOpen }: { snap: DomainSnapshot; onOpen: () => void }) {
  const empty = snap.value === null;
  return (
    <button className={ui.snapCard} onClick={onOpen}>
      <div className={ui.snapTop}>
        <span className={ui.snapDomain}>{snap.domain}</span>
        <ProvenanceBadge status={snap.status} />
      </div>
      {empty ? (
        <div className={ui.snapEmpty}>{snap.label}</div>
      ) : (
        <>
          <div className={`${ui.snapValue} tnum`}>{kes(snap.value)}</div>
          <div className={ui.snapLabel}>{snap.label}</div>
          {snap.sub && <div className={ui.snapSub}>{snap.sub}</div>}
        </>
      )}
      <span className={ui.snapArrow}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
      </span>
    </button>
  );
}

function OverviewSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className={ui.snapGrid}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={104} radius={12} />)}
      </div>
      <div className={ui.chartGrid}>
        <Skeleton height={220} radius={12} /><Skeleton height={220} radius={12} />
      </div>
    </div>
  );
}
