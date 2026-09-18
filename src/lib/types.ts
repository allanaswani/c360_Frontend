// Contract types — mirror the Django/DRF payloads. Kept in one place so a
// backend change surfaces as a compile error, not a runtime surprise.

export type Provenance = 'live' | 'preview' | 'derived' | 'to_source';

export interface Metric<T = number | string | boolean | null> {
  value: T;
  status: Provenance;
  unit?: string;
  label?: string;
  note?: string;
}

export interface SeriesPoint {
  [key: string]: number | string;
}

export interface Series {
  key: string;
  name: string;
  status: Provenance;
  note?: string;
  points: SeriesPoint[];
}

export interface Meta {
  data_mode: 'mock' | 'live';
  as_of: string;
  period_presets: string[];
  scope: { role: string; whole_book: boolean; can_view_portfolio: boolean };
  provenance_legend: Record<Provenance, string>;
}

/**
 * An property client. A separate universe from `CustomerSummary`: these people
 * are on the property arm's register, not the bank's customer master, and most of
 * them hold no bank record at all — which is why they were invisible in this app
 * until now. Their id is namespaced `the property register-<client_id>` so no bank query can ever
 * resolve it and attach somebody else's balances.
 */
export interface PropertyClient {
  cust_id: string;
  name: string | null;
  segment: string;
  mobile: string | null;
  email: string | null;
  id_no: string | null;
  property_client: {
    client_id: number;
    /** Set when this client ALSO banks with us — link to their full profile. */
    bank_cust_id: string | null;
    units: number;
    units_value: number;
    paid_pct: number | null;
    projects: string[];
    has_pin: boolean;
  };
}

/**
 * An insurance-arm client. A third universe alongside bank customers and property
 * clients, and the one with two tiers: most have a record on the insurance register,
 * a few hundred exist only in its premium receipts because the register never got
 * them. `receipts_only` marks the second kind — they have a name and a count of
 * payments and nothing else.
 */
export interface InsuranceClient {
  cust_id: string;
  name: string | null;
  segment: string;
  mobile: string | null;
  email: string | null;
  id_no: string | null;
  insurance: {
    client_no: string | null;
    /** Set when this client ALSO banks with us — link to their full profile. */
    bank_cust_id: string | null;
    policies: number;
    active_policies: number;
    premium: number;
    sum_insured: number;
    receipts: number;
    /** No client record on the register; premiums paid are the only evidence. */
    receipts_only: boolean;
    sales_person: string | null;
    occupation: string | null;
  };
}

export interface InsuranceClientCoverage {
  total: number;
  banked: number;
  unbanked: number;
  receipts_only: number;
  note: string;
}

export interface InsuranceClientList {
  count: number;
  results: InsuranceClient[];
  coverage: InsuranceClientCoverage | null;
  staff_unverified: number;
  receipts_only: number;
  basis: string;
  /** True while browsing: receipt-only clients have no client number to page by, so
   *  they are reachable by search only and the page must say so. */
  receipts_only_searchable: boolean;
}

export interface PropertyClientCoverage {
  total: number;
  banked: number;
  unbanked: number;
  owners: number;
  units: number;
  note: string;
}

export interface PropertyClientList {
  count: number;
  results: PropertyClient[];
  coverage: PropertyClientCoverage | null;
  /** Rows the staff rule could not be evaluated against (no bank record to check). */
  staff_unverified: number;
  basis: string;
}

export interface CustomerSummary {
  cust_id: string;
  name: string;
  segment: string;
  branch: string;
  sales_code: string;
  rm_name: string | null;
  value?: number;
  deposits?: number;
  loans?: number;
  products_held?: number;
  id_no?: string | null;
  id_type?: string | null;
  customer_type?: string | null;
}

export interface CustomerBio {
  customer_type: Metric<string | null>;
  id_type: Metric<string | null>;
  id_no: Metric<string | null>;
  issuing_authority: Metric<string | null>;
  kra_pin_status: Metric<string | null>;
  date_of_birth: Metric<string | null>;
  gender: Metric<string | null>;
  city_of_birth: Metric<string | null>;
  employer: Metric<string | null>;
  address: Metric<string | null>;
  alt_phone: Metric<string | null>;
  branch: Metric<string | null>;
  account_open_date: Metric<string | null>;
}

export interface CreditBureau {
  no_hit: boolean;
  score: number | null;
  grade: string | null;
  pd: number | null;
  pd_band: string | null;
  non_performing: number;
  arrears_90_days: number;
  max_arrears_6m: number;
  enquiries: number;
  enquiries_90_days: number;
  as_of: string | null;
}

export interface PropertyLeadsCrm {
  lead_count: number;
  stage: string;
  stage_index: number;              // 0..3 position on `funnel`
  stage_kind: 'active' | 'won' | 'lost';
  funnel: string[];                 // the pipeline step labels
  followups: number;
  followups_successful: number;
  bridge: string;
}

export interface InsuranceCrm {
  risk_manager: string | null;
  agent: string | null;
  occupation: string | null;
  branch: string | null;
  location: string | null;
}

export interface CustomerCrm {
  property_leads?: PropertyLeadsCrm | null;
  insurance?: InsuranceCrm | null;
}

export interface Delinquency {
  status: 'npl' | 'watch';
  classification: string;        // Loss | Doubtful | Substandard | Watch
  severity: number;              // 0 (watch) .. 3 (loss)
  accounts: number;
  impairment: number;
  month: string | null;
}

export interface CollateralHeld {
  types: { type: string; count: number }[];
  distinct: number;
}

export interface LendingHealth {
  delinquency?: Delinquency | null;
  collateral?: CollateralHeld | null;
}

// --- observability / audit --------------------------------------------------
export interface ObsSeriesPoint {
  minute: string;
  count: number;
  errors: number;
  client_errors: number;
  rps: number;
  avg_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
}

export interface ObsSummary {
  requests: number;
  errors: number;
  client_errors: number;
  error_rate_pct: number;
  rps_now: number;
  p95_now_ms: number;
  p99_now_ms: number;
  /** null when uptime is not being measured (no heartbeats yet). Must never be
   *  rendered as 0% — that reads as a total outage. */
  uptime_pct: number | null;
  uptime_minutes?: number;
  /** Span uptime was measured over. Below the window = not enough history. */
  uptime_measured_minutes?: number;
  active_users: number;
  instances: number;
}

export interface ObsTopRoute {
  route: string;
  method: string;
  count: number;
  avg_ms: number;
  errors: number;
}

export interface AuditRow {
  id: number;
  ts: string;
  user_id: number | null;
  username: string;
  kind: string;
  method: string;
  route: string;
  path: string;
  status: number | null;
  duration_ms: number | null;
  target: string;
  ip: string | null;
  session: string;
  meta: Record<string, unknown>;
}

export interface ObsOverview {
  generated_at: string;
  window_minutes: number;
  summary: ObsSummary;
  series: ObsSeriesPoint[];
  top_routes: ObsTopRoute[];
  recent_errors: AuditRow[];
}

export interface AuditPage {
  count: number;
  limit: number;
  offset: number;
  results: AuditRow[];
}

/** One field that moved, in a recorded change. */
export interface FieldChange {
  field: string;
  label: string;
  old: string | null;
  new: string | null;
}

/** One recorded create / update / delete on something this app can alter —
 *  an account, a role, an RM's book, a recommendation outcome. */
export interface ChangeRow {
  id: string;
  app_label: string;
  model: string;
  model_label: string;
  object_id: number | string | null;
  object_label: string;
  action: 'created' | 'updated' | 'deleted' | string;
  action_code: '+' | '~' | '-' | string;
  user: string | null;
  username: string | null;
  /** The actor was a portfolio SSO identity with no local account. The name is
   *  real; it just can't be linked to a user record here. */
  external_actor: boolean;
  reason: string;
  when: string;
  changes: FieldChange[];
  /** An update where no tracked field actually differed. */
  no_op: boolean;
}

export interface ChangePage {
  count: number;
  limit: number;
  results: ChangeRow[];
  summary: {
    by_action: { created: number; updated: number; deleted: number };
    by_model: { model: string; count: number }[];
    total: number;
    actors: number;
  };
  models: { model: string; label: string }[];
}

export interface CustomerHeader {
  cust_id: string;
  /** One plain-language line composed server-side from the facts on this page. */
  summary?: string;
  /**
   * Present ONLY when this record is an property client rather than a bank
   * customer. Without it a page full of zeroes and "not sourced" badges reads as
   * broken; with it, the page can say in one line that there is no bank
   * relationship to show — and hand over to the real profile when there is one.
   */
  /** Present ONLY for an insurance-register client. Same purpose as
   *  `property_client`: without it a page of zeroes reads as broken. */
  insurance_client?: {
    client_no: string | null;
    bank_cust_id: string | null;
    policies: number;
    active_policies: number;
    premium: number;
    receipts: number;
    receipts_only: boolean;
  };
  property_client?: {
    client_id: number;
    bank_cust_id: string | null;
    units: number;
    units_value: number;
    paid_pct: number | null;
    projects: string[];
    has_pin: boolean;
  };
  identity: {
    name: Metric<string>;
    segment: Metric<string>;
    branch: Metric<string>;
    rm_name: Metric<string | null>;
    rm_previous?: Metric<string | null> | null;
    sales_code: Metric<string | null>;
    mobile: Metric<string | null>;
    email: Metric<string | null>;
    id_no: Metric<string | null>;
    active: Metric<boolean>;
  };
  bio?: CustomerBio;
  /** TransUnion credit-bureau record, or null when the customer has no bureau record
   *  (or it couldn't be read). A real external feed but a point-in-time pull, so `as_of`
   *  is always shown. `no_hit` = on the bureau but no scoreable history (thin file). */
  credit_bureau?: CreditBureau | null;
  /** Subsidiary CRM: property-sales leads (phone-matched) + insurance CRM profile
   *  (national-ID bridged). Null when the customer has neither. */
  crm?: CustomerCrm | null;
  /** Lending health — delinquency standing (NPL/watch + impairment) and collateral
   *  held. Null when the customer has neither. Display-only. */
  lending?: LendingHealth | null;
  risk: {
    risk_class: Metric<string | null>;
    crb_status: Metric<string | null>;
    kyc_status: Metric<string | null>;
    relationship_since: Metric<string | null>;
  };
  /** Silent-attrition early warning, DERIVED from the deposit-balance trend. Null
   *  when there isn't enough history or the balance is too small to read. */
  retention?: {
    flag: 'stable' | 'watch' | 'at_risk';
    trend_pct: number;
    note: string;
    from?: string;
    to?: string;
    status: Provenance;
  } | null;
}

export interface LinkedMember {
  cust_id: string;
  name: string;
  segment: string;
  branch?: string | null;
  value?: number;
  products_held?: number;
}
export interface LinkedParties {
  basis?: string;
  count: number;
  combined_value?: number;
  members: LinkedMember[];
  /** Related parties from the curated register — a DIFFERENT question from the
   *  members above, which are the same legal person under several customer
   *  numbers. Null when the register is unwired or has nothing visible. */
  related?: RelatedParties | null;
}

/** One party related to this customer, and the role between them. */
export interface RelatedParty {
  cust_id: string;
  name: string | null;
  segment: string | null;
  branch?: string | null;
  value?: number;
  products_held?: number;
  /** Raw register codes, e.g. ['DIRECTOR','SIGNATORY']. */
  roles: string[];
  /** Plain-language equivalents, e.g. ['Director','Signatory']. */
  role_labels: string[];
  /** 'outbound' = this customer holds the role at the other party;
   *  'inbound'  = the other party holds the role here. */
  direction?: 'outbound' | 'inbound' | string;
}

export interface RelatedParties {
  basis: string;
  count: number;
  /** Family ties held back from display; reported so the count is never silently short. */
  withheld_personal: number;
  members: RelatedParty[];
}

export interface ValueSummary {
  headline: {
    relationship_value: Metric;
    deposits: Metric;
    loans: Metric;
    revenue: Metric;
  };
  by_domain: { domain: string; value: number | null; status: Provenance; note?: string }[];
}

export interface CustomerDetail {
  header: CustomerHeader;
  value_summary: ValueSummary;
}

export interface ResolvedPeriod {
  token: string;
  label: string;
  start: string;
  end: string;
  days: number;
}

export interface ChartBlock {
  question: string;
  type: 'dual_line' | 'line' | 'bar' | 'donut';
  status?: Provenance;
  note?: string;
  series?: Series[];
  bars?: { product: string; balance: number; side: 'deposit' | 'loan' }[];
  slices?: { channel: string; share: number }[];
  empty_reason?: string | null;
}

export interface TableBlock {
  status: Provenance;
  note?: string;
  columns: string[];
  rows: Record<string, string | number>[];
}

export interface HFCBDomain {
  cust_id: string;
  period: ResolvedPeriod;
  metrics: {
    total_deposits: Metric;
    total_loans: Metric;
    net_position: Metric;
    products_held: Metric;
    revenue: Metric;
    loan_to_deposit: Metric;
    active_channels: Metric;
    aum: Metric;
    profitability: Metric;
    npl_status: Metric;
  };
  charts: {
    balance_trend: ChartBlock;
    disbursement_vs_balance: ChartBlock;
    product_holdings: ChartBlock;
    transaction_trend: ChartBlock;
    channel_usage: ChartBlock;
  };
  tables: {
    product_uptake: TableBlock;
    recent_transactions: TableBlock;
  };
}

export interface RecommendationItem {
  /** A few words for a table column. The full `reason` opens with the same
   *  boilerplate on every model-generated row, so truncating it in the worklist
   *  showed every customer the identical string. */
  reason_short?: string;
  product: string;
  product_name: string;
  domain: string;
  reason: string;
  rule_id: string;
  score: number | null;
  eligible: boolean | null;
}

// ---- Generic non-core domain payload (Whizz / Properties / Bancassurance) ----
export type ValueFmt = 'kes' | 'count' | 'pct';

export interface DomainMetric {
  label: string;
  value: number;
  unit: 'KES' | 'count' | 'pct';
  status: Provenance;
  lead?: boolean;
  tone?: 'pos' | 'neg';
  meta?: string;
  /** Optional mini-trend rendered as a sparkline under the figure (e.g. daily Whizz
   *  transactions / value moved). Omitted for snapshot metrics that have no series. */
  spark?: number[];
}

export interface ChartLines {
  kind: 'lines';
  id: string; title: string; question: string; status: Provenance; fmt: ValueFmt;
  series: { name: string; dataKey: string; colorRole: number }[];
  data: Record<string, number | string>[];
}
export interface ChartBars {
  kind: 'bars';
  id: string; title: string; question: string; status: Provenance; fmt: ValueFmt;
  data: { label: string; value: number; colorRole: number }[];
}
export interface ChartGrouped {
  kind: 'grouped';
  id: string; title: string; question: string; status: Provenance; fmt: ValueFmt;
  seriesNames: [string, string];
  data: { label: string; a: number; b: number }[];
}
export interface ChartDonut {
  kind: 'donut';
  id: string; title: string; question: string; status: Provenance; fmt: ValueFmt;
  data: { label: string; value: number }[];
}
export interface ChartMeters {
  kind: 'meters';
  id: string; title: string; question: string; status: Provenance; fmt: ValueFmt;
  /** value is a 0–1 completion fraction; paid/total (optional) drive the KES caption. */
  data: { label: string; value: number; paid?: number; total?: number }[];
}
export type DomainChart = ChartLines | ChartBars | ChartGrouped | ChartDonut | ChartMeters;

export interface DomainTable {
  id: string; title: string; status: Provenance; note?: string;
  columns: string[]; rows: Record<string, string | number>[];
}

export interface DomainPayload {
  cust_id: string;
  domain: string;
  preview: boolean;
  period?: ResolvedPeriod;
  metrics: DomainMetric[];
  charts: DomainChart[];
  tables: DomainTable[];
  empty_reason?: string;
  /** True when the domain's SOURCE couldn't be read (error, or the source table is
   *  empty/unreachable) — as opposed to the customer genuinely holding none. The UI
   *  renders this as an honest "couldn't load" state with a retry, never as empty. */
  unavailable?: boolean;
}

// ---- Level 2 Customer overview ----
export interface DomainSlice { domain: string; value: number; status: Provenance; note?: string }
export interface DomainSnapshot { domain: string; tab: string; status: Provenance; label: string; value: number | null; sub: string }
export interface CustomerOverview {
  cust_id: string;
  period: ResolvedPeriod;
  relationship_value: Metric<number>;
  value_by_domain: { question: string; note?: string; slices: DomainSlice[] };
  relationship_trend: { question: string; status: Provenance; note?: string; split: string[]; series: { period: string; deposits: number; loans: number }[] };
  domain_snapshots: DomainSnapshot[];
}

// ---- Level 1 Portfolio ----
export interface SegmentRow { segment: string; customers: number; value: number; deposits: number; loans: number }
export interface RiskRow { class: string; customers: number }
export interface MoverRow {
  cust_id: string; name: string; segment: string; value: number;
  delta_pct: number; delta_value: number; direction: 'up' | 'down';
}
export interface BalancePoint { period: string; balance: number }

export interface PortfolioOverview {
  scope: { whole_book: boolean; customers_in_view: number; role: string; live_sample?: boolean; sample_note?: string | null };
  period: ResolvedPeriod;
  summary: {
    customers: Metric<number>;
    active_customers?: Metric<number>;
    relationship_value: Metric<number>;
    deposits: Metric<number>;
    loans: Metric<number>;
    avg_products: Metric<number>;
  };
  segment_mix: { question: string; status: Provenance; rows: SegmentRow[] };
  risk_distribution: { question: string; status: Provenance; note?: string; rows: RiskRow[] };
  book_trend: { question: string; status: Provenance; note?: string; series: { deposits: BalancePoint[]; loans: BalancePoint[] } };
  segment_value_trend: { question: string; status: Provenance; note?: string; segments: string[]; data: Record<string, number | string>[] };
  top_movers: { question: string; status: Provenance; note?: string; rows: MoverRow[] };
  top_products?: { question: string; status: Provenance; rows: { product: string; value: number; customers: number }[] };
  cache: { cached: boolean; age_seconds: number };
}

export interface WorklistRow extends CustomerSummary {
  recommendation: RecommendationItem;
  recommendation_status: 'ok' | 'eligibility_hold' | 'eligibility_pending';
}
export interface Worklist { count: number; results: WorklistRow[] }

export interface Recommendations {
  status: 'ok' | 'eligibility_hold' | 'eligibility_pending';
  engine_version: string;
  eligibility: {
    gate_evaluable: boolean;
    risk_class: string | null;
    kyc_status: string | null;
    passed?: boolean;
    basis?: string;
    risk_factors?: string[];
    kyc_checks?: { key: string; label: string; ok: boolean }[];
    note: string | null;
  };
  items: RecommendationItem[];
  withheld: RecommendationItem[];
}
