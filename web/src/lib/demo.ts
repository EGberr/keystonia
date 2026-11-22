"use client";

// Static demo mode (GitHub Pages). There is no chain and no API: the app reads a snapshot
// exported by backend/app/export_static.py and simulates every transaction in the browser.
// The simulation is an overlay saved in localStorage and applied on top of the snapshot, so
// investing, claiming rent, trading or voting visibly changes the numbers on every page.

import type { AssetDetail, ListingRequest, Market, Portfolio, Proposal, StreamEvent } from "@/lib/api";
import { BASE_PATH } from "@/lib/format";

export const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

type Holding = Portfolio["holdings"][number];
type WalletSim = {
  cash: number;
  kyc?: number; // country code
  shares: Record<string, number>; // asset id -> shares bought on the market or claimed
  pending: Record<string, { shares: number; paid: number; settled: boolean }>;
  accrued: Record<string, number>; // asset id -> rent not yet claimed
  claimed: number;
  votes: Record<number, number>;
  activity: { kind: string; asset_id: string; asset_name: string; shares: number | null; value_eur: number; ts: number; tx: string }[];
};
type Sim = {
  v: 1;
  months: number;
  wallets: Record<string, WalletSim>;
  assets: Record<string, { sold: number; raised: number; investors: number }>;
  removedListings: number[];
  listings: Market["listings"];
  tallies: Record<number, { for: number; against: number; abstain: number }>;
  requests: ListingRequest[];
};

const KEY = "keystonia-sim-v1";
const empty = (): Sim => ({ v: 1, months: 0, wallets: {}, assets: {}, removedListings: [], listings: [], tallies: {}, requests: [] });
let sim: Sim | null = null;

function load(): Sim {
  if (sim) return sim;
  try {
    const raw = localStorage.getItem(KEY);
    sim = raw ? (JSON.parse(raw) as Sim) : empty();
  } catch {
    sim = empty();
  }
  return sim;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(sim));
  } catch {
    /* storage unavailable: the simulation still works for this visit */
  }
}
export function resetSimulation() {
  sim = empty();
  save();
}
function wallet(addr: string): WalletSim {
  const s = load();
  const k = addr.toLowerCase();
  s.wallets[k] ??= { cash: 0, shares: {}, pending: {}, accrued: {}, claimed: 0, votes: {}, activity: [] };
  return s.wallets[k];
}
const fakeHash = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}` as `0x${string}`;
const now = () => Math.floor(Date.now() / 1000);

// ── Snapshot loading ────────────────────────────────────────────────────────
const cache = new Map<string, Promise<unknown>>();
function file<T>(name: string): Promise<T> {
  if (!cache.has(name))
    cache.set(
      name,
      fetch(`${BASE_PATH}/demo/${name}`).then((r) => {
        if (!r.ok) throw new Error(`404 ${name}`);
        return name.endsWith(".md") ? r.text() : r.json();
      }),
    );
  return cache.get(name) as Promise<T>;
}

type AssetLite = { id: string; name: string; name_fr: string; city_name: string; category: string; images: string[]; token: string; offering: string; share_price_eur: number; total_shares: number; offered_shares: number; shares_sold: number; raised_eur: number; investors: number; progress_pct: number; net_yield_pct: number; monthly_distribution_eur: number; phase: string };
async function assetLite(id: string): Promise<AssetLite | undefined> {
  const all = await file<AssetLite[]>("assets.json");
  return all.find((a) => a.id.toLowerCase() === id.toLowerCase() || a.offering.toLowerCase() === id.toLowerCase() || a.token.toLowerCase() === id.toLowerCase());
}

function overlayAsset<T extends AssetLite>(a: T): T {
  const o = load().assets[a.id];
  if (!o) return a;
  const sold = a.shares_sold + o.sold;
  return { ...a, shares_sold: sold, raised_eur: a.raised_eur + o.raised, investors: a.investors + o.investors, progress_pct: Math.min(100, (sold / a.offered_shares) * 100) };
}

function overlayProposal(p: Proposal): Proposal {
  const t = load().tallies[p.id];
  if (!t) return p;
  const f = p.for + t.for;
  const ag = p.against + t.against;
  const ab = p.abstain + t.abstain;
  const total = f + ag + ab;
  const prevTotal = p.for + p.against + p.abstain;
  const supply = prevTotal && p.turnout_pct ? (prevTotal * 100) / p.turnout_pct : total;
  return { ...p, for: f, against: ag, abstain: ab, turnout_pct: supply ? (total / supply) * 100 : p.turnout_pct };
}

function overlayListings(list: Market["listings"]): Market["listings"] {
  const s = load();
  return [...s.listings, ...list.filter((l) => !s.removedListings.includes(l.id))];
}

async function overlayPortfolio(p: Portfolio, addr: string): Promise<Portfolio> {
  const w = wallet(addr);
  const holdings: Holding[] = p.holdings.map((h) => ({ ...h }));
  for (const [aid, shares] of Object.entries(w.shares)) {
    const a = await assetLite(aid);
    if (!a || !shares) continue;
    let h = holdings.find((x) => x.asset_id === aid);
    if (!h) {
      h = { asset_id: aid, name: a.name, name_fr: a.name_fr, city_name: a.city_name, category: a.category, image: a.images[0], token: a.token, shares: 0, pct: 0, value_eur: 0, net_yield_pct: a.net_yield_pct, income_claimed_eur: 0, income_withdrawable_eur: 0, monthly_income_eur: 0 };
      holdings.push(h);
    }
    h.shares += shares;
    h.pct = (h.shares / a.total_shares) * 100;
    h.value_eur = h.shares * a.share_price_eur;
    h.monthly_income_eur = (a.monthly_distribution_eur * h.shares) / a.total_shares;
  }
  for (const h of holdings) h.income_withdrawable_eur += w.accrued[h.asset_id] ?? 0;
  const pending: Portfolio["pending"] = [...p.pending];
  for (const [aid, o] of Object.entries(w.pending)) {
    const a = await assetLite(aid);
    if (!a || !o.shares) continue;
    pending.push({ asset_id: aid, name: a.name, name_fr: a.name_fr, image: a.images[0], offering: a.offering, shares: o.shares, value_eur: o.paid, status: o.settled ? "succeeded" : "active" });
  }
  const withdrawable = holdings.reduce((s, h) => s + h.income_withdrawable_eur, 0);
  return {
    ...p,
    profile: w.kyc ? { ...p.profile, kyc: true, country: w.kyc, kyc_expires_at: now() + 365 * 86400 } : p.profile,
    cash_eur: p.cash_eur + w.cash,
    holdings,
    pending,
    portfolio_value_eur: holdings.reduce((s, h) => s + h.value_eur, 0),
    income_withdrawable_eur: withdrawable,
    income_claimed_eur: p.income_claimed_eur + w.claimed,
    monthly_income_eur: holdings.reduce((s, h) => s + h.monthly_income_eur, 0),
    activity: [...w.activity, ...p.activity],
  };
}

function emptyPortfolio(addr: string): Portfolio {
  return { wallet: addr, profile: { address: addr, name: null, role: "investor", country: null, kyc: false, kyc_expires_at: null }, cash_eur: 0, portfolio_value_eur: 0, income_claimed_eur: 0, income_withdrawable_eur: 0, monthly_income_eur: 0, holdings: [], pending: [], income_by_month: [], activity: [] };
}

/** Static replacement for GET /api/... */
export async function staticGet<T>(path: string): Promise<T> {
  const [route, query] = path.split("?");
  const parts = route.split("/").filter(Boolean);
  const s = load();
  switch (parts[0]) {
    case "health": {
      const h = await file<{ chain_time: number }>("health.json");
      return { ...h, assistant: "offline", chain_time: h.chain_time + s.months * 30 * 86400, demo_controls: true } as T;
    }
    case "config":
    case "governance":
    case "requests":
    case "overview": {
      const data = await file<unknown>(`${parts[0]}.json`);
      if (parts[0] === "governance") return (data as Proposal[]).map(overlayProposal) as T;
      if (parts[0] === "requests") return [...s.requests, ...(data as ListingRequest[])] as T;
      if (parts[0] === "overview") {
        const ov = data as { chain_time: number };
        return { ...ov, chain_time: ov.chain_time + s.months * 30 * 86400 } as T;
      }
      return data as T;
    }
    case "market": {
      const m = await file<Market>("market.json");
      return { ...m, listings: overlayListings(m.listings) } as T;
    }
    case "activity": {
      const limit = Number(new URLSearchParams(query).get("limit") ?? 30);
      const a = await file<unknown[]>("activity.json");
      return a.slice(0, limit) as T;
    }
    case "assets": {
      if (parts.length === 1) return (await file<AssetLite[]>("assets.json")).map(overlayAsset) as T;
      const id = parts[1].toLowerCase();
      if (parts[2] === "documents") return (await file<string>(`doc/${id}-${parts[3]}.md`)) as T;
      const d = await file<AssetDetail>(`asset/${id}.json`);
      return { ...overlayAsset(d as unknown as AssetLite), order_book: d.order_book.filter((o) => !s.removedListings.includes(o.id)).concat(s.listings.filter((l) => l.asset_id === d.id).map((l) => ({ id: l.id, seller: l.seller, seller_name: l.seller_name, shares: l.shares, price_eur: l.price_eur, listed_at: l.ts }))), proposals: d.proposals.map(overlayProposal) } as T;
    }
    case "portfolio": {
      const addr = parts[1];
      const p = await file<Portfolio>(`portfolio/${addr.toLowerCase()}.json`).catch(() => emptyPortfolio(addr));
      return (await overlayPortfolio(p, addr)) as T;
    }
  }
  throw new Error(`404 ${path}`);
}

// ── Simulated transactions ──────────────────────────────────────────────────
function record(addr: string, kind: string, aid: string, name: string, shares: number | null, value: number) {
  wallet(addr).activity.unshift({ kind, asset_id: aid, asset_name: name, shares, value_eur: value, ts: now(), tx: fakeHash() });
}
function done() {
  save();
  return fakeHash();
}

export const simulate = {
  async invest(addr: string, offering: string, shares: number, price: number) {
    const a = await assetLite(offering);
    if (!a) throw new Error("Unknown offering");
    const w = wallet(addr);
    const cost = shares * price;
    const s = load();
    s.assets[a.id] ??= { sold: 0, raised: 0, investors: 0 };
    if (!w.pending[a.id]) s.assets[a.id].investors += 1;
    s.assets[a.id].sold += shares;
    s.assets[a.id].raised += cost;
    w.cash -= cost;
    w.pending[a.id] = { shares: (w.pending[a.id]?.shares ?? 0) + shares, paid: (w.pending[a.id]?.paid ?? 0) + cost, settled: false };
    record(addr, "invest", a.id, a.name, shares, cost);
    return done();
  },
  async claimShares(addr: string, offering: string) {
    const a = await assetLite(offering);
    const w = wallet(addr);
    if (!a || !w.pending[a.id]) throw new Error("Nothing to claim");
    w.shares[a.id] = (w.shares[a.id] ?? 0) + w.pending[a.id].shares;
    delete w.pending[a.id];
    return done();
  },
  async refund(addr: string, offering: string) {
    const a = await assetLite(offering);
    const w = wallet(addr);
    if (!a || !w.pending[a.id]) throw new Error("Nothing to refund");
    w.cash += w.pending[a.id].paid;
    delete w.pending[a.id];
    return done();
  },
  async claimIncome(addr: string, tokens: string[]) {
    const w = wallet(addr);
    const snap = await file<Portfolio>(`portfolio/${addr.toLowerCase()}.json`).catch(() => emptyPortfolio(addr));
    let total = 0;
    for (const t of tokens) {
      const a = await assetLite(t);
      if (!a) continue;
      const fromSnap = snap.holdings.find((h) => h.asset_id === a.id)?.income_withdrawable_eur ?? 0;
      const amount = (w.accrued[a.id] ?? 0) + fromSnap;
      w.accrued[a.id] = -fromSnap; // cancels the snapshot amount in the overlay
      total += amount;
      if (amount > 0) record(addr, "claim", a.id, a.name, null, amount);
    }
    w.cash += total;
    w.claimed += total;
    return done();
  },
  async buy(addr: string, listingId: number, shares: number, price: number) {
    const m = await staticGet<Market>("/market");
    const l = m.listings.find((x) => x.id === listingId);
    if (!l) throw new Error("Listing no longer available");
    const w = wallet(addr);
    const cost = shares * price * 1.01;
    if (cost > (await staticGet<Portfolio>(`/portfolio/${addr}`)).cash_eur) throw new Error("Insufficient kEUR balance");
    const s = load();
    s.removedListings.push(listingId);
    s.listings = s.listings.filter((x) => x.id !== listingId);
    w.cash -= cost;
    w.shares[l.asset_id] = (w.shares[l.asset_id] ?? 0) + shares;
    record(addr, "buy", l.asset_id, l.asset_name, shares, cost);
    return done();
  },
  async list(addr: string, token: string, shares: number, price: number) {
    const a = await assetLite(token);
    if (!a) throw new Error("Unknown token");
    const s = load();
    s.listings.unshift({ id: 100000 + Math.floor(Math.random() * 900000), asset_id: a.id, asset_name: a.name, asset_name_fr: a.name_fr, city_name: a.city_name, image: a.images[0], share_price_eur: a.share_price_eur, seller: addr, seller_name: null, shares, price_eur: price, premium_pct: ((price - a.share_price_eur) / a.share_price_eur) * 100, ts: now() });
    return done();
  },
  async cancel(listingId: number) {
    const s = load();
    s.listings = s.listings.filter((x) => x.id !== listingId);
    s.removedListings.push(listingId);
    return done();
  },
  async vote(addr: string, proposalId: number, support: 0 | 1 | 2) {
    const w = wallet(addr);
    if (w.votes[proposalId] !== undefined) throw new Error("Already voted");
    const props = await file<Proposal[]>("governance.json");
    const p = props.find((x) => x.id === proposalId);
    const port = await staticGet<Portfolio>(`/portfolio/${addr}`);
    const power = port.holdings.find((h) => h.asset_id === p?.asset_id)?.shares ?? 0;
    if (!power) throw new Error("No voting power on this asset at the snapshot");
    const s = load();
    s.tallies[proposalId] ??= { for: 0, against: 0, abstain: 0 };
    s.tallies[proposalId][support === 1 ? "for" : support === 0 ? "against" : "abstain"] += power;
    w.votes[proposalId] = support;
    return done();
  },
  async submitListing(addr: string, category: number, city: string, uri: string) {
    const cats = ["residential", "hospitality", "commercial", "student", "land"];
    load().requests.unshift({ id: 1000 + Math.floor(Math.random() * 9000), owner: addr, owner_name: null, category: cats[category] ?? "residential", city, uri, status: "pending", note: null, ts: now() });
    return done();
  },
  kyc(addr: string, country: number) {
    if (country === 840) throw new Error("U.S. persons cannot be verified (Regulation S)");
    wallet(addr).kyc = country;
    return Promise.resolve({ tx: done() });
  },
  faucet(addr: string, amount = 10000) {
    wallet(addr).cash += amount;
    return Promise.resolve({ tx: done() });
  },
  async advanceMonth() {
    const s = load();
    s.months += 1;
    // Rent for every holding of the active wallet and of every wallet touched in this demo
    // (other profiles are credited when you switch to them), and pending offerings settle.
    const { currentAddress } = await import("@/lib/chain");
    const addrs = [...new Set([currentAddress().toLowerCase(), ...Object.keys(s.wallets)])];
    const portfolios = await Promise.all(addrs.map((a) => staticGet<Portfolio>(`/portfolio/${a}`)));
    const paid: string[] = [];
    addrs.forEach((addr, i) => {
      const w = wallet(addr);
      for (const h of portfolios[i].holdings) {
        if (!h.monthly_income_eur) continue;
        w.accrued[h.asset_id] = (w.accrued[h.asset_id] ?? 0) + h.monthly_income_eur;
        paid.push(h.asset_id);
      }
      for (const o of Object.values(w.pending)) o.settled = true;
    });
    save();
    const d = new Date((await staticGet<{ chain_time: number }>("/health")).chain_time * 1000);
    return { period: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, income_paid: [...new Set(paid)], offerings_settled: [] };
  },
};

// ── In-browser analyst (same event stream as the API's offline analyst) ─────
type Chunk = { id: string; a: string; d: string; t: string; s: string; x: string };
const STOP = new Set("the a an of to in and or is are for on with what how which this that does do i my me it its be as at by from de la le les des du un une et ou est sont pour sur avec quel quelle quels quelles comment ce cette qui que d l".split(" "));
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const terms = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

export async function staticAssistant(messages: { role: string; content: string }[], onEvent: (e: StreamEvent) => void, opts: { assetId?: string; lang?: "en" | "fr" } = {}) {
  const fr = opts.lang === "fr";
  const t0 = performance.now();
  const q = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
  onEvent({ type: "status", text: "Planning the analysis" });
  const [chunks, assets] = await Promise.all([file<Chunk[]>("chunks.json"), file<AssetLite[]>("assets.json")]);
  const fq = fold(q);
  const named = assets.find((a) => fq.includes(fold(a.name)) || fq.includes(fold(a.name_fr)) || fq.includes(a.id.toLowerCase()));
  const scope = named?.id ?? opts.assetId;
  await pause(250);

  if (scope) {
    const a = await staticGet<AssetDetail>(`/assets/${scope.toLowerCase()}`);
    onEvent({ type: "tool_call", id: "s1", name: "get_asset", input: { asset_id: scope }, is_error: false, summary: `${a.name} · ${a.net_yield_pct}% net` });
    onEvent({ type: "dataset", dataset: { id: "D1", title: `${a.name} — key facts`, rows: [{ valuation_eur: a.valuation_eur, net_yield_pct: a.net_yield_pct, share_price_eur: a.share_price_eur, occupancy_pct: a.occupancy_pct, progress_pct: Math.round(a.progress_pct), investors: a.investors }] } });
  }
  const qt = terms(q);
  const pool = chunks.filter((c) => !scope || c.a === scope);
  const scored = pool
    .map((c) => {
      const words = terms(`${c.t} ${c.s} ${c.x}`);
      const set = new Set(words);
      const hits = qt.reduce((s, w) => s + (set.has(w) ? 1 + Math.log(1 + words.filter((x) => x === w).length) : 0), 0);
      return { c, score: hits + (/(risk|risque)/.test(fq) && /risk/i.test(c.s) ? 2 : 0) + (/(valu|évalu|evalu)/.test(fq) && c.d === "valuation" ? 2 : 0) + (/(legal|juridi|spv|structure)/.test(fq) && c.d === "legal" ? 2 : 0) };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 4);
  await pause(300);
  onEvent({ type: "tool_call", id: "s2", name: "search_documents", input: { query: q, asset_ids: scope ? [scope] : undefined, k: 4 }, is_error: false, summary: `${scored.length} passages` });
  scored.forEach(({ c }, i) => onEvent({ type: "source", source: { id: `S${i + 1}`, asset_id: c.a, doc: c.d, title: c.t, section: c.s, text: c.x } }));
  onEvent({ type: "status", text: "Writing the answer" });

  let text = "";
  if (scope) {
    const a = await staticGet<AssetDetail>(`/assets/${scope.toLowerCase()}`);
    text += fr
      ? `**${a.name_fr ?? a.name}** (${a.city_name}) : rendement net de ${a.net_yield_pct} % [D1], valorisé ${Math.round(a.valuation_eur).toLocaleString("fr-FR")} € pour des tokens à ${a.share_price_eur} € [D1].\n\n`
      : `**${a.name}** (${a.city_name}): ${a.net_yield_pct}% net yield [D1], valued at €${Math.round(a.valuation_eur).toLocaleString("en-GB")} with tokens at €${a.share_price_eur} [D1].\n\n`;
  }
  text += fr ? "### Ce que disent les documents\n" : "### What the documents say\n";
  for (const [i, { c }] of scored.entries()) {
    const sentence = c.x.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    text += `- *${c.s}* — ${sentence} [S${i + 1}]\n`;
  }
  text += fr ? "\n*Analyste hors ligne (démo statique) : réponse assemblée à partir des documents cités.*" : "\n*Offline analyst (static demo): answer assembled from the cited documents.*";
  for (const part of text.match(/.{1,24}/gs) ?? []) {
    onEvent({ type: "text", delta: part });
    await pause(12);
  }
  onEvent({ type: "done", mode: "offline", model: "offline", usage: {}, latency_ms: Math.round(performance.now() - t0) });
}
