/**
 * Every brand name this app puts on screen, in one place.
 *
 * The group has rebranded, and displaying a superseded entity name is a regulatory
 * exposure, not a cosmetic one. Before this existed the old names were typed
 * literally into thirty-odd components, page titles, tooltips, alt text and email
 * bodies — which is precisely the shape of change that gets 90% applied and then
 * quietly ships the old name in a tooltip nobody re-read.
 *
 * So: nothing renders a brand name from a literal. A rename is an edit to this file
 * and it lands everywhere at once.
 *
 * ## What is deliberately NOT in here
 *
 * Code identifiers keep their existing spelling: the `hfcb` domain key in the API,
 * the `HFCBDomain` type, the `hfdi_client_data` warehouse table, the `the property register-` id
 * prefix, the `hfdi_admin` role. Those are contracts with the backend, the
 * warehouse and the portfolio's JWT claims. Renaming them would break the wire
 * format to rename something no user ever sees, and the two kinds of name drift
 * apart anyway — the warehouse table will carry its name long after the marketing
 * one changes again.
 *
 * `DOMAIN_KEY` below is the bridge: the API's by-domain rows are labelled with the
 * display name, so anything matching on those labels reads them from here rather
 * than from a literal that would silently stop matching after a rename.
 */

/** The banking entity — core banking, the app's own brand lockup. */
export const BANK = 'HFCB';

/** The property arm, whose register the property-clients page lists. */
export const PROPERTY = 'HFCB Properties';

/** The bancassurance arm behind the insurance CRM panel. */
export const INSURANCE = 'HFBI';

/** The parent group, for the cross-app launcher. */
export const GROUP = 'HF Group';

/** The digital/mobile product. */
export const DIGITAL = 'Whizz';

/**
 * Display labels the API also uses as by-domain row keys. Kept together so a
 * rename cannot break the colour map and the domain lookups that key off them.
 */
export const DOMAIN_KEY = {
  bank: BANK,
  digital: DIGITAL,
  property: 'Properties',
  insurance: 'Bancassurance',
} as const;

/** Composed strings that appear in more than one place. */
export const BRAND = {
  bank: BANK,
  property: PROPERTY,
  insurance: INSURANCE,
  group: GROUP,
  digital: DIGITAL,
  /** Browser tab / metadata title. */
  appTitle: `Customer 360 · ${BANK}`,
  appDescription:
    `Everything ${BANK} knows about a customer. Portfolio health and next best product, in one instrument.`,
  /** The tag beside the wordmark in the top bar and on the sign-in screen. */
  tag: BANK,
  /** Alt text for the mark. The image FILE keeps its name; only the label moves. */
  markAlt: BANK,
} as const;
