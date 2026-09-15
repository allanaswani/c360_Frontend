'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { AuditPage, AuditRow, ChangePage, ChangeRow } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/States';
import { ExportMenu } from '@/components/ExportMenu';
import {
  AdminHeader, AdminNav, AdminOnly, Empty, Panel, Segmented, Toolbar,
} from '@/components/admin/AdminChrome';
import a from '@/components/admin/adminChrome.module.css';
import ui from '@/components/ui.module.css';
import s from './audit.module.css';

const KINDS = ['', 'api', 'click', 'nav', 'page_view', 'auth'];
const ACTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: '+', label: 'Created' },
  { value: '~', label: 'Updated' },
  { value: '-', label: 'Deleted' },
];
const RANGES: { label: string; minutes: number | null }[] = [
  { label: '1h', minutes: 60 }, { label: '24h', minutes: 1440 },
  { label: '7d', minutes: 10080 }, { label: '30d', minutes: 43200 },
  { label: 'All', minutes: null },
];
const PAGE = 50;
const CHANGE_LIMIT = 200;

type Trail = 'activity' | 'changes';

/**
 * The audit screen carries two different questions, so it carries two trails:
 *
 *  · **Activity** — what was *accessed*. Every API call and interaction, with the
 *    route, status and latency. Almost everything this app serves is read-only,
 *    so this is the bulk of it.
 *  · **Changes** — what was *altered*. Accounts, roles, an RM's book, the
 *    recommendation outcomes that become training labels — with the acting user
 *    and the before → after value of every field that moved.
 *
 * Both export the whole filtered set from the server, never the page on screen.
 */
export default function AuditTrailPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [trail, setTrail] = useState<Trail>(params.get('trail') === 'changes' ? 'changes' : 'activity');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [statusF, setStatusF] = useState(params.get('status') ?? '');
  const [action, setAction] = useState('');
  const [model, setModel] = useState('');
  const [range, setRange] = useState<number | null>(1440);
  const [offset, setOffset] = useState(0);

  const [activity, setActivity] = useState<AuditPage | null>(null);
  const [changes, setChanges] = useState<ChangePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The window is sent as a duration, never as a timestamp computed here. Reading
  // the clock during render would give `load` a new identity every render and the
  // debounce effect would re-fire forever; and the server's clock is the one the
  // rows were stamped with, so it should be the one that resolves the window.
  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (range != null) p.set('window', String(range));
    try {
      if (trail === 'activity') {
        if (kind) p.set('kind', kind);
        if (statusF) p.set('status', statusF);
        p.set('limit', String(PAGE));
        p.set('offset', String(offset));
        setActivity(await api.audit(p.toString()));
      } else {
        if (action) p.set('action', action);
        if (model) p.set('model', model);
        p.set('limit', String(CHANGE_LIMIT));
        setChanges(await api.changes(p.toString()));
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [trail, q, kind, statusF, action, model, range, offset]);

  useEffect(() => {
    if (!user?.is_admin) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [user, load]);

  // Paging resets when a filter changes. Done in the handlers rather than an
  // effect watching every filter: that effect would fire an extra render pass on
  // each keystroke, and the reset belongs to the interaction, not to a state sync.
  function onFilter<T>(setter: (value: T) => void) {
    return (value: T) => { setter(value); setOffset(0); };
  }
  const setQFiltered = onFilter(setQ);
  const setKindFiltered = onFilter(setKind);
  const setStatusFiltered = onFilter(setStatusF);
  const setRangeFiltered = onFilter(setRange);
  const setTrailFiltered = onFilter(setTrail);
  const setActionFiltered = onFilter(setAction);
  const setModelFiltered = onFilter(setModel);

  const rangeLabel = RANGES.find((r) => r.minutes === range)?.label ?? 'All';
  const exportParams = {
    window: range ?? undefined, q,
    ...(trail === 'activity' ? { kind, status: statusF } : { action, model }),
  };

  return (
    <main className={ui.content}>
      <AdminOnly what="The audit trail">
      <AdminHeader
        title="Audit trail"
        sub="Who did what, in real system time."
        actions={(
          <ExportMenu
            title={trail === 'activity' ? 'Activity trail' : 'Change audit'}
            subtitle={`${rangeLabel} · ${q ? `search “${q}” · ` : ''}exported from Customer 360`}
            count={trail === 'activity' ? activity?.count : changes?.count}
            source={{ kind: 'server', dataset: trail === 'activity' ? 'activity' : 'changes', params: exportParams }}
          />
        )}
      />
      <AdminNav current="/admin/audit" />

      <div className={s.trailTabs} role="tablist" aria-label="Audit trail">
        <TrailTab active={trail === 'activity'} onClick={() => setTrailFiltered('activity')}
                  label="Activity" note="what was accessed" />
        <TrailTab active={trail === 'changes'} onClick={() => setTrailFiltered('changes')}
                  label="Changes" note="what was altered"
                  badge={changes?.summary.total} />
      </div>

      {trail === 'changes' && changes && (
        <div className={s.summaryStrip}>
          <Summary label="Changes" value={changes.summary.total} tone="ink" />
          <Summary label="Created" value={changes.summary.by_action.created} tone="teal" />
          <Summary label="Updated" value={changes.summary.by_action.updated} tone="ink" />
          <Summary label="Deleted" value={changes.summary.by_action.deleted}
                   tone={changes.summary.by_action.deleted ? 'coral' : 'ink'} />
          <Summary label="People" value={changes.summary.actors} tone="ink" />
          <div className={s.summaryModels}>
            {changes.summary.by_model.length === 0
              ? <span className={s.summaryNone}>No records changed in this range.</span>
              : changes.summary.by_model.map((m) => (
                <span key={m.model} className={s.summaryChip}>{m.model}<b>{m.count}</b></span>
              ))}
          </div>
        </div>
      )}

      <Toolbar trailing={<span className={s.count}>{loading ? '…' : countLabel(trail, activity, changes, offset)}</span>}>
        <input className={s.search}
               placeholder={trail === 'activity' ? 'Search route, user, target…' : 'Search record, user, field…'}
               value={q} onChange={(e) => setQFiltered(e.target.value)} aria-label="Search audit" />
        {trail === 'activity' ? (
          <>
            <select className={s.select} value={kind} onChange={(e) => setKindFiltered(e.target.value)} aria-label="Kind">
              {KINDS.map((k) => <option key={k || 'all'} value={k}>{k || 'All kinds'}</option>)}
            </select>
            <input className={s.statusInput} placeholder="Status" value={statusF}
                   onChange={(e) => setStatusFiltered(e.target.value.replace(/[^0-9]/g, ''))}
                   aria-label="Status code" inputMode="numeric" />
          </>
        ) : (
          <>
            <select className={s.select} value={action} onChange={(e) => setActionFiltered(e.target.value)} aria-label="Action">
              {ACTIONS.map((a) => <option key={a.value || 'all'} value={a.value}>{a.label}</option>)}
            </select>
            <select className={s.select} value={model} onChange={(e) => setModelFiltered(e.target.value)} aria-label="Record type">
              <option value="">All record types</option>
              {(changes?.models ?? []).map((m) => <option key={m.model} value={m.model}>{m.label}</option>)}
            </select>
          </>
        )}
        <Segmented label="Time range" value={range} onChange={setRangeFiltered}
                   options={RANGES.map((r) => ({ label: r.label, value: r.minutes }))} />
      </Toolbar>

      {error && <Panel><span style={{ color: 'var(--coral)' }}>{error}</span></Panel>}

      {trail === 'activity'
        ? <ActivityTable data={activity} offset={offset} onOffset={setOffset} />
        : <ChangeList data={changes} />}
      </AdminOnly>
    </main>
  );
}

function countLabel(trail: Trail, a: AuditPage | null, c: ChangePage | null, offset: number): string {
  if (trail === 'changes') {
    if (!c) return '';
    const capped = c.count >= CHANGE_LIMIT ? ' (most recent)' : '';
    return `${c.count.toLocaleString()} change${c.count === 1 ? '' : 's'}${capped}`;
  }
  if (!a) return '';
  const from = a.count === 0 ? 0 : offset + 1;
  return `${from.toLocaleString()}–${Math.min(offset + PAGE, a.count).toLocaleString()} of ${a.count.toLocaleString()}`;
}

function TrailTab({ active, onClick, label, note, badge }: {
  active: boolean; onClick: () => void; label: string; note: string; badge?: number;
}) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
            aria-label={`${label} trail`}
            className={`${s.trailTab} ${active ? s.trailTabActive : ''}`}>
      <span className={s.trailTabLabel}>
        {label}
        {badge != null && badge > 0 && <span className={s.trailBadge}>{badge}</span>}
      </span>
      <span className={s.trailTabNote}>{note}</span>
    </button>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: 'ink' | 'teal' | 'coral' }) {
  return (
    <div className={s.summaryItem}>
      <span className="microlabel">{label}</span>
      <span className={s.summaryVal} data-tone={tone}>{value.toLocaleString()}</span>
    </div>
  );
}

// --- activity ---------------------------------------------------------------

function ActivityTable({ data, offset, onOffset }: {
  data: AuditPage | null; offset: number; onOffset: (n: number) => void;
}) {
  const rows = data?.results ?? [];
  const total = data?.count ?? 0;
  return (
    <>
      <Panel flush>
        {!data ? <Skeleton height={300} radius={12} /> : (
          <div className={a.tableWrap}>
            <table className={`${a.table} ${s.activityTable}`}>
              <thead>
                <tr>
                  <th className={s.colTime}>Time</th>
                  <th className={s.colUser}>User</th>
                  <th className={s.colKind}>Kind</th>
                  <th className={s.colAction}>Action</th>
                  <th className={`${a.num} ${s.colStatus}`}>Status</th>
                  <th className={s.colTarget}>Target</th>
                  <th className={`${a.num} ${s.colMs}`}>ms</th>
                  <th className={s.colIp}>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8}><Empty title="No events match these filters" /></td></tr>
                )}
                {rows.map((e) => <ActivityRow key={e.id} e={e} />)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className={s.pager}>
        <button className={s.pageBtn} disabled={offset === 0}
                onClick={() => onOffset(Math.max(0, offset - PAGE))}>← Newer</button>
        <button className={s.pageBtn} disabled={offset + PAGE >= total}
                onClick={() => onOffset(offset + PAGE)}>Older →</button>
      </div>
    </>
  );
}

function ActivityRow({ e }: { e: AuditRow }) {
  const d = new Date(e.ts);
  return (
    <tr>
      <td className={s.timeCell}>
        <span className={s.time}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        <span className={s.date}>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
      </td>
      <td className={s.userCell}>{e.username || (e.user_id != null ? `#${e.user_id}` : '—')}</td>
      <td><span className={`${s.kind} ${s['kind_' + e.kind] || ''}`}>{e.kind}</span></td>
      {/* An API call's action is its route; a click's action is WHERE it happened,
          and the label of what was clicked belongs in Target. Falling back to the
          target here printed the same string in both columns for every click. */}
      <td className={s.actionCell}>
        {e.method && <b className={s.method}>{e.method}</b>}
        <span className={s.route}>{e.route || e.path || '—'}</span>
      </td>
      <td className={a.num}>
        {e.status != null && (
          <span className={`${s.status} ${e.status >= 500 ? s.s5 : e.status >= 400 ? s.s4 : s.s2}`}>{e.status}</span>
        )}
      </td>
      <td className={s.targetCell} title={e.target}>{e.target || '—'}</td>
      <td className={`${a.num} ${s.ms}`}>{e.duration_ms ?? ''}</td>
      <td className={s.ipCell}>{e.ip || '—'}</td>
    </tr>
  );
}

// --- changes ----------------------------------------------------------------

/** A change is a record, an actor and a set of field moves — a table row can't
 *  hold that without either truncating the diff or exploding one edit into six
 *  rows, so the change trail is a feed of entries instead. */
function ChangeList({ data }: { data: ChangePage | null }) {
  if (!data) return <Skeleton height={300} radius={12} />;
  if (data.results.length === 0) {
    return (
      <Panel>
        <Empty title="No changes recorded in this range">
          Accounts, roles, RM allocation and recommendation outcomes are the things this
          app can alter. Everything else it serves is read-only warehouse data.
        </Empty>
      </Panel>
    );
  }
  return (
    <div className={s.changeFeed}>
      {data.results.map((row) => <ChangeEntry key={row.id} row={row} />)}
    </div>
  );
}

function ChangeEntry({ row }: { row: ChangeRow }) {
  const d = new Date(row.when);
  return (
    <article className={`${ui.card} ${s.change}`} data-action={row.action_code}>
      <div className={s.changeHead}>
        <span className={s.changeAction} data-action={row.action_code}>{row.action}</span>
        <span className={s.changeModel}>{row.model_label}</span>
        <span className={s.changeObject} title={row.object_label}>{row.object_label || `#${row.object_id}`}</span>
        <span className={s.changeSpacer} />
        <span className={s.changeWho}>
          {row.username ?? 'system'}
          {row.external_actor && (
            <span className={s.changeExternal} title="Signed in with a portfolio token — no local account to link to.">
              portfolio
            </span>
          )}
        </span>
        <time className={s.changeWhen} dateTime={row.when}
              title={d.toLocaleString('en-GB')}>
          {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          <span className={s.changeDate}>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        </time>
      </div>

      {row.changes.length > 0 && (
        <ul className={s.diffList}>
          {row.changes.map((c) => (
            <li key={c.field} className={s.diffRow}>
              <span className={s.diffField}>{c.label}</span>
              <span className={s.diffOld}>{c.old ?? 'empty'}</span>
              <svg className={s.diffArrow} width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" aria-label="changed to"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span className={s.diffNew}>{c.new ?? 'empty'}</span>
            </li>
          ))}
        </ul>
      )}

      {row.no_op && (
        <div className={s.changeNote}>Saved, but no tracked field changed.</div>
      )}
      {row.action_code === '+' && (
        <div className={s.changeNote}>Record created.</div>
      )}
      {row.action_code === '-' && (
        <div className={s.changeNote}>Record deleted.</div>
      )}
      {row.reason && <div className={s.changeReason}>{row.reason}</div>}
    </article>
  );
}
