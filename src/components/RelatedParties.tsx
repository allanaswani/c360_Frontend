'use client';

import Link from 'next/link';
import type { RelatedParties as Related } from '@/lib/types';
import { initials, kes } from '@/lib/format';
import s from './ui.module.css';

/**
 * Related parties from the curated register — who is connected to this customer,
 * and in what role.
 *
 * Deliberately separate from `LinkedParties`, which answers a different question:
 * that one finds the SAME legal person under several customer numbers (matched on
 * national ID). This one links two DIFFERENT parties and names the relationship —
 * a company's directors and signatories, the companies a person sits on. The
 * lakehouse cannot answer it at all: `dim_customer` has a free-text `employer`
 * field and a 183-value occupation picklist, neither of which names a role at a
 * specific organisation.
 *
 * The role is the answer, so the role is what the row shows. Direction is carried
 * through to the tooltip and no further: which of the two parties the register
 * filed the tie under is an artefact of how the table stores it, not something an
 * RM acts on, and repeating it down every row was noise. The stronger reading —
 * "Director OF this company" versus "a directorship AT that company" — is what
 * would be worth the space, but it depends on which column the register puts the
 * organisation in, and that is not confirmed against the live table (see
 * c360/relationships.py for the query that would settle it). Rather than print a
 * sentence that may be backwards beside a real person's name, the panel says only
 * what is certain.
 */
export function RelatedParties({ data }: { data: Related | null | undefined }) {
  if (!data || data.count === 0) return null;

  return (
    <div className={s.linkedPanel}>
      <div className={s.linkedHead}>
        <span className={s.linkedTitle}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="2.6" /><circle cx="18" cy="18" r="2.6" /><circle cx="18" cy="6" r="2.6" />
            <path d="M8.6 6H15.4M18 8.6v6.8" />
          </svg>
          Related parties
        </span>
        <span className="microlabel" title="Sourced from the group related-party register">
          {data.count} {data.count === 1 ? 'party' : 'parties'}
        </span>
      </div>

      <div className={s.relList}>
        {data.members.map((m) => (
          <Link
            key={m.cust_id}
            href={`/customers/${m.cust_id}`}
            className={s.relRow}
            title={`${m.role_labels.join(' · ')} — the register files this relationship on ${
              m.direction === 'outbound' ? "this customer's record" : 'theirs'
            }`}
          >
            <span className={s.linkedAvatar}>{m.name ? initials(m.name) : '—'}</span>
            <span className={s.relMain}>
              <span className={s.relName}>
                {/* The register can reference a customer number no longer in the
                    master. The row stays: a relationship to an id we cannot name is
                    still a fact, and silently dropping it would understate the count. */}
                {m.name ?? <em className={s.relUnknown}>Not in the customer master</em>}
              </span>
              <span className={s.relRoles}>
                {m.role_labels.map((r) => (
                  <span key={r} className={s.relRole}>{r}</span>
                ))}
              </span>
              <span className={s.linkedMeta}>
                <span className="tnum">{m.cust_id}</span>
                {m.segment ? ` · ${m.segment}` : ''}{m.branch ? ` · ${m.branch}` : ''}
              </span>
            </span>
            {typeof m.value === 'number' && m.value > 0 && (
              <span className={s.linkedFig}>
                <span className="microlabel">Value</span>
                <span className={`${s.linkedFigVal} tnum`}>{kes(m.value)}</span>
              </span>
            )}
          </Link>
        ))}
      </div>

      {data.withheld_personal > 0 && (
        // Never a silent omission: the register also holds family ties, and the
        // count on screen has to be reconcilable with the register itself.
        <p className={s.relFoot}>
          {data.withheld_personal} family {data.withheld_personal === 1 ? 'relationship is' : 'relationships are'} on
          the register and not shown here — personal ties are outside what this screen is for.
        </p>
      )}
    </div>
  );
}
