"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Coins, FileCheck2, Landmark, Repeat, ScrollText, ShieldCheck, TrendingUp, Vote, Wallet } from "lucide-react";
import { api, type Activity, type Asset, type Overview } from "@/lib/api";
import { useApi } from "@/lib/chain";
import { compactEur, cx, eur, num, pct, relative } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { Photo } from "@/components/photo";
import { AssetCard, ProgressBar, useCategoryLabel } from "@/components/asset-card";
import { ErrorState, Skeleton } from "@/components/ui";

const CATEGORY_IMAGE: Record<string, string> = {
  residential: "/img/categories/residential.webp",
  hospitality: "/img/categories/hospitality.webp",
  commercial: "/img/categories/commercial.webp",
  student: "/img/categories/student.webp",
  land: "/img/categories/land.webp",
};

function SectionHead({ title, sub, href, cta }: { title: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="font-serif text-[32px] leading-tight tracking-tight sm:text-[40px]">{title}</h2>
        {sub && <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="group hidden shrink-0 items-center gap-1 text-[13.5px] font-medium text-accent-ink sm:flex">
          {cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function ActivityRow({ a, now }: { a: Activity; now: number }) {
  const { lang } = useLang();
  const fr = lang === "fr";
  const icon = { invest: Coins, trade: Repeat, income: Landmark, vote: Vote }[a.kind];
  const Icon = icon;
  const text =
    a.kind === "invest"
      ? fr ? `${a.who} a investi ${eur(a.value_eur ?? 0, 0, lang)} dans` : `${a.who} invested ${eur(a.value_eur ?? 0, 0, lang)} in`
      : a.kind === "trade"
        ? fr ? `${a.who} a acheté ${a.shares} parts de` : `${a.who} bought ${a.shares} shares of`
        : a.kind === "income"
          ? fr ? `${eur(a.value_eur ?? 0, 0, lang)} de revenus distribués pour` : `${eur(a.value_eur ?? 0, 0, lang)} of income distributed for`
          : fr ? `${a.who} a voté sur` : `${a.who} voted on`;
  return (
    <li className="flex items-center gap-3 border-b hairline py-3 last:border-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <Icon size={15} />
      </span>
      <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-2">
        {text}{" "}
        <Link href={`/assets/${a.asset_id?.toLowerCase()}`} className="font-medium text-ink hover:underline">
          {a.asset_name}
        </Link>
      </p>
      <span className="shrink-0 text-[11.5px] text-muted">{relative(a.ts, now, lang)}</span>
    </li>
  );
}

export default function Home() {
  const { t, lang, pick } = useLang();
  const cat = useCategoryLabel();
  const { data: ov, error } = useApi<Overview>("overview", api.overview, 15000);
  const { data: assets } = useApi<Asset[]>("assets", () => api.assets(), 15000);
  const { data: activity } = useApi<Activity[]>("activity", () => api.activity(9), 5000);
  if (error) return <ErrorState message={t("common.backend_down")} />;
  const now = ov?.chain_time ?? 0;
  const live = (assets ?? []).filter((a) => a.phase === "live").sort((a, b) => a.ends_at - b.ends_at);
  const heroAssets = ["KST-RAK-001", "KST-PAR-005", "KST-LIS-005"].map((id) => assets?.find((a) => a.id === id)).filter(Boolean) as Asset[];
  const featured = live[0];

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-14 pt-12 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border hairline bg-surface px-3 py-1 text-[11.5px] text-muted">
            <ShieldCheck size={13} className="text-accent-ink" /> {t("home.eyebrow")}
          </p>
          <h1 className="font-serif text-[46px] leading-[1.02] tracking-tight sm:text-[66px]">
            {t("home.title_a")} <em className="highlight italic text-accent-ink">{t("home.title_b")}</em> {t("home.title_c")}
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-2">{t("home.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/invest" className="inline-flex items-center gap-2 rounded-full bg-accent-ink px-6 py-3 text-[14px] font-medium text-bg hover:opacity-90">
              {t("home.cta_invest")} <ArrowRight size={16} />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 rounded-full border hairline bg-surface px-6 py-3 text-[14px] font-medium hover:border-line-strong">
              {t("home.cta_how")}
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="grid grid-cols-[1.3fr_1fr] gap-3">
            {heroAssets.length === 3 ? (
              <>
                <Link href={`/assets/${heroAssets[0].id.toLowerCase()}`} className="group row-span-2">
                  <Photo src={heroAssets[0].images[0]} alt={pick(heroAssets[0], "name")} className="h-full min-h-[420px]" rounded="rounded-3xl" priority sizes="(max-width: 1024px) 60vw, 420px" />
                </Link>
                <Link href={`/assets/${heroAssets[1].id.toLowerCase()}`} className="group">
                  <Photo src={heroAssets[1].images[1]} alt={pick(heroAssets[1], "name")} className="h-[204px]" rounded="rounded-3xl" priority sizes="300px" />
                </Link>
                <Link href={`/assets/${heroAssets[2].id.toLowerCase()}`} className="group">
                  <Photo src={heroAssets[2].images[0]} alt={pick(heroAssets[2], "name")} className="h-[204px]" rounded="rounded-3xl" priority sizes="300px" />
                </Link>
              </>
            ) : (
              <>
                <Skeleton className="row-span-2 min-h-[420px] rounded-3xl" />
                <Skeleton className="h-[204px] rounded-3xl" />
                <Skeleton className="h-[204px] rounded-3xl" />
              </>
            )}
          </div>
          {featured && (
            <Link href={`/assets/${featured.id.toLowerCase()}`} className="card absolute -bottom-6 left-4 right-4 flex items-center gap-4 p-4 sm:left-8 sm:right-auto sm:w-[360px]">
              <Photo src={featured.images[0]} alt="" className="h-14 w-14 shrink-0" rounded="rounded-xl" sizes="56px" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-ink">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-ink" /> {t("phase.live")} · {featured.city_name}
                </p>
                <p className="truncate font-medium">{pick(featured, "name")}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <ProgressBar value={featured.progress_pct} className="flex-1" />
                  <span className="num text-[11.5px] text-muted">{pct(featured.progress_pct, 0)}</span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ── Live stats ─────────────────────────────────────────────────── */}
      <section className="mx-auto mt-6 max-w-[1320px] px-5 sm:px-8">
        <div className="card grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {[
            [t("home.stats.value"), ov ? compactEur(ov.tokenized_value_eur, lang) : "—"],
            [t("home.stats.income"), ov ? compactEur(ov.income_distributed_eur, lang) : "—"],
            [t("home.stats.investors"), ov ? num(ov.investors, lang) : "—"],
            [t("home.stats.yield"), ov ? pct(ov.avg_net_yield_pct) : "—"],
            [t("home.stats.volume"), ov ? compactEur(ov.secondary_volume_eur, lang) : "—"],
          ].map(([label, value]) => (
            <div key={label} className="px-6 py-5">
              <p className="num text-[28px] font-semibold leading-none">{value}</p>
              <p className="mt-1.5 text-[12.5px] text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        {/* ── Cities ─────────────────────────────────────────────────────── */}
        <section className="pt-24">
          <SectionHead title={t("home.cities")} sub={t("home.cities_sub")} href="/invest" cta={t("common.see_all")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(ov?.cities ?? Array.from({ length: 4 })).map((c, i) =>
              c ? (
                <Link key={c.id} href={`/invest?city=${c.id}`} className="group relative block overflow-hidden rounded-3xl">
                  <Photo src={`/img/cities/${c.id}.webp`} alt={c.name} className="aspect-[3/4]" rounded="rounded-3xl" sizes="(max-width: 640px) 100vw, 320px" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-[11.5px] uppercase tracking-[0.16em] text-white/70">{c.country}</p>
                    <h3 className="font-serif text-[30px] leading-tight">{lang === "fr" ? { London: "Londres", Lisbon: "Lisbonne" }[c.name] ?? c.name : c.name}</h3>
                    <p className="mt-1 text-[12.5px] text-white/80">{lang === "fr" ? c.tagline_fr : c.tagline_en}</p>
                    <p className="num mt-3 text-[12.5px]">
                      {c.assets} assets · {compactEur(c.value_eur, lang)}
                    </p>
                  </div>
                </Link>
              ) : (
                <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
              ),
            )}
          </div>
        </section>

        {/* ── Live offerings ─────────────────────────────────────────────── */}
        <section className="pt-24">
          <SectionHead title={t("home.live")} sub={t("home.live_sub")} href="/invest?phase=live" cta={t("common.see_all")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {assets ? live.slice(0, 6).map((a) => <AssetCard key={a.id} a={a} now={now} />) : Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[420px]" />)}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <section id="how" className="scroll-mt-24 pt-24">
          <div className="overflow-hidden rounded-[32px] bg-accent-ink px-6 py-12 text-bg sm:px-12">
            <h2 className="font-serif text-[34px] leading-tight sm:text-[44px]">{t("home.how")}</h2>
            <p className="mt-2 max-w-xl text-[14.5px] opacity-75">{t("home.how_sub")}</p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [BadgeCheck, "home.step1", "home.step1_text"],
                [Wallet, "home.step2", "home.step2_text"],
                [TrendingUp, "home.step3", "home.step3_text"],
                [Vote, "home.step4", "home.step4_text"],
              ].map(([Icon, title, text], i) => {
                const I = Icon as typeof BadgeCheck;
                return (
                  <div key={i} className="rounded-2xl border border-white/15 bg-white/5 p-5 dark:border-black/15 dark:bg-black/5">
                    <div className="flex items-center justify-between">
                      <I size={22} className="text-accent" />
                      <span className="num text-[12px] opacity-50">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 text-[17px] font-medium">{t(title as Parameters<typeof t>[0])}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed opacity-75">{t(text as Parameters<typeof t>[0])}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Categories ─────────────────────────────────────────────────── */}
        <section className="pt-24">
          <SectionHead title={t("home.categories")} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(ov?.categories ?? []).map((c) => (
              <Link key={c.id} href={`/invest?category=${c.id}`} className="group relative block overflow-hidden rounded-2xl">
                <Photo src={CATEGORY_IMAGE[c.id]} alt={cat(c.id)} className="aspect-[4/5]" sizes="260px" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="text-[15px] font-medium">{cat(c.id)}</h3>
                  <p className="text-[12px] text-white/75">{c.assets} assets</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Activity + trust ───────────────────────────────────────────── */}
        <section className="grid gap-6 pt-24 lg:grid-cols-[1.2fr_1fr]">
          <div className="card p-6">
            <h2 className="font-serif text-[28px] tracking-tight">{t("home.activity")}</h2>
            <p className="mb-3 mt-1 flex items-center gap-2 text-[13px] text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-positive" /> {t("home.activity_sub")} {ov && <span className="num">#{ov.block}</span>}
            </p>
            <ul>
              {(activity ?? []).map((a) => (
                <ActivityRow key={`${a.tx}-${a.kind}-${a.who}`} a={a} now={now} />
              ))}
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <h2 className="font-serif text-[28px] tracking-tight sm:col-span-2">{t("home.trust")}</h2>
            {[
              [ShieldCheck, "home.trust1", "home.trust1_text"],
              [Landmark, "home.trust2", "home.trust2_text"],
              [FileCheck2, "home.trust3", "home.trust3_text"],
              [ScrollText, "home.trust4", "home.trust4_text"],
            ].map(([Icon, title, text], i) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={i} className={cx("card p-5")}>
                  <I size={20} className="text-accent-ink" />
                  <h3 className="mt-3 text-[15px] font-medium">{t(title as Parameters<typeof t>[0])}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{t(text as Parameters<typeof t>[0])}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
