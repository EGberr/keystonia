"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Asset } from "@/lib/api";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { BANDS, IsoTower } from "@/components/motion/iso-tower";

const PanoTour = dynamic(() => import("@/components/three/pano-tour"), { ssr: false });

/**
 * Pick a level on the building, step inside: the isometric tower is the menu and the 360° visit
 * (real photographs) is the content. Clicking a level slides it out of the stack and cuts to its room.
 */
export function FloorExplorer({ asset, className }: { asset: Asset; className?: string }) {
  const { lang } = useLang();
  const fr = lang === "fr";
  const rooms = (asset.tour ?? []).slice(0, BANDS);
  const [level, setLevel] = useState(0);
  if (!rooms.length) return null;
  return (
    <div className={cx("grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]", className)}>
      <div className="card relative flex flex-col overflow-hidden p-5">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,91,31,0.3),transparent_70%)]" />
        <p className="label relative">
          <span className="text-accent">●</span> {fr ? "Choisissez un niveau" : "Pick a level"}
        </p>
        <div className="relative mx-auto my-2 h-[260px] w-full sm:h-[320px] lg:h-auto lg:min-h-[300px] lg:flex-1">
          <IsoTower className="absolute inset-0 h-full w-full" active={level} onPick={setLevel} />
        </div>
        <ol className="relative grid grid-cols-2 gap-1.5 lg:grid-cols-1">
          {rooms
            .map((r, i) => ({ r, i }))
            .reverse()
            .map(({ r, i }) => (
              <li key={r.pano + i}>
                <button onClick={() => setLevel(i)} className={cx("flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition", i === level ? "border-accent bg-accent-soft" : "hairline hover:border-line-strong")}>
                  <span className={cx("num text-[11px]", i === level ? "text-accent" : "text-muted")}>
                    {fr ? "N" : "L"}
                    {i + 1}
                  </span>
                  <span className="truncate text-[13.5px] font-medium">{fr ? r.fr : r.en}</span>
                </button>
              </li>
            ))}
        </ol>
      </div>
      <PanoTour asset={asset} room={level} onRoomChange={setLevel} className="lg:!aspect-auto lg:h-full lg:min-h-[560px]" />
    </div>
  );
}
