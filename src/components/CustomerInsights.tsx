'use client';

import type { CustomerInsights as Insights, InsightBlock, Provenance } from '@/lib/types';
import { count, kesFull, pct, shortDate } from '@/lib/format';
import { Card } from './Card';
import { RankedBars } from './charts/RankedBars';
import { LineSeriesChart } from './charts/LineSeriesChart';
import { EmptyState, Skeleton, UnavailableState } from './States';
import ui from './ui.module.css';
import s from './insights.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "What they hold, owe, earn us and do" - the HFCB-tab section built on
 *  /customers/:id/insights/. Every block renders its own state: a source that could
 *  not be read says so, and is never shown as "none". */
export function CustomerInsights({ data }: { data: Insights | null }) {
  if (!data) {
    return (
      <div className={ui.chartGrid}>
        <Skeleton height={220} radius={12} />
        <Skeleton height={220} radius={12} />
      </div>
    );
  }
  return (
    <div className={ui.chartGrid}>
      <AccountsCard data={data} />
      <LoansCard data={data} />
      <FacilitiesCard data={data} />
      <ActivityCard data={data} />
      <RevenueCard data={data} />
      <ProfileCard data={data} />
    </div>
  );
}

function statusOf(b: InsightBlock<unknown>): Provenance | undefined {
  return b.status === 'live' ? 'live' : undefined;
}

function Unavailable({ what }: { what: string }) {
  return (
    <UnavailableState title={`${what} could not be loaded`}>
      The source did not answer just now. This is a data-source issue, not a gap in the
      customer’s record. Reload the page to try again.
    </UnavailableState>
  );
}

function AccountsCard({ data }: { data: Insights }) {
  const b = data.products;
  return (
    <Card title="Accounts by type" question="Where do their deposits sit?" status={statusOf(b)}
          note={`Grouped by the core-banking product tree, balances at ${shortDate(data.as_of)}.`}>
      {b.status === 'unavailable' ? <Unavailable what="Accounts" /> :
        !b.data || b.data.deposits.length === 0 ? <EmptyState title="No deposit accounts with a balance" /> : (
          <RankedBars fmt="kes" rows={b.data.deposits.filter((g) => g.balance > 0).map((g) => ({
            label: g.label, value: g.balance,
            meta: `${g.accounts} ${g.accounts === 1 ? 'account' : 'accounts'} · ${g.products.join(', ')}`,
          }))} />
        )}
    </Card>
  );
}

function LoansCard({ data }: { data: Insights }) {
  const b = data.products;
  return (
    <Card title="Loans by type" question="What kind of lending do they have with us?" status={statusOf(b)}>
      {b.status === 'unavailable' ? <Unavailable what="Loans" /> :
        !b.data || b.data.loans.length === 0 ? <EmptyState title="No loans outstanding" /> : (
          <RankedBars fmt="kes" rows={b.data.loans.map((g) => ({
            label: g.label, value: g.balance,
            meta: `${g.accounts} ${g.accounts === 1 ? 'loan' : 'loans'} · ${g.products.join(', ')}`,
          }))} />
        )}
    </Card>
  );
}

function FacilitiesCard({ data }: { data: Insights }) {
  const b = data.facilities;
  const f = b.data;
  return (
    <Card className={ui.spanFull} title="Credit facilities" status={statusOf(b)}
          question="How much has the bank sanctioned, and how much is drawn?"
          note="Sanctioned limit from the loan agreement; outstanding from the loan book at the latest close.">
      {b.status === 'unavailable' ? <Unavailable what="Facilities" /> :
        !f || (f.facilities.length === 0 && !f.mobile) ? <EmptyState title="No credit facilities on record" /> : (
          <>
            {f.facilities.length > 0 && (
              <>
                <div className={s.muted} style={{ marginTop: 0, marginBottom: 8 }}>
                  {f.active_count > 0
                    ? `${f.active_count} active: ${kesFull(f.outstanding_total)} outstanding against ${kesFull(f.sanctioned_total)} sanctioned.`
                    : 'No facility has a balance outstanding.'}
                  {f.past_count > 0 && ` ${f.past_count} repaid ${f.past_count === 1 ? 'facility is' : 'facilities are'} listed below as history.`}
                </div>
                <div className={ui.tableWrap}>
                  <table className={ui.table}>
                    <thead>
                      <tr>
                        <th>Facility</th><th>Issued</th>
                        <th className={ui.tRight}>Sanctioned</th><th className={ui.tRight}>Outstanding</th>
                        <th className={ui.tRight}>Drawn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.facilities.map((x) => (
                        <tr key={x.agreement} className={x.active ? undefined : s.past}>
                          <td>{x.type}{x.active ? '' : ' (repaid)'}</td>
                          <td>{x.issued ? shortDate(x.issued) : '—'}</td>
                          <td className={`${ui.tRight} tnum`}>{kesFull(x.limit)}</td>
                          <td className={`${ui.tRight} tnum`}>{kesFull(x.outstanding)}</td>
                          <td className={`${ui.tRight} tnum`} style={{ minWidth: 90 }}>
                            {x.used_pct == null ? '—' : pct(x.used_pct, 0)}
                            {x.used_pct != null && (
                              <div className={s.bar}><div className={s.barFill} style={{ width: `${Math.min(100, x.used_pct * 100)}%` }} /></div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {f.mobile && (
              <div className={s.muted}>
                Mobile loans: {count(f.mobile.loans_taken)} taken
                {f.mobile.first_issued ? ` since ${f.mobile.first_issued.slice(0, 4)}` : ''}, latest approved{' '}
                {kesFull(f.mobile.latest_amount)}
                {f.mobile.latest_issued ? ` on ${shortDate(f.mobile.latest_issued)}` : ''}, {kesFull(f.mobile.outstanding)} outstanding.
                Each mobile loan is approved separately, so these are amounts approved, not a limit. The full history is on the Whizz tab.
              </div>
            )}
          </>
        )}
    </Card>
  );
}

function ActivityCard({ data }: { data: Insights }) {
  const b = data.activity;
  const a = b.data;
  return (
    <Card className={ui.spanFull} title="What their transactions say" status={statusOf(b)}
          question="What do they do with their money, and what does that suggest?"
          note={a ? `Customer-facing transactions from ${shortDate(a.from)} to ${shortDate(a.to)}, by purpose.` : undefined}>
      {b.status === 'unavailable' ? <Unavailable what="Transactions" /> :
        !a || a.categories.length === 0 ? (
          <EmptyState title="No customer-facing transactions in the last 90 days" />
        ) : (
          <div className={ui.chartGrid} style={{ marginTop: 0 }}>
            <div>
              <RankedBars fmt="count" rows={a.categories.map((c) => ({
                label: c.label, value: c.count, meta: kesFull(c.value),
              }))} />
              {a.watch.map((w) => <div key={w} className={s.watch}>{w}</div>)}
            </div>
            <div>
              {a.opportunities.length === 0 ? (
                <EmptyState title="Nothing their activity points to">
                  {a.opportunities_note ?? 'Their transactions do not show a need for a product they do not already hold.'}
                </EmptyState>
              ) : (
                <div className={s.opps}>
                  {a.opportunities.map((o) => (
                    <div key={o.rule_id} className={s.opp}>
                      <div className={s.oppHead}>
                        <span className={s.oppName}>{o.product_name}</span>
                        <span className={s.oppDomain}>{o.domain}</span>
                      </div>
                      <div className={s.oppReason}>{o.reason}</div>
                      <ul className={s.oppEvidence}>{o.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    </Card>
  );
}

function RevenueCard({ data }: { data: Insights }) {
  const b = data.revenue;
  const r = b.data;
  const span = r ? `${MONTHS[r.first_month - 1]} to ${MONTHS[r.last_month - 1]} ${r.year}` : '';
  return (
    <Card title="Revenue from this customer" status={statusOf(b)}
          question="What does the bank earn from them each month?"
          note="Interest income plus fees and commissions, less interest paid to the customer. Before operating costs.">
      {b.status === 'unavailable' ? <Unavailable what="Revenue" /> :
        !r ? <EmptyState title="No revenue on record this year" /> : (
          <>
            <div className={s.facts} style={{ marginBottom: 8 }}>
              <div><div className={s.factLabel}>Net, {span}</div><div className={`${s.factValue} tnum`}>{kesFull(r.totals.net)}</div></div>
              <div><div className={s.factLabel}>Interest income</div><div className={`${s.factValue} tnum`}>{kesFull(r.totals.interest_income)}</div></div>
              <div><div className={s.factLabel}>Fees and commissions</div><div className={`${s.factValue} tnum`}>{kesFull(r.totals.nfi)}</div></div>
              <div><div className={s.factLabel}>Interest paid to them</div><div className={`${s.factValue} tnum`}>{kesFull(r.totals.interest_expense)}</div></div>
            </div>
            <LineSeriesChart fmt="kes" height={150} data={r.months.map((m) => ({ period: m.period, net: m.net }))}
                             series={[{ name: 'Net revenue', dataKey: 'net', colorRole: 1 }]} />
          </>
        )}
    </Card>
  );
}

function ProfileCard({ data }: { data: Insights }) {
  const b = data.profile;
  const p = b.data;
  const tone = p?.aml_tone === 'neg' ? s.chipNeg : p?.aml_tone === 'warn' ? s.chipWarn : p?.aml_tone === 'pos' ? s.chipPos : '';
  return (
    <Card title="Customer file" status={statusOf(b)} question="What does the bank’s own record say about them?"
          note="From the core-banking customer categories. Fields left blank or holding a placeholder are not shown.">
      {b.status === 'unavailable' ? <Unavailable what="The customer file" /> :
        !p ? <EmptyState title="No customer categories on record" /> : (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className={`${s.chip} ${tone}`}>AML risk: {p.aml_risk ?? 'not rated'}</span>
              {p.pep && <span className={`${s.chip} ${s.chipNeg}`}>Politically exposed person</span>}
              <span className={s.chip}>
                Cards: {p.cards.active} active{p.cards.blocked ? `, ${p.cards.blocked} blocked` : ''}
              </span>
            </div>
            <div className={s.facts}>
              {p.fields.filter((f) => f.key !== 'aml_risk').map((f) => (
                <div key={f.key}><div className={s.factLabel}>{f.label}</div><div className={s.factValue}>{f.value}</div></div>
              ))}
            </div>
          </>
        )}
    </Card>
  );
}
