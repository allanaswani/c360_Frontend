'use client';

import type { HFCBDomain } from '@/lib/types';
import { count, kes } from '@/lib/format';
import { Card } from './Card';
import { StatStrip, type Stat } from './StatStrip';
import { DataTable } from './DataTable';
import { DisbursementBalance } from './charts/DisbursementBalance';
import { LineSeriesChart } from './charts/LineSeriesChart';
import { TransactionTrend } from './charts/TransactionTrend';
import type { Series } from '@/lib/types';
import { ProductHoldingsBar } from './charts/ProductHoldingsBar';
import { PartToWhole } from './charts/PartToWhole';
import { EmptyState, Skeleton } from './States';
import ui from './ui.module.css';

// Fixed channel identity colours (were bespoke to the channel donut).
const CHANNEL_COLOR: Record<string, string> = {
  Mobile: 'var(--series-1)', Branch: 'var(--series-2)', Agent: 'var(--coral)',
  ATM: 'var(--series-3)', Internet: 'var(--series-5)',
  // Live channels from fact_dep_trx_recording (transaction count by channel).
  'Whizz / M-Pesa': 'var(--series-1)', Online: 'var(--series-4)', Cheque: 'var(--series-5)',
};

export function HFCBView({ domain }: { domain: HFCBDomain | null }) {
  if (!domain) return <HFCBSkeleton />;

  const m = domain.metrics;
  const netTone = (m.net_position.value as number) >= 0 ? 'pos' : 'neg';
  const stats: Stat[] = [
    { label: 'Net position', countTo: m.net_position.value as number, fmt: (n) => kes(n), value: kes(m.net_position.value as number), lead: true, tone: netTone, meta: 'deposits − loans', status: m.net_position.status },
    { label: 'Deposits', countTo: m.total_deposits.value as number, fmt: (n) => kes(n), value: kes(m.total_deposits.value as number), status: m.total_deposits.status },
    { label: 'Loans', countTo: m.total_loans.value as number, fmt: (n) => kes(n), value: kes(m.total_loans.value as number), status: m.total_loans.status },
    { label: 'Products', countTo: m.products_held.value as number, fmt: (n) => count(Math.round(n)), value: count(m.products_held.value as number), status: m.products_held.status },
    { label: 'Revenue', countTo: m.revenue.value as number, fmt: (n) => kes(n), value: kes(m.revenue.value as number), status: m.revenue.status },
  ];

  const balance = domain.charts.balance_trend;
  const disb = domain.charts.disbursement_vs_balance;
  const holdings = domain.charts.product_holdings;
  const txn = domain.charts.transaction_trend;
  const channel = domain.charts.channel_usage;

  return (
    <div className="fadeUp">
      <StatStrip stats={stats} />

      <div className={ui.chartGrid}>
        <Card
          title="Deposit vs loan balance"
          question={balance.question}
          status={balance.series?.[0]?.status}
          note={balance.series?.[0]?.note}
        >
          <LineSeriesChart
            data={mergeBalance(balance.series ?? [])}
            series={[
              { name: 'Deposit balance', dataKey: 'deposits', colorRole: 1 },
              { name: 'Loan balance', dataKey: 'loans', colorRole: 2 },
            ]}
            fmt="kes"
            height={180}
          />
        </Card>

        <Card
          title="Loan disbursement vs balance"
          question={disb.question}
          status={disb.series?.[0]?.status}
          note={disb.series?.[0]?.note}
        >
          {disb.empty_reason ? (
            <EmptyState title="No lending relationship">{disb.empty_reason}</EmptyState>
          ) : (
            <DisbursementBalance disbursed={disb.series![0]} balance={disb.series![1]} />
          )}
        </Card>

        <Card title="Product holdings" question={holdings.question} status={holdings.status}>
          {holdings.bars && holdings.bars.length > 0 ? (
            <ProductHoldingsBar bars={holdings.bars} />
          ) : (
            <EmptyState title="No active products" />
          )}
        </Card>

        <Card title="Channel usage" question={channel.question} status={channel.status} note={channel.note}>
          {channel.slices && channel.slices.length > 0 ? (
            <PartToWhole
              fmt="pct"
              data={channel.slices.map((c) => ({ label: c.channel, value: c.share }))}
              colors={channel.slices.map((c) => CHANNEL_COLOR[c.channel] ?? 'var(--series-4)')}
            />
          ) : (
            <EmptyState title="No channel activity" />
          )}
        </Card>

        <Card className={ui.spanFull} title="Transaction trend" question={txn.question} status={txn.series?.[0]?.status} note={txn.series?.[0]?.note}>
          {txn.series?.[0]?.points.length ? <TransactionTrend series={txn.series[0]} /> : <EmptyState title="No transactions in this period" />}
        </Card>
      </div>

      <div className={ui.chartGrid}>
        <Card title="Product uptake" status={domain.tables.product_uptake.status}>
          <DataTable block={domain.tables.product_uptake} />
        </Card>
        <Card title="Recent transactions" status={domain.tables.recent_transactions.status} note={domain.tables.recent_transactions.note}>
          <DataTable block={domain.tables.recent_transactions} />
        </Card>
      </div>
    </div>
  );
}

/** Merge two balance Series ([{period, balance}]) into rows for LineSeriesChart. */
function mergeBalance(series: Series[]): Record<string, number | string>[] {
  const map = new Map<string, Record<string, number | string>>();
  const keys: Record<string, string> = { deposits: 'deposits', loans: 'loans' };
  for (const s of series) {
    const dk = keys[s.key] ?? s.key;
    for (const p of s.points) {
      const period = String(p.period);
      const row = map.get(period) ?? { period };
      row[dk] = Number(p.balance);
      map.set(period, row);
    }
  }
  return [...map.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
}

function HFCBSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton height={92} radius={12} />
      <Skeleton height={272} radius={12} />
      <div className={ui.chartGrid}>
        <Skeleton height={220} radius={12} />
        <Skeleton height={220} radius={12} />
      </div>
    </div>
  );
}
