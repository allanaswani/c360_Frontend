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
import { RankedBars } from '@/components/charts/RankedBars';
import { CoverageMix } from '@/components/charts/CoverageMix';
import { LineSeriesChart } from '@/components/charts/LineSeriesChart';
import { MultiLineChart } from '@/components/charts/MultiLineChart';
import { TopMovers } from '@/components/portfolio/TopMovers';
import { Worklist } from '@/components/portfolio/Worklist';
import { ModelPerformance } from '@/components/portfolio/ModelPerformance';
import ui from '@/components/ui.module.css';
import { TYPE } from '@/lib/type';

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
          <div className="microlabel" style={{ color: 'var(--teal)' }}>Portfolio</div>
          <h1 className={ui.pfTitle}>Where should attention go?</h1>
          <div className={ui.pfSub}>
            {ov ? (
              <>
                <span className={ui.scopeChip}>{ov.scope.live_sample ? 'Live sample' : ov.scope.whole_book ? 'Whole book' : 'My book'}</span>
                <span>{count(ov.scope.customers_in_view)} customers · {ov.period.label}</span>
                {ov.cache.cached && <span className={ui.freshDot} title={`Precomputed ${ov.cache.age_seconds}s ago`}>◷ cached</span>}
                {ov.scope.sample_note && <span style={{ color: 'var(--ink-3)', fontSize: TYPE.xs }} title={ov.scope.sample_note}>ⓘ whole-book roll-up in nightly precompute</span>}
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
          {/* Three ranked/part-to-whole panels side by side. They used to be a tall
              bar chart in one column with a donut and a second bar chart stacked in
              the other to "balance the heights" — the balancing was only needed
              because the bar chart was 530px for eleven rows. */}
          <div className={ui.pfTrio}>
            <Card title="Segment mix" question={ov.segment_mix.question} status={ov.segment_mix.status}>
              <RankedBars
                fmt="kes"
                rows={ov.segment_mix.rows.map((r) => ({
                  label: r.segment,
                  value: r.value,
                  // The customer count was already in the payload and the old chart
                  // threw it away, so "how many customers per segment" — half the
                  // question the panel asks — went unanswered.
                  meta: `${compact(r.customers)} cust`,
                }))}
              />
            </Card>

            <Card title="Risk grading" question="How much of the book is graded, and how does the graded part look?"
                  status={ov.risk_distribution.status} note={ov.risk_distribution.note}>
              <CoverageMix
                slices={ov.risk_distribution.rows.map((r, i) => ({
                  label: r.class,
                  value: r.customers,
                  color: RISK_COLORS[i] ?? 'var(--slate)',
                }))}
              />
            </Card>

            {ov.top_products && ov.top_products.rows.length > 0 && (
              <Card title="Top deposit products" question={ov.top_products.question} status={ov.top_products.status}>
                <RankedBars
                  fmt="kes"
                  rows={ov.top_products.rows.map((r) => ({
                    label: r.product,
                    value: r.value,
                    meta: `${compact(r.customers)} cust`,
                  }))}
                  max={8}
                />
              </Card>
            )}
          </div>

          <div className={ui.chartGrid}>
            <Card title="Deposit vs loan book" question={ov.book_trend.question} status={ov.book_trend.status} note={ov.book_trend.note}>
              {/* The movement, stated, above the shape. Both lines are all but flat —
                  a book this size barely moves month to month — so 190px of chart was
                  spending the panel to say "stable" without ever saying it. The deltas
                  answer the question in words; the chart shows whether the stability
                  was steady or lumpy. */}
              <BookDelta rows={mergeBook(ov)} />
              <LineSeriesChart fmt="kes" data={mergeBook(ov)} series={[
                { name: 'Deposits', dataKey: 'deposits', colorRole: 1 },
                { name: 'Loans', dataKey: 'loans', colorRole: 2 },
              ]} height={132} />
            </Card>
            <Card title="Segment value trend" question={ov.segment_value_trend.question} status={ov.segment_value_trend.status} note={ov.segment_value_trend.note}>
              <MultiLineChart fmt="kes" data={ov.segment_value_trend.data} keys={ov.segment_value_trend.segments} height={150} />
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

/** 1,096,593 -> 1.1M. The meta column is 64px; a full thousands-separated count
 *  would truncate and tell the reader less than the abbreviation does. */
function compact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1e3)}K`;
  if (n >= 1_000) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-KE');
}

/**
 * Period-over-period movement in the book, and the loan-to-deposit ratio.
 *
 * Deposits and loans move by fractions of a percent a month at this scale, so the
 * two lines below render as flat rules and the reader leaves with no number. These
 * are the numbers they came for — including the ratio, which is the figure that
 * actually shifts and the one a balance-sheet question is really about.
 */
function BookDelta({ rows }: { rows: Record<string, number | string>[] }) {
  const numeric = (r: Record<string, number | string> | undefined, k: string) =>
    (typeof r?.[k] === 'number' ? (r[k] as number) : null);
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) return null;

  const items = (['deposits', 'loans'] as const).map((key) => {
    const a = numeric(first, key);
    const b = numeric(last, key);
    const pct = a && b && a !== 0 ? ((b - a) / a) * 100 : null;
    return { key, label: key === 'deposits' ? 'Deposits' : 'Loans', now: b, pct };
  });

  const dep = numeric(last, 'deposits');
  const loan = numeric(last, 'loans');
  const ltd = dep && loan && dep !== 0 ? (loan / dep) * 100 : null;

  return (
    <div className={ui.bookDelta}>
      {items.map((it) => (
        <div key={it.key} className={ui.bookDeltaItem}>
          <span className="microlabel">{it.label}</span>
          <span className={`${ui.bookDeltaVal} tnum`}>{it.now === null ? '—' : kes(it.now)}</span>
          <span className={ui.bookDeltaPct}
                data-dir={it.pct === null ? undefined : it.pct >= 0 ? 'up' : 'down'}>
            {it.pct === null ? 'no prior period'
              : `${it.pct >= 0 ? '+' : ''}${it.pct.toFixed(1)}% over the period`}
          </span>
        </div>
      ))}
      <div className={ui.bookDeltaItem}>
        <span className="microlabel">Loan-to-deposit</span>
        <span className={`${ui.bookDeltaVal} tnum`}>{ltd === null ? '—' : `${ltd.toFixed(0)}%`}</span>
        <span className={ui.bookDeltaPct}>
          {ltd === null ? '' : ltd > 100 ? 'lending above deposits' : 'deposits fund the book'}
        </span>
      </div>
    </div>
  );
}
