"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, Play } from "lucide-react";
import { api, type Activity, type Asset, type Overview } from "@/lib/api";
import { useApi } from "@/lib/chain";
import { compactEur, cx, eur, pct } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";
import { useCategoryLabel } from "@/components/asset-card";
import { ErrorState } from "@/components/ui";
import { CountUp, Magnetic, Reveal, SplitReveal, Stagger, reduced } from "@/components/motion/motion";
import { Aurora } from "@/components/motion/aurora";
import { FLOORS, IsoTower } from "@/components/motion/iso-tower";


const CITY_FR: Record<string, string> = { London: "Londres", Dubai: "Dubaï" };
const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;

const COPY = {
  en: {
    eyebrow: "Keystonia · Real estate, tokenized",
    title_a: "Real estate,",
    title_b: "as tokens.",
    sub: "A New York penthouse, a five-star riad, a Dubai marina hotel: each becomes thousands of €50 tokens. Buy one, collect the rent every month, sell it whenever you want.",
    cta: "Buy your first token",
    cta2: "See how it works",
    rent_label: "Rent, every month",
    rent_title: "Your tokens pay you rent.",
    rent_sub: "Each month the hotel, the riad or the tenant pays. The contract splits the rent between every token and sends your share to your wallet.",
    rent_card: "Rent received over 12 months",
    token: "Your token",
    accrued: "Rent accrued · live simulation",
    loader: "Tokenizing 24 addresses",
    steps_label: "Tokenization, in four moves",
    steps: [
      ["A real property", "Every asset is held by its own company (SPV), valued from public sales data and audited before listing."],
      ["Floor by floor, into tokens", "The company's shares become thousands of tokens on the blockchain. One token = one share of the walls and the rent."],
      ["Each worth €50", "Tokens are sold to verified investors. Every transfer checks identity, country and the holder limit, in code."],
      ["One lands in your wallet", "Rent is paid to every token, every month. Keep it, sell it on the exchange, or vote on the building."],
    ],
    wallet: "Your wallet",
    wallet_rent: "Rent this month",
    stats: ["Addresses tokenized", "Asset value on-chain", "Rent already paid out", "Average net yield"],
    collection_label: "The collection",
    collection: "Twenty-four addresses. Six cities. Only the best.",
    collection_cta: "See the full collection",
    visit_label: "360° visit",
    visit: "Walk in before you buy a single token.",
    visit_sub: "Every property opens as a 360° visit made of real photographs. Let it play, or drag to look around.",
    how_label: "How it works",
    how: "From the walls to your wallet.",
    how_steps: [
      ["Verify once", "A one-time identity check registers your wallet. Unverified wallets can never receive a token.", "KYC"],
      ["Buy tokens", "Pick an address, choose how many tokens. Money waits in escrow until the sale closes, or comes back in full.", "€50"],
      ["Collect the rent", "Rent is split on-chain between every token holder and lands in your wallet each month.", "+€0.26"],
      ["Sell or vote", "Resell tokens to other investors at any time, or vote on works, refinancing or a sale.", "1 = 1"],
    ],
    cities_label: "Six cities",
    cities: "Where the keys are.",
    addresses: "addresses",
    ledger: "The ledger, live",
    live: "Live",
    close_a: "Your first token,",
    close_b: "from €50.",
    price: "Price",
    yield: "Net yield",
  },
  fr: {
    eyebrow: "Keystonia · L'immobilier, tokenisé",
    title_a: "L'immobilier,",
    title_b: "en tokens.",
    sub: "Un penthouse à New York, un riad cinq étoiles, un hôtel sur la marina de Dubaï : chacun devient des milliers de tokens à 50 €. Achetez-en un, touchez le loyer chaque mois, revendez-le quand vous voulez.",
    cta: "Acheter mon premier token",
    cta2: "Voir comment ça marche",
    rent_label: "Le loyer, chaque mois",
    rent_title: "Vos tokens vous versent un loyer.",
    rent_sub: "Chaque mois, l'hôtel, le riad ou le locataire paie. Le contrat répartit le loyer entre tous les tokens et envoie votre part dans votre wallet.",
    rent_card: "Loyers reçus sur 12 mois",
    token: "Votre token",
    accrued: "Loyer accumulé · simulation en direct",
    loader: "Tokenisation de 24 adresses",
    steps_label: "La tokenisation, en 4 temps",
    steps: [
      ["Un vrai bien", "Chaque bien est détenu par sa propre société (SPV), évalué sur des ventes publiques et audité avant d'être listé."],
      ["Étage par étage, en tokens", "Les parts de la société deviennent des milliers de tokens sur la blockchain. Un token = une part des murs et des loyers."],
      ["50 € chacun", "Les tokens sont vendus à des investisseurs vérifiés. Chaque transfert contrôle identité, pays et plafond, dans le code."],
      ["L'un d'eux arrive dans votre wallet", "Le loyer est versé à chaque token, chaque mois. Gardez-le, revendez-le en bourse, ou votez sur l'immeuble."],
    ],
    wallet: "Votre wallet",
    wallet_rent: "Loyer ce mois-ci",
    stats: ["Adresses tokenisées", "Valeur des biens on-chain", "Loyers déjà versés", "Rendement net moyen"],
    collection_label: "La collection",
    collection: "Vingt-quatre adresses. Six villes. Le très haut de gamme.",
    collection_cta: "Voir toute la collection",
    visit_label: "Visite 360°",
    visit: "Entrez avant d'acheter un seul token.",
    visit_sub: "Chaque bien s'ouvre en visite 360° faite de vraies photographies. Laissez défiler, ou glissez pour regarder autour.",
    how_label: "Comment ça marche",
    how: "Des murs à votre wallet.",
    how_steps: [
      ["Vérifiez-vous une fois", "Une vérification d'identité unique enregistre votre wallet. Un wallet non vérifié ne peut jamais recevoir de token.", "KYC"],
      ["Achetez des tokens", "Choisissez une adresse et un nombre de tokens. L'argent reste sous séquestre jusqu'à la clôture, ou revient en entier.", "50 €"],
      ["Touchez le loyer", "Le loyer est réparti on-chain entre tous les détenteurs et arrive dans votre wallet chaque mois.", "+0,26 €"],
      ["Revendez ou votez", "Revendez vos tokens à d'autres investisseurs à tout moment, ou votez sur les travaux, un refinancement ou une vente.", "1 = 1"],
    ],
    cities_label: "Six villes",
    cities: "Là où sont les clés.",
    addresses: "adresses",
    ledger: "Le registre, en direct",
    live: "En direct",
    close_a: "Votre premier token,",
    close_b: "dès 50 €.",
    price: "Prix",
    yield: "Rendement net",
  },
};
type Copy = (typeof COPY)["en"];

function introSeen() {
  try {
    return sessionStorage.getItem("ks-intro") === "1";
  } catch {
    return true;
  }
}

function Label({ n, children, className, light }: { n?: string; children: React.ReactNode; className?: string; light?: boolean }) {
  return (
    <p className={cx("label flex items-center gap-3", light && "!text-white/80", className)}>
      {n && <span className="text-accent">( {n} )</span>}
      {children}
    </p>
  );
}

function PrimaryButton({ href, children, light = false }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <Magnetic>
      <Link href={href} className={cx("group flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-[14.5px] font-medium transition active:scale-[0.97]", light ? "bg-white text-[#0f0f0d]" : "bg-ink text-bg")}>
        {children}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-transform duration-500 ease-[var(--ease-out)] group-hover:rotate-45">
          <ArrowUpRight size={16} />
        </span>
      </Link>
    </Magnetic>
  );
}

// ── 0. Preloader: counts to 100, once per session ────────────────────────────
function Preloader({ c, onDone }: { c: Copy; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);
  useGSAP(() => {
    const seen = introSeen();
    try {
      sessionStorage.setItem("ks-intro", "1");
    } catch {
      /* private mode */
    }
    if (seen || reduced()) {
      setGone(true);
      onDone();
      return;
    }
    const o = { v: 0 };
    gsap
      .timeline({
        onComplete: () => {
          setGone(true);
        },
      })
      .to(o, { v: 100, duration: 1.5, ease: "power2.inOut", onUpdate: () => void (num.current && (num.current.textContent = String(Math.round(o.v)).padStart(3, "0"))) })
      .add(onDone, "+=0.05")
      .to(root.current, { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, "<");
  }, []);
  if (gone) return null;
  return (
    <div ref={root} className="fixed inset-0 z-[95] flex flex-col justify-between bg-ink p-6 text-white sm:p-10" style={{ clipPath: "inset(0 0 0 0)" }}>
      <p className="font-display text-[22px]">
        Keystonia<span className="text-accent">✦</span>
      </p>
      <div className="flex items-end justify-between gap-6">
        <p className="label !text-white/60">{c.loader}…</p>
        <span ref={num} className="font-display text-[22vw] leading-[0.8] tracking-[-0.05em] sm:text-[16vw]">
          000
        </span>
      </div>
    </div>
  );
}

// ── 1. Hero: colour field, giant wordmark, the building of floors ─────────────
function Hero({ c, start }: { c: Copy; start: boolean }) {
  const { lang } = useLang();
  const root = useRef<HTMLElement>(null);
  const rent = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!start || reduced()) return;
      gsap
        .timeline()
        .from(".hero-aurora", { opacity: 0, duration: 2.4, ease: "power2.out" })
        .from(".hero-letter", { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.045 }, 0.1)
        .from(".hero-tower .iso-floor", { y: -520, opacity: 0, duration: 1.5, ease: "expo.out", stagger: 0.07 }, 0.25)
        .from(".hero-tower .iso-ground", { opacity: 0, duration: 1.2 }, 0.3)
        .from(".hero-line", { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.1 }, 0.5)
        .from(".hero-fade", { y: 30, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1 }, 0.7)
        .add(() => {
          // idle: the floors breathe
          gsap.to(".hero-tower .iso-floor", { y: "-=7", duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.12, from: "start" } });
        });
      gsap.to(".hero-word", { yPercent: -45, opacity: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "70% top", scrub: true } });
      gsap.to(".hero-tower", { yPercent: 12, scale: 1.06, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    },
    { scope: root, dependencies: [start] },
  );

  // Rent accruing on the token card (simulation: €50 at 6.2 % net, one month every 4 seconds).
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      if (rent.current) rent.current.textContent = eur((50 * 0.062 * ((t - t0) / 4000)) / 12, 4, lang);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [lang]);

  return (
    <section ref={root} className={cx("relative h-[100svh] min-h-[680px] overflow-hidden", !start && "invisible")}>
      <Aurora className="hero-aurora absolute inset-0 h-full w-full" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-bg to-transparent" />

      <div className="hero-word pointer-events-none absolute inset-x-0 top-[15%] flex justify-center px-3 sm:top-[14%]">
        <p aria-hidden className="font-display flex text-[16.4vw] font-semibold leading-[0.8] tracking-[-0.055em] text-white/[0.13] sm:text-[18.6vw]">
          {"KEYSTONIA".split("").map((l, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.05em]">
              <span className="hero-letter inline-block">{l}</span>
            </span>
          ))}
        </p>
      </div>

      <div className="hero-tower pointer-events-none absolute left-1/2 top-[10%] h-[43%] -translate-x-1/2 sm:bottom-[-6%] sm:left-auto sm:right-[2%] sm:top-auto sm:h-[92%] sm:translate-x-0 lg:right-[9%]">
        <IsoTower className="h-full w-auto" />
      </div>

      <div className="absolute inset-x-5 bottom-7 flex flex-col gap-6 sm:inset-x-10 sm:bottom-12 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[720px] text-white">
          <Label light className="hero-fade">
            {c.eyebrow}
          </Label>
          <h1 className="font-display mt-4 text-[clamp(46px,7vw,104px)] leading-[0.92] tracking-[-0.04em]">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="hero-line block">{c.title_a}</span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="hero-line block text-accent">{c.title_b}</span>
            </span>
          </h1>
          <p className="hero-fade mt-5 max-w-[34rem] text-[15.5px] leading-[1.55] text-white/80 sm:text-[17px]">{c.sub}</p>
          <div className="hero-fade mt-7 flex flex-wrap items-center gap-3">
            <PrimaryButton href="/invest" light>
              {c.cta}
            </PrimaryButton>
            <a href="#tokenize" className="glass-dark flex items-center gap-2.5 rounded-full px-5 py-3.5 text-[14.5px] transition hover:bg-white/25">
              <Play size={12} className="fill-current" /> {c.cta2}
            </a>
          </div>
        </div>
        <div className="hero-fade glass-dark hidden w-[320px] rounded-[26px] p-5 lg:block">
          <div className="flex items-center justify-between">
            <p className="label !text-white/75">{c.token}</p>
            <span className="rounded-full bg-accent px-2.5 py-1 font-mono text-[10.5px] text-white">KST-NYC-001</span>
          </div>
          <p className="font-display mt-4 text-[40px] leading-none">#04217</p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-4 text-[12.5px]">
            <div>
              <p className="text-white/65">{c.price}</p>
              <p suppressHydrationWarning className="num mt-0.5 text-[17px]">{eur(50, 0, lang)}</p>
            </div>
            <div>
              <p className="text-white/65">{c.yield}</p>
              <p suppressHydrationWarning className="num mt-0.5 text-[17px]">{pct(6.2)}</p>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] text-white/65">{c.accrued}</p>
          <span ref={rent} suppressHydrationWarning className="num text-[20px] text-white">
            {eur(0, 4, lang)}
          </span>
        </div>
      </div>
    </section>
  );
}

// ── 2. Signature: the floors come apart into tokens ───────────────────────────
const SELECTED = 6;

function Tokenize({ c }: { c: Copy }) {
  const { lang } = useLang();
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useGSAP(
    () => {
      if (reduced()) return;
      const floors = gsap.utils.toArray<SVGGElement>(".tk-tower .iso-floor");
      const others = floors.filter((_, i) => i !== SELECTED);
      const chosen = floors[SELECTED];
      const mid = (FLOORS - 1) / 2;
      gsap
        .timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=340%", scrub: 1, pin: true, onUpdate: (st) => setStep(Math.min(3, Math.floor(st.progress * 4.15))) },
        })
        // 1 → 2: the storeys lift apart
        .to(floors, { y: (i) => -(i - mid) * 26, duration: 1.2, stagger: { each: 0.03, from: "center" } }, 0.2)
        .to(".tk-tower .iso-cells", { opacity: 1, duration: 0.7, stagger: 0.03 }, 0.9)
        // 2 → 3: every cell is a token
        .to(".tk-tower .iso-cell", { fillOpacity: 0.75, duration: 0.5, stagger: { amount: 1.0, from: "random" } }, 1.9)
        .to(".tk-count", { opacity: 1, y: 0, duration: 0.5 }, 2.2)
        // 3 → 4: one floor, one token, your wallet
        .to(".tk-count", { opacity: 0, duration: 0.3 }, 3.2)
        .to(others, { opacity: 0.1, duration: 0.9 }, 3.2)
        .to(chosen, { y: 0, scale: 1.25, svgOrigin: "0 -120", duration: 1.0, ease: "expo.inOut" }, 3.2)
        .to(".tk-tower .iso-mine", { fill: "#ffffff", fillOpacity: 1, stroke: "#ffffff", duration: 0.4 }, 3.9)
        .to(".tk-tower .iso-mine", { y: -150, scale: 2.6, transformOrigin: "50% 50%", duration: 0.9, ease: "expo.out" }, 4.1)
        .to(".tk-wallet", { opacity: 1, x: 0, duration: 0.9, ease: "expo.out" }, 4.3)
        .to({}, { duration: 0.6 });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="tokenize" className="relative flex h-[100svh] items-center overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute right-[-10%] top-1/2 h-[90vh] w-[90vh] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,91,31,0.16),rgba(124,92,255,0.08)_45%,transparent_70%)]" />
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-6 px-5 sm:px-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10">
          <Label n="02">{c.steps_label}</Label>
          <div className="relative mt-6 min-h-[210px] sm:min-h-[270px]">
            {c.steps.map(([title, text], i) => (
              <div key={title} className={cx("absolute inset-x-0 top-0 transition-all duration-700 ease-[var(--ease-out)]", step === i ? "translate-y-0 opacity-100" : i < step ? "-translate-y-8 opacity-0" : "translate-y-8 opacity-0")}>
                <p className="num text-[13px] text-accent">0{i + 1} / 04</p>
                <h2 className="font-display mt-3 text-[clamp(36px,5vw,76px)] leading-[0.95] tracking-[-0.04em]">{title}</h2>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-2">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cx("h-[3px] flex-1 rounded-full transition-colors duration-500", i <= step ? "bg-accent" : "bg-ink/10")} />
            ))}
          </div>
        </div>

        <div className="relative flex h-[52svh] items-center justify-center sm:h-[82svh]">
          <IsoTower className="tk-tower h-full w-auto" selected={SELECTED} />
          <p suppressHydrationWarning className="tk-count num absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-4 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-white opacity-0">
            20 000 tokens × {eur(50, 0, lang)} = {eur(1_000_000, 0, lang)}
          </p>
          <div className="tk-wallet card absolute right-0 top-[18%] w-[220px] translate-x-10 p-5 opacity-0 sm:w-[260px]">
            <p className="label">{c.wallet}</p>
            <p className="font-display mt-3 text-[30px] leading-none">1 token</p>
            <p className="num mt-1 text-[12px] text-muted">KST-NYC-001 · #4217</p>
            <div className="mt-4 border-t hairline pt-3">
              <p className="text-[12px] text-muted">{c.wallet_rent}</p>
              <p suppressHydrationWarning className="num text-[20px] text-positive">+{eur(0.26, 2, lang)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 2b. Rent, drawn: an animated payout chart ─────────────────────────────────
function RentChart({ c }: { c: Copy }) {
  const { lang } = useLang();
  const root = useRef<HTMLElement>(null);
  const months = lang === "fr" ? ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] : ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  // cumulative rent for 100 tokens at 6.2 % net, paid monthly
  const pts = months.map((_, i) => [40 + i * 84, 300 - (i + 1) * 21] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  useGSAP(
    () => {
      if (reduced()) return;
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 65%", once: true } });
      tl.from(".rc-bar", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9, ease: "expo.out", stagger: 0.06 })
        .from(".rc-line", { strokeDashoffset: 1200, duration: 1.8, ease: "power2.inOut" }, 0.2)
        .from(".rc-dot", { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(3)", stagger: 0.06 }, 0.5)
        .from(".rc-tag", { opacity: 0, y: 12, duration: 0.6 }, 1.6);
    },
    { scope: root },
  );
  return (
    <section ref={root} className="mx-auto max-w-[1400px] px-5 pt-28 sm:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <Label n="03">{c.rent_label}</Label>
          <SplitReveal className="font-display mt-5 text-[clamp(40px,5.6vw,88px)] leading-[0.92] tracking-[-0.04em]">{c.rent_title}</SplitReveal>
          <Reveal className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-2">{c.rent_sub}</Reveal>
        </div>
        <div className="card relative overflow-hidden p-5 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,91,31,0.35),transparent_70%)]" />
          <div className="flex items-end justify-between">
            <div>
              <p className="label">{c.rent_card}</p>
              <CountUp key={lang} value={310} format={(v) => eur(v, 2, lang)} className="font-display mt-2 block text-[clamp(40px,5vw,72px)] leading-none tracking-[-0.04em] text-accent" />
            </div>
            <p className="num text-right text-[12px] text-muted">
              100 tokens · {eur(5000, 0, lang)}
              <br />
              6.2 % net
            </p>
          </div>
          <svg viewBox="0 0 1004 340" className="mt-6 w-full" role="img" aria-label={c.rent_card}>
            <defs>
              <linearGradient id="rcBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ff5b1f" stopOpacity="0.9" />
                <stop offset="1" stopColor="#7c5cff" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="rcLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ff5b1f" />
                <stop offset="1" stopColor="#ff3d81" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((g) => (
              <line key={g} x1="0" x2="1004" y1={300 - g * 84} y2={300 - g * 84} stroke="currentColor" strokeOpacity="0.08" />
            ))}
            {pts.map(([x, y], i) => (
              <g key={i}>
                <rect className="rc-bar" x={x - 22} y={y} width="44" height={300 - y} rx="8" fill="url(#rcBar)" opacity="0.55" />
                <text x={x} y="330" textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.45" fontFamily="var(--font-label)">
                  {months[i]}
                </text>
              </g>
            ))}
            <path className="rc-line" d={line} fill="none" stroke="url(#rcLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1200" strokeDashoffset="0" />
            {pts.map(([x, y], i) => (
              <circle key={i} className="rc-dot" cx={x} cy={y} r="6" fill="#fff" stroke="#ff5b1f" strokeWidth="3" />
            ))}
          </svg>
          <p className="rc-tag num absolute right-6 top-[46%] rounded-full bg-accent px-3 py-1.5 text-[12px] font-medium text-white sm:right-10">+{eur(25.83, 2, lang)} / {lang === "fr" ? "mois" : "month"}</p>
        </div>
      </div>
    </section>
  );
}


// ── 3. Collection: horizontal rail pinned to the scroll ───────────────────────
function Collection({ c, assets }: { c: Copy; assets: Asset[] }) {
  const { lang, pick, t } = useLang();
  const cat = useCategoryLabel();
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = track.current;
      if (!el || reduced() || window.innerWidth < 768) return;
      const dist = () => el.scrollWidth - window.innerWidth + 80;
      gsap.to(el, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${dist()}`, scrub: 1, pin: true, invalidateOnRefresh: true } });
    },
    { scope: root, dependencies: [assets.length] },
  );
  return (
    <section ref={root} className="relative overflow-hidden bg-bg py-24 md:flex md:h-[100svh] md:flex-col md:justify-center md:pb-0 md:pt-24">
      <div className="mx-auto mb-10 flex w-full max-w-[1400px] flex-col gap-5 px-5 sm:px-10 md:flex-row md:items-end md:justify-between">
        <div>
          <Label n="04">{c.collection_label}</Label>
          <SplitReveal className="font-display mt-5 max-w-3xl text-[clamp(38px,5.4vw,84px)] leading-[0.95] tracking-[-0.04em]">{c.collection}</SplitReveal>
        </div>
        <Link href="/invest" className="group inline-flex items-center gap-2 text-[14px] font-medium">
          {c.collection_cta} <ArrowUpRight size={16} className="transition-transform group-hover:rotate-45" />
        </Link>
      </div>
      <div ref={track} className="no-scrollbar flex gap-4 overflow-x-auto px-5 sm:px-10 md:overflow-visible">
        {assets.map((a, i) => (
          <Link key={a.id} href={`/assets/${a.id.toLowerCase()}`} className="group relative block w-[78vw] shrink-0 overflow-hidden rounded-[26px] sm:w-[340px] lg:w-[400px]">
            <div className="aspect-[4/5] bg-surface transition-transform duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.04]" style={{ backgroundImage: `radial-gradient(120% 90% at ${20 + ((i * 37) % 60)}% 0%, ${RAIL_HUES[i % RAIL_HUES.length]} 0%, transparent 62%), radial-gradient(90% 70% at 100% 100%, rgba(124,92,255,0.28), transparent 60%)` }} />
            <span aria-hidden className="font-display pointer-events-none absolute -right-3 top-10 text-[190px] font-semibold leading-none tracking-[-0.06em] text-white/[0.07]">
              {a.id.split("-")[1]}
            </span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute inset-x-5 top-5 flex items-center justify-between">
              <span className="num text-[12px] text-white/80">{String(i + 1).padStart(2, "0")}</span>
              <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-medium", a.phase === "live" ? "bg-accent text-white" : "bg-white/85 text-ink")}>{t(`phase.${a.phase}` as TKey)}</span>
            </div>
            <div className="absolute inset-x-5 bottom-5 text-white">
              <p className="text-[12px] text-white/75">
                {a.city_name} · {cat(a.category)}
              </p>
              <h3 className="font-display mt-1.5 text-[28px] leading-[1] tracking-[-0.02em]">{pick(a, "name")}</h3>
              <div className="mt-4 flex items-end justify-between border-t border-white/20 pt-3">
                <span className="num text-[13px] text-white/80">{eur(a.share_price_eur, 0, lang)} / token</span>
                <span className="font-display text-[24px]">{pct(a.net_yield_pct)}</span>
              </div>
            </div>
          </Link>
        ))}
        <Link href="/invest" className="group flex w-[78vw] shrink-0 flex-col justify-between rounded-[26px] bg-accent p-7 text-white sm:w-[340px] lg:w-[400px]">
          <span className="num text-[12px] text-white/60">+12</span>
          <span>
            <span className="font-display block text-[44px] leading-[0.95] tracking-[-0.03em]">{c.collection_cta}</span>
            <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0f0f0d] transition-transform duration-500 group-hover:rotate-45">
              <ArrowUpRight size={20} />
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}

// ── 5. How it works: stacking cards ───────────────────────────────────────────
function HowItWorks({ c }: { c: Copy }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (reduced()) return;
      const cards = gsap.utils.toArray<HTMLElement>(".how-card");
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card.firstElementChild, { scale: 0.92, opacity: 0.55, ease: "none", scrollTrigger: { trigger: next, start: "top 85%", end: "top 140px", scrub: true } });
      });
    },
    { scope: root },
  );
  const tones = ["bg-surface", "bg-surface-2", "bg-[#f4ece4] text-[#120a0b]", "bg-accent text-white"];
  return (
    <section ref={root} className="mx-auto max-w-[1400px] px-5 pt-32 sm:px-10">
      <Label n="05">{c.how_label}</Label>
      <SplitReveal className="font-display mt-5 max-w-4xl text-[clamp(40px,6vw,96px)] leading-[0.92] tracking-[-0.04em]">{c.how}</SplitReveal>
      <div className="mt-14">
        {c.how_steps.map(([title, text, big], i) => (
          <div key={title} className="how-card sticky top-[120px] mb-6">
            <div className={cx("grid min-h-[340px] origin-top gap-8 rounded-[32px] border hairline p-8 sm:grid-cols-[1fr_auto] sm:p-12", tones[i])}>
              <div className="flex flex-col justify-between gap-10">
                <span className="num text-[14px] opacity-60">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-[clamp(34px,4vw,60px)] leading-[0.95] tracking-[-0.03em]">{title}</h3>
                  <p className="mt-4 max-w-lg text-[16px] leading-relaxed opacity-75">{text}</p>
                </div>
              </div>
              <p className="font-display self-end text-[clamp(64px,11vw,180px)] leading-[0.8] tracking-[-0.06em] opacity-90">{big}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 6. Cities: editorial index with a floating photo ─────────────────────────
function Cities({ c, ov }: { c: Copy; ov?: Overview }) {
  const { lang } = useLang();
  const [hover, setHover] = useState<string | null>(null);
  return (
    <section
      className="mx-auto max-w-[1400px] px-5 pt-32 sm:px-10"
      onMouseLeave={() => setHover(null)}
    >
      <Label n="06">{c.cities_label}</Label>
      <SplitReveal className="font-display mb-12 mt-5 text-[clamp(40px,6vw,96px)] leading-[0.92] tracking-[-0.04em]">{c.cities}</SplitReveal>
      <Stagger className="border-t hairline">
        {(ov?.cities ?? []).map((city, i) => (
          <Link key={city.id} href={`/invest?city=${city.id}`} onMouseEnter={() => setHover(city.id)} className="group grid grid-cols-[1fr_auto] items-end gap-4 border-b hairline py-6 sm:grid-cols-[60px_1fr_200px_160px] sm:py-8">
            <span className="num hidden text-[13px] text-muted sm:block">0{i + 1}</span>
            <span className={cx("font-display text-[clamp(48px,9vw,140px)] leading-[0.82] tracking-[-0.05em] transition-all duration-500 ease-[var(--ease-out)] group-hover:translate-x-4 group-hover:text-accent", hover && hover !== city.id ? "text-ink/20" : "text-ink")}>
              {lang === "fr" ? (CITY_FR[city.name] ?? city.name) : city.name}
            </span>
            <span className="num hidden text-[12px] leading-relaxed text-muted sm:block">
              {coord(city.lat, "N", "S")}
              <br />
              {coord(city.lon, "E", "W")}
            </span>
            <span className="text-right">
              <span className="font-display block text-[24px]">{compactEur(city.value_eur, lang)}</span>
              <span className="text-[12px] text-muted">
                {city.assets} {c.addresses}
              </span>
            </span>
          </Link>
        ))}
      </Stagger>
    </section>
  );
}

// ── 7. Ledger marquee ─────────────────────────────────────────────────────────
function Ledger({ items, block, c }: { items: Activity[]; block?: string; c: Copy }) {
  const { lang } = useLang();
  const fr = lang === "fr";
  const line = (a: Activity) =>
    a.kind === "invest"
      ? `${a.who} ${fr ? "achète des tokens" : "buys tokens"} · ${eur(a.value_eur ?? 0, 0, lang)} · ${a.asset_name}`
      : a.kind === "trade"
        ? `${a.who} ${fr ? "rachète" : "buys back"} ${a.shares} tokens · ${a.asset_name}`
        : a.kind === "income"
          ? `${eur(a.value_eur ?? 0, 0, lang)} ${fr ? "de loyers versés" : "rent paid"} · ${a.asset_name}`
          : `${a.who} ${fr ? "vote" : "votes"} · ${a.asset_name}`;
  const row = (k: string) =>
    items.map((a) => (
      <span key={k + a.tx + a.kind} className="flex shrink-0 items-center gap-3 px-8">
        <span className={cx("h-2 w-2 rounded-full", a.kind === "income" ? "bg-accent" : "bg-ink/30")} />
        <span className="text-[15px]">{line(a)}</span>
        <span className="num text-[11px] text-muted">{a.tx.slice(0, 10)}…</span>
      </span>
    ));
  return (
    <section className="pt-32">
      <div className="mx-auto mb-6 flex max-w-[1400px] items-center justify-between px-5 sm:px-10">
        <Label n="07">{c.ledger}</Label>
        <span className="label flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {c.live} · block {block ?? "—"}
        </span>
      </div>
      <div className="relative overflow-hidden border-y hairline bg-surface py-6 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <div className="marquee flex w-max">
          {row("a")}
          {row("b")}
        </div>
      </div>
    </section>
  );
}

const RAIL_HUES = ["rgba(255,91,31,0.75)", "rgba(255,61,129,0.7)", "rgba(124,92,255,0.7)", "rgba(255,179,71,0.7)", "rgba(194,24,91,0.75)"];
const ORDER: Record<Asset["phase"], number> = { live: 0, closing: 0, upcoming: 1, funded: 2, refunded: 3 };

export default function Home() {
  const { t, lang } = useLang();
  const c = COPY[lang];
  const [started, setStarted] = useState(false);
  const { data: ov, error } = useApi<Overview>("overview", api.overview, 15000);
  const { data: assets } = useApi<Asset[]>("assets", () => api.assets(), 15000);
  const { data: activity } = useApi<Activity[]>("activity", () => api.activity(24), 8000);
  if (error) return <ErrorState message={t("common.backend_down")} />;
  // Ten featured addresses with distinct cover photos; the rest live on the collection page.
  const rail = [...(assets ?? [])]
    .sort((a, b) => ORDER[a.phase] - ORDER[b.phase] || b.net_yield_pct - a.net_yield_pct)
    .slice(0, 12);

  const stats: [number, (v: number) => string][] = [
    [ov?.assets ?? 24, (v) => String(Math.round(v))],
    [ov?.tokenized_value_eur ?? 0, (v) => compactEur(v, lang)],
    [ov?.income_distributed_eur ?? 0, (v) => compactEur(v, lang)],
    [ov?.avg_net_yield_pct ?? 0, (v) => pct(v)],
  ];

  return (
    <div className="theme-night">
      <Preloader c={c} onDone={() => setStarted(true)} />
      <Hero c={c} start={started} />
      <Tokenize c={c} />
      <RentChart c={c} />

      <section className="mx-auto max-w-[1400px] px-5 pt-28 sm:px-10">
        <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border hairline bg-line lg:grid-cols-4">
          {stats.map(([v, f], i) => (
            <div key={i} className="bg-bg p-6 sm:p-8">
              <CountUp key={lang + i} value={v} format={f} className="font-display block text-[clamp(36px,5vw,72px)] leading-none tracking-[-0.04em]" />
              <p className="mt-3 text-[13.5px] text-muted">{c.stats[i]}</p>
            </div>
          ))}
        </Stagger>
      </section>

      <div className="pt-24">{rail.length > 0 && <Collection c={c} assets={rail} />}</div>
      <HowItWorks c={c} />
      <Cities c={c} ov={ov} />
      {activity && activity.length > 0 && <Ledger items={activity} block={ov?.block} c={c} />}

      <section className="relative mx-auto mt-32 max-w-[1400px] px-2.5 sm:px-4">
        <div className="relative overflow-hidden rounded-[36px] px-6 py-24 text-center text-white sm:py-36">
          <Aurora className="absolute inset-0 h-full w-full" />
          <div className="relative">
            <SplitReveal className="font-display text-[clamp(46px,8vw,140px)] leading-[0.9] tracking-[-0.05em]">
              {c.close_a}
              <br />
              {c.close_b}
            </SplitReveal>
            <div className="mt-10 flex justify-center">
              <PrimaryButton href="/invest" light>
                {c.cta}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
