'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { PropertyClient, PropertyClientList } from '@/lib/types';
import { ErrorState, Skeleton } from '@/components/States';
import { ExportMenu } from '@/components/ExportMenu';
import { count, initials, kes, pct } from '@/lib/format';
import { BRAND } from '@/lib/brand';
import s from '../home.module.css';
import p from './propertyClients.module.css';
import ui from '@/components/ui.module.css';

/**
 * The the property register property-client register.
 *
 * A customer list the bank does not own. Customer 360's universe has always been
 * `dim_customer`, the core-banking master, and most property buyers are not in it.
 * They had no page, no search result and no existence in this app at all. That is
 * how a company holding six units and KES 50M of property came to be "not on
 * Customer 360".
 *
 * The page is built around the number that justifies it: how much of the register
 * the bank actually has a relationship with. Everything else follows from this
 * being a sales list rather than a directory, including the unbanked filter and
 * the ordering by holding value.
 */
export default function PropertyClients() {
  const [q, setQ] = useState('');
  const [unbanked, setUnbanked] = useState(false);
  const [data, setData] = useState<PropertyClientList | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    let live = true;
    // Debounced, and the previous error is cleared inside the callback rather than
    // in the effect body — a synchronous setState there cascades a second render on
    // every keystroke.
    const t = setTimeout(() => {
      setError(null);
      api.propertyClients(q, unbanked)
        .then((r) => live && setData(r))
        .catch((e) => live && setError({ status: e.status ?? 0, message: e.message }));
    }, 160);
    return () => { live = false; clearTimeout(t); };
  }, [q, unbanked]);

  const held = useMemo(
    () => (data?.results ?? []).reduce((a, r) => a + (r.property_client.units_value ?? 0), 0),
    [data],
  );

  if (error) {
    return (
      <main className={ui.content}>
        <div className={ui.card} style={{ marginTop: 24 }}>
          <ErrorState
            title={error.status === 403 ? 'Not available in your view' : "Can't load the property register"}
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
          <div className="microlabel" style={{ color: 'var(--teal)' }}>{BRAND.property} · client register</div>
          <h1 className={s.title}>Property clients</h1>
          <p className={s.lede}>
            Everyone who has bought through {BRAND.property}, whether or not they bank with
            us. Most of them hold no account here, so there is no full 360 profile to open.
            The ones marked <span className={p.prospectChip}>No bank record</span> are the
            ones worth a call.
          </p>
        </div>
        {data && data.results.length > 0 && (
          <ExportMenu
            title="Property clients"
            subtitle={unbanked ? 'Clients with no bank record' : `${BRAND.property} property register`}
            count={data.results.length}
            source={{
              kind: 'rows',
              build: () => ({
                title: unbanked ? 'Property clients with no bank record' : 'Property clients',
                columns: [
                  { key: 'cust_id', label: 'Client ref', type: 'text' as const },
                  { key: 'name', label: 'Name', type: 'text' as const },
                  { key: 'id_no', label: 'ID / registration', type: 'text' as const },
                  { key: 'mobile', label: 'Phone', type: 'text' as const },
                  { key: 'email', label: 'Email', type: 'text' as const },
                  { key: 'units', label: 'Units', type: 'num' as const },
                  { key: 'units_value', label: 'Holding value (KES)', type: 'num' as const },
                  { key: 'paid_pct', label: 'Paid %', type: 'num' as const },
                  { key: 'projects', label: 'Projects', type: 'text' as const },
                  { key: 'bank_cust_id', label: 'Bank customer', type: 'text' as const },
                ],
                rows: data.results.map((c) => ({
                  cust_id: c.cust_id,
                  name: c.name,
                  id_no: c.id_no,
                  mobile: c.mobile,
                  email: c.email,
                  units: c.property_client.units,
                  units_value: c.property_client.units_value,
                  paid_pct: c.property_client.paid_pct == null ? null : Math.round(c.property_client.paid_pct * 100),
                  projects: c.property_client.projects.join(', '),
                  // Blank would read as "we checked and they don't bank with us" for
                  // both cases; this says which it is.
                  bank_cust_id: c.property_client.bank_cust_id ?? 'No bank record',
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
            <span className="microlabel">Units held</span>
            <span className={`${p.covVal} tnum`}>{count(cov.units)}</span>
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
            placeholder={`Search by name, national ID, company registration, or ${BRAND.property} client number…`}
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

      <div className={s.list}>
        {!data
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={s.rowSkeleton}><Skeleton height={40} radius={8} /></div>
            ))
          : data.results.map((c) => <ClientRow key={c.cust_id} c={c} />)}
        {data && data.results.length === 0 && (
          <div className={ui.card} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
            {q ? <>No property clients match &ldquo;{q}&rdquo;.</> : 'No property clients on the register.'}
          </div>
        )}
      </div>

      {data && data.results.length > 0 && (
        <p className={p.foot}>
          {count(data.results.length)} shown · {kes(held)} of property across them
          {data.staff_unverified > 0 && (
            <>
              {' '}· HF-staff screening could not be run on {count(data.staff_unverified)} of these
              rows. The rule needs an employer, segment or employee number, and the
              {' '}{BRAND.property} register carries none of those for a client with no
              bank record.
            </>
          )}
        </p>
      )}
    </main>
  );
}

function ClientRow({ c }: { c: PropertyClient }) {
  const banked = c.property_client.bank_cust_id;
  // A client who also banks with us has a real 360 profile, which is richer than
  // anything this register holds — send the RM there, not to the thin page.
  const href = banked ? `/customers/${banked}` : `/customers/${c.cust_id}`;
  return (
    <Link href={href} className={s.row}>
      <div className={s.rowAvatar}>{c.name ? initials(c.name) : '—'}</div>
      <div className={s.rowMain}>
        <div className={s.rowName}>
          {c.name ?? <em style={{ color: 'var(--ink-3)' }}>Unnamed on the register</em>}
        </div>
        <div className={s.rowMeta}>
          <span className="tnum">{c.cust_id}</span>
          {c.id_no && <> · <span className="tnum">{c.id_no}</span></>}
          {c.mobile && <> · <span className="tnum">{c.mobile}</span></>}
          {' '}
          {banked
            ? <span className={p.bankChip} title={`Also a bank customer (${banked})`}>Bank customer</span>
            : <span className={p.prospectChip}>No bank record</span>}
          {c.property_client.projects.length > 0 && (
            <span className={p.projects} title={c.property_client.projects.join(', ')}>
              {' '}· {c.property_client.projects.join(', ')}
            </span>
          )}
        </div>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Holding</span>
        <span className={`${s.rowFigVal} tnum`}>{kes(c.property_client.units_value)}</span>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Units</span>
        <span className={`${s.rowFigVal} tnum`}>{count(c.property_client.units)}</span>
      </div>
      <div className={s.rowFig}>
        <span className="microlabel">Paid</span>
        {/* Genuinely unknown when the client holds no unit yet — an honest dash with
            a reason, not a 0% that would read as "they have paid nothing". */}
        <span className={`${s.rowFigVal} tnum`} title={c.property_client.paid_pct == null ? 'No unit on the register yet' : undefined}>
          {c.property_client.paid_pct == null ? '—' : pct(c.property_client.paid_pct)}
        </span>
      </div>
      <svg className={s.rowChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
    </Link>
  );
}
