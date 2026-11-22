"use client";

import Link from "next/link";
import { useState } from "react";
import type { Address } from "viem";
import { BedDouble, Check, Palmtree, Grape, Home, ShieldCheck, Store } from "lucide-react";
import { api, type Config, type ListingRequest, type Portfolio } from "@/lib/api";
import { actions } from "@/lib/actions";
import { runTx, useApi, useWallet } from "@/lib/chain";
import { cx, dateLabel, eur, shortAddr } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";
import { useCategoryLabel } from "@/components/asset-card";
import { PageHeader, Panel } from "@/components/ui";

const CATS = [
  { id: "residential", icon: Home },
  { id: "hospitality", icon: BedDouble },
  { id: "commercial", icon: Store },
  { id: "resort", icon: Palmtree },
  { id: "land", icon: Grape },
] as const;
const CITIES = ["New York", "Paris", "Dubai", "London", "Marrakech", "Melbourne", "Miami", "Monaco", "Singapore"];
const STATUS_STYLE: Record<ListingRequest["status"], string> = {
  pending: "bg-accent-soft text-accent-ink",
  approved: "bg-positive/15 text-positive",
  rejected: "bg-negative/12 text-negative",
};

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ListPage() {
  const { t, lang } = useLang();
  const cat = useCategoryLabel();
  const wallet = useWallet();
  const { data: config } = useApi<Config>("config", api.config);
  const { data: me } = useApi<Portfolio>(`portfolio:${wallet.address}`, () => api.portfolio(wallet.address));
  const { data: requests } = useApi<ListingRequest[]>("requests", api.requests, 15000);

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(0);
  const [city, setCity] = useState("Paris");
  const [name, setName] = useState("");
  const [value, setValue] = useState(2_500_000);
  const [rent, setRent] = useState(140_000);
  const [share, setShare] = useState(60);
  const [done, setDone] = useState(false);

  const gross = value ? (rent / value) * 100 : 0;
  const shares = Math.round(value / 100);
  const raise = (value * share) / 100;
  const canNext = step === 0 ? name.trim().length > 2 : value >= 100_000 && rent > 0;

  const submit = async () => {
    if (!config) return;
    const uri = `keystonia://requests/${slug(`${city}-${name}`)}`;
    const ok = await runTx(t("list.submit"), actions.submitListing(config.contracts.registry as Address, category, city, uri, value), wallet.state, t("list.submitted"));
    if (ok) setDone(true);
  };

  const steps: TKey[] = ["list.step1", "list.step2", "list.step3"];
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8">
      <PageHeader eyebrow={t("nav.list")} title={t("list.title")}>{t("list.subtitle")}</PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <section className="card p-6">
          <ol className="mb-6 flex items-center gap-2">
            {steps.map((k, i) => (
              <li key={k} className="flex flex-1 items-center gap-2">
                <span className={cx("num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium", i < step || done ? "bg-accent-ink text-bg" : i === step ? "bg-ink text-bg" : "bg-surface-2 text-muted")}>
                  {i < step || done ? <Check size={13} /> : i + 1}
                </span>
                <span className={cx("hidden text-[13px] sm:block", i === step ? "font-medium" : "text-muted")}>{t(k)}</span>
                {i < 2 && <span className="h-px flex-1 bg-line" />}
              </li>
            ))}
          </ol>

          {done ? (
            <div className="py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-positive/15 text-positive"><Check size={22} /></span>
              <h2 className="mt-4 font-serif text-[26px]">{t("list.submitted")}</h2>
              <p className="mx-auto mt-2 max-w-md text-[13.5px] text-ink-2">{t("list.next_steps")}</p>
              <button onClick={() => { setDone(false); setStep(0); setName(""); }} className="mt-5 rounded-full border hairline px-4 py-2 text-[13px]">{t("list.another")}</button>
            </div>
          ) : step === 0 ? (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[12px] text-muted">{t("list.category")}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {CATS.map((c, i) => (
                    <button key={c.id} onClick={() => setCategory(i)} className={cx("flex flex-col items-center gap-2 rounded-2xl border p-3 text-[12.5px] transition", category === i ? "border-accent-ink bg-accent-soft text-accent-ink" : "hairline hover:border-line-strong")}>
                      <c.icon size={20} /> {cat(c.id)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-[12px] text-muted">{t("list.name")}
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "fr" ? "ex. Résidence Canal Saint-Martin" : "e.g. Canal Saint-Martin Residence"} className="mt-1 h-11 w-full rounded-xl border hairline bg-surface px-3 text-[14px] text-ink outline-none focus:border-accent-ink" />
                </label>
                <label className="text-[12px] text-muted">{t("list.city")}
                  <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-11 w-full rounded-xl border hairline bg-surface px-3 text-[14px] text-ink outline-none">
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-[12px] text-muted">{t("list.value")}
                  <input type="number" step={50000} value={value} onChange={(e) => setValue(Number(e.target.value))} className="num mt-1 h-11 w-full rounded-xl border hairline bg-surface px-3 text-[14px] text-ink outline-none focus:border-accent-ink" />
                </label>
                <label className="text-[12px] text-muted">{t("list.rent")}
                  <input type="number" step={5000} value={rent} onChange={(e) => setRent(Number(e.target.value))} className="num mt-1 h-11 w-full rounded-xl border hairline bg-surface px-3 text-[14px] text-ink outline-none focus:border-accent-ink" />
                </label>
              </div>
              <label className="block text-[12px] text-muted">{t("list.share")} · <span className="num font-medium text-ink">{share}%</span>
                <input type="range" min={20} max={90} step={5} value={share} onChange={(e) => setShare(Number(e.target.value))} className="mt-2 w-full accent-[var(--accent-ink)]" />
              </label>
            </div>
          ) : (
            <dl className="divide-y divide-line text-[13.5px]">
              {([
                ["list.category", cat(CATS[category].id)],
                ["list.name", name],
                ["list.city", city],
                ["list.value", eur(value, 0, lang)],
                ["list.rent", eur(rent, 0, lang)],
                ["list.share", `${share}%`],
                ["list.owner", me?.profile.name ?? shortAddr(wallet.address)],
              ] as [TKey, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{t(k)}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          )}

          {!done && (
            <div className="mt-6 flex items-center gap-2 border-t hairline pt-4">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="rounded-full border hairline px-4 py-2 text-[13px]">{t("list.back")}</button>}
              <div className="ml-auto">
                {step < 2 ? (
                  <button disabled={!canNext} onClick={() => setStep(step + 1)} className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-bg disabled:opacity-40">{t("list.next")}</button>
                ) : !me?.profile.kyc ? (
                  <Link href="/portfolio#kyc" className="flex items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-bg"><ShieldCheck size={14} /> {t("invest.box.verify")}</Link>
                ) : (
                  <button onClick={submit} className="rounded-full bg-accent-ink px-5 py-2 text-[13px] font-medium text-bg">{t("list.submit")}</button>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <Panel title={t("list.preview")}>
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">{t("asset.gross_yield")}</dt><dd className="num font-semibold text-accent-ink">{gross.toFixed(2)}%</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t("list.shares_minted")}</dt><dd className="num">{shares.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")} × €100</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t("list.raise")}</dt><dd className="num font-medium">{eur(raise, 0, lang)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t("asset.retained")}</dt><dd className="num">{100 - share}%</dd></div>
            </dl>
            <ol className="mt-5 space-y-3 border-t hairline pt-4 text-[12.5px] text-ink-2">
              {(["list.flow1", "list.flow2", "list.flow3", "list.flow4"] as TKey[]).map((k, i) => (
                <li key={k} className="flex gap-3"><span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10.5px]">{i + 1}</span>{t(k)}</li>
              ))}
            </ol>
          </Panel>
          <Panel title={t("list.requests")}>
            <ul className="divide-y divide-line">
              {requests?.map((r) => (
                <li key={r.id} className="py-2.5 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{r.uri.split("/").pop()?.replace(/-/g, " ")}</span>
                    <span className={cx("rounded-full px-2 py-0.5 text-[11px]", STATUS_STYLE[r.status])}>{t(`list.status.${r.status}` as TKey)}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted">{r.city} · {cat(r.category)} · {r.owner_name ?? shortAddr(r.owner)} · {dateLabel(r.ts, lang)}</p>
                  {r.note && <p className="mt-1 text-[11.5px] text-ink-2">“{r.note}”</p>}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
