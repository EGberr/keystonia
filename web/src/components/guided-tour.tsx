"use client";

import Link from "next/link";
import { Check, ChevronDown, PlayCircle, X } from "lucide-react";
import { api, type Portfolio } from "@/lib/api";
import { useApi, useWallet } from "@/lib/chain";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { tourReset, tourSet, useTour } from "@/lib/tour";

const COPY = {
  en: {
    title: "Guided demo",
    sub: "Four steps, about one minute",
    start: "Take the guided demo",
    done: "Done. You just used every core feature.",
    restart: "Restart",
    steps: [
      ["Verify your identity", "Only verified wallets can hold tokens.", "/portfolio#kyc", "Open portfolio"],
      ["Buy tokens", "Pick an open offering and invest.", "/invest?phase=live", "See open offerings"],
      ["Jump one month ahead", "Rent is paid to every token holder.", "/transparency", "Open ledger"],
      ["Collect your rent", "Claim it to your wallet in one click.", "/portfolio", "Open portfolio"],
    ],
  },
  fr: {
    title: "Démo guidée",
    sub: "Quatre étapes, environ une minute",
    start: "Lancer la démo guidée",
    done: "Terminé. Vous venez d'utiliser toutes les fonctions clés.",
    restart: "Recommencer",
    steps: [
      ["Vérifiez votre identité", "Seuls les wallets vérifiés peuvent détenir des tokens.", "/portfolio#kyc", "Ouvrir le portefeuille"],
      ["Achetez des tokens", "Choisissez une levée ouverte et investissez.", "/invest?phase=live", "Voir les levées ouvertes"],
      ["Avancez d'un mois", "Le loyer est versé à chaque détenteur de token.", "/transparency", "Ouvrir le registre"],
      ["Touchez votre loyer", "Récupérez-le dans votre wallet en un clic.", "/portfolio", "Ouvrir le portefeuille"],
    ],
  },
};

/** Floating checklist that walks a first-time visitor through the product in four real actions. */
export function GuidedTour() {
  const { lang } = useLang();
  const c = COPY[lang];
  const wallet = useWallet();
  const tour = useTour();
  const { data: p } = useApi<Portfolio>(`portfolio:${wallet.address}`, () => api.portfolio(wallet.address));
  const state = [Boolean(p?.profile.kyc), tour.done("invest"), tour.done("month"), tour.done("claim")];
  const current = state.findIndex((s) => !s);
  const finished = current === -1;

  if (!tour.open)
    return (
      <button onClick={() => tourSet("open")} className="fixed bottom-4 left-4 z-[55] flex items-center gap-2 rounded-full bg-accent py-2.5 pl-3 pr-4 text-[13px] font-medium text-white shadow-[0_10px_40px_-10px_rgba(255,91,31,0.8)] transition hover:scale-[1.03]">
        <PlayCircle size={17} /> {c.start}
      </button>
    );

  return (
    <aside className="card fixed bottom-4 left-4 z-[55] w-[min(340px,calc(100vw-2rem))] overflow-hidden p-4" aria-label={c.title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[19px] leading-none">{c.title}</p>
          <p className="mt-1.5 text-[12px] text-muted">{c.sub}</p>
        </div>
        <button onClick={() => tourSet("closed")} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
          {finished ? <X size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      <div className="mt-3 flex gap-1">
        {state.map((s, i) => (
          <span key={i} className={cx("h-[3px] flex-1 rounded-full transition-colors duration-500", s ? "bg-accent" : "bg-ink/10")} />
        ))}
      </div>
      <ol className="mt-3 space-y-1.5">
        {c.steps.map(([title, text, href, cta], i) => (
          <li key={title} className={cx("rounded-2xl border p-3 transition", i === current ? "border-accent bg-accent-soft" : "hairline")}>
            <div className="flex items-center gap-2.5">
              <span className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-medium", state[i] ? "bg-accent text-white" : "bg-surface-3 text-muted")}>{state[i] ? <Check size={12} /> : i + 1}</span>
              <span className={cx("text-[13.5px] font-medium", state[i] && "text-muted line-through")}>{title}</span>
            </div>
            {i === current && (
              <div className="mt-2 pl-[30px]">
                <p className="text-[12.5px] leading-snug text-ink-2">{text}</p>
                <Link href={href} className="mt-2 inline-flex rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-bg">
                  {cta}
                </Link>
              </div>
            )}
          </li>
        ))}
      </ol>
      {finished && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-positive">{c.done}</p>
          <button onClick={tourReset} className="shrink-0 text-[12px] text-muted underline">
            {c.restart}
          </button>
        </div>
      )}
    </aside>
  );
}
