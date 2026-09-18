'use client';
import { BRAND } from '@/lib/brand';

import { useState } from 'react';
import type { CustomerBio, CreditBureau, CustomerCrm, LendingHealth } from '@/lib/types';
import { CreditBureauPanel, bandTone } from './CreditBureauPanel';
import { CrmPanel } from './CrmPanel';
import { LendingPanel } from './LendingPanel';
import { BioPanel } from './BioPanel';
import s from './ui.module.css';

/** Signal strip — the customer's non-financial standing (bureau score, credit
 *  classification, collateral, CRM funnel, servicing RM, identification) as ONE dense
 *  row docked under the identity band, instead of four full-width cards stacked below
 *  the fold where nobody scrolls to them.
 *
 *  The point is discoverability: each tile carries the ANSWER on its face (751 · BB,
 *  "Sealed", "Property", the RM's name), so the strip reads without a single click; the
 *  click only opens the working detail (meter, funnel, impairment, the ID grid) in
 *  place. A tile that would alert an RM — a non-performing / watch-list classification
 *  — opens itself, because that one shouldn't wait for a click. */
export function SignalStrip({ bio, bureau, crm, lending }: {
  bio?: CustomerBio;
  bureau?: CreditBureau | null;
  crm?: CustomerCrm | null;
  lending?: LendingHealth | null;
}) {
  const delinquency = lending?.delinquency ?? null;
  const collateral = lending?.collateral ?? null;
  const property = crm?.property_leads ?? null;
  const insurance = crm?.insurance ?? null;

  const tiles: Tile[] = [];

  if (bureau) {
    const tone = bureau.no_hit ? undefined : bandTone(bureau.pd_band);
    const adverse = bureau.non_performing > 0 || bureau.arrears_90_days > 0;
    tiles.push({
      key: 'bureau',
      label: 'Credit bureau',
      icon: <path d="M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6l7-3z" />,
      dot: adverse ? 'var(--coral)' : undefined,
      value: bureau.no_hit ? (
        <span className={s.sigVal}>No score</span>
      ) : (
        <span className={s.sigVal}>
          <span className={s.sigValNum} style={{ color: tone }}>{bureau.score ?? '—'}</span>
          {bureau.grade && <span className={s.sigGrade}>{bureau.grade}</span>}
        </span>
      ),
      sub: bureau.no_hit
        ? 'Thin file, no scoreable history'
        : bureau.pd_band
          ? `${bureau.pd_band} default risk`
          : 'Scored on the bureau',
      panel: <CreditBureauPanel bureau={bureau} />,
    });
  }

  if (delinquency) {
    const npl = delinquency.status === 'npl';
    const tone = delinquency.severity >= 2 ? 'var(--coral)' : 'var(--gold)';
    tiles.push({
      key: 'standing',
      label: 'Credit standing',
      icon: <path d="M12 3l9 16H3L12 3zM12 9v5M12 17.5v.01" />,
      dot: tone,
      alert: true,
      value: <span className={s.sigVal} style={{ color: tone }}>{npl ? delinquency.classification : 'Watch list'}</span>,
      sub: npl
        ? `Non-performing${delinquency.month ? ` · ${delinquency.month}` : ''}`
        : 'Early warning, not yet non-performing',
      panel: <LendingPanel lending={{ delinquency }} />,
    });
  }

  if (collateral && collateral.types.length > 0) {
    tiles.push({
      key: 'collateral',
      label: 'Collateral held',
      icon: <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />,
      value: (
        <span className={s.sigVal}>
          {collateral.distinct === 1 ? collateral.types[0].type : `${collateral.distinct} types`}
        </span>
      ),
      sub: collateral.distinct === 1
        ? 'Securing this customer’s facilities'
        : collateral.types.map((t) => t.type).join(', '),
      panel: <LendingPanel lending={{ collateral }} />,
    });
  }

  if (property) {
    const lost = property.stage_kind === 'lost';
    const won = property.stage_kind === 'won';
    tiles.push({
      key: 'property',
      label: 'Property sales',
      icon: <path d="M3 12h18M3 7h18M3 17h10" />,
      dot: lost ? 'var(--coral)' : won ? 'var(--teal)' : undefined,
      value: (
        <span className={s.sigVal} style={lost ? { color: 'var(--coral)' } : undefined}>
          {lost ? 'Not converted' : property.stage}
        </span>
      ),
      sub: `${property.lead_count} lead${property.lead_count === 1 ? '' : 's'} · ${property.followups} follow-up${property.followups === 1 ? '' : 's'}`,
      panel: <CrmPanel crm={{ property_leads: property }} />,
    });
  }

  if (insurance) {
    const person = insurance.risk_manager ?? insurance.agent;
    tiles.push({
      key: 'insurance',
      label: 'Insurance · serviced by',
      icon: <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87M7 10a4 4 0 108 0 4 4 0 00-8 0zM3 21v-2a4 4 0 013-3.87" />,
      value: <span className={s.sigVal}>{person ?? `${BRAND.insurance} profile`}</span>,
      sub: person
        ? (insurance.risk_manager ? `Relationship manager · ${BRAND.insurance}` : `Agent · ${BRAND.insurance}`)
        : [insurance.branch, insurance.location].filter(Boolean).join(' · ') || 'On the insurance CRM',
      panel: <CrmPanel crm={{ insurance }} />,
    });
  }

  if (bio) {
    const idNo = txt(bio.id_no);
    const idType = txt(bio.id_type);
    tiles.push({
      key: 'bio',
      label: 'Identification',
      icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
      value: <span className={s.sigVal}>{idNo ?? idType ?? 'On file'}</span>,
      sub: idNo && idType ? idType : 'Identification, personal and account details',
      panel: <BioPanel bio={bio} embedded />,
    });
  }

  // An alerting classification opens on arrival; otherwise the strip starts folded and
  // every tile still reads at a glance.
  const [open, setOpen] = useState<string | null>(() => tiles.find((t) => t.alert)?.key ?? null);
  if (tiles.length === 0) return null;
  const active = tiles.find((t) => t.key === open) ?? null;

  return (
    <div className={`${s.card} fadeUp`}>
      <div className={s.sigRow}>
        {tiles.map((t) => (
          <button
            key={t.key}
            className={s.sigTile}
            data-open={t.key === open}
            aria-expanded={t.key === open}
            onClick={() => setOpen((cur) => (cur === t.key ? null : t.key))}
          >
            <span className={`${s.sigLabel} microlabel`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{t.icon}</svg>
              {t.label}
              {t.dot && <span className={s.badgeDot} style={{ background: t.dot }} />}
            </span>
            {t.value}
            <span className={s.sigSub}>{t.sub}</span>
            <span className={s.sigChev}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </button>
        ))}
      </div>
      {active && <div className={s.sigPanel}>{active.panel}</div>}
    </div>
  );
}

interface Tile {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  sub: string;
  panel: React.ReactNode;
  /** A signal colour beside the label (adverse bureau record, NPL/watch, lost lead). */
  dot?: string;
  /** Opens itself on arrival — reserved for standing an RM must not miss. */
  alert?: boolean;
}

function txt(m: { value: string | null } | undefined): string | null {
  const v = m?.value;
  return v != null && String(v).trim() !== '' ? String(v) : null;
}
