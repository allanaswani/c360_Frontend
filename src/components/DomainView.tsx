'use client';

import type { DomainChart, DomainMetric, DomainPayload } from '@/lib/types';
import { fmtValue } from '@/lib/format';
import { Card } from './Card';
import { StatStrip, type Stat } from './StatStrip';
import { DataTable } from './DataTable';
import { EmptyState, Skeleton } from './States';
import { LineSeriesChart } from './charts/LineSeriesChart';
import { BarsChart } from './charts/BarsChart';
import { GroupedBarChart } from './charts/GroupedBarChart';
import { PartToWhole } from './charts/PartToWhole';
import ui from './ui.module.css';

/** One renderer for every non-core domain. Reads the generic payload the backend
 *  emits, so adding a domain is a backend change only. Whole domain is preview. */
export function DomainView({ payload }: { payload: DomainPayload | null }) {
  if (!payload) return <DomainSkeleton />;

  if (payload.empty_reason) {
    return (
      <div className={`${ui.card} fadeUp`} style={{ padding: 8 }}>
        <EmptyState title={`No ${payload.domain} data`}>{payload.empty_reason}</EmptyState>
      </div>
    );
  }

  const stats: Stat[] = payload.metrics.map((m: DomainMetric) => ({
    label: m.label,
    value: fmtValue(m.value, m.unit),
    countTo: m.value,
    fmt: (n: number) => fmtValue(m.unit === 'count' ? Math.round(n) : n, m.unit),
    status: m.status,
    lead: m.lead,
    tone: m.tone,
    meta: m.meta,
  }));

  // Charts: full-width kinds span the row; the rest share two columns. If an odd
  // number of half-width charts would leave a trailing empty cell, the last one
  // spans full so the grid never shows "wasted" blank space.
  const halfIdx = payload.charts.map((c, i) => (isFull(c) ? -1 : i)).filter((i) => i >= 0);
  const lastLoneHalf = halfIdx.length % 2 === 1 ? halfIdx[halfIdx.length - 1] : -1;

  return (
    <div className="fadeUp">
      <StatStrip stats={stats} />
      <div className={ui.chartGrid}>
        {payload.charts.map((c, i) => (
          <Card key={c.id} className={isFull(c) || i === lastLoneHalf ? ui.spanFull : ''} title={c.title} question={c.question} status={c.status}>
            <ChartRenderer chart={c} />
          </Card>
        ))}
      </div>
      <div className={ui.chartGrid}>
        {payload.tables.map((t) => (
          <Card key={t.id} title={t.title} status={t.status} note={t.note}>
            <DataTable block={t} />
          </Card>
        ))}
      </div>
    </div>
  );
}

function isFull(c: DomainChart): boolean {
  return c.kind === 'lines' || c.kind === 'grouped';
}

function ChartRenderer({ chart }: { chart: DomainChart }) {
  switch (chart.kind) {
    case 'lines':
      return <LineSeriesChart data={chart.data} series={chart.series} fmt={chart.fmt} />;
    case 'bars':
      return <BarsChart data={chart.data} fmt={chart.fmt} />;
    case 'grouped':
      return <GroupedBarChart data={chart.data} seriesNames={chart.seriesNames} fmt={chart.fmt} />;
    case 'donut':
      return <PartToWhole data={chart.data} fmt={chart.fmt} />;
  }
}

function DomainSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height={80} radius={12} />
      <Skeleton height={220} radius={12} />
      <div className={ui.chartGrid}>
        <Skeleton height={200} radius={12} />
        <Skeleton height={200} radius={12} />
      </div>
    </div>
  );
}
