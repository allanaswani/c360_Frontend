'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { CustomerDetail, CustomerOverview, DomainPayload, HFCBDomain, LinkedParties as LinkedPartiesData, Recommendations } from '@/lib/types';
import { CustomerHeader } from '@/components/CustomerHeader';
import { BioPanel } from '@/components/BioPanel';
import { LinkedParties } from '@/components/LinkedParties';
import { DomainTabs } from '@/components/DomainTabs';
import { PeriodFilter } from '@/components/PeriodFilter';
import { RecommendationPanel } from '@/components/RecommendationPanel';
import { OverviewView } from '@/components/OverviewView';
import { HFCBView } from '@/components/HFCBView';
import { DomainView } from '@/components/DomainView';
import { ErrorState, Skeleton } from '@/components/States';
import ui from '@/components/ui.module.css';

const DOMAIN_LABEL: Record<string, { title: string; sub: string }> = {
  overview: { title: 'Overview', sub: 'Where value sits across domains, and the trend' },
  hfcb: { title: 'HFCB · Core banking', sub: 'Deposits, lending and channel activity' },
  whizz: { title: 'Whizz · Digital', sub: 'Mobile wallet and digital lending' },
  properties: { title: 'Properties', sub: 'Real-estate holdings and loan-to-value' },
  bancassurance: { title: 'Bancassurance', sub: 'Insurance policies and premiums' },
};

const VALID_PERIODS = new Set(['7D', '30D', 'QTD', 'YTD']);

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // URL is the source of truth for period + tab → every view is shareable.
  const period = VALID_PERIODS.has(search.get('period') ?? '') ? search.get('period')! : '30D';
  const tab = search.get('tab') ?? 'overview';

  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [linked, setLinked] = useState<LinkedPartiesData | null>(null);
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [overview, setOverview] = useState<CustomerOverview | null>(null);
  const [hfcb, setHfcb] = useState<HFCBDomain | null>(null);
  const [other, setOther] = useState<DomainPayload | null>(null);
  const [meta, setMeta] = useState<{ as_of: string } | null>(null);
  const [error, setError] = useState<{ code: number; msg: string } | null>(null);
  // Bumped to force a re-fetch of the active domain payload (the "Retry" affordance
  // on an unavailable domain, so an RM can recover without reloading the whole page).
  const [reloadTick, setReloadTick] = useState(0);

  const setParam = useCallback(
    (key: string, val: string) => {
      const next = new URLSearchParams(search.toString());
      next.set(key, val);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [search, router, pathname],
  );

  // Identity, recommendations and meta — fetched once per customer.
  useEffect(() => {
    let live = true;
    setError(null);
    setDetail(null);
    setLinked(null);
    Promise.all([api.customer(id), api.recommendations(id), api.meta()])
      .then(([d, r, m]) => {
        if (!live) return;
        setDetail(d);
        setRecs(r);
        setMeta({ as_of: m.as_of });
      })
      .catch((e: ApiError) => live && setError({ code: e.status, msg: e.message }));
    // Linked parties load independently — a slow or empty result never blocks the page.
    api.linked(id).then((l) => live && setLinked(l)).catch(() => live && setLinked(null));
    return () => { live = false; };
  }, [id]);

  // Active-tab payload — re-fetched whenever the tab or global period changes.
  useEffect(() => {
    let live = true;
    setOverview(null);
    setHfcb(null);
    setOther(null);
    if (tab === 'overview') {
      api.overview(id, period).then((d) => live && setOverview(d)).catch(() => live && setOverview(null));
    } else if (tab === 'hfcb') {
      api.hfcb(id, period).then((d) => live && setHfcb(d)).catch(() => live && setHfcb(null));
    } else {
      api.domain(id, tab, period).then((d) => live && setOther(d)).catch(() => live && setOther(null));
    }
    return () => { live = false; };
  }, [id, period, tab, reloadTick]);

  if (error) {
    return (
      <main className={ui.content}>
        <div className={ui.card} style={{ marginTop: 24 }}>
          <ErrorState
            title={error.code === 403 ? 'Outside your book' : error.code === 404 ? 'Customer not found' : "Couldn't load this customer"}
            detail={error.msg}
          />
        </div>
      </main>
    );
  }

  return (
    <main className={ui.content}>
      {detail && meta ? (
        <CustomerHeader header={detail.header} value={detail.value_summary} asOf={meta.as_of} />
      ) : (
        <Skeleton height={168} radius={12} />
      )}

      {detail?.header.bio && (
        <div style={{ marginTop: 12 }}>
          <BioPanel bio={detail.header.bio} />
        </div>
      )}

      {linked && linked.count > 0 && (
        <div style={{ marginTop: 12 }}>
          <LinkedParties data={linked} />
        </div>
      )}

      {/* Next Best Product is customer-level — a full-width band up top, so it's
          the first thing an RM sees regardless of which tab they're on. */}
      <div style={{ marginTop: 12 }}>
        {recs ? <RecommendationPanel data={recs} custId={id} layout="row" /> : <Skeleton height={150} radius={12} />}
      </div>

      <DomainTabs active={tab} onChange={(k) => setParam('tab', k)} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{(DOMAIN_LABEL[tab] ?? DOMAIN_LABEL.hfcb).title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
            {(DOMAIN_LABEL[tab] ?? DOMAIN_LABEL.hfcb).sub} · one control drives every chart below
          </div>
        </div>
        <PeriodFilter value={period} onChange={(p) => setParam('period', p)} />
      </div>

      <div key={tab} className={ui.tabPane}>
        {tab === 'overview' ? (
          <OverviewView overview={overview} onOpenDomain={(t) => setParam('tab', t)} />
        ) : tab === 'hfcb' ? (
          <HFCBView domain={hfcb} />
        ) : (
          <DomainView payload={other} onRetry={() => setReloadTick((n) => n + 1)} />
        )}
      </div>
    </main>
  );
}
