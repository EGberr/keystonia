"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, Map as MapIcon } from "lucide-react";
import { api, type Asset, type Overview } from "@/lib/api";
import { useApi } from "@/lib/chain";
import { cx } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";
import { AssetCard, useCategoryLabel } from "@/components/asset-card";
import { AssetMap } from "@/components/asset-map";
import { Chip, ErrorState, PageHeader, Skeleton } from "@/components/ui";

const SORTS = ["net_yield_pct", "progress_pct", "valuation_eur", "ends_at"] as const;
const PHASES = ["live", "funded", "upcoming"] as const;
const CITY_FR: Record<string, string> = { London: "Londres", Lisbon: "Lisbonne" };

function Invest() {
  const { t, lang } = useLang();
  const cat = useCategoryLabel();
  const params = useSearchParams();
  const [city, setCity] = useState(params.get("city") ?? "all");
  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [phase, setPhase] = useState(params.get("phase") ?? "all");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("net_yield_pct");
  const [view, setView] = useState<"grid" | "map">("grid");
  const { data: assets, error } = useApi<Asset[]>("assets", () => api.assets(), 15000);
  const { data: ov } = useApi<Overview>("overview", api.overview);

  const shown = useMemo(() => {
    const list = (assets ?? []).filter(
      (a) => (city === "all" || a.city === city) && (category === "all" || a.category === category) && (phase === "all" || a.phase === phase),
    );
    return list.sort((a, b) => (sort === "ends_at" ? (a.phase === "live" ? a.ends_at : 9e12) - (b.phase === "live" ? b.ends_at : 9e12) : b[sort] - a[sort]));
  }, [assets, city, category, phase, sort]);

  if (error) return <ErrorState message={t("common.backend_down")} />;
  const now = ov?.chain_time ?? 0;

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8">
      <PageHeader eyebrow={t("nav.invest")} title={t("invest.title")}>
        {t("invest.subtitle")}
      </PageHeader>

      <div className="sticky top-[100px] z-10 -mx-5 flex flex-col gap-3 bg-bg/90 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Chip active={city === "all"} onClick={() => setCity("all")}>
            {t("invest.all")}
          </Chip>
          {ov?.cities.map((c) => (
            <Chip key={c.id} active={city === c.id} onClick={() => setCity(c.id)}>
              {lang === "fr" ? (CITY_FR[c.name] ?? c.name) : c.name}
            </Chip>
          ))}
          <span className="mx-2 w-px shrink-0 bg-line" />
          {ov?.categories.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(category === c.id ? "all" : c.id)}>
              {cat(c.id)}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border hairline bg-surface p-0.5 text-[12.5px]">
            {(["all", ...PHASES] as const).map((p) => (
              <button key={p} onClick={() => setPhase(p)} className={cx("rounded-full px-3 py-1", phase === p ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
                {p === "all" ? t("invest.all") : t(`phase.${p}` as TKey)}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label={t("invest.sort")} className="rounded-full border hairline bg-surface px-3 py-1.5 text-[12.5px] outline-none">
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`invest.sort.${s}` as TKey)}
              </option>
            ))}
          </select>
          <span className="ml-auto text-[12.5px] text-muted">{shown.length} / {assets?.length ?? "—"}</span>
          <div className="flex rounded-full border hairline bg-surface p-0.5">
            {(["grid", "map"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-label={t(v === "grid" ? "invest.grid" : "invest.map")} className={cx("rounded-full p-1.5", view === v ? "bg-ink text-bg" : "text-muted")}>
                {v === "grid" ? <LayoutGrid size={14} /> : <MapIcon size={14} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-4">{assets && <AssetMap assets={shown} height={600} />}</div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {!assets && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[430px]" />)}
          {shown.map((a) => (
            <AssetCard key={a.id} a={a} now={now} />
          ))}
        </div>
      )}
      {assets && !shown.length && <p className="mt-12 text-center text-[13.5px] text-muted">{t("invest.none")}</p>}
    </div>
  );
}

export default function InvestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Invest />
    </Suspense>
  );
}
