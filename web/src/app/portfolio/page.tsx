"use client";

import Link from "next/link";
import { useState } from "react";
import type { Address } from "viem";
import { ArrowDownLeft, ArrowUpRight, Coins, Droplets, ShieldCheck, Vote } from "lucide-react";
import { api, type Portfolio } from "@/lib/api";
import { actions } from "@/lib/actions";
import { demoCall, runTx, useApi, useWallet } from "@/lib/chain";
import { COUNTRIES, cx, dateLabel, eur, num, pct } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";
import { tourMark } from "@/lib/tour";
import { useCategoryLabel } from "@/components/asset-card";
import { Columns, Donut } from "@/components/charts";
import { Photo } from "@/components/photo";
import { ErrorState, PageHeader, Panel, Skeleton, Stat } from "@/components/ui";

const KIND_ICON: Record<string, typeof Coins> = { invest: ArrowUpRight, buy: ArrowUpRight, sell: ArrowDownLeft, income: Coins, vote: Vote, refund: ArrowDownLeft, claim: ArrowDownLeft };

function KycCard({ wallet }: { wallet: string }) {
  const { t, lang } = useLang();
  const [country, setCountry] = useState(250);
  return (
    <section id="kyc" className="card mb-8 grid gap-6 overflow-hidden p-6 md:grid-cols-[1fr_320px]">
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink"><ShieldCheck size={20} /></span>
        <h2 className="mt-4 font-serif text-[28px] leading-tight">{t("portfolio.kyc_title")}</h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2">{t("portfolio.kyc_text")}</p>
        <ul className="mt-4 grid gap-1.5 text-[12.5px] text-muted sm:grid-cols-2">
          {(["portfolio.kyc_p1", "portfolio.kyc_p2", "portfolio.kyc_p3", "portfolio.kyc_p4"] as TKey[]).map((k) => (
            <li key={k} className="flex gap-2"><span className="mt-[7px] h-1 w-1 rounded-full bg-accent-ink" />{t(k)}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-end gap-3 rounded-2xl bg-surface-2 p-4">
        <label className="text-[12px] text-muted">
          {t("portfolio.kyc_country")}
          <select value={country} onChange={(e) => setCountry(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border hairline bg-surface px-3 text-[14px] text-ink outline-none">
            {Object.entries(COUNTRIES).map(([iso, c]) => (
              <option key={iso} value={iso}>{c.flag} {lang === "fr" ? c.fr : c.en}</option>
            ))}
          </select>
        </label>
        {country === 840 && <p className="text-[11.5px] text-warning">{t("invest.box.us")}</p>}
        <button onClick={() => demoCall(t("portfolio.kyc_cta"), () => api.kyc(wallet, country), t("portfolio.kyc_done"))} className="h-11 rounded-xl bg-accent-ink text-[14px] font-medium text-bg">
          {t("portfolio.kyc_cta")}
        </button>
        <p className="text-[11px] leading-snug text-muted">{t("portfolio.kyc_note")}</p>
      </div>
    </section>
  );
}

export default function PortfolioPage() {
  const { t, lang, pick } = useLang();
  const cat = useCategoryLabel();
  const wallet = useWallet();
  const { data: p, error } = useApi<Portfolio>(`portfolio:${wallet.address}`, () => api.portfolio(wallet.address), 15000);

  if (error) return <ErrorState message={t("common.backend_down")} />;
  const claimable = p?.holdings.filter((h) => h.income_withdrawable_eur > 0.005) ?? [];
  const byCategory = Object.entries(
    (p?.holdings ?? []).reduce<Record<string, number>>((acc, h) => ({ ...acc, [h.category]: (acc[h.category] ?? 0) + h.value_eur }), {}),
  )
    .map(([k, v]) => ({ label: cat(k), value: v }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8">
      <PageHeader
        eyebrow={p?.profile.name ?? t("nav.portfolio")}
        title={t("portfolio.title")}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => demoCall(t("portfolio.faucet"), () => api.faucet(wallet.address), t("portfolio.faucet_done"))} className="flex items-center gap-1.5 rounded-full border hairline bg-surface px-4 py-2 text-[13px] hover:border-line-strong">
              <Droplets size={14} /> {t("portfolio.faucet")}
            </button>
            {claimable.length > 0 && (
              <button
                onClick={() => runTx(t("portfolio.claim_all"), actions.claimIncome(claimable.map((h) => h.token as Address)), wallet.state, t("portfolio.claimed")).then((ok) => ok && tourMark("claim"))}
                className="flex items-center gap-1.5 rounded-full bg-accent-ink px-4 py-2 text-[13px] font-medium text-bg"
              >
                <Coins size={14} /> {t("portfolio.claim_all")} · {eur(p?.income_withdrawable_eur ?? 0, 2, lang)}
              </button>
            )}
          </div>
        }
      >
        {p?.profile.kyc ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-positive">
            <ShieldCheck size={14} /> {t("portfolio.verified")} · {COUNTRIES[p.profile.country ?? 0]?.flag} {p.profile.kyc_expires_at && `${t("portfolio.until")} ${dateLabel(p.profile.kyc_expires_at, lang)}`}
          </span>
        ) : (
          p && t("portfolio.not_verified")
        )}
      </PageHeader>

      {p && !p.profile.kyc && <KycCard wallet={wallet.address} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {p ? (
          <>
            <Stat label={t("portfolio.value")} value={eur(p.portfolio_value_eur, 0, lang)} hint={`${p.holdings.length} ${t("portfolio.assets")}`} />
            <Stat label={t("portfolio.cash")} value={eur(p.cash_eur, 0, lang)} hint="kEUR · testnet" />
            <Stat label={t("portfolio.monthly")} value={eur(p.monthly_income_eur, 2, lang)} hint={`${t("portfolio.received")} ${eur(p.income_claimed_eur, 0, lang)}`} tone="positive" />
            <Stat label={t("portfolio.claimable")} value={eur(p.income_withdrawable_eur, 2, lang)} hint={t("portfolio.claimable_hint")} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        )}
      </div>

      {p && p.pending.length > 0 && (
        <Panel title={t("portfolio.pending")} className="mt-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {p.pending.map((o) => (
              <div key={o.offering} className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border hairline p-3">
                <Photo src={o.image} alt="" className="h-14 w-20 shrink-0" rounded="rounded-xl" sizes="80px" />
                <div className="min-w-0 flex-1">
                  <Link href={`/assets/${o.asset_id.toLowerCase()}`} className="block truncate text-[14px] font-medium hover:underline">{pick(o, "name")}</Link>
                  <p className="num text-[12px] text-muted">{o.shares} {t("common.shares")} · {eur(o.value_eur, 0, lang)}</p>
                </div>
                {o.status === "succeeded" ? (
                  <button onClick={() => runTx(t("portfolio.claim_shares"), actions.claimShares(o.offering as Address), wallet.state, t("portfolio.shares_claimed"))} className="rounded-full bg-accent-ink px-3 py-1.5 text-[12.5px] font-medium text-bg">{t("portfolio.claim_shares")}</button>
                ) : o.status === "failed" ? (
                  <button onClick={() => runTx(t("portfolio.refund"), actions.refund(o.offering as Address), wallet.state, t("portfolio.refunded"))} className="rounded-full border hairline px-3 py-1.5 text-[12.5px]">{t("portfolio.refund")}</button>
                ) : (
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] text-accent-ink">{t("portfolio.in_escrow")}</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title={t("portfolio.holdings")}>
          {!p ? (
            <Skeleton className="h-60" />
          ) : p.holdings.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13.5px] text-muted">{t("portfolio.empty")}</p>
              <Link href="/invest" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-[13px] text-bg">{t("nav.invest")}</Link>
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11.5px] text-muted">
                    <th className="pb-2 font-medium">{t("market.asset")}</th>
                    <th className="pb-2 text-right font-medium">{t("market.shares")}</th>
                    <th className="pb-2 text-right font-medium">{t("portfolio.value_col")}</th>
                    <th className="pb-2 text-right font-medium">{t("asset.net_yield")}</th>
                    <th className="pb-2 text-right font-medium">{t("portfolio.monthly")}</th>
                    <th className="pb-2 text-right font-medium">{t("portfolio.claimable")}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.holdings.map((h) => (
                    <tr key={h.asset_id} className="border-t hairline">
                      <td className="py-3">
                        <Link href={`/assets/${h.asset_id.toLowerCase()}`} className="flex items-center gap-3 hover:underline">
                          <Photo src={h.image} alt="" className="h-10 w-14 shrink-0" rounded="rounded-lg" sizes="56px" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{pick(h, "name")}</span>
                            <span className="text-[11.5px] text-muted">{h.city_name} · {cat(h.category)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="num py-3 text-right">{h.shares}<span className="block text-[11px] text-muted">{pct(h.pct, 2)}</span></td>
                      <td className="num py-3 text-right font-medium">{eur(h.value_eur, 0, lang)}</td>
                      <td className="num py-3 text-right text-accent-ink">{pct(h.net_yield_pct)}</td>
                      <td className="num py-3 text-right">{eur(h.monthly_income_eur, 2, lang)}</td>
                      <td className="num py-3 text-right">
                        {h.income_withdrawable_eur > 0.005 ? (
                          <button onClick={() => runTx(t("portfolio.claim"), actions.claimIncome([h.token as Address]), wallet.state, t("portfolio.claimed")).then((ok) => ok && tourMark("claim"))} className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] text-accent-ink hover:brightness-95">
                            {eur(h.income_withdrawable_eur, 2, lang)}
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={t("portfolio.allocation")}>{byCategory.length ? <Donut data={byCategory} unit="EUR" height={190} /> : <Skeleton className="h-48" />}</Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title={t("portfolio.income_chart")}>
          {p?.income_by_month.length ? <Columns data={p.income_by_month.map((m) => ({ label: m.period, value: m.amount_eur }))} unit="EUR" height={240} /> : <p className="py-10 text-center text-[13px] text-muted">—</p>}
        </Panel>
        <Panel title={t("portfolio.activity")}>
          <ul className="scroll-thin max-h-[280px] divide-y divide-line overflow-y-auto">
            {p?.activity.map((e) => {
              const Icon = KIND_ICON[e.kind] ?? Coins;
              return (
                <li key={e.tx + e.kind} className="flex items-center gap-3 py-2 text-[12.5px]">
                  <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", e.kind === "income" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-2")}><Icon size={13} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{t(`activity.${e.kind}` as TKey)} · {e.asset_name}</span>
                    <span className="text-[11px] text-muted">{dateLabel(e.ts, lang)}</span>
                  </span>
                  <span className="num font-medium">{e.shares ? `${num(e.shares, lang)} · ` : ""}{eur(e.value_eur, 0, lang)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
