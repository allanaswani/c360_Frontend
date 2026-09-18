'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { InsuranceClient, InsuranceClientList } from '@/lib/types';
import { ErrorState, Skeleton } from '@/components/States';
import { ExportMenu } from '@/components/ExportMenu';
import { count, initials, kes } from '@/lib/format';
import s from '../home.module.css';
import p from './insuranceClients.module.css';
import ui from '@/components/ui.module.css';

/**
 * The insurance arm's client register.
 *
 * Companion to the property-clients page and built for the same reason: the group has
 * a relationship with these people, and Customer 360's universe was the bank's
 * customer master, so they did not exist here.
 *
 * This register has two tiers and the page has to show both. Most clients have a
 * record with a client number. A few hundred appear only in the premium receipts,
 * because the register never got them — they have a name and a count of payments and
 * nothing else. They are reachable by search rather than by browsing, since without a
 * client number there is no stable key to page them by, and the page says so instead
 * of quietly appearing to list everything.
 */
export default function InsuranceClients() {
  const [q, setQ] = useState('');
  const [unbanked, setUnbanked] = useState(false);
  const [data, setData] = useState<InsuranceClientList | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setError(null);
      api.insuranceClients(q, unbanked)
        .then((r) => live && setData(r))
        .catch((e) => live && setError({ status: e.status ?? 0, message: e.message }));
    }, 160);
    return () => { live = false; clearTimeout(t); };
  }, [q, unbanked]);

  const premium = useMemo(
    () => (data?.results ?? []).reduce((a, r) => a + (r.insurance.premium ?? 0), 0),
    [data],
  );

  if (error) {
    return (
      <main className={ui.content}>
        <div className={ui.card} style={{ marginTop: 24 }}>
          <ErrorState
            title={error.status === 403 ? 'Not available in your view' : "Can't load the insurance register"}
            detail={error.message}
          />
        </div>
      </main>
    );
  }

  const cov = data?.coverage;

  return (
    <main className={ui.content}>
      <div className={p.head}>
        <div>
          <div className="microlabel" style={{ color: 'var(--teal)' }}>Insurance · client register</div>
          <h1 className={s.title}>Insurance clients</h1>
          <p className={s.lede}>
            Everyone the insurance arm holds a client record for, whether or not they bank
            with us. Most of them hold no account here, so there is no full 360 profile to
            open. The ones marked <span className={p.prospectChip}>No bank record</span> are
            the ones worth a call.
          </p>
        </div>
        {data && data.results.length > 0 && (
          <ExportMenu
            title="Insurance clients"
            subtitle={unbanked ? 'Clients with no bank record' : 'Insurance client register'}
            count={data.results.length}
            source={{
              kind: 'rows',
              build: () => ({
                title: unbanked ? 'Insurance clients with no bank record' : 'Insurance clients',
                columns: [
                  { key: 'cust_id', label: 'Client ref', type: 'text' as const },
                  { key: 'name', label: 'Name', type: 'text' as const },
                  { key: 'client_no', label: 'Insurance client no.', type: 'text' as const },
                  { key: 'id_no', label: 'ID / registration', type: 'text' as const },
                  { key: 'mobile', label: 'Phone', type: 'text' as const },
                  { key: 'policies', label: 'Policies', type: 'num' as const },
                  { key: 'active_policies', label: 'Active', type: 'num' as const },
                  { key: 'premium', label: 'Premium (KES)', type: 'num' as const },
                  { key: 'receipts', label: 'Premium receipts', type: 'num' as const },
                  { key: 'bank_cust_id', label: 'Bank customer', type: 'text' as const },
                ],
                rows: data.results.map((c) => ({
                  cust_id: c.cust_id,
                  name: c.name,
                  client_no: c.insurance.client_no ?? 'No client record',
                  id_no: c.id_no,
                  mobile: c.mobile,
                  policies: c.insurance.policies,
                  active_policies: c.insurance.active_policies,
                  premium: c.insurance.premium,
                  receipts: c.insurance.receipts ?? 'No receipts on file',
                  bank_cust_id: c.insurance.bank_cust_id ?? 'No bank record',
                })),
              }),
            }}
          />
        )}
      </div>

      {cov && (
        <div className={p.coverage}>
          <div className={p.covFig}>
            <span className="microlabel">On the register</span>
            <span className={`${p.covVal} tnum`}>{count(cov.total)}</span>
          </div>
          <div className={p.covFig}>
            <span className="microlabel">Also bank with us</span>
            <span className={`${p.covVal} tnum`}>{count(cov.banked)}</span>
          </div>
          <div className={p.covFig}>
            <span className="microlabel">No bank record</span>
            <span className={`${p.covVal} ${p.covValAccent} tnum`}>{count(cov.unbanked)}</span>
          </div>
          <div className={p.covFig}>
            <span className="microlabel">Receipts only</span>
            <span className={`${p.covVal} tnum`}>{count(cov.receipts_only)}</span>
          </div>
          <p className={p.covNote}>{cov.note}</p>
        </div>
      )}

      <div className={p.filters} style={{ marginBottom: 12 }}>
        <div className={s.searchWrap} style={{ flex: '1 1 380px', margin: 0 }}>
          <svg className={s.searchIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className={s.search}
            placeholder="Search by name, insurance client number, or ID document…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <button
          type="button"
          className={`${p.toggle} ${unbanked ? p.toggleOn : ''}`}
          onClick={() => setUnbanked((v) => !v)}
          aria-pressed={unbanked}
        >
          <span className={p.toggleDot} />
          No bank record only
        </button>
      </div>

      {/* Receipt-only clients have no client number, so there is no stable key to page
          them by. Saying so is the difference between a list that is partial and a
          list that looks complete and is not. */}
      {data?.receipts_only_searchable && (cov?.receipts_only ?? 0) > 0 && (
        <p className={p.foot} style={{ marginTop: 0, marginBottom: 12 }}>
          {count(cov?.receipts_only ?? 0)} clients appear only in the premium receipts and
          have no client record to list. Search by name to reach them.
        </p>
      )}

      <div className={s.list}>
        {!data
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={s.rowSkeleton}><Skeleton height={40} radius={8} /></div>
            ))
          : data.results.map((c) => <ClientRow key={c.cust_id} c={c} />)}
        {data && data.results.length === 0 && (
          <div className={ui.card} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
            {q ? <>No insurance clients match &ldquo;{q}&rdquo;.</> : 'No clients on the insurance register.'}
          </div>
        )}
      </div>

      {data && data.results.length > 0 && (
        <p className={p.foot}>
          {count(data.results.length)} shown · {kes(premium)} of premium across them
          {data.staff_unverified > 0 && (
            <>
              {' '}· HF-staff screening could not be run on {count(data.staff_unverified)} of these
              rows. The rule needs an employer, segment or employee number, and the insurance
              register carries none of those for a client with no bank record.
            </>
          )}
        </p>
      )}
    </main>
  );
}

function ClientRow({ c }: { c: InsuranceClient }) {
  const banked = c.insurance.bank_cust_id;
  // A client who also banks with us has a real 360 profile, which is richer than
  // anything this register holds.
  const href = banked ? `/customers/${banked}` : `/customers/${c.cust_id}`;
  return (
    <Link href={href} className={s.row}>
      <div className={s.rowAvatar}>{c.name ? initials(c.name) : '—'}</div>
      <div className={s.rowMain}>
        <div className={s.rowName}>
          {c.name ?? <em style={{ color: 'var(--ink-3)' }}>Unnamed on the register</em>}
        </div>
        <div className={s.rowMeta}>
          <span className="tnum">{c.insurance.client_no ?? c.cust_id}</span>
          {c.id_no && <> · <span className="tnum">{c.id_no}</span></>}
          {c.mobile && <> · <span className="tnum">{c.mobile}</span></>}
          {' '}
          {banked
            ? <span className={p.bankChip} title={`Also a bank customer (${banked})`}>Bank customer</span>
            : <span className={p.prospectChip}>No bank record</span>}
          {c.insurance.receipts_only && (
            <>
              {' '}
              <span
                className={p.receiptsOnlyChip}
                title="No client record on the insurance register. The only evidence of this relationship is the premiums they have paid."
              >
                Receipts only
              </span>
            </>
          )}
        </div>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Premium</span>
        <span className={`${s.rowFigVal} tnum`}>{kes(c.insurance.premium)}</span>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Policies</span>
        {/* An all-expired book is a retention conversation, not an empty cell. */}
        <span className={`${s.rowFigVal} tnum`} title={c.insurance.policies ? `${c.insurance.active_policies} active` : undefined}>
          {c.insurance.policies ? `${c.insurance.active_policies}/${c.insurance.policies}` : '—'}
        </span>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Receipts</span>
        {/* null means the receipts feed has no row for this client, which is true of
            54% of the register. A bare 0 read as "this client has never paid" about
            someone the feed simply does not reach. */}
        <span
          className={`${s.rowFigVal} tnum`}
          title={c.insurance.receipts == null
            ? 'No premium receipts on file. The receipts feed covers about half the register, so this is not a statement that nothing was paid.'
            : undefined}
        >
          {c.insurance.receipts == null ? '—' : count(c.insurance.receipts)}
        </span>
      </div>
      <svg className={s.rowChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
    </Link>
  );
}
