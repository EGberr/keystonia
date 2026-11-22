"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import dots from "@/lib/world-dots.json";
import { reduced } from "@/components/motion/motion";

type City = { id: string; name: string; lat: number; lon: number };
const W = 1000;
const H = 420;
const px = (lon: number) => ((lon + 170) / 350) * W;
const py = (lat: number) => ((78 - lat) / 134) * H;

/** Dotted world map with the six cities pulsing and light arcs travelling between them. */
export function WorldMap({ cities, className }: { cities: City[]; className?: string }) {
  const root = useRef<SVGSVGElement>(null);
  useGSAP(
    () => {
      if (reduced()) return;
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 75%", once: true } });
      tl.from(".wm-dot", { opacity: 0, duration: 0.6, stagger: { amount: 1.2, from: "random" } })
        .from(".wm-city", { scale: 0, transformOrigin: "50% 50%", duration: 0.7, ease: "back.out(3)", stagger: 0.12 }, 0.5)
        .from(".wm-label", { opacity: 0, y: 6, duration: 0.5, stagger: 0.12 }, 0.7)
        .from(".wm-arc", { strokeDashoffset: 1, duration: 1.6, ease: "power2.inOut", stagger: 0.15 }, 0.9);
      gsap.to(".wm-pulse", { scale: 3.2, opacity: 0, transformOrigin: "50% 50%", duration: 2.2, ease: "power1.out", repeat: -1, stagger: 0.35 });
    },
    { scope: root, dependencies: [cities.length] },
  );
  const arcs = cities.slice(1).map((c, i) => {
    const a = cities[i];
    const [x1, y1, x2, y2] = [px(a.lon), py(a.lat), px(c.lon), py(c.lat)];
    const lift = Math.min(120, Math.hypot(x2 - x1, y2 - y1) * 0.35);
    return `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - lift} ${x2},${y2}`;
  });
  return (
    <svg ref={root} viewBox={`0 -30 ${W} ${H + 50}`} className={className} role="img" aria-label={cities.map((c) => c.name).join(", ")}>
      <defs>
        <linearGradient id="wmArc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff5b1f" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      {(dots as [number, number][]).map(([lon, lat], i) => (
        <circle key={i} className="wm-dot" cx={px(lon)} cy={py(lat)} r="1.7" fill="currentColor" opacity="0.22" />
      ))}
      {arcs.map((d, i) => (
        <path key={i} className="wm-arc" d={d} pathLength={1} fill="none" stroke="url(#wmArc)" strokeWidth="1.6" strokeDasharray="1" strokeDashoffset="0" strokeLinecap="round" />
      ))}
      {cities.map((c) => (
        <g key={c.id} transform={`translate(${px(c.lon)},${py(c.lat)})`}>
          <circle className="wm-pulse" r="6" fill="#ff5b1f" opacity="0.55" />
          <circle className="wm-city" r="5.5" fill="#fff" stroke="#ff5b1f" strokeWidth="3" />
          <text className="wm-label" y={c.id === "paris" ? 26 : -14} textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="var(--font-display)">
            {c.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
