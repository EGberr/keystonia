// Typed client for the Keystonia FastAPI backend (proxied under /api by next.config.ts).

export type Phase = "live" | "funded" | "upcoming" | "closing" | "refunded";

export type Asset = {
  id: string;
  name: string;
  name_fr: string;
  tagline: string;
  tagline_fr: string;
  city: string;
  city_name: string;
  country: string;
  currency: string;
  district: string;
  category: string;
  lat: number;
  lon: number;
  surface_m2: number;
  units: number;
  layout: string;
  year_built: number;
  energy_rating: string;
  operator: string;
  occupancy_pct: number;
  valuation_eur: number;
  share_price_eur: number;
  total_shares: number;
  offered_shares: number;
  retained_shares: number;
  offered_pct: number;
  gross_yield_pct: number;
  net_yield_pct: number;
  annual_noi_eur: number;
  monthly_distribution_eur: number;
  valuation_evidence: { method: string; reference: string; source: string; adjustment: string; indicative: boolean };
  highlights: string[];
  risks: string[];
  images: string[];
  tour?: { pano: string; preview: string; en: string; fr: string }[];
  // live (chain index)
  listed: boolean;
  token: string;
  offering: string;
  phase: Phase;
  shares_sold: number;
  progress_pct: number;
  raised_eur: number;
  investors: number;
  holders: number;
  starts_at: number;
  ends_at: number;
  income_distributed_eur: number;
  income_months: number;
  last_trade_price_eur: number | null;
  last_trade_at: number | null;
};

export type Proposal = {
  id: number;
  asset_id: string;
  asset_name: string;
  title: string;
  proposer: string;
  snapshot: number;
  deadline: number;
  state: "active" | "defeated" | "succeeded" | "executed";
  for: number;
  against: number;
  abstain: number;
  turnout_pct: number;
  quorum_pct: number;
  note: string | null;
  created_at: number;
};

export type AssetDetail = Asset & {
  income_history: { period: string; amount_eur: number; cumulative_eur: number; ts: number; tx: string }[];
  funding_curve: { ts: number; shares: number; pct: number }[];
  recent_investments: { investor: string; who: string | null; shares: number; paid_eur: number; ts: number; tx: string }[];
  order_book: { id: number; seller: string; seller_name: string | null; shares: number; price_eur: number; listed_at: number }[];
  trades: { shares: number; price_eur: number; ts: number; tx: string; buyer: string | null; seller: string | null }[];
  cap_table: { holder: string; name: string | null; shares: number; pct: number; is_issuer: boolean }[];
  proposals: Proposal[];
  documents: string[];
};

export type City = { id: string; name: string; country: string; iso: number; currency: string; lat: number; lon: number; tagline_en: string; tagline_fr: string; assets: number; value_eur: number };
export type Category = { id: string; en: string; fr: string; assets: number };

export type Overview = {
  assets: number;
  tokenized_value_eur: number;
  raised_eur: number;
  income_distributed_eur: number;
  investors: number;
  secondary_volume_eur: number;
  funded_assets: number;
  live_offerings: number;
  avg_net_yield_pct: number;
  cities: City[];
  categories: Category[];
  chain_time: number;
  block: string;
};

export type Activity = { kind: "invest" | "trade" | "income" | "vote"; asset_id: string; asset_name: string; who: string | null; shares: number | null; value_eur: number | null; support: number | null; ts: number; tx: string };

export type Holding = { asset_id: string; name: string; name_fr: string; city_name: string; category: string; image: string; token: string; shares: number; pct: number; value_eur: number; net_yield_pct: number; income_claimed_eur: number; income_withdrawable_eur: number; monthly_income_eur: number };

export type Portfolio = {
  wallet: string;
  profile: { address: string; name: string | null; role: string; country: number | null; kyc: boolean; kyc_expires_at: number | null };
  cash_eur: number;
  portfolio_value_eur: number;
  income_claimed_eur: number;
  income_withdrawable_eur: number;
  monthly_income_eur: number;
  holdings: Holding[];
  pending: { asset_id: string; name: string; name_fr: string; image: string; offering: string; shares: number; value_eur: number; status: "active" | "succeeded" | "failed" }[];
  income_by_month: { period: string; amount_eur: number }[];
  activity: { kind: string; asset_id: string; asset_name: string; shares: number | null; value_eur: number; ts: number; tx: string }[];
};

export type Market = {
  listings: { id: number; asset_id: string; asset_name: string; asset_name_fr: string; city_name: string; image: string; share_price_eur: number; seller: string; seller_name: string | null; shares: number; price_eur: number; premium_pct: number | null; ts: number }[];
  trades: { asset_id: string; asset_name: string; asset_name_fr: string; city_name: string; image: string; shares: number; price_eur: number; ts: number; buyer: string | null; seller: string | null; tx: string }[];
};

export type ListingRequest = { id: number; owner: string; owner_name: string | null; category: string; city: string; uri: string; status: "pending" | "approved" | "rejected"; note: string | null; ts: number };

export type Config = {
  chainId: number;
  rpcUrl: string;
  contracts: { keur: string; identity: string; registry: string; market: string; governor: string };
  demoAccount: string;
  personas: { address: string; index: number; name: string; country: number; role: "investor" | "issuer" }[];
};

export type Health = { status: string; chain_id: number; block: number; chain_time: number; indexed_block: string; assistant: "claude" | "offline"; demo_controls: boolean };

import { STATIC, simulate, staticAssistant, staticGet } from "@/lib/demo";

async function get<T>(path: string): Promise<T> {
  if (STATIC) return staticGet<T>(path);
  const res = await fetch(`/api${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => get<Health>("/health"),
  config: () => get<Config>("/config"),
  overview: () => get<Overview>("/overview"),
  assets: (q = "") => get<Asset[]>(`/assets${q}`),
  asset: (id: string) => get<AssetDetail>(`/assets/${id}`),
  document: async (id: string, kind: string) => {
    if (STATIC) return staticGet<string>(`/assets/${id}/documents/${kind}`);
    const r = await fetch(`/api/assets/${id}/documents/${kind}`, { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return r.text();
  },
  portfolio: (wallet: string) => get<Portfolio>(`/portfolio/${wallet}`),
  market: () => get<Market>("/market"),
  governance: () => get<Proposal[]>("/governance"),
  requests: () => get<ListingRequest[]>("/requests"),
  activity: (limit = 30) => get<Activity[]>(`/activity?limit=${limit}`),
  kyc: (wallet: string, country: number) => (STATIC ? simulate.kyc(wallet, country) : post<{ tx: string }>("/demo/kyc", { wallet, country })),
  faucet: (wallet: string, amount_eur = 10000) => (STATIC ? simulate.faucet(wallet, amount_eur) : post<{ tx: string }>("/demo/faucet", { wallet, amount_eur })),
  advanceMonth: () => (STATIC ? simulate.advanceMonth() : post<{ period: string; income_paid: string[]; offerings_settled: string[] }>("/demo/advance-month", {})),
};

export type StreamEvent =
  | { type: "status"; text: string }
  | { type: "text"; delta: string }
  | { type: "tool_call"; id: string; name: string; input: Record<string, unknown>; is_error: boolean; summary: string }
  | { type: "source"; source: { id: string; asset_id: string; doc: string; title: string; section: string; text: string } }
  | { type: "dataset"; dataset: { id: string; title: string; rows: Record<string, unknown>[] } }
  | { type: "done"; mode: string; model: string; usage: Record<string, number>; latency_ms: number }
  | { type: "error"; message: string };

export async function streamAssistant(
  messages: { role: "user" | "assistant"; content: string }[],
  onEvent: (e: StreamEvent) => void,
  opts: { signal?: AbortSignal; assetId?: string; lang?: "en" | "fr" } = {},
) {
  if (STATIC) return staticAssistant(messages, onEvent, opts);
  const res = await fetch(`/api/assistant`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ messages, asset_id: opts.assetId, lang: opts.lang }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`Assistant request failed (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as StreamEvent);
      } catch {
        /* keep-alive */
      }
    }
  }
}

export type ChartSpec = {
  id: string;
  title: string;
  chart_type: "bar" | "horizontal_bar" | "grouped_bar" | "donut";
  unit: string;
  data: { label: string; value: number; series?: string | null }[];
  source_ids: string[];
};
