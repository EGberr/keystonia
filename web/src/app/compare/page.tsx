"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { api, type Asset } from "@/lib/api";
import { useApi } from "@/lib/chain";
import { compactEur, cx, eur, num, pct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useCategoryLabel } from "@/components/asset-card";
import { Photo } from "@/components/photo";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui";

type Row = { en: string; fr: string; get: (a: Asset) => number; show: (a: Asset, lang: "en" | "fr") => string; best?: "max" | "min" };
const ROWS: Row[] = [
  { en: "Net yield", fr: "Rendement net", get: (a) => a.net_yield_pct, show: (a) => pct(a.net_yield_pct), best: "max" },
  { en: "Token price", fr: "Prix du token", get: (a) => a.share_price_eur, show: (a, l) => eur(a.share_price_eur, 0, l), best: "min" },
  { en: "Valuation", fr: "Valorisation", get: (a) => a.valuation_eur, show: (a, l) => compactEur(a.valuation_eur, l) },
  { en: "Occupancy", fr: "Occupation", get: (a) => a.occupancy_pct, show: (a) => pct(a.occupancy_pct, 0), best: "max" },
  { en: "Funded", fr: "Financé", get: (a) => a.progress_pct, show: (a) => pct(a.progress_pct, 0) },
  { en: "Investors", fr: "Investisseurs", get: (a) => a.investors, show: (a, l) => num(a.investors, l) },
  { en: "Rent paid so far", fr: "Loyers déjà versés", get: (a) => a.income_distributed_eur, show: (a, l) => compactEur(a.income_distributed_eur, l), best: "max" },
  { en: "Monthly rent per €1,000", fr: "Loyer mensuel pour 1 000 €", get: (a) => a.net_yield_pct, show: (a, l) => eur((1000 * a.net_yield_pct) / 1200, 2, l) },
];

function Compare() {
  const { lang, pick } = useLang();
  const fr = lang === "fr";
  const cat = useCategoryLabel();
  const params = useSearchParams();
  const { data: assets, error } = useApi<Asset[]>("assets", () => api.assets());
  const [picked, setPicked] = useState<string[]>(() => (params.get("ids") ?? "KST-NYC-002,KST-RAK-001,KST-DXB-003").toUpperCase().split(",").slice(0, 3));
  if (error) return <ErrorState message={String(error)} />;
  const chosen = picked.map((id) => assets?.find((a) => a.id === id)).filter(Boolean) as Asset[];
  const set = (i: number, id: string) => setPicked((p) => p.map((x, k) => (k === i ? id : x)));

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8">
      <PageHeader eyebrow={fr ? "Comparateur" : "Compare"} title={fr ? "Trois adresses, côte à côte." : "Three addresses, side by side."}>
        {fr ? "Choisissez jusqu'à trois biens. La meilleure valeur de chaque ligne est mise en avant." : "Pick up to three properties. The best value on each line is highlighted."}
      </PageHeader>
      {!assets ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <div className="grid min-w-[760px] grid-cols-[180px_repeat(3,1fr)] gap-x-4">
            <div />
            {picked.map((id, i) => {
              const a = chosen.find((x) => x.id === id);
              return (
                <div key={i} className="card overflow-hidden">
                  {a && <Photo src={a.images[0]} alt="" className="aspect-[16/10]" rounded="rounded-none" sizes="400px" />}
                  <div className="p-4">
                    <select value={id} onChange={(e) => set(i, e.target.value)} aria-label={fr ? "Bien" : "Property"} className="h-10 w-full rounded-xl border hairline bg-surface-2 px-2 text-[13.5px] outline-none focus:border-accent">
                      {assets.map((x) => (
                        <option key={x.id} value={x.id}>
                          {pick(x, "name")}
                        </option>
                      ))}
                    </select>
                    {a && (
                      <p className="mt-2 text-[12px] text-muted">
                        {a.city_name} · {cat(a.category)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {ROWS.map((r) => {
              const vals = chosen.map(r.get);
              const best = r.best === "max" ? Math.max(...vals) : r.best === "min" ? Math.min(...vals) : null;
              const top = Math.max(...vals, 1e-9);
              return (
                <div key={r.en} className="col-span-4 grid grid-cols-subgrid items-center border-b hairline py-4">
                  <p className="text-[13px] text-muted">{fr ? r.fr : r.en}</p>
                  {picked.map((id, i) => {
                    const a = chosen.find((x) => x.id === id);
                    if (!a) return <span key={i} />;
                    const isBest = best !== null && r.get(a) === best;
                    return (
                      <div key={i} className="px-4">
                        <p className={cx("font-display text-[24px] leading-none tracking-[-0.02em]", isBest && "text-accent")}>{r.show(a, lang)}</p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                          <div className={cx("h-full rounded-full transition-all duration-700", isBest ? "bg-accent" : "bg-ink/40")} style={{ width: `${Math.max(4, (r.get(a) / top) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div />
            {picked.map((id, i) => (
              <Link key={i} href={`/assets/${id.toLowerCase()}`} className="group mt-5 flex items-center justify-center gap-2 rounded-full bg-ink py-3 text-[13.5px] font-medium text-bg">
                {fr ? "Voir le bien" : "Open property"} <ArrowUpRight size={15} className="transition-transform group-hover:rotate-45" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Compare />
    </Suspense>
  );
}
