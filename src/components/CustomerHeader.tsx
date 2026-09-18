import Link from 'next/link';
import type { CustomerHeader as Header, ValueSummary } from '@/lib/types';
import { initials, kes, shortDate } from '@/lib/format';
import { CountUp } from './CountUp';
import s from './ui.module.css';
import { TYPE } from '@/lib/type';

/** The customer identity band. Identity + RM are live; risk & KYC are DERIVED from
 *  live data (violet, with the basis on hover); CRB stays "not sourced" (needs an
 *  external bureau feed). Never a bare "--". */
export function CustomerHeader({ header, value, asOf, lastTransaction, lastTxnLoading }: {
  header: Header; value: ValueSummary; asOf: string;
  /** Last customer-facing transaction — loaded separately (own endpoint), so it arrives
   *  after the header. undefined + lastTxnLoading=true → 'checking…'; a metric → shown. */
  lastTransaction?: { value: string | null; note?: string } | null;
  lastTxnLoading?: boolean;
}) {
  const id = header.identity;
  const risk = header.risk;
  const rel = value.headline.relationship_value.value as number;
  // On an the property register record the hero is the property, always. Relationship value is a
  // BANK figure and this record has no bank side to it — showing KES 0 would read
  // as "we hold nothing on them" while they own units worth millions. That is true
  // even when they also bank with us: those balances live on their bank record,
  // which the notice below links to, not on this one.
  const propertyClient = header.property_client;
  const insuranceClient = header.insurance_client;
  // Relationship value is a BANK figure. On a record that has no bank side, KES 0 is
  // true and useless: JACCA Consulting holds a live policy and pays KES 85,422 a year
  // and their page led with zero. Each universe leads with what it actually holds.
  const heroLabel = propertyClient ? 'Property holding'
    : insuranceClient ? 'Annual premium'
    : 'Relationship value';
  const heroValue = propertyClient ? propertyClient.units_value
    : insuranceClient ? insuranceClient.premium
    : rel;

  return (
    <div className={`${s.headerBand} fadeUp`}>
      <Link href="/" className={s.headerBackLink}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        All customers
      </Link>
      <div className={s.headerTop}>
        <div className={s.identity}>
          <div className={s.avatar}>{initials(String(id.name.value))}</div>
          <div>
            <div className={s.custName}>{String(id.name.value)}</div>
            <div className={s.custSub}>
              <span><b style={{ color: 'var(--ink-on-dark)' }}>{header.cust_id}</b></span>
              <span>· {String(id.segment.value)}</span>
              {/* An organisation, or a client from a register that has no branches,
                  legitimately has no branch. Printing it unconditionally rendered
                  the literal text "null branch". */}
              {id.branch.value != null && <span>· {String(id.branch.value)} branch</span>}
              {id.rm_name.value && <span>· RM {String(id.rm_name.value)}</span>}
              {id.rm_previous?.value && (
                <span title="Reassigned from a previous relationship manager" style={{ opacity: 0.75 }}>
                  · prev. {String(id.rm_previous.value)}
                </span>
              )}
            </div>
            {header.summary && <p className={s.custSummary}>{header.summary}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="microlabel" style={{ color: 'var(--ink-on-dark-2)' }}>{heroLabel}</div>
          <div className="tnum" style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: TYPE.xxl, color: '#fff', letterSpacing: '-0.01em' }}>
            <CountUp value={heroValue} format={(n) => kes(n)} />
          </div>
          <div style={{ fontSize: TYPE.xxs, color: 'var(--ink-on-dark-2)' }}>as of {shortDate(asOf)}</div>
        </div>
      </div>

      <div className={s.riskRow}>
        <RiskChip label="Risk class" metric={risk.risk_class} />
        <RiskChip label="CRB status" metric={risk.crb_status} />
        <RiskChip label="KYC status" metric={risk.kyc_status} />
        <RiskChip label="Relationship since" metric={risk.relationship_since} />
        <StatusChip active={!!id.active.value} lastTransaction={lastTransaction} asOf={asOf} />
        <LastTxnChip metric={lastTransaction} loading={lastTxnLoading} asOf={asOf} />
        {header.retention && header.retention.flag !== 'stable' && (
          <div className={s.riskChip} title={header.retention.note}>
            <span className="microlabel">Retention</span>
            <span className={s.riskChipVal} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span className={s.badgeDot} style={{ background: header.retention.flag === 'at_risk' ? 'var(--coral)' : 'var(--gold)' }} />
              {header.retention.flag === 'at_risk' ? 'At risk' : 'Watch'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Whole months between an ISO date and the as-of date (never negative). */
function monthsSince(val: string, asOf: string): number {
  const d = new Date(val), ref = new Date(asOf);
  return Math.max(0, (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth()));
}

// A customer-facing transaction older than this (months) reads as 'no recent activity'.
// Matches the LastTxnChip's gold ('over a year') threshold so the two agree.
const INACTIVE_MONTHS = 12;

/** Status — the CORE-BANKING account-status code, shown verbatim (never overridden). We
 *  only append a muted '· no recent activity' caveat when the account is Active yet the
 *  (separately loaded) last customer-facing transaction is over a year old, or there's
 *  none on record — so 'Active' next to a years-old last transaction stops looking like a
 *  contradiction. While the probe is still loading, no caveat is shown. */
function StatusChip({ active, lastTransaction, asOf }: {
  active: boolean; lastTransaction?: { value: string | null } | null; asOf: string;
}) {
  let caveat = false;
  if (active && lastTransaction != null) {            // null/undefined ⇒ still loading
    const v = lastTransaction.value;
    caveat = v === null ? true : monthsSince(v, asOf) >= INACTIVE_MONTHS;
  }
  return (
    <div className={s.riskChip} title={caveat
      ? 'Core-banking status is Active, but there has been no customer-facing transaction in over a year.'
      : undefined}>
      <span className="microlabel">Status</span>
      <span className={s.riskChipVal}>
        {active ? 'Active' : 'Dormant'}
        {caveat && <span style={{ color: 'var(--ink-on-dark-2)', fontWeight: 500 }}> · no recent activity</span>}
      </span>
    </div>
  );
}

/** Last customer-facing transaction — the honest 'when was this account last active'.
 *  An 'Active' status can hide years of no real activity; when the last transaction is
 *  over a year old we flag it (gold > 1yr, coral > 3yr) with a relative-age caption, so
 *  a stale account is obvious without opening the transaction history. */
function LastTxnChip({ metric, loading, asOf }: {
  metric?: { value: string | null; note?: string } | null; loading?: boolean; asOf: string;
}) {
  if (loading && !metric) {
    return (
      <div className={s.riskChip} title="Looking up the last customer-facing transaction…">
        <span className="microlabel">Last transaction</span>
        <span className={s.riskChipVal} style={{ opacity: 0.6 }}>Checking…</span>
      </div>
    );
  }
  const val = metric?.value ?? null;
  if (!val) {
    return (
      <div className={s.riskChip} title={metric?.note || 'No customer-facing transaction found on record.'}>
        <span className="microlabel">Last transaction</span>
        <span className={s.riskChipPending}>None on record</span>
      </div>
    );
  }
  const months = monthsSince(val, asOf);
  const years = Math.floor(months / 12);
  const color = months >= 36 ? 'var(--coral)' : months >= 12 ? 'var(--gold)' : undefined;
  const ago = months < 1 ? 'this month' : months < 12 ? `${months} mo ago` : `${years} yr${years > 1 ? 's' : ''} ago`;
  const title = color
    ? `Account is marked Active, but its last customer-facing transaction was ${shortDate(val)}, ${ago}.`
    : `Last customer-facing transaction ${shortDate(val)}.`;
  return (
    <div className={s.riskChip} title={title}>
      <span className="microlabel">Last transaction</span>
      <span className={s.riskChipVal} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {color && <span className={s.badgeDot} style={{ background: color }} />}
        {shortDate(val)}
        <span style={{ color: 'var(--ink-on-dark-2)', fontWeight: 500 }}>· {ago}</span>
      </span>
    </div>
  );
}

function RiskChip({ label, metric }: { label: string; metric: { value: string | null; status: string; note?: string } }) {
  const pending = metric.value === null || metric.status === 'to_source';
  const isDerived = metric.status === 'derived' && !pending;
  return (
    <div className={s.riskChip} title={metric.note}>
      <span className="microlabel">{label}</span>
      {pending ? (
        <span className={s.riskChipPending}>Not sourced</span>
      ) : (
        <span className={s.riskChipVal} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {isDerived && <span className={s.badgeDot} style={{ background: 'var(--prov-derived)' }} />}
          {String(metric.value)}
        </span>
      )}
    </div>
  );
}
