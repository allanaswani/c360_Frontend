'use client';

import type { CustomerInsights as Insights, InsightBlock, Provenance } from '@/lib/types';
import { count, kesFull, pct, shortDate } from '@/lib/format';
import { Card } from './Card';
import { RankedBars } from './charts/RankedBars';
import { LineSeriesChart } from './charts/LineSeriesChart';
import { CashFlowChart } from './charts/CashFlowChart';
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
      <AccountListCard data={data} />
      <CashFlowCard data={data} />
      <LoanDetailsCard data={data} />
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

/** Every account, current to fixed deposit, with its number, balance, status and (for a
 *  term or call deposit) maturity date. One table rather than one per type, so the
 *  whole relationship reads top to bottom. */
function AccountListCard({ data }: { data: Insights }) {
  const b = data.products;
  const rows = b.data?.accounts ?? [];
  return (
    <Card className={ui.spanFull} title="All accounts" status={statusOf(b)}
          question="Which accounts do they hold, and when do deposits mature?"
          note={b.data ? `Deposits as of ${shortDate(b.data.as_of)}, loans as of ${shortDate(b.data.loans_as_of ?? b.data.as_of)}.` : undefined}>
      {b.status === 'unavailable' ? <Unavailable what="Accounts" /> :
        rows.length === 0 ? <EmptyState title="No accounts with a balance" /> : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Type</th><th>Product</th><th>Account</th><th>Status</th><th>Matures</th>
                  <th className={ui.tRight}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={`${a.side}-${a.account_no}-${a.product}`}>
                    <td>{a.category}</td>
                    <td>{a.product ?? '—'}</td>
                    <td className={`${ui.tMuted} tnum`}>{a.account_no ?? '—'}</td>
                    <td>{a.status}</td>
                    <td>{a.maturity ? shortDate(a.maturity) : '—'}</td>
                    <td className={`${ui.tRight} tnum`}>{kesFull(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Card>
  );
}

/** Money in and out over twelve months, and where it comes from and goes. */
function CashFlowCard({ data }: { data: Insights }) {
  const b = data.cashflow;
  const c = b.data;
  return (
    <Card className={ui.spanFull} title="Money in and out" status={statusOf(b)}
          question="Is money building up in the relationship or draining out, and through what?"
          note={c ? `Every money movement on the customer’s accounts, ${shortDate(c.from)} to ${shortDate(c.to)}. ${c.note}` : undefined}>
      {b.status === 'unavailable' ? <Unavailable what="Cash flow" /> :
        !c ? <EmptyState title="No money moved in the last twelve months" /> : (
          <>
            <div className={s.facts} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 6 }}>
              <div><div className={s.factLabel}>Money in, 12 months</div><div className={`${s.factValue} tnum`}>{kesFull(c.total_in)}</div></div>
              <div><div className={s.factLabel}>Money out, 12 months</div><div className={`${s.factValue} tnum`}>{kesFull(c.total_out)}</div></div>
              <div><div className={s.factLabel}>Net</div><div className={`${s.factValue} tnum`}>{kesFull(c.net)}</div></div>
            </div>
            <CashFlowChart months={c.months} to={c.to} />
            <div className={ui.chartGrid} style={{ marginTop: 6 }}>
              <div>
                <div className={s.factLabel} style={{ marginBottom: 6 }}>Where money comes from</div>
                {c.sources.length ? (
                  <RankedBars fmt="kes" max={7} rows={c.sources.map((g) => ({
                    label: g.group, value: g.value, meta: `${g.count} ${g.count === 1 ? 'credit' : 'credits'}` }))} />
                ) : <div className={s.muted}>Nothing came in.</div>}
              </div>
              <div>
                <div className={s.factLabel} style={{ marginBottom: 6 }}>Where money goes</div>
                {c.uses.length ? (
                  <RankedBars fmt="kes" max={7} rows={c.uses.map((g) => ({
                    label: g.group, value: g.value, meta: `${g.count} ${g.count === 1 ? 'debit' : 'debits'}` }))} />
                ) : <div className={s.muted}>Nothing went out.</div>}
              </div>
            </div>
          </>
        )}
    </Card>
  );
}

/** Each live loan: instalment, when it is next due, arrears, maturity, and how it is
 *  paid when a standing order of exactly the instalment runs. */
function LoanDetailsCard({ data }: { data: Insights }) {
  const b = data.loans;
  const rows = b.data?.loans ?? [];
  if (b.status === 'none' || (b.status === 'live' && rows.length === 0)) return null;   // no loans: nothing to say
  return (
    <Card className={ui.spanFull} title="Loans in detail" status={statusOf(b)}
          question="What do they pay, when, are they behind, and how is it paid?"
          note={b.data ? `From the loan book at ${shortDate(b.data.as_of)}. Paid by is shown where a standing order of exactly the instalment ran in the last four months.` : undefined}>
      {b.status === 'unavailable' ? <Unavailable what="Loan details" /> : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Loan</th><th className={ui.tRight}>Balance</th><th className={ui.tRight}>Instalment</th>
                <th>Next due</th><th>Arrears</th><th>Matures</th><th className={ui.tRight}>Rate</th><th>Paid by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => (
                <tr key={`${l.account_no}-${i}`}>
                  <td>{l.product}<div className={ui.tMuted} style={{ fontSize: 'var(--t-2xs)' }}>{l.type ?? ''}{l.status ? ` · ${l.status}` : ''}</div></td>
                  <td className={`${ui.tRight} tnum`}>{kesFull(l.balance)}</td>
                  <td className={`${ui.tRight} tnum`}>{l.instalment ? kesFull(l.instalment) : '—'}</td>
                  <td>{l.next_due ? shortDate(l.next_due) : '—'}</td>
                  <td>{l.days_overdue > 0
                    ? <span style={{ color: 'var(--neg)', fontWeight: 600 }}>{l.days_overdue} days, {kesFull(l.arrears)}</span>
                    : 'None'}</td>
                  <td>{l.matures ? `${shortDate(l.matures)}${l.months_left ? ` (${l.months_left} mo)` : ''}` : '—'}</td>
                  <td className={`${ui.tRight} tnum`}>{l.rate != null ? `${l.rate}%` : '—'}</td>
                  <td style={{ whiteSpace: 'normal', minWidth: 160 }}>{l.paid_by_standing_order
                    ? `Standing order from ${l.paid_by_standing_order.account ?? 'their account'}, around the ${l.paid_by_standing_order.days.join(' or ')}`
                    : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            {f.history && Object.keys(f.history).length > 0 && (
              <div className={s.facHist}>
                {f.facilities.filter((x) => x.active && f.history?.[x.agreement]?.length).map((x) => (
                  <div key={x.agreement}>
                    <div className={s.factLabel}>{x.type}: outstanding at each month end, against {kesFull(x.limit)} sanctioned</div>
                    <LineSeriesChart fmt="kes" height={110}
                                     data={(f.history![x.agreement]).map((h) => ({ period: h.period, outstanding: h.outstanding }))}
                                     series={[{ name: 'Outstanding', dataKey: 'outstanding', colorRole: 1 }]} />
                  </div>
                ))}
              </div>
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
              {a.salary_timing && <div className={s.muted}>{a.salary_timing} A good day to call.</div>}
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
            <LineSeriesChart fmt="kes" height={170}
                             data={r.months.map((m) => ({ period: m.period, ii: m.interest_income, nfi: m.nfi, ie: m.interest_expense }))}
                             series={[
                               { name: 'Interest income', dataKey: 'ii', colorRole: 1 },
                               { name: 'Fees and commissions', dataKey: 'nfi', colorRole: 2 },
                               { name: 'Interest paid to them', dataKey: 'ie', colorRole: 3 },
                             ]} />
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
