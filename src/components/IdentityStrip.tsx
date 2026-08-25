import type { CustomerBio } from '@/lib/types';
import s from './ui.module.css';

/** The verification set — the hard-identity facts an RM or teller checks first —
 *  lifted out of the collapsible Bio card to sit directly under the hero. Same
 *  null-guarding as BioPanel: a field with no value is simply absent (an organisation
 *  carries a registration no., not personal IDs), never shown as a bare dash. Renders
 *  nothing when none of the four are present, so the strip never appears empty. */
export function IdentityStrip({ bio }: { bio: CustomerBio | undefined }) {
  if (!bio) return null;

  const v = (m: { value: string | null } | undefined) =>
    m && m.value != null && String(m.value).trim() !== '' ? String(m.value) : null;

  const items: { label: string; value: string | null }[] = [
    { label: 'Customer type', value: v(bio.customer_type) },
    { label: 'ID type', value: v(bio.id_type) },
    { label: 'ID number', value: v(bio.id_no) },
    { label: 'KRA PIN', value: v(bio.kra_pin_status) },
  ].filter((i) => i.value !== null);

  if (items.length === 0) return null;

  return (
    <div className={`${s.idStrip} fadeUp`}>
      {items.map((i) => (
        <div key={i.label} className={s.idStripItem}>
          <span className="microlabel">{i.label}</span>
          <span className={s.idStripVal}>{i.value}</span>
        </div>
      ))}
    </div>
  );
}
