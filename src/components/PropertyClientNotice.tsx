'use client';

import Link from 'next/link';
import type { CustomerHeader } from '@/lib/types';
import { count, kes } from '@/lib/format';
import { BRAND } from '@/lib/brand';
import s from './ui.module.css';

/**
 * The line that stops an property client's page reading as a broken one.
 *
 * These records come from the property arm's register, not the bank's customer
 * master. Most of them have no bank relationship at all, so the deposits, loans,
 * bureau, CRM and lending panels below are all legitimately empty, and a screen of
 * zeroes and "not sourced" badges with no explanation looks like a page that failed
 * to load. This says what is actually true: there is nothing to show because there
 * is nothing there, and here is what we do hold.
 *
 * When the client also banks with us the notice becomes a hand-off instead: their
 * real profile is richer than anything this register can offer, so the page points
 * at it rather than quietly being the worse of the two.
 */
export function PropertyClientNotice({ header }: { header: CustomerHeader }) {
  const h = header.property_client;
  if (!h) return null;

  return (
    <div className={s.hfdiNotice}>
      <svg className={s.hfdiIcon} width="17" height="17" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M3 10.5L12 4l9 6.5" /><path d="M5 10v9h14v-9" /><path d="M10 19v-5h4v5" />
      </svg>
      <div className={s.hfdiBody}>
        <div className={s.hfdiTitle}>
          {h.bank_cust_id ? 'Property client, and a bank customer' : 'Property client, not a bank customer'}
        </div>
        <p className={s.hfdiText}>
          {h.bank_cust_id ? (
            <>
              This is their record on the {BRAND.property} register. Their bank profile
              holds the deposits, lending and product history this page cannot show.{' '}
              <Link href={`/customers/${h.bank_cust_id}`} className={s.hfdiLink}>
                Open the full profile →
              </Link>
            </>
          ) : (
            <>
              They hold {count(h.units)} {h.units === 1 ? 'unit' : 'units'} worth{' '}
              <b className="tnum">{kes(h.units_value)}</b>
              {h.projects.length > 0 && <> in {h.projects.join(', ')}</>}, and no account
              with us. The banking, bureau and insurance panels below are empty because
              there is nothing there, not because anything failed to load.
              {h.has_pin && ` ${BRAND.property} holds a KRA PIN for them.`}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
