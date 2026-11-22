"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import { ArrowRight } from "lucide-react";
import { api, type Config, type Market, type Portfolio } from "@/lib/api";
import { actions } from "@/lib/actions";
import { runTx, useApi, useWallet } from "@/lib/chain";
import { cx, dateLabel, eur, num, shortAddr } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { Photo } from "@/components/photo";
import { Chip, ErrorState, PageHeader, Panel, Skeleton, Stat } from "@/components/ui";

export default function MarketPage() {
  const { t, lang, pick } = useLang();
  const wallet = useWallet();
  const { data: m, error } = useApi<Market>("market", api.market, 10000);
  const { data: config } = useApi<Config>("config", api.config);
  const { data: me } = useApi<Portfolio>(`portfolio:${wallet.address}`, () => api.portfolio(wallet.address));
  const [city, setCity] = useState("all");

  const cities = useMemo(() => [...new Set(m?.listings.map((l) => l.city_name) ?? [])], [m]);
  const listings = (m?.listings ?? []).filter((l) => city === "all" || l.city_name === city);
  const volume = (m?.trades ?? []).reduce((s, tr) => s + tr.shares * tr.price_eur, 0);
  const avgPrem = m?.listings.length ? m.listings.reduce((s, l) => s + (l.premium_pct ?? 0), 0) / m.listings.length : 0;

  if (error) return <ErrorState message={t("common.backend_down")} />;
  const c = config?.contracts;
  const me_addr = wallet.address.toLowerCase();

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8">
      <PageHeader eyebrow={t("nav.market")} title={t("market.title")}>{t("market.subtitle")}</PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {m ? (
          <>
            <Stat label={t("market.open_orders")} value={num(m.listings.length, lang)} hint={`${num(m.listings.reduce((s, l) => s + l.shares, 0), lang)} ${t("common.shares")}`} />
            <Stat label={t("market.volume")} value={eur(volume, 0, lang)} hint={`${m.trades.length} ${t("market.trades_count")}`} />
            <Stat label={t("market.avg_premium")} value={`${avgPrem >= 0 ? "+" : ""}${avgPrem.toFixed(1)}%`} tone={avgPrem >= 0 ? "positive" : "negative"} hint={t("market.premium")} />
            <Stat label={t("market.fee_label")} value="1%" hint={t("market.fee_hint")} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        )}
      </div>

      <div className="mt-8 flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={city === "all"} onClick={() => setCity("all")}>{t("invest.all")}</Chip>
        {cities.map((cn) => <Chip key={cn} active={city === cn} onClick={() => setCity(cn)}>{cn}</Chip>)}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title={t("market.listings")}>
          {!m ? (
            <Skeleton className="h-80" />
          ) : listings.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted">{t("market.none")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {listings.map((l) => {
                const mine = l.seller.toLowerCase() === me_addr;
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Photo src={l.image} alt="" className="h-12 w-16 shrink-0" rounded="rounded-xl" sizes="64px" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/assets/${l.asset_id.toLowerCase()}`} className="block truncate text-[14px] font-medium hover:underline">{pick(l, "asset_name")}</Link>
                      <p className="truncate text-[11.5px] text-muted">{l.city_name} · {t("market.seller")} {l.seller_name ?? shortAddr(l.seller)} · {dateLabel(l.ts, lang, false)}</p>
                    </div>
                    <div className="num text-right text-[13px]">
                      <p className="font-medium">{l.shares} × {eur(l.price_eur, 2, lang)}</p>
                      {l.premium_pct !== null && <p className={cx("text-[11.5px]", l.premium_pct >= 0 ? "text-positive" : "text-negative")}>{l.premium_pct >= 0 ? "+" : ""}{l.premium_pct.toFixed(1)}% {t("market.vs_issue")}</p>}
                    </div>
                    {mine ? (
                      <button onClick={() => c && runTx(t("market.cancel"), actions.cancel(c.market as Address, l.id), wallet.state, t("market.cancelled"))} className="w-28 rounded-full border hairline py-1.5 text-[12.5px] hover:bg-surface-2">{t("market.cancel")}</button>
                    ) : (
                      <button
                        disabled={!me?.profile.kyc || !c}
                        title={!me?.profile.kyc ? t("invest.box.verify") : undefined}
                        onClick={() => c && runTx(`${t("market.buy")} · ${l.shares} ${t("common.shares")}`, actions.buy(c.keur as Address, c.market as Address, l.id, l.shares, l.price_eur), wallet.state, t("market.bought"))}
                        className="w-28 rounded-full bg-accent-ink py-1.5 text-[12.5px] font-medium text-bg disabled:opacity-40"
                      >
                        {t("market.buy")} {eur(l.shares * l.price_eur, 0, lang)}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={t("market.trades")} subtitle={t("market.trades_sub")}>
          <ul className="scroll-thin max-h-[620px] divide-y divide-line overflow-y-auto">
            {m?.trades.map((tr) => (
              <li key={tr.tx} className="py-2.5 text-[12.5px]">
                <div className="flex items-center gap-2">
                  <Link href={`/assets/${tr.asset_id.toLowerCase()}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{pick(tr, "asset_name")}</Link>
                  <span className="num">{tr.shares} × {eur(tr.price_eur, 2, lang)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                  <span className="truncate">{tr.seller ?? "—"}</span>
                  <ArrowRight size={11} className="shrink-0" />
                  <span className="truncate">{tr.buyer ?? "—"}</span>
                  <span className="ml-auto shrink-0">{dateLabel(tr.ts, lang, false)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <p className="mt-6 text-[12px] text-muted">{t("market.how")}</p>
    </div>
  );
}
