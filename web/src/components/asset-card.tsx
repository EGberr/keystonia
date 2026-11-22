"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { Asset } from "@/lib/api";
import { countdown, cx, eur, pct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { Photo } from "@/components/photo";

export function PhaseBadge({ phase, className }: { phase: Asset["phase"]; className?: string }) {
  const { t } = useLang();
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur",
        phase === "live" && "bg-accent text-[#1b1409]",
        phase === "funded" && "bg-surface/90 text-accent-ink",
        phase === "upcoming" && "bg-surface/90 text-ink",
        (phase === "closing" || phase === "refunded") && "bg-surface/90 text-muted",
        className,
      )}
    >
      {phase === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1b1409]" />}
      {t(`phase.${phase}`)}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
      <div className="h-full rounded-full bg-accent-ink transition-[width] duration-700" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export function useCategoryLabel() {
  const { lang } = useLang();
  const labels: Record<string, [string, string]> = {
    residential: ["Residences", "Résidences"],
    hospitality: ["Hotels & riads", "Hôtels & riads"],
    commercial: ["Flagships & dining", "Flagships & tables"],
    resort: ["Resorts & villas", "Resorts & villas"],
    land: ["Estates & vineyards", "Domaines & vignobles"],
  };
  return (c: string) => labels[c]?.[lang === "fr" ? 1 : 0] ?? c;
}

export function AssetCard({ a, now, className }: { a: Asset; now?: number; className?: string }) {
  const { t, lang, pick } = useLang();
  const cat = useCategoryLabel();
  const left = now ? a.ends_at - now : 0;
  return (
    <Link href={`/assets/${a.id.toLowerCase()}`} className={cx("group card flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-line-strong", className)}>
      <div className="relative">
        <Photo src={a.images[0]} alt={pick(a, "name")} className="aspect-[4/3]" rounded="rounded-none" sizes="(max-width: 768px) 100vw, 400px" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <PhaseBadge phase={a.phase} />
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">{cat(a.category)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-[12px] text-muted">
          <MapPin size={12} /> {a.district}, {a.city_name}
        </p>
        <h3 className="mt-1 font-serif text-[21px] leading-tight tracking-tight">{pick(a, "name")}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-2">{pick(a, "tagline")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t hairline pt-3 text-[12px]">
          <div>
            <p className="text-muted">{t("asset.net_yield")}</p>
            <p className="num mt-0.5 text-[15px] font-semibold text-accent-ink">{pct(a.net_yield_pct)}</p>
          </div>
          <div>
            <p className="text-muted">{t("asset.share_price")}</p>
            <p className="num mt-0.5 text-[15px] font-semibold">{eur(a.share_price_eur, 0, lang)}</p>
          </div>
          <div>
            <p className="text-muted">{t("asset.valuation")}</p>
            <p className="num mt-0.5 text-[15px] font-semibold">{new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { notation: "compact", style: "currency", currency: "EUR", maximumFractionDigits: 1 }).format(a.valuation_eur)}</p>
          </div>
        </div>
        {a.phase === "live" || a.phase === "closing" ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="num font-medium">
                {pct(a.progress_pct, 0)} {t("asset.funded")}
              </span>
              <span className="flex items-center gap-1 text-muted">
                <Clock size={12} /> {now ? countdown(left, lang) : "—"}
              </span>
            </div>
            <ProgressBar value={a.progress_pct} />
          </div>
        ) : a.phase === "funded" ? (
          <p className="mt-4 text-[12px] text-muted">
            {t("asset.income_paid")}: <span className="num font-medium text-ink">{eur(a.income_distributed_eur, 0, lang)}</span> · {a.holders} {t("asset.investors")}
          </p>
        ) : (
          <p className="mt-4 text-[12px] text-muted">
            {t("asset.opens")} {new Date(a.starts_at * 1000).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long" })}
          </p>
        )}
      </div>
    </Link>
  );
}
