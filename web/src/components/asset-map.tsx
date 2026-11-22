"use client";

import { useEffect, useRef } from "react";
import type { Asset } from "@/lib/api";
import { eur, pct } from "@/lib/format";
import { useLang } from "@/lib/i18n";

/** Leaflet map with one marker per asset (OpenStreetMap tiles, loaded client-side only). */
export function AssetMap({ assets, height = 520 }: { assets: Asset[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { lang, pick } = useLang();

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true }).setView([42, 0], 4);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: "ks-tiles",
      }).addTo(map);
      const bounds: [number, number][] = [];
      for (const a of assets) {
        const label = `${Math.round(a.net_yield_pct * 10) / 10}%`;
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${a.phase === "live" ? "var(--accent)" : "var(--accent-ink)"};color:${a.phase === "live" ? "#1b1409" : "var(--bg)"};font:600 11px var(--font-label),monospace;padding:4px 8px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25);white-space:nowrap;transform:translate(-50%,-50%)">${label}</div>`,
          iconSize: [0, 0],
        });
        L.marker([a.lat, a.lon], { icon })
          .addTo(map)
          .bindPopup(
            `<a href="/assets/${a.id.toLowerCase()}" style="display:block;width:220px;text-decoration:none;color:inherit">
               <img src="${a.images[0]}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:10px" />
               <strong style="display:block;margin-top:8px;font-size:14px">${pick(a, "name")}</strong>
               <span style="font-size:12px;opacity:.7">${a.district}, ${a.city_name}</span><br/>
               <span style="font-size:12px">${pct(a.net_yield_pct)} · ${eur(a.share_price_eur, 0, lang)} / share</span>
             </a>`,
          );
        bounds.push([a.lat, a.lon]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [assets, lang, pick]);

  return <div ref={ref} style={{ height }} className="relative isolate z-0 overflow-hidden rounded-3xl border hairline" />;
}
