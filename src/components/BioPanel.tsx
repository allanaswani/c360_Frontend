'use client';

import { useState } from 'react';
import type { CustomerBio } from '@/lib/types';
import { shortDate } from '@/lib/format';
import s from './ui.module.css';

/** Bio & identification (backlog item #1) — DOB, identification details and account
 *  details for the customer, sourced live from the core-banking master. Personal
 *  fields are individual-only, so for an organisation they are simply absent (a real
 *  N/A) rather than shown as a bare dash. Collapsible so the page stays tight. */
export function BioPanel({ bio }: { bio: CustomerBio | undefined }) {
  const [open, setOpen] = useState(true);
  if (!bio) return null;

  const v = (m: { value: string | null } | undefined) => (m && m.value != null && String(m.value).trim() !== '' ? String(m.value) : null);
  const dob = v(bio.date_of_birth);

  // Ordered so identification leads, then the person/entity, then account details.
  const items: { label: string; value: string | null }[] = [
    { label: 'Customer type', value: v(bio.customer_type) },
    { label: 'ID type', value: v(bio.id_type) },
    { label: 'ID number', value: v(bio.id_no) },
    { label: 'Issuing authority', value: v(bio.issuing_authority) },
    { label: 'KRA PIN', value: v(bio.kra_pin_status) },
    { label: 'Date of birth', value: dob ? `${shortDate(dob)}${age(dob) != null ? ` · ${age(dob)} yrs` : ''}` : null },
    { label: 'Gender', value: v(bio.gender) },
    { label: 'Place of birth', value: v(bio.city_of_birth) },
    { label: 'Employer', value: v(bio.employer) },
    { label: 'Alternate phone', value: v(bio.alt_phone) },
    { label: 'Postal address', value: v(bio.address) },
    { label: 'Home branch', value: v(bio.branch) },
    { label: 'Account opened', value: v(bio.account_open_date) ? shortDate(v(bio.account_open_date)) : null },
  ].filter((i) => i.value !== null);

  if (items.length === 0) return null;

  return (
    <div className={`${s.card} ${s.bioCard} fadeUp`}>
      <button className={s.bioHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={s.bioTitle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          Bio &amp; identification
        </span>
        <span className={s.bioChevron} data-open={open}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
      {open && (
        <dl className={s.bioGrid}>
          {items.map((i) => (
            <div key={i.label} className={s.bioItem}>
              <dt className="microlabel">{i.label}</dt>
              <dd className={s.bioVal}>{i.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function age(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a >= 0 && a < 130 ? a : null;
}
