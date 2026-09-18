'use client';
import { BRAND } from '@/lib/brand';

import type { CustomerCrm, PropertyLeadsCrm, InsuranceCrm } from '@/lib/types';
import { initials } from '@/lib/format';
import s from './ui.module.css';

/** Subsidiary CRM — property-sales leads (the property register) and the insurance CRM profile (HFBI).
 *  Property reads as the sales FUNNEL the customer is moving through (not a lone chip),
 *  with follow-up engagement beneath; insurance is a people-forward servicing view.
 *  Rendered only for customers who have one or the other. Property is phone-matched
 *  (flagged); insurance is a clean national-ID join. */
export function CrmPanel({ crm }: { crm: CustomerCrm }) {
  const p = crm.property_leads;
  const ins = crm.insurance;
  if (!p && !ins) return null;

  return (
    <div className={`${s.card} fadeUp`}>
      <div className={s.crmHead}>
        <span className={s.crmTitle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87M7 10a4 4 0 108 0 4 4 0 00-8 0zM3 21v-2a4 4 0 013-3.87" />
          </svg>
          CRM · leads &amp; servicing
        </span>
      </div>

      <div className={s.crmBody}>
        {p && <PropertyBlock p={p} />}
        {ins && <InsuranceBlock ins={ins} />}
      </div>
    </div>
  );
}

function PropertyBlock({ p }: { p: PropertyLeadsCrm }) {
  const lost = p.stage_kind === 'lost';
  return (
    <section className={`${s.crmBlock} ${s.crmProperty}`}>
      <header className={s.crmBlockHead}>
        <span className={s.crmBlockTitle}>Property sales</span>
        <span className={s.crmCaveat} title="These leads are linked to this customer by phone number, so the match is indicative rather than guaranteed.">matched by phone</span>
      </header>

      <div className={s.funnel} data-kind={p.stage_kind} role="img"
        aria-label={`Sales stage: ${p.stage}${lost ? ' (not converted)' : ''}`}>
        {p.funnel.map((label, i) => {
          const reached = p.stage_kind === 'won' ? true : i <= p.stage_index;
          const current = i === p.stage_index;
          return (
            <div key={label} className={s.funnelStep} data-reached={reached || undefined}>
              <span className={s.funnelNode} data-reached={reached || undefined} data-current={current || undefined} />
              <span className={s.funnelLabel} data-current={current || undefined}>{label}</span>
            </div>
          );
        })}
      </div>

      <div className={s.crmMeta}>
        {lost
          ? <span className={s.crmLost}>Not converted</span>
          : <span className={s.crmStageNow}>{p.stage}</span>}
        <span className={s.crmDot} />
        <span>{p.lead_count} {p.lead_count === 1 ? 'lead' : 'leads'}</span>
        <span className={s.crmDot} />
        <span>
          {p.followups} follow-up{p.followups === 1 ? '' : 's'}
          {p.followups > 0 && <span className={s.crmOk}> · {p.followups_successful} successful</span>}
        </span>
      </div>
    </section>
  );
}

function InsuranceBlock({ ins }: { ins: InsuranceCrm }) {
  const people = [
    ins.risk_manager && { name: ins.risk_manager, role: 'Relationship manager' },
    ins.agent && { name: ins.agent, role: 'Agent' },
  ].filter(Boolean) as { name: string; role: string }[];
  const context = [ins.occupation, ins.branch, ins.location].filter(Boolean).join(' · ');

  return (
    <section className={`${s.crmBlock} ${s.crmInsurance}`}>
      <header className={s.crmBlockHead}>
        <span className={s.crmBlockTitle}>Insurance</span>
        <span className={s.crmSrc} title={`${BRAND.insurance} insurance CRM, matched by national ID.`}>{BRAND.insurance}</span>
      </header>

      {people.length > 0 && (
        <div className={s.crmPeople}>
          <span className="microlabel">Serviced by</span>
          {people.map((person) => (
            <div key={person.role} className={s.crmPerson}>
              <span className={s.crmAvatar}>{initials(person.name)}</span>
              <span className={s.crmPersonName}>{person.name}</span>
              <span className={s.crmPersonRole}>{person.role}</span>
            </div>
          ))}
        </div>
      )}

      {context && <div className={s.crmContext}>{context}</div>}
    </section>
  );
}
