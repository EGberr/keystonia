"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Address } from "viem";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import dynamic from "next/dynamic";
import { ArrowLeft, Box as BoxIcon, Building2, Image as ImageIcon, CalendarDays, Check, Copy, FileText, Gauge, Layers, Leaf, MapPin, Minus, Plus, ShieldCheck, Users } from "lucide-react";
import { api, type AssetDetail, type Config, type Health, type Portfolio } from "@/lib/api";
import { actions } from "@/lib/actions";
import { demoCall, runTx, useApi, useWallet } from "@/lib/chain";
import { COUNTRIES, compactEur, countdown, cx, dateLabel, eur, num, pct, shortAddr } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";
import { PhaseBadge, ProgressBar, useCategoryLabel } from "@/components/asset-card";
import { AssetMap } from "@/components/asset-map";
import { Analyst } from "@/components/analyst";
import { Columns } from "@/components/charts";
import { Photo } from "@/components/photo";
import { ProposalCard } from "@/components/proposal-card";
import { ErrorState, Panel, Skeleton } from "@/components/ui";

const PanoTour = dynamic(() => import("@/components/three/pano-tour"), { ssr: false });

const TABS = ["overview", "financials", "documents", "ownership", "market", "governance"] as const;
type Tab = (typeof TABS)[number];
const DOCS = ["memorandum", "valuation", "technical", "legal"] as const;

function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_140px]">
      <Photo src={images[i]} alt={alt} className="aspect-[16/10]" rounded="rounded-3xl" sizes="(max-width: 768px) 100vw, 900px" priority />
      <div className="flex gap-2 md:flex-col">
        {images.map((src, k) => (
          <button key={src} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={cx("flex-1 overflow-hidden rounded-2xl ring-offset-2 ring-offset-bg transition", k === i ? "ring-2 ring-accent-ink" : "opacity-70 hover:opacity-100")}>
            <Photo src={src} alt="" className="aspect-[4/3] md:aspect-auto md:h-full" rounded="rounded-2xl" sizes="140px" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Top of the asset page: the 3D walkthrough first, photos one click away. */
function MediaStage({ a }: { a: AssetDetail }) {
  const { t, pick } = useLang();
  const [mode, setMode] = useState<"tour" | "photos">("tour");
  return (
    <div>
      <div className="mb-4 flex gap-1.5">
        {(
          [
            ["tour", BoxIcon, t("asset.walk")],
            ["photos", ImageIcon, t("asset.photos")],
          ] as const
        ).map(([m, Icon, label]) => (
          <button key={m} onClick={() => setMode(m)} className={cx("flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition", mode === m ? "bg-ink text-white" : "border hairline bg-surface text-ink-2 hover:text-ink")}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      {mode === "tour" ? <PanoTour asset={a} /> : <Gallery images={a.images} alt={pick(a, "name")} />}
    </div>
  );
}

function Copyable({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="num inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink"
    >
      {shortAddr(value)} {done ? <Check size={12} className="text-positive" /> : <Copy size={12} />}
    </button>
  );
}

function InvestBox({ a, now, portfolio, config }: { a: AssetDetail; now: number; portfolio?: Portfolio; config?: Config }) {
  const { t, lang } = useLang();
  const wallet = useWallet();
  const remaining = a.offered_shares - a.shares_sold;
  const maxShares = Math.max(1, Math.min(remaining, 500));
  const [shares, setShares] = useState(10);
  const qty = Math.min(Math.max(1, shares), maxShares);
  const cost = qty * a.share_price_eur;
  const monthly = (a.monthly_distribution_eur / a.total_shares) * qty;
  const kyc = portfolio?.profile.kyc;
  const usPerson = portfolio?.profile.country === 840;
  const cash = portfolio?.cash_eur ?? 0;
  const live = a.phase === "live" && a.ends_at > now;

  const invest = () =>
    config && runTx(`${t("invest.box.cta")} · ${qty} ${t("common.shares")}`, actions.invest(config.contracts.keur as Address, a.offering as Address, qty, a.share_price_eur), wallet.state, t("invest.box.success"));

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-[30px] leading-none">{eur(a.share_price_eur, 0, lang)}</p>
        <p className="text-[12px] text-muted">/ {t("common.share")}</p>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[12px]">
          <span className="num font-medium">{pct(a.progress_pct, 0)} {t("asset.funded")}</span>
          <span className="text-muted">{a.phase === "live" ? countdown(a.ends_at - now, lang) : t(`phase.${a.phase}` as TKey)}</span>
        </div>
        <ProgressBar value={a.progress_pct} />
        <div className="num mt-2 flex justify-between text-[11.5px] text-muted">
          <span>{compactEur(a.raised_eur, lang)} / {compactEur(a.offered_shares * a.share_price_eur, lang)}</span>
          <span>{a.investors} {t("asset.investors")}</span>
        </div>
      </div>

      {live ? (
        <div className="mt-5 border-t hairline pt-4">
          <label className="text-[12px] text-muted">{t("invest.box.shares")}</label>
          <div className="mt-1.5 flex items-center gap-2">
            <button onClick={() => setShares(Math.max(1, qty - 1))} aria-label="-1" className="flex h-10 w-10 items-center justify-center rounded-xl border hairline hover:bg-surface-2"><Minus size={15} /></button>
            <input type="number" min={1} max={maxShares} value={shares} onChange={(e) => setShares(Number(e.target.value) || 1)} className="num h-10 flex-1 rounded-xl border hairline bg-surface text-center text-[16px] font-semibold outline-none focus:border-accent-ink" />
            <button onClick={() => setShares(Math.min(maxShares, qty + 1))} aria-label="+1" className="flex h-10 w-10 items-center justify-center rounded-xl border hairline hover:bg-surface-2"><Plus size={15} /></button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[5, 10, 25, 50].filter((n) => n <= maxShares).map((n) => (
              <button key={n} onClick={() => setShares(n)} className={cx("num flex-1 rounded-lg border py-1 text-[12px]", qty === n ? "border-ink bg-ink text-bg" : "hairline hover:bg-surface-2")}>{n}</button>
            ))}
          </div>
          <dl className="mt-4 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted">{t("invest.box.cost")}</dt><dd className="num font-semibold">{eur(cost, 0, lang)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("invest.box.monthly")}</dt><dd className="num text-accent-ink">≈ {eur(monthly, 2, lang)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("invest.box.balance")}</dt><dd className={cx("num", cash < cost && "text-negative")}>{eur(cash, 0, lang)} kEUR</dd></div>
          </dl>
          {usPerson ? (
            <p className="mt-4 rounded-xl bg-warning/10 p-3 text-[12.5px] text-warning">{t("invest.box.us")}</p>
          ) : !kyc ? (
            <Link href="/portfolio#kyc" className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-medium text-bg">
              <ShieldCheck size={16} /> {t("invest.box.verify")}
            </Link>
          ) : cash < cost ? (
            <button onClick={() => demoCall(t("portfolio.faucet"), () => api.faucet(wallet.address), t("portfolio.faucet_done"))} className="mt-4 h-11 w-full rounded-xl border hairline text-[14px] font-medium hover:bg-surface-2">
              {t("portfolio.faucet")}
            </button>
          ) : (
            <button onClick={invest} disabled={!config} className="mt-4 h-11 w-full rounded-xl bg-accent-ink text-[14px] font-medium text-bg transition hover:brightness-110 disabled:opacity-50">
              {t("invest.box.cta")} {eur(cost, 0, lang)}
            </button>
          )}
          <p className="mt-3 text-[11.5px] leading-snug text-muted">{t("invest.box.escrow")}</p>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-surface-2 p-3 text-[12.5px] leading-snug text-ink-2">
          {a.phase === "upcoming" ? `${t("invest.box.upcoming")} ${dateLabel(a.starts_at, lang)}.` : t("invest.box.funded")}
        </p>
      )}
    </div>
  );
}

function Overview({ a }: { a: AssetDetail }) {
  const { t, lang } = useLang();
  const facts: [TKey, string, typeof Building2][] = [
    ["asset.surface", `${num(a.surface_m2, lang)} m²`, Layers],
    ["asset.layout", a.layout, Building2],
    ["asset.built", String(a.year_built), CalendarDays],
    ["asset.energy", a.energy_rating, Leaf],
    ["asset.operator", a.operator, Users],
    ["asset.occupancy", pct(a.occupancy_pct, 0), Gauge],
  ];
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title={t("asset.highlights")}>
          <ul className="space-y-2.5">
            {a.highlights.map((h) => (
              <li key={h} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2"><Check size={15} className="mt-0.5 shrink-0 text-positive" />{h}</li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("asset.risks")}>
          <ul className="space-y-2.5">
            {a.risks.map((h) => (
              <li key={h} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />{h}</li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title={t("asset.facts")}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {facts.map(([k, v, Icon]) => (
            <div key={k} className="flex gap-3">
              <Icon size={16} className="mt-0.5 shrink-0 text-accent-ink" />
              <div className="min-w-0"><dt className="text-[11.5px] text-muted">{t(k)}</dt><dd className="truncate text-[13.5px] font-medium">{v}</dd></div>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title={t("asset.location")} subtitle={`${a.district}, ${a.city_name}`}>
        <AssetMap assets={[a]} height={300} />
      </Panel>
      {a.recent_investments.length > 0 && (
        <Panel title={t("asset.recent")}>
          <ul className="divide-y divide-line">
            {a.recent_investments.slice(0, 8).map((r) => (
              <li key={r.tx} className="flex items-center gap-3 py-2 text-[13px]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium">{(r.who ?? "?").slice(0, 1)}</span>
                <span className="flex-1 truncate">{r.who ?? shortAddr(r.investor)}</span>
                <span className="num text-ink-2">{r.shares} {t("common.shares")}</span>
                <span className="num w-20 text-right font-medium">{eur(r.paid_eur, 0, lang)}</span>
                <span className="w-24 text-right text-[11.5px] text-muted">{dateLabel(r.ts, lang, false)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Financials({ a }: { a: AssetDetail }) {
  const { t, lang } = useLang();
  const ev = a.valuation_evidence;
  const rows: [TKey, string][] = [
    ["asset.valuation", eur(a.valuation_eur, 0, lang)],
    ["asset.gross_yield", pct(a.gross_yield_pct)],
    ["asset.net_yield", pct(a.net_yield_pct)],
    ["asset.noi", eur(a.annual_noi_eur, 0, lang)],
    ["asset.monthly", eur(a.monthly_distribution_eur, 0, lang)],
    ["asset.offered", `${num(a.offered_shares, lang)} (${pct(a.offered_pct, 0)})`],
    ["asset.retained", num(a.retained_shares, lang)],
  ];
  const curve = a.funding_curve.map((p) => ({ label: dateLabel(p.ts, lang, false), pct: p.pct }));
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title={t("asset.economics")}>
          <dl className="divide-y divide-line text-[13.5px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2"><dt className="text-ink-2">{t(k)}</dt><dd className="num font-medium">{v}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel title={t("asset.valuation_evidence")}>
          <dl className="space-y-3 text-[13px]">
            <div><dt className="text-[11.5px] text-muted">{t("asset.method")}</dt><dd className="mt-0.5 text-ink-2">{ev.method}</dd></div>
            <div><dt className="text-[11.5px] text-muted">{t("asset.reference")}</dt><dd className="mt-0.5 text-ink-2">{ev.reference}</dd></div>
            <div><dt className="text-[11.5px] text-muted">{t("asset.source")}</dt><dd className="mt-0.5 text-ink-2">{ev.source}</dd></div>
            <p className="rounded-xl bg-surface-2 p-2.5 text-[12px] text-ink-2">{ev.adjustment}</p>
            {ev.indicative && <p className="text-[11.5px] text-warning">{t("asset.indicative")}</p>}
          </dl>
        </Panel>
      </div>
      {a.income_history.length > 0 && (
        <Panel title={t("asset.income_history")} subtitle={`${t("asset.income_history_sub")} · ${eur(a.income_distributed_eur, 0, lang)}`}>
          <Columns data={a.income_history.map((h) => ({ label: h.period, value: h.amount_eur }))} unit="EUR" height={240} />
        </Panel>
      )}
      {curve.length > 1 && (
        <Panel title={t("asset.funding_curve")}>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={curve} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fund" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-ink)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent-ink)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }} />
                <Area type="stepAfter" dataKey="pct" stroke="var(--accent-ink)" strokeWidth={2} fill="url(#fund)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Documents({ a }: { a: AssetDetail }) {
  const { t } = useLang();
  const [doc, setDoc] = useState<(typeof DOCS)[number]>("memorandum");
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api.document(a.id, doc).then((s) => live && setText(s)).catch(() => live && setText(`_${t("common.error")}_`));
    return () => {
      live = false;
    };
  }, [a.id, doc, t]);
  return (
    <div className="grid gap-5 md:grid-cols-[200px_1fr]">
      <nav className="flex gap-1.5 overflow-x-auto md:flex-col">
        {DOCS.map((d) => (
          <button key={d} onClick={() => { setText(null); setDoc(d); }} className={cx("flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-[13px]", doc === d ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2")}>
            <FileText size={14} /> {t(`asset.doc.${d}` as TKey)}
          </button>
        ))}
      </nav>
      <article className="card min-h-[420px] p-6">
        {text === null ? (
          <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4 w-4/5" /></div>
        ) : (
          <div className="prose-answer prose-doc"><ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown></div>
        )}
      </article>
    </div>
  );
}

function Ownership({ a }: { a: AssetDetail }) {
  const { t, lang } = useLang();
  return (
    <div className="grid gap-5">
      <Panel title={t("asset.cap_table")} subtitle={`${t("asset.cap_table_sub")} · ${a.holders} ${t("asset.holders")}`}>
        <ul className="space-y-2.5">
          {a.cap_table.map((h) => (
            <li key={h.holder} className="text-[13px]">
              <div className="mb-1 flex items-center gap-2">
                <span className={cx("flex-1 truncate", h.is_issuer && "font-medium")}>
                  {h.name ?? shortAddr(h.holder)} {h.is_issuer && <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent-ink">{t("asset.owner")}</span>}
                </span>
                <span className="num text-ink-2">{num(h.shares, lang)}</span>
                <span className="num w-14 text-right font-medium">{pct(h.pct)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className={cx("h-full rounded-full", h.is_issuer ? "bg-accent" : "bg-accent-ink")} style={{ width: `${Math.max(1, h.pct)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={t("asset.contracts")}>
        <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
          <div><dt className="text-[11.5px] text-muted">{t("asset.token")} · ERC-3643-style</dt><dd><Copyable value={a.token} /></dd></div>
          <div><dt className="text-[11.5px] text-muted">{t("asset.offering_contract")}</dt><dd><Copyable value={a.offering} /></dd></div>
        </dl>
      </Panel>
    </div>
  );
}

function MarketTab({ a, portfolio, config }: { a: AssetDetail; portfolio?: Portfolio; config?: Config }) {
  const { t, lang } = useLang();
  const wallet = useWallet();
  const held = portfolio?.holdings.find((h) => h.asset_id === a.id)?.shares ?? 0;
  const listed = a.order_book.filter((o) => o.seller.toLowerCase() === wallet.address.toLowerCase()).reduce((s, o) => s + o.shares, 0);
  const free = Math.max(0, held - listed);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(a.last_trade_price_eur ?? a.share_price_eur);
  const c = config?.contracts;

  const buy = (o: AssetDetail["order_book"][number]) =>
    c && runTx(`${t("market.buy")} · ${o.shares} ${t("common.shares")}`, actions.buy(c.keur as Address, c.market as Address, o.id, o.shares, o.price_eur), wallet.state, t("market.bought"));
  const cancel = (id: number) => c && runTx(t("market.cancel"), actions.cancel(c.market as Address, id), wallet.state, t("market.cancelled"));
  const list = () => c && runTx(t("market.list_cta"), actions.list(c.market as Address, a.token as Address, Math.min(qty, free), price), wallet.state, t("market.listed"));

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_300px]">
      <div className="grid gap-5">
        <Panel title={t("market.listings")} subtitle={`${t("market.issue_price")} ${eur(a.share_price_eur, 0, lang)}`}>
          {a.order_book.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">{t("market.empty")}</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11.5px] text-muted"><th className="pb-2 font-medium">{t("market.seller")}</th><th className="pb-2 text-right font-medium">{t("market.shares")}</th><th className="pb-2 text-right font-medium">{t("market.price")}</th><th /></tr></thead>
              <tbody>
                {a.order_book.map((o) => {
                  const mine = o.seller.toLowerCase() === wallet.address.toLowerCase();
                  const prem = ((o.price_eur - a.share_price_eur) / a.share_price_eur) * 100;
                  return (
                    <tr key={o.id} className="border-t hairline">
                      <td className="py-2.5">{o.seller_name ?? shortAddr(o.seller)}</td>
                      <td className="num py-2.5 text-right">{o.shares}</td>
                      <td className="num py-2.5 text-right">{eur(o.price_eur, 2, lang)} <span className={cx("text-[11px]", prem >= 0 ? "text-positive" : "text-negative")}>{prem >= 0 ? "+" : ""}{prem.toFixed(1)}%</span></td>
                      <td className="py-2.5 pl-3 text-right">
                        {mine ? (
                          <button onClick={() => cancel(o.id)} className="rounded-full border hairline px-3 py-1 text-[12px] hover:bg-surface-2">{t("market.cancel")}</button>
                        ) : (
                          <button onClick={() => buy(o)} disabled={!portfolio?.profile.kyc} className="rounded-full bg-accent-ink px-3 py-1 text-[12px] font-medium text-bg disabled:opacity-40">{t("market.buy")} {eur(o.shares * o.price_eur, 0, lang)}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title={t("market.trades")}>
          {a.trades.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-muted">—</p>
          ) : (
            <ul className="divide-y divide-line text-[13px]">
              {a.trades.slice(0, 12).map((tr) => (
                <li key={tr.tx} className="flex items-center gap-3 py-2">
                  <span className="flex-1 truncate text-ink-2">{tr.seller ?? "—"} → {tr.buyer ?? "—"}</span>
                  <span className="num">{tr.shares} × {eur(tr.price_eur, 2, lang)}</span>
                  <span className="w-24 text-right text-[11.5px] text-muted">{dateLabel(tr.ts, lang, false)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title={t("market.sell")} subtitle={`${t("market.you_hold")} ${held} · ${t("market.available")} ${free}`}>
        {free > 0 ? (
          <div className="space-y-3">
            <label className="block text-[12px] text-muted">{t("market.qty")}
              <input type="number" min={1} max={free} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(free, Number(e.target.value) || 1)))} className="num mt-1 h-10 w-full rounded-xl border hairline bg-surface px-3 text-[14px] text-ink outline-none focus:border-accent-ink" />
            </label>
            <label className="block text-[12px] text-muted">{t("market.price")} (kEUR)
              <input type="number" min={1} step={0.5} value={price} onChange={(e) => setPrice(Number(e.target.value) || 1)} className="num mt-1 h-10 w-full rounded-xl border hairline bg-surface px-3 text-[14px] text-ink outline-none focus:border-accent-ink" />
            </label>
            <p className="num text-[12px] text-muted">= {eur(qty * price, 0, lang)} · {t("market.fee")}</p>
            <button onClick={list} className="h-10 w-full rounded-xl bg-ink text-[13.5px] font-medium text-bg">{t("market.list_cta")}</button>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">{t("market.nothing_to_sell")}</p>
        )}
      </Panel>
    </div>
  );
}

function AssetView() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, pick } = useLang();
  const cat = useCategoryLabel();
  const wallet = useWallet();
  const [tab, setTab] = useState<Tab>("overview");
  const { data: a, error } = useApi<AssetDetail>(`asset:${id}`, () => api.asset(id), 10000);
  const { data: config } = useApi<Config>("config", api.config);
  const { data: health } = useApi<Health>("health", api.health, 10000);
  const { data: portfolio } = useApi<Portfolio>(`portfolio:${wallet.address}`, () => api.portfolio(wallet.address));
  const now = health?.chain_time ?? 0;
  const votingPower = useMemo(() => portfolio?.holdings.find((h) => h.asset_id === a?.id)?.shares ?? 0, [portfolio, a]);

  if (error) return <ErrorState message={error.includes("404") ? t("asset.not_found") : t("common.backend_down")} />;
  if (!a)
    return (
      <div className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8">
        <Skeleton className="aspect-[16/7] w-full" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
      </div>
    );

  const country = COUNTRIES[{ paris: 250, london: 826, marrakech: 504, newyork: 840, dubai: 784, melbourne: 36 }[a.city] ?? 0];
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8">
      <Link href="/invest" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"><ArrowLeft size={14} /> {t("asset.back")}</Link>
      <MediaStage a={a} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <PhaseBadge phase={a.phase} />
            <span className="rounded-full border hairline px-2.5 py-1">{cat(a.category)}</span>
            <span className="num rounded-full border hairline px-2.5 py-1 text-muted">{a.id}</span>
          </div>
          <h1 className="mt-3 font-serif text-[40px] leading-[1.05] tracking-tight sm:text-[52px]">{pick(a, "name")}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-[14px] text-muted"><MapPin size={14} /> {a.district}, {a.city_name} {country?.flag}</p>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">{pick(a, "tagline")}</p>

          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border hairline bg-line sm:grid-cols-4">
            {([
              ["asset.net_yield", pct(a.net_yield_pct), true],
              ["asset.valuation", compactEur(a.valuation_eur, lang), false],
              ["asset.income_paid", compactEur(a.income_distributed_eur, lang), false],
              ["asset.holders_label", num(a.holders, lang), false],
            ] as [TKey, string, boolean][]).map(([k, v, hl]) => (
              <div key={k} className="bg-surface p-4">
                <p className="text-[11.5px] text-muted">{t(k)}</p>
                <p className={cx("num mt-1 text-[22px] font-semibold", hl && "text-accent-ink")}>{v}</p>
              </div>
            ))}
          </div>

          <div className="scroll-thin sticky top-[100px] z-10 -mx-1 mt-8 flex gap-1 overflow-x-auto border-b hairline bg-bg/90 px-1 backdrop-blur">
            {TABS.map((k) => (
              <button key={k} onClick={() => setTab(k)} className={cx("relative whitespace-nowrap px-3.5 py-3 text-[13.5px] transition-colors", tab === k ? "font-medium text-ink" : "text-muted hover:text-ink")}>
                {t(`asset.tab.${k}` as TKey)}
                {k === "market" && a.order_book.length > 0 && <span className="num ml-1.5 rounded-full bg-accent-soft px-1.5 text-[10.5px] text-accent-ink">{a.order_book.length}</span>}
                {k === "governance" && a.proposals.some((p) => p.state === "active") && <span className="ml-1.5 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-accent" />}
                {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-ink" />}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {tab === "overview" && <Overview a={a} />}
            {tab === "financials" && <Financials a={a} />}
            {tab === "documents" && <Documents a={a} />}
            {tab === "ownership" && <Ownership a={a} />}
            {tab === "market" && <MarketTab a={a} portfolio={portfolio} config={config} />}
            {tab === "governance" &&
              (a.proposals.length ? (
                <div className="grid gap-4">{a.proposals.map((p) => <ProposalCard key={p.id} p={p} now={now} votingPower={votingPower} />)}</div>
              ) : (
                <p className="card p-8 text-center text-[13px] text-muted">{t("governance.none")}</p>
              ))}
          </div>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-[112px] lg:self-start">
          <InvestBox a={a} now={now} portfolio={portfolio} config={config} />
          <Analyst assetId={a.id} height={520} />
          <p className="num text-center text-[11px] text-muted">{t("asset.updated")} · block {health?.block ?? "—"} · {dateLabel(now, lang)}</p>
        </aside>
      </div>
    </div>
  );
}

export default function AssetPageView() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AssetView />
    </Suspense>
  );
}
