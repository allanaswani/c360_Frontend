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

export interface CustomerHeader {
  cust_id: string;
  identity: {
    name: Metric<string>;
    segment: Metric<string>;
    branch: Metric<string>;
    rm_name: Metric<string | null>;
    sales_code: Metric<string | null>;
    mobile: Metric<string | null>;
    email: Metric<string | null>;
    id_no: Metric<string | null>;
    active: Metric<boolean>;
  };
  bio?: CustomerBio;
  risk: {
    risk_class: Metric<string | null>;
    crb_status: Metric<string | null>;
    kyc_status: Metric<string | null>;
    relationship_since: Metric<string | null>;
  };
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
export type DomainChart = ChartLines | ChartBars | ChartGrouped | ChartDonut;

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
