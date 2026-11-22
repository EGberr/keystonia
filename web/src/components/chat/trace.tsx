"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, ChevronDown, Database, ListTree, Search, Sparkles } from "lucide-react";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export type ToolCall = { id: string; name: string; input: Record<string, unknown>; is_error: boolean; summary: string };

const ICONS: Record<string, typeof Search> = {
  search_documents: Search,
  get_asset: Database,
  list_assets: ListTree,
  compare_assets: BarChart3,
};
const LABELS: Record<string, string> = {
  search_documents: "Searched documents",
  get_asset: "Read on-chain figures",
  list_assets: "Screened assets",
  compare_assets: "Compared assets",
};

function describe(call: ToolCall) {
  const i = call.input as Record<string, unknown>;
  if (call.name === "search_documents") return `“${i.query as string}”`;
  if (call.name === "get_asset") return String(i.asset_id ?? "");
  if (call.name === "compare_assets") return ((i.asset_ids as string[]) ?? []).join(", ");
  if (call.name === "list_assets") return [i.city, i.category, i.phase].filter(Boolean).join(" · ");
  return "";
}

const STATUS_FR: Record<string, string> = {
  "Planning the analysis": "Planification de l'analyse",
  "Reading the document packs": "Lecture des documents",
  "Reading on-chain figures": "Lecture des données on-chain",
  "Screening assets": "Sélection des biens",
  "Comparing assets": "Comparaison des biens",
  "Writing the answer": "Rédaction de la réponse",
};

export function Trace({ calls, status, running }: { calls: ToolCall[]; status?: string; running: boolean }) {
  const [open, setOpen] = useState(false);
  const { t, lang } = useLang();
  if (!calls.length && !running) return null;
  const shown = lang === "fr" && status ? (STATUS_FR[status] ?? status) : status;
  return (
    <div className="mb-4 rounded-2xl border hairline bg-surface-2/60">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px]">
        <Sparkles size={14} className="shrink-0 text-accent-ink" />
        {running ? (
          <span className="text-shimmer font-medium">{shown ?? t("chat.thinking")}…</span>
        ) : (
          <span className="font-medium text-ink-2">
            {t("chat.trace")} · {calls.length} {t("chat.steps")}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-muted">
          {calls.slice(-5).map((c) => {
            const Icon = ICONS[c.name] ?? Search;
            return <Icon key={c.id} size={12} className={c.is_error ? "text-negative" : undefined} />;
          })}
          <ChevronDown size={14} className={cx("transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <ol className="relative mx-3.5 mb-3 border-l hairline pl-4">
          {calls.map((c) => {
            const Icon = c.is_error ? AlertTriangle : (ICONS[c.name] ?? Search);
            return (
              <li key={c.id} className="relative py-1.5">
                <span className={cx("absolute -left-[25px] top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full border bg-surface", c.is_error ? "border-negative text-negative" : "hairline text-accent-ink")}>
                  <Icon size={10} />
                </span>
                <p className="text-[12.5px] text-ink">
                  <span className="font-medium">{LABELS[c.name] ?? c.name}</span> <span className="text-ink-2">{describe(c)}</span>
                </p>
                <p className={cx("num text-[11px]", c.is_error ? "text-negative" : "text-muted")}>{c.summary}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
