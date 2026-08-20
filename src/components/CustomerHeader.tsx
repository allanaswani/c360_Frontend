import Link from 'next/link';
import type { CustomerHeader as Header, ValueSummary } from '@/lib/types';
import { initials, kes } from '@/lib/format';
import { CountUp } from './CountUp';
import s from './ui.module.css';

/** The customer identity band. Identity + RM are live; risk & KYC are DERIVED from
 *  live data (violet, with the basis on hover); CRB stays "not sourced" (needs an
 *  external bureau feed). Never a bare "--". */
export function CustomerHeader({ header, value, asOf }: { header: Header; value: ValueSummary; asOf: string }) {
  const id = header.identity;
  const risk = header.risk;
  const rel = value.headline.relationship_value.value as number;

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
              <span>· {String(id.branch.value)} branch</span>
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
          <div className="microlabel" style={{ color: 'var(--ink-on-dark-2)' }}>Relationship value</div>
          <div className="tnum" style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 26, color: '#fff', letterSpacing: '-0.01em' }}>
            <CountUp value={rel} format={(n) => kes(n)} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-on-dark-2)' }}>as of {new Date(asOf).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      <div className={s.riskRow}>
        <RiskChip label="Risk class" metric={risk.risk_class} />
        <RiskChip label="CRB status" metric={risk.crb_status} />
        <RiskChip label="KYC status" metric={risk.kyc_status} />
        <RiskChip label="Relationship since" metric={risk.relationship_since} />
        <div className={s.riskChip}>
          <span className="microlabel">Status</span>
          <span className={s.riskChipVal}>{id.active.value ? 'Active' : 'Dormant'}</span>
        </div>
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
