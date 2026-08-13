'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { PortfolioOverview, Worklist as WorklistT } from '@/lib/types';
import { count, kes } from '@/lib/format';
import { Card } from '@/components/Card';
import { PeriodFilter } from '@/components/PeriodFilter';
import { StatStrip, type Stat } from '@/components/StatStrip';
import { ErrorState, Skeleton } from '@/components/States';
import { BarsChart } from '@/components/charts/BarsChart';
import { PartToWhole } from '@/components/charts/PartToWhole';
import { LineSeriesChart } from '@/components/charts/LineSeriesChart';
import { MultiLineChart } from '@/components/charts/MultiLineChart';
import { TopMovers } from '@/components/portfolio/TopMovers';
import { Worklist } from '@/components/portfolio/Worklist';
import { ModelPerformance } from '@/components/portfolio/ModelPerformance';
import ui from '@/components/ui.module.css';

const VALID = new Set(['7D', '30D', 'QTD', 'YTD']);
const RISK_COLORS = ['var(--pos)', 'var(--gold)', 'var(--coral)', 'var(--slate)'];

export default function PortfolioPage() {
  return (
    <Suspense fallback={<main className={ui.content}><Skeleton height={92} radius={12} /></main>}>
      <PortfolioInner />
    </Suspense>
  );
}

function PortfolioInner() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const period = VALID.has(search.get('period') ?? '') ? search.get('period')! : '30D';

  const [ov, setOv] = useState<PortfolioOverview | null>(null);
  const [wl, setWl] = useState<WorklistT | null>(null);
  const [error, setError] = useState<{ code: number; msg: string } | null>(null);

  const setPeriod = useCallback((p: string) => {
    const next = new URLSearchParams(search.toString());
    next.set('period', p);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [search, router, pathname]);

  useEffect(() => {
    let live = true;
    setOv(null);
    setError(null);
    api.portfolioOverview(period)
      .then((d) => live && setOv(d))
      .catch((e: ApiError) => live && setError({ code: e.status, msg: e.message }));
    return () => { live = false; };
  }, [period]);

  useEffect(() => {
    let live = true;
    api.worklist().then((d) => live && setWl(d)).catch(() => live && setWl(null));
    return () => { live = false; };
  }, []);

  if (error) {
    return (
      <main className={ui.content}>
        <div className={ui.card} style={{ marginTop: 24 }}>
          <ErrorState title={error.code === 403 ? 'Portfolio access needed' : "Couldn't load the portfolio"} detail={error.msg} />
        </div>
      </main>
    );
  }

  return (
    <main className={ui.content}>
      <div className={ui.pfHead}>
        <div>
          <div className="microlabel" style={{ color: 'var(--teal)' }}>Level 1 · Portfolio</div>
          <h1 className={ui.pfTitle}>Where should attention go?</h1>
          <div className={ui.pfSub}>
            {ov ? (
              <>
                <span className={ui.scopeChip}>{ov.scope.live_sample ? 'Live sample' : ov.scope.whole_book ? 'Whole book' : 'My book'}</span>
                <span>{count(ov.scope.customers_in_view)} customers · {ov.period.label}</span>
                {ov.cache.cached && <span className={ui.freshDot} title={`Precomputed ${ov.cache.age_seconds}s ago`}>◷ cached</span>}
                {ov.scope.sample_note && <span style={{ color: 'var(--ink-3)', fontSize: 12 }} title={ov.scope.sample_note}>ⓘ whole-book roll-up in nightly precompute</span>}
              </>
            ) : 'Loading…'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" className={ui.pfLink}>All customers →</Link>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {ov ? <StatStrip stats={statsFrom(ov)} /> : <Skeleton height={92} radius={12} />}

      {ov ? (
        <div className="fadeUp">
          <div className={ui.chartGrid}>
            <Card title="Segment mix" question={ov.segment_mix.question} status={ov.segment_mix.status}>
              <BarsChart fmt="kes" data={ov.segment_mix.rows.map((r, i) => ({ label: r.segment, value: r.value, colorRole: i + 1 }))} />
            </Card>
            <Card title="Risk distribution" question={ov.risk_distribution.question} status={ov.risk_distribution.status} note={ov.risk_distribution.note}>
              <PartToWhole fmt="count" centerLabel="Customers" colors={RISK_COLORS}
                data={ov.risk_distribution.rows.map((r) => ({ label: r.class, value: r.customers }))} />
            </Card>
          </div>

          {ov.top_products && ov.top_products.rows.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Card title="Top deposit products" question={ov.top_products.question} status={ov.top_products.status}>
                <BarsChart fmt="kes" data={ov.top_products.rows.map((r, i) => ({ label: r.product, value: r.value, colorRole: i + 1 }))} />
              </Card>
            </div>
          )}

          <div className={ui.chartGrid}>
            <Card title="Deposit vs loan book" question={ov.book_trend.question} status={ov.book_trend.status} note={ov.book_trend.note}>
              <LineSeriesChart fmt="kes" data={mergeBook(ov)} series={[
                { name: 'Deposits', dataKey: 'deposits', colorRole: 1 },
                { name: 'Loans', dataKey: 'loans', colorRole: 2 },
              ]} height={190} />
            </Card>
            <Card title="Segment value trend" question={ov.segment_value_trend.question} status={ov.segment_value_trend.status} note={ov.segment_value_trend.note}>
              <MultiLineChart fmt="kes" data={ov.segment_value_trend.data} keys={ov.segment_value_trend.segments} height={190} />
            </Card>
          </div>

          <div style={{ marginTop: 12 }}>
            <Card title="Top movers" question={ov.top_movers.question} status={ov.top_movers.status} note={ov.top_movers.note}>
              <div className={ui.moverGrid}><TopMovers rows={ov.top_movers.rows} /></div>
            </Card>
          </div>
        </div>
      ) : (
        <div className={ui.chartGrid} style={{ marginTop: 12 }}>
          <Skeleton height={240} radius={12} /><Skeleton height={240} radius={12} />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Card title="Cross-sell worklist" question="Who should my RMs call this week, and why?">
          {wl ? <Worklist rows={wl.results} /> : <Skeleton height={200} radius={8} />}
        </Card>
      </div>

      <div style={{ marginTop: 12 }}>
        <Card title="Model performance" question="Are the model’s recommendations actually converting?">
          <ModelPerformance />
        </Card>
      </div>
    </main>
  );
}

function statsFrom(ov: PortfolioOverview): Stat[] {
  const S = ov.summary;
  const active = S.active_customers?.value;
  const activeShare = active && S.customers.value ? Math.round((active / S.customers.value) * 100) : null;
  return [
    { label: 'Customers', countTo: S.customers.value, fmt: (n) => count(Math.round(n)), value: count(S.customers.value), lead: true, status: S.customers.status },
    ...(active !== undefined ? [{
      label: 'Active customers', countTo: active, fmt: (n: number) => count(Math.round(n)), value: count(active),
      status: S.active_customers!.status,
      meta: activeShare !== null ? `${activeShare}% of book · transacted recently` : 'transacted recently',
    } as Stat] : []),
    { label: 'Relationship value', countTo: S.relationship_value.value, fmt: (n) => kes(n), value: kes(S.relationship_value.value), status: S.relationship_value.status },
    { label: 'Deposits', countTo: S.deposits.value, fmt: (n) => kes(n), value: kes(S.deposits.value), status: S.deposits.status },
    { label: 'Loans', countTo: S.loans.value, fmt: (n) => kes(n), value: kes(S.loans.value), status: S.loans.status },
    { label: 'Avg products', countTo: S.avg_products.value, fmt: (n) => n.toFixed(1), value: S.avg_products.value.toFixed(1), status: S.avg_products.status },
  ];
}

function mergeBook(ov: PortfolioOverview): Record<string, number | string>[] {
  const map = new Map<string, Record<string, number | string>>();
  for (const p of ov.book_trend.series.deposits) map.set(p.period, { period: p.period, deposits: p.balance });
  for (const p of ov.book_trend.series.loans) {
    const row = map.get(p.period) ?? { period: p.period };
    row.loans = p.balance;
    map.set(p.period, row);
  }
  return [...map.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
}
