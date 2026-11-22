"use client";

import { useMemo, useState } from "react";
import type { Asset } from "@/lib/api";
import { cx, eur, pct } from "@/lib/format";
import { useLang } from "@/lib/i18n";

/**
 * "If I invest X in this property, what do I receive?" Net rent at the asset's yield, paid monthly,
 * optionally reinvested into more tokens. A projection from today's yield, not a promise.
 */
export function Simulator({ assets, fixed, className }: { assets: Asset[]; fixed?: boolean; className?: string }) {
  const { lang, pick } = useLang();
  const fr = lang === "fr";
  const [id, setId] = useState(assets[0]?.id);
  const [amount, setAmount] = useState(5000);
  const [years, setYears] = useState(5);
  const [reinvest, setReinvest] = useState(true);
  const a = assets.find((x) => x.id === id) ?? assets[0];

  const sim = useMemo(() => {
    if (!a) return null;
    const r = a.net_yield_pct / 100 / 12;
    const months = years * 12;
    const points: { m: number; invested: number; rent: number }[] = [];
    let capital = Math.floor(amount / a.share_price_eur) * a.share_price_eur;
    const start = capital;
    let cash = 0;
    let rent = 0;
    for (let m = 1; m <= months; m++) {
      const pay = capital * r;
      rent += pay;
      if (reinvest) {
        cash += pay;
        const buy = Math.floor(cash / a.share_price_eur) * a.share_price_eur;
        capital += buy;
        cash -= buy;
      }
      points.push({ m, invested: capital + (reinvest ? cash : 0), rent });
    }
    return { start, tokens: start / a.share_price_eur, rent, monthly: start * r, final: reinvest ? capital + cash : start + rent, points };
  }, [a, amount, years, reinvest]);

  if (!a || !sim) return null;
  const W = 640;
  const H = 220;
  const max = Math.max(sim.final, sim.start) * 1.04;
  const min = sim.start * 0.985;
  const x = (m: number) => (m / (years * 12)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const total = (p: (typeof sim.points)[number]) => (reinvest ? p.invested : sim.start + p.rent);
  const line = `M0,${y(sim.start)} ` + sim.points.map((p) => `L${x(p.m).toFixed(1)},${y(total(p)).toFixed(1)}`).join(" ");

  return (
    <div className={cx("card relative overflow-hidden p-5 sm:p-8", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.28),transparent_70%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          {!fixed && (
            <label className="block text-[12px] text-muted">
              {fr ? "Bien" : "Property"}
              <select value={a.id} onChange={(e) => setId(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border hairline bg-surface-2 px-3 text-[14px] text-ink outline-none focus:border-accent">
                {assets.map((x) => (
                  <option key={x.id} value={x.id}>
                    {pick(x, "name")} · {pct(x.net_yield_pct)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-[12px] text-muted">
            <span className="flex justify-between">
              {fr ? "Montant investi" : "Amount invested"} <b className="num text-[14px] font-medium text-ink">{eur(amount, 0, lang)}</b>
            </span>
            <input type="range" min={100} max={50000} step={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-3 w-full accent-[var(--accent)]" />
          </label>
          <label className="block text-[12px] text-muted">
            <span className="flex justify-between">
              {fr ? "Durée" : "Horizon"} <b className="num text-[14px] font-medium text-ink">{years} {fr ? "ans" : "years"}</b>
            </span>
            <input type="range" min={1} max={15} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} className="mt-3 w-full accent-[var(--accent)]" />
          </label>
          <button onClick={() => setReinvest((v) => !v)} role="switch" aria-checked={reinvest} className="flex w-full items-center justify-between rounded-2xl border hairline px-4 py-3 text-left text-[13.5px]">
            {fr ? "Réinvestir les loyers en tokens" : "Reinvest rent into tokens"}
            <span className={cx("relative h-6 w-11 rounded-full transition-colors", reinvest ? "bg-accent" : "bg-surface-3")}>
              <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", reinvest ? "left-[22px]" : "left-0.5")} />
            </span>
          </button>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-4">
            {[
              [fr ? "Tokens achetés" : "Tokens bought", String(sim.tokens)],
              [fr ? "Loyer mensuel" : "Monthly rent", eur(sim.monthly, 2, lang)],
              [fr ? `Loyers sur ${years} ans` : `Rent over ${years} years`, eur(sim.rent, 0, lang)],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[11.5px] text-muted">{k}</p>
                <p className="font-display mt-1 text-[clamp(20px,2.6vw,34px)] leading-none tracking-[-0.03em]">{v}</p>
              </div>
            ))}
          </div>
          <svg viewBox={`0 -10 ${W} ${H + 20}`} className="mt-6 w-full" role="img" aria-label={fr ? "Projection de la valeur" : "Value projection"}>
            <defs>
              <linearGradient id="simFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ff5b1f" stopOpacity="0.45" />
                <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="simLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ff5b1f" />
                <stop offset="1" stopColor="#ff3d81" />
              </linearGradient>
            </defs>
            <line x1="0" x2={W} y1={y(sim.start)} y2={y(sim.start)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 6" />
            <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#simFill)" className="transition-[d] duration-500" />
            <path d={line} fill="none" stroke="url(#simLine)" strokeWidth="3" strokeLinecap="round" className="transition-[d] duration-500" />
            <circle cx={W} cy={y(sim.final)} r="6" fill="#fff" stroke="#ff5b1f" strokeWidth="3" className="transition-all duration-500" />
          </svg>
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="max-w-xs text-[11.5px] leading-snug text-muted">{fr ? `Projection au rendement net actuel (${pct(a.net_yield_pct)}), valeur du bien constante. Ce n'est pas une promesse.` : `Projection at today's net yield (${pct(a.net_yield_pct)}), property value held constant. Not a promise.`}</p>
            <p className="text-right">
              <span className="block text-[11.5px] text-muted">{fr ? `Valeur après ${years} ans` : `Value after ${years} years`}</span>
              <span className="font-display text-[clamp(28px,3.4vw,48px)] leading-none tracking-[-0.03em] text-accent">{eur(sim.final, 0, lang)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
