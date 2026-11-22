"use client";

import { useState } from "react";
import { Blocks, Clock, FastForward, FileCheck2, Lock, Network, Scale, ShieldCheck } from "lucide-react";
import { api, type Asset, type Config, type Health, type Overview } from "@/lib/api";
import { demoCall, useApi } from "@/lib/chain";
import { compactEur, eur, num } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";
import { tourMark } from "@/lib/tour";
import { ErrorState, PageHeader, Panel, Stat } from "@/components/ui";

const CONTRACTS: [keyof Config["contracts"], string, TKey][] = [
  ["keur", "KEUR.sol", "transparency.c.keur"],
  ["identity", "IdentityRegistry.sol", "transparency.c.identity"],
  ["registry", "AssetRegistry.sol", "transparency.c.registry"],
  ["market", "Marketplace.sol", "transparency.c.market"],
  ["governor", "AssetGovernor.sol", "transparency.c.governor"],
];

const CONTROLS: [typeof ShieldCheck, TKey][] = [
  [ShieldCheck, "transparency.rule.kyc"],
  [Network, "transparency.rule.country"],
  [Lock, "transparency.rule.escrow"],
  [Scale, "transparency.rule.holders"],
  [FileCheck2, "transparency.rule.forced"],
  [Blocks, "transparency.rule.snapshot"],
];

export default function TransparencyPage() {
  const { t, lang } = useLang();
  const { data: config } = useApi<Config>("config", api.config);
  const { data: health, error } = useApi<Health>("health", api.health, 5000);
  const { data: ov } = useApi<Overview>("overview", api.overview);
  const { data: assets } = useApi<Asset[]>("assets", () => api.assets());
  const [last, setLast] = useState<string | null>(null);
  if (error) return <ErrorState message={t("common.backend_down")} />;

  const advance = () =>
    demoCall(t("transparency.advance"), async () => {
      const r = await api.advanceMonth();
      tourMark("month");
      setLast(`${r.period} · ${r.income_paid.length} ${t("transparency.paid")} · ${r.offerings_settled.length} ${t("transparency.settled")}`);
    }, t("transparency.advanced"));

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8">
      <PageHeader eyebrow={t("nav.transparency")} title={t("transparency.title")}>{t("transparency.subtitle")}</PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("transparency.network")} value={health ? `Anvil ${health.chain_id}` : "—"} hint="EVM · osaka" />
        <Stat label={t("transparency.block")} value={health ? num(health.block, lang) : "—"} hint={`${t("transparency.indexed")} ${health?.indexed_block ?? "—"}`} />
        <Stat label={t("transparency.chain_time")} value={health ? new Date(health.chain_time * 1000).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"} hint={t("transparency.chain_time_hint")} />
        <Stat label={t("transparency.tvl")} value={ov ? compactEur(ov.tokenized_value_eur, lang) : "—"} hint={ov ? `${eur(ov.income_distributed_eur, 0, lang)} ${t("transparency.distributed")}` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title={t("transparency.contracts")} subtitle="Solidity 0.8.31 · OpenZeppelin 5 · Foundry">
          <ul className="divide-y divide-line">
            {CONTRACTS.map(([k, file, desc]) => (
              <li key={k} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-[180px] flex-1">
                  <p className="num text-[13px] font-medium">{file}</p>
                  <p className="text-[12px] text-muted">{t(desc)}</p>
                </div>
                <code className="num break-all text-[11.5px] text-ink-2">{config?.contracts[k] ?? "…"}</code>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] text-muted">{t("transparency.per_asset")}</p>
          <div className="scroll-thin mt-2 max-h-64 overflow-y-auto rounded-xl border hairline">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 bg-surface"><tr className="text-left text-muted"><th className="px-3 py-2 font-medium">ID</th><th className="px-3 py-2 font-medium">{t("asset.token")}</th><th className="px-3 py-2 font-medium">{t("asset.offering_contract")}</th></tr></thead>
              <tbody>
                {assets?.filter((a) => a.listed).map((a) => (
                  <tr key={a.id} className="border-t hairline"><td className="num px-3 py-1.5">{a.id}</td><td className="num px-3 py-1.5 text-ink-2">{a.token}</td><td className="num px-3 py-1.5 text-ink-2">{a.offering}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title={t("transparency.demo")}>
            <p className="text-[13px] leading-relaxed text-ink-2">{t("transparency.demo_text")}</p>
            <button onClick={advance} disabled={!health?.demo_controls} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-ink text-[14px] font-medium text-bg disabled:opacity-40">
              <FastForward size={16} /> {t("transparency.advance")}
            </button>
            {last && <p className="num mt-3 flex items-center gap-1.5 text-[12px] text-positive"><Clock size={12} /> {last}</p>}
          </Panel>
          <Panel title={t("transparency.rules")}>
            <ul className="space-y-3">
              {CONTROLS.map(([Icon, k]) => (
                <li key={k} className="flex gap-3 text-[12.5px] leading-snug text-ink-2"><Icon size={15} className="mt-0.5 shrink-0 text-accent-ink" />{t(k)}</li>
              ))}
            </ul>
          </Panel>
          <Panel title={t("transparency.tests")}>
            <p className="text-[12.5px] leading-relaxed text-ink-2">{t("transparency.tests_text")}</p>
            <pre className="num mt-3 overflow-x-auto rounded-xl bg-surface-2 p-3 text-[11.5px]">cd contracts && forge test</pre>
          </Panel>
        </div>
      </div>
    </div>
  );
}
