'use client';

import s from './ui.module.css';

// All four domains are live in the app. HFCB reads real core-banking queries;
// Whizz / Properties / Bancassurance run on preview data from their verified
// source systems (Kocela MySQL, HFDI CRM, insurance_policies) until the pipelines
// are wired — flagged with a Preview dot, never hidden behind a "coming soon".
const DOMAINS = [
  { key: 'overview', label: 'Overview', preview: false },
  { key: 'hfcb', label: 'HFCB', preview: false },
  { key: 'whizz', label: 'Whizz', preview: true },
  { key: 'properties', label: 'Properties', preview: true },
  { key: 'bancassurance', label: 'Bancassurance', preview: true },
];

export function DomainTabs({ active, onChange }: { active: string; onChange: (k: string) => void }) {
  return (
    <div className={s.tabs} role="tablist">
      {DOMAINS.map((d) => (
        <button
          key={d.key}
          role="tab"
          aria-selected={active === d.key}
          className={`${s.tab} ${active === d.key ? s.tabActive : ''}`}
          onClick={() => onChange(d.key)}
        >
          {d.label}
          {d.preview && <span className={s.tabDot} title="Preview data" />}
        </button>
      ))}
    </div>
  );
}
