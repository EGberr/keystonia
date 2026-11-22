"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { api, type Activity, type Asset, type Overview } from "@/lib/api";
import { useApi } from "@/lib/chain";
import { compactEur, cx, eur, pct } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";
import { Photo } from "@/components/photo";
import { useCategoryLabel } from "@/components/asset-card";
import { ErrorState } from "@/components/ui";

const ShareTower = dynamic(() => import("@/components/three/share-tower"), { ssr: false });
const Walkthrough = dynamic(() => import("@/components/three/walkthrough"), { ssr: false });

const CITY_FR: Record<string, string> = { London: "Londres", Lisbon: "Lisbonne" };
const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;

function Label({ n, children, className }: { n?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cx("label flex items-center gap-3", className)}>
      {n && <span className="text-accent">[ {n} ]</span>}
      {children}
    </p>
  );
}

/** Fades and lifts children once they enter the viewport. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("transition-all duration-[900ms] ease-[var(--ease-out)] motion-reduce:transition-none", shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── 1. Pinned hero: the share tower ────────────────────────────────────────
function Hero({ ov }: { ov?: Overview }) {
  const { t, lang } = useLang();
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      progress.current = p;
      setBeat(p < 0.28 ? 0 : p < 0.62 ? 1 : 2);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const beats: { n: string; title: TKey; text: TKey }[] = [
    { n: "01", title: "h.beat1", text: "h.beat1_text" },
    { n: "02", title: "h.beat2", text: "h.beat2_text" },
    { n: "03", title: "h.beat3", text: "h.beat3_text" },
  ];
  const stats: [string, TKey][] = [
    [ov ? compactEur(ov.tokenized_value_eur, lang) : "—", "h.stat1"],
    [ov ? compactEur(ov.income_distributed_eur, lang) : "—", "h.stat2"],
    [ov ? pct(ov.avg_net_yield_pct) : "—", "h.stat3"],
  ];

  return (
    <section ref={section} className="relative h-[280vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="fade-up absolute inset-0" style={{ animationDuration: "1.8s" }}>
          <ShareTower progress={progress} className="h-full w-full" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-bg via-bg/75 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg/80 to-transparent" />

        {/* Scroll beats */}
        <div className="pointer-events-none absolute left-5 top-[17%] hidden w-[340px] sm:left-10 md:block lg:left-[max(40px,calc((100vw-1400px)/2+40px))]">
          {beats.map((b, i) => (
            <div key={b.n} className={cx("absolute inset-x-0 top-0 transition-all duration-700 ease-[var(--ease-out)]", beat === i ? "translate-y-0 opacity-100" : i < beat ? "-translate-y-6 opacity-0" : "translate-y-6 opacity-0")}>
              <p className="label">
                <span className="text-accent">{b.n}</span> / 03
              </p>
              <p className="mt-3 font-serif text-[38px] leading-[1.02]">{t(b.title)}</p>
              <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed text-ink-2">{t(b.text)}</p>
            </div>
          ))}
          <div className="absolute -left-5 top-1 h-[120px] w-px bg-white/10">
            <div className="w-px bg-accent transition-all duration-700" style={{ height: `${((beat + 1) / 3) * 100}%` }} />
          </div>
        </div>

        {/* Copy, bottom-left */}
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1400px] flex-col gap-9 px-5 pb-9 sm:px-10 sm:pb-14">
          <div className="max-w-[1040px]">
            <Label className="fade-up" n="KST">
              {t("h.eyebrow")}
            </Label>
            <h1 className="mt-6 font-serif text-[clamp(52px,7.6vw,128px)] leading-[0.92] tracking-[-0.045em] lg:[&_.line-mask>span]:whitespace-nowrap">
              <span className="line-mask">
                <span style={{ animationDelay: "0.25s" }}>{t("h.title_a")}</span>
              </span>
              <span className="line-mask">
                <span style={{ animationDelay: "0.38s" }} className="italic text-ink/50">
                  {t("h.title_b")}
                </span>
              </span>
            </h1>
            <p className="fade-up mt-7 max-w-[34rem] text-[15.5px] leading-[1.6] text-ink-2 sm:text-[17px]" style={{ animationDelay: "0.6s" }}>
              {t("h.sub")}
            </p>
            <div className="fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.75s" }}>
              <Link href="/invest" className="group flex items-center gap-3 rounded-full bg-accent-ink py-2 pl-6 pr-2 text-[14px] font-medium text-[#14110c] transition active:scale-[0.97]">
                {t("h.cta")}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14110c] text-accent-ink transition-transform duration-300 group-hover:-rotate-45">
                  <ArrowUpRight size={16} />
                </span>
              </Link>
              <a href="#walkthrough" className="glass flex items-center gap-2.5 rounded-full px-5 py-3.5 text-[14px] text-ink transition hover:bg-white/10">
                <Play size={12} className="fill-current" /> {t("h.cta2")}
              </a>
            </div>
          </div>
          <dl className="fade-up grid shrink-0 grid-cols-3 gap-6 border-t border-white/10 pt-5 sm:gap-8 lg:absolute lg:bottom-14 lg:right-10 lg:border-0 lg:pt-0" style={{ animationDelay: "0.95s" }}>
            {stats.map(([v, k]) => (
              <div key={k} className="lg:text-right">
                <dd className="num whitespace-nowrap text-[22px] font-light text-ink sm:text-[28px]">{v}</dd>
                <dt className="label mt-1.5 !text-[9.5px]">{t(k)}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

// ── 2. The collection rail ─────────────────────────────────────────────────
function CinemaCard({ a, i }: { a: Asset; i: number }) {
  const { lang, pick, t } = useLang();
  const cat = useCategoryLabel();
  return (
    <Link href={`/assets/${a.id.toLowerCase()}`} className="group relative block w-[78vw] shrink-0 snap-start overflow-hidden rounded-[28px] sm:w-[360px]">
      <Photo src={a.images[0]} alt={pick(a, "name")} className="aspect-[4/5] transition-transform duration-[1.2s] ease-[var(--ease-out)] group-hover:scale-[1.04]" rounded="rounded-none" sizes="400px" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20" />
      <div className="absolute inset-x-5 top-5 flex items-center justify-between">
        <span className="label !text-white/70">{String(i + 1).padStart(2, "0")}</span>
        <span className={cx("label rounded-full px-2.5 py-1 !text-[9.5px] !tracking-[0.14em]", a.phase === "live" ? "bg-accent !text-[#14110c]" : "glass !text-white/80")}>{t(`phase.${a.phase}` as TKey)}</span>
      </div>
      <div className="absolute inset-x-5 bottom-5">
        <p className="label !text-white/60">
          {a.city_name} · {cat(a.category)}
        </p>
        <h3 className="mt-2 font-serif text-[30px] leading-[0.98] text-white">{pick(a, "name")}</h3>
        <div className="mt-4 flex items-end justify-between border-t border-white/15 pt-3">
          <span className="num text-[13px] text-white/75">
            {eur(a.share_price_eur, 0, lang)} / {t("common.share")}
          </span>
          <span className="num text-[22px] font-light text-accent">{pct(a.net_yield_pct)}</span>
        </div>
      </div>
    </Link>
  );
}

// ── 4. Cities as an editorial index with a pointer-following frame ─────────
function CityIndex({ ov }: { ov?: Overview }) {
  const { t, lang } = useLang();
  const [hover, setHover] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const move = (e: React.MouseEvent) => {
    const el = frame.current;
    if (el) el.style.transform = `translate3d(${e.clientX + 32}px, ${e.clientY - 150}px, 0)`;
  };
  return (
    <div onMouseMove={move} onMouseLeave={() => setHover(null)} className="relative">
      <ul className="border-t hairline">
        {ov?.cities.map((c, i) => (
          <li key={c.id} onMouseEnter={() => setHover(c.id)}>
            <Link href={`/invest?city=${c.id}`} className="group grid grid-cols-[1fr_auto] items-end gap-4 border-b hairline py-6 sm:grid-cols-[60px_1fr_200px_150px] sm:py-8">
              <span className="label hidden sm:block">0{i + 1}</span>
              <span className={cx("font-serif text-[clamp(44px,8vw,124px)] leading-[0.85] tracking-[-0.045em] transition-colors duration-500 group-hover:italic", hover && hover !== c.id ? "text-ink/20" : "text-ink")}>
                {lang === "fr" ? (CITY_FR[c.name] ?? c.name) : c.name}
              </span>
              <span className="label hidden leading-relaxed sm:block">
                {coord(c.lat, "N", "S")}
                <br />
                {coord(c.lon, "E", "W")}
              </span>
              <span className="text-right">
                <span className="num block text-[20px] font-light">{compactEur(c.value_eur, lang)}</span>
                <span className="label">
                  {c.assets} {t("h.addresses")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div ref={frame} aria-hidden className={cx("pointer-events-none fixed left-0 top-0 z-40 hidden w-[240px] transition-opacity duration-300 lg:block", hover ? "opacity-100" : "opacity-0")}>
        {ov?.cities.map((c) => (
          <Photo key={c.id} src={`/img/cities/${c.id}.webp`} alt="" className={cx("aspect-[3/4]", hover === c.id ? "block" : "hidden")} rounded="rounded-[22px]" sizes="240px" />
        ))}
      </div>
    </div>
  );
}

// ── 6. Ledger marquee ──────────────────────────────────────────────────────
function Ledger({ items }: { items: Activity[] }) {
  const { lang } = useLang();
  const fr = lang === "fr";
  const line = (a: Activity) =>
    a.kind === "invest"
      ? `${a.who} ${fr ? "investit" : "invests"} ${eur(a.value_eur ?? 0, 0, lang)} · ${a.asset_name}`
      : a.kind === "trade"
        ? `${a.who} ${fr ? "achète" : "buys"} ${a.shares} ${fr ? "parts" : "shares"} · ${a.asset_name}`
        : a.kind === "income"
          ? `${eur(a.value_eur ?? 0, 0, lang)} ${fr ? "de loyers versés" : "rent paid out"} · ${a.asset_name}`
          : `${a.who} ${fr ? "vote" : "votes"} · ${a.asset_name}`;
  const row = (copy: string) =>
    items.map((a) => (
      <span key={copy + a.tx + a.kind} className="flex shrink-0 items-center gap-3 px-7">
        <span className={cx("h-1.5 w-1.5 rounded-full", a.kind === "income" ? "bg-accent" : "bg-ink/40")} />
        <span className="num text-[13px] text-ink-2">{line(a)}</span>
        <span className="num text-[11px] text-muted">{a.tx.slice(0, 10)}…</span>
      </span>
    ));
  return (
    <div className="relative overflow-hidden border-y hairline py-5 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="marquee flex w-max">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}

const ORDER: Record<Asset["phase"], number> = { live: 0, closing: 0, upcoming: 1, funded: 2, refunded: 3 };

export default function Home() {
  const { t } = useLang();
  const { data: ov, error } = useApi<Overview>("overview", api.overview, 15000);
  const { data: assets } = useApi<Asset[]>("assets", () => api.assets(), 15000);
  const { data: activity } = useApi<Activity[]>("activity", () => api.activity(24), 8000);
  if (error) return <ErrorState message={t("common.backend_down")} />;

  const rail = [...(assets ?? [])].sort((a, b) => ORDER[a.phase] - ORDER[b.phase] || b.net_yield_pct - a.net_yield_pct);
  const riad = assets?.find((a) => a.id === "KST-RAK-001");

  return (
    <div>
      <Hero ov={ov} />

      {/* 2. Collection */}
      <section className="relative pt-24 sm:pt-36">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 sm:px-10 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Label n="02">{t("h.collection_label")}</Label>
            <h2 className="mt-5 font-serif text-[clamp(40px,6vw,92px)] leading-[0.92]">
              {t("h.collection_a")} <em className="text-ink/50">{t("h.collection_b")}</em>
            </h2>
          </Reveal>
          <Reveal delay={120} className="max-w-sm">
            <p className="text-[15px] leading-relaxed text-ink-2">{t("h.collection_sub")}</p>
            <Link href="/invest" className="group mt-5 inline-flex items-center gap-2 text-[13.5px] text-accent-ink">
              {t("h.collection_cta")} <ArrowUpRight size={15} className="transition-transform group-hover:-rotate-45" />
            </Link>
          </Reveal>
        </div>
        <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scroll-padding-left:20px] sm:px-10 sm:[scroll-padding-left:40px]">
          {rail.map((a, i) => (
            <CinemaCard key={a.id} a={a} i={i} />
          ))}
          {!assets && Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/5] w-[360px] shrink-0 rounded-[28px] bg-surface-2" />)}
        </div>
      </section>

      {/* 3. Walkthrough */}
      <section id="walkthrough" className="mx-auto max-w-[1400px] scroll-mt-28 px-5 pt-28 sm:px-10 sm:pt-40">
        <Reveal>
          <Label n="03">{t("h.walk_label")}</Label>
          <h2 className="mt-5 max-w-4xl font-serif text-[clamp(40px,6vw,92px)] leading-[0.92]">
            {t("h.walk_a")} <em className="text-ink/50">{t("h.walk_b")}</em>
          </h2>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-2">{t("h.walk_sub")}</p>
        </Reveal>
        <div className="mt-12">{riad ? <Walkthrough asset={riad} /> : <div className="aspect-[16/9] rounded-[28px] bg-surface" />}</div>
      </section>

      {/* 4. Cities */}
      <section className="mx-auto max-w-[1400px] px-5 pt-28 sm:px-10 sm:pt-40">
        <Reveal className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Label n="04">{t("h.cities_label")}</Label>
            <h2 className="mt-5 font-serif text-[clamp(36px,4.6vw,68px)] leading-[0.95]">{t("h.cities")}</h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-2">{t("h.cities_sub")}</p>
        </Reveal>
        <CityIndex ov={ov} />
      </section>

      {/* 5. Rules */}
      <section className="mx-auto max-w-[1400px] px-5 pt-28 sm:px-10 sm:pt-40">
        <Reveal>
          <Label n="05">{t("h.rules_label")}</Label>
          <h2 className="mt-5 max-w-4xl font-serif text-[clamp(40px,6vw,92px)] leading-[0.92]">
            {t("h.rules_a")} <em className="text-ink/50">{t("h.rules_b")}</em>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[28px] border hairline bg-line sm:grid-cols-2 lg:grid-cols-4">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="flex h-full flex-col bg-bg p-7">
              <span className="num text-[13px] text-accent">0{n}</span>
              <h3 className="mt-12 font-serif text-[26px] leading-[1.05]">{t(`h.rule${n}` as TKey)}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{t(`h.rule${n}_text` as TKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Ledger */}
      <section className="pt-28 sm:pt-36">
        <div className="mx-auto mb-6 flex max-w-[1400px] items-center justify-between px-5 sm:px-10">
          <Label n="06">{t("h.ledger")}</Label>
          <span className="label flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {t("h.live")} · block {ov?.block ?? "—"}
          </span>
        </div>
        {activity && activity.length > 0 && <Ledger items={activity} />}
      </section>

      {/* 7. Closing */}
      <section className="mx-auto max-w-[1400px] px-5 pt-32 text-center sm:px-10 sm:pt-44">
        <Reveal>
          <h2 className="font-serif text-[clamp(48px,9vw,150px)] leading-[0.88] tracking-[-0.045em]">
            {t("h.close_a")}
            <br />
            <em className="text-ink/50">{t("h.close_b")}</em>
          </h2>
          <Link href="/invest" className="group mx-auto mt-12 inline-flex items-center gap-3 rounded-full bg-accent-ink py-2 pl-7 pr-2 text-[15px] font-medium text-[#14110c]">
            {t("h.cta")}
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#14110c] text-accent-ink transition-transform duration-300 group-hover:-rotate-45">
              <ArrowUpRight size={17} />
            </span>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
