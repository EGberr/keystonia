"use client";

import Link from "next/link";
import type { Address } from "viem";
import { Check, Minus, X } from "lucide-react";
import { api, type Config, type Proposal } from "@/lib/api";
import { actions } from "@/lib/actions";
import { runTx, useApi, useWallet } from "@/lib/chain";
import { countdown, cx, dateLabel, num, shortAddr } from "@/lib/format";
import { useLang, type TKey } from "@/lib/i18n";

const STATE_STYLE: Record<Proposal["state"], string> = {
  active: "bg-accent text-[#1b1409]",
  succeeded: "bg-positive/15 text-positive",
  executed: "bg-accent-ink text-bg",
  defeated: "bg-negative/12 text-negative",
};

/** One governance proposal: tally bar against quorum, and vote buttons while voting is open. */
export function ProposalCard({ p, now, showAsset = false, votingPower }: { p: Proposal; now: number; showAsset?: boolean; votingPower?: number }) {
  const { t, lang } = useLang();
  const wallet = useWallet();
  const { data: config } = useApi<Config>("config", api.config);
  const total = p.for + p.against + p.abstain;
  const share = (v: number) => (total ? (v / total) * 100 : 0);
  const open = p.state === "active" && p.deadline > now;

  const vote = (support: 0 | 1 | 2) =>
    config && runTx(t("governance.vote"), actions.vote(config.contracts.governor as Address, p.id, support), wallet.state, t("governance.voted"));

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
        <span className={cx("rounded-full px-2.5 py-0.5 font-medium", STATE_STYLE[p.state])}>{t(`governance.state.${p.state}` as TKey)}</span>
        <span className="num text-muted">#{p.id}</span>
        {showAsset && (
          <Link href={`/assets/${p.asset_id.toLowerCase()}`} className="truncate text-accent-ink hover:underline">
            {p.asset_name}
          </Link>
        )}
        <span className="ml-auto text-muted">
          {open ? `${t("governance.ends")} ${countdown(p.deadline - now, lang)}` : `${t("governance.ended")} ${dateLabel(p.deadline, lang)}`}
        </span>
      </div>
      <h3 className="mt-3 text-[16px] font-medium leading-snug">{p.title}</h3>
      {p.note && <p className="mt-1 text-[12.5px] text-muted">{p.note}</p>}

      <div className="relative mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
        <span className="bg-positive" style={{ width: `${share(p.for)}%` }} />
        <span className="bg-negative" style={{ width: `${share(p.against)}%` }} />
        <span className="bg-line-strong" style={{ width: `${share(p.abstain)}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-positive" />{t("governance.for")} <b className="num font-medium">{num(p.for, lang)}</b></span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-negative" />{t("governance.against")} <b className="num font-medium">{num(p.against, lang)}</b></span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-line-strong" />{t("governance.abstain")} <b className="num font-medium">{num(p.abstain, lang)}</b></span>
        <span className={cx("num ml-auto", p.turnout_pct >= p.quorum_pct ? "text-positive" : "text-muted")}>
          {p.turnout_pct.toFixed(1)}% {t("governance.turnout")} · {p.quorum_pct}% {t("governance.quorum")}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t hairline pt-3">
        <span className="num text-[11px] text-muted">{shortAddr(p.proposer)}</span>
        {open && (
          <div className="ml-auto flex items-center gap-1.5">
            {votingPower !== undefined && <span className="num mr-1 text-[11.5px] text-muted">{num(votingPower, lang)} {t("common.shares")}</span>}
            <button onClick={() => vote(1)} className="flex items-center gap-1 rounded-full bg-positive px-3 py-1.5 text-[12.5px] font-medium text-[#08120c] hover:brightness-110">
              <Check size={13} /> {t("governance.for")}
            </button>
            <button onClick={() => vote(0)} className="flex items-center gap-1 rounded-full bg-negative px-3 py-1.5 text-[12.5px] font-medium text-[#1a0806] hover:brightness-110">
              <X size={13} /> {t("governance.against")}
            </button>
            <button onClick={() => vote(2)} className="flex items-center gap-1 rounded-full border hairline px-3 py-1.5 text-[12.5px] hover:bg-surface-2">
              <Minus size={13} /> {t("governance.abstain")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
