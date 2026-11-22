"use client";

import { useState } from "react";
import { api, type Health, type Portfolio, type Proposal } from "@/lib/api";
import { useApi, useWallet } from "@/lib/chain";
import { useLang, type TKey } from "@/lib/i18n";
import { ProposalCard } from "@/components/proposal-card";
import { Chip, ErrorState, PageHeader, Skeleton, Stat } from "@/components/ui";

const FILTERS = ["all", "active", "executed", "succeeded", "defeated"] as const;

export default function GovernancePage() {
  const { t } = useLang();
  const wallet = useWallet();
  const { data: proposals, error } = useApi<Proposal[]>("governance", api.governance, 10000);
  const { data: health } = useApi<Health>("health", api.health, 10000);
  const { data: me } = useApi<Portfolio>(`portfolio:${wallet.address}`, () => api.portfolio(wallet.address));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  if (error) return <ErrorState message={t("common.backend_down")} />;

  const now = health?.chain_time ?? 0;
  const shown = (proposals ?? []).filter((p) => filter === "all" || p.state === filter);
  const count = (s: Proposal["state"]) => proposals?.filter((p) => p.state === s).length ?? 0;
  const avgTurnout = proposals?.length ? proposals.reduce((s, p) => s + p.turnout_pct, 0) / proposals.length : 0;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8">
      <PageHeader eyebrow={t("nav.governance")} title={t("governance.title")}>{t("governance.subtitle")}</PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("governance.state.active")} value={count("active")} />
        <Stat label={t("governance.state.executed")} value={count("executed") + count("succeeded")} />
        <Stat label={t("governance.state.defeated")} value={count("defeated")} />
        <Stat label={t("governance.avg_turnout")} value={`${avgTurnout.toFixed(1)}%`} />
      </div>
      <div className="mt-8 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? t("invest.all") : t(`governance.state.${f}` as TKey)}
          </Chip>
        ))}
      </div>
      <div className="mt-4 grid gap-4">
        {!proposals && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        {shown.map((p) => (
          <ProposalCard key={p.id} p={p} now={now} showAsset votingPower={me?.holdings.find((h) => h.asset_id === p.asset_id)?.shares ?? 0} />
        ))}
        {proposals && !shown.length && <p className="card p-8 text-center text-[13px] text-muted">{t("governance.none")}</p>}
      </div>
      <p className="mt-6 text-[12px] leading-relaxed text-muted">{t("governance.how")}</p>
    </div>
  );
}
