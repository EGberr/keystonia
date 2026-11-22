"use client";

import { useMemo, useState } from "react";

/**
 * A building drawn as a stack of glowing isometric floors (pure SVG, animated by GSAP from the
 * parent). Each floor is a group `.iso-floor` holding a glass storey, a slab and a grid of token
 * cells `.iso-cell` on its top face, so a timeline can lift the floors apart and light the cells.
 */

export const FLOORS = 12;
export const GRID = 5;
const S = 30; // px per unit
const W = 5;
const H = 0.66; // storey height
const T = 0.1; // slab thickness
const COS = 0.866;

const iso = (x: number, y: number, z: number): [number, number] => [(x - y) * S * COS, (x + y) * S * 0.5 - z * S];
const pts = (list: [number, number, number][]) => list.map((p) => iso(...p).map((v) => v.toFixed(1)).join(",")).join(" ");

/** Colour of floor k: orange at street level, through pink, to violet at the crown. */
export function floorColor(k: number) {
  const t = k / (FLOORS - 1);
  const stops: [number, number, number][] = [
    [255, 91, 31],
    [255, 61, 129],
    [124, 92, 255],
  ];
  const i = Math.min(1, Math.floor(t * 2));
  const f = t * 2 - i;
  const c = stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * f));
  return `rgb(${c.join(",")})`;
}

export const BANDS = 4; // interactive mode groups the floors into four clickable levels

export function IsoTower({
  className,
  selected = 6,
  mine = 12,
  active,
  onPick,
}: {
  className?: string;
  selected?: number;
  mine?: number;
  /** Interactive mode: index of the highlighted level (0 = ground). */
  active?: number;
  onPick?: (level: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const interactive = onPick !== undefined;
  const levelOf = (k: number) => Math.floor(k / (FLOORS / BANDS)); // 0 = ground level
  const floors = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, k) => {
        const z0 = k * H;
        const z1 = z0 + H - T; // top of the glass storey
        const z2 = z0 + H; // top of the slab
        const cells = [];
        for (let i = 0; i < GRID; i++)
          for (let j = 0; j < GRID; j++) {
            const a = 0.06;
            cells.push(
              pts([
                [i + a, j + a, z2],
                [i + 1 - a, j + a, z2],
                [i + 1 - a, j + 1 - a, z2],
                [i + a, j + 1 - a, z2],
              ]),
            );
          }
        const mullions = [];
        for (let i = 1; i < 10; i++) {
          const u = (i * W) / 10;
          mullions.push([iso(u, W, z0), iso(u, W, z1)], [iso(W, u, z0), iso(W, u, z1)]);
        }
        return {
          k,
          color: floorColor(k),
          left: pts([[0, W, z1], [W, W, z1], [W, W, z0], [0, W, z0]]),
          right: pts([[W, 0, z1], [W, W, z1], [W, W, z0], [W, 0, z0]]),
          slabL: pts([[0, W, z2], [W, W, z2], [W, W, z1], [0, W, z1]]),
          slabR: pts([[W, 0, z2], [W, W, z2], [W, W, z1], [W, 0, z1]]),
          top: pts([[0, 0, z2], [W, 0, z2], [W, W, z2], [0, W, z2]]),
          cells,
          mullions,
          // deterministic "lit window" pattern
          lit: mullions.map((_, i) => (i * 7 + k * 13) % 5 < 2),
        };
      }),
    [],
  );
  const top = FLOORS * H * S;
  const half = W * S * COS;
  return (
    <svg className={className} viewBox={interactive ? `${-half - 30} ${-top - 40} ${half * 2 + 100} ${top + W * S + 70}` : `${-half - 150} ${-top - 150} ${half * 2 + 300} ${top + W * S + 300}`} role="img" aria-label="A building made of floors, each floor divided into tokens" overflow="visible">
      <defs>
        {floors.map((f) => (
          <linearGradient key={f.k} id={`glass${f.k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={f.color} stopOpacity="0.42" />
            <stop offset="1" stopColor={f.color} stopOpacity="0.06" />
          </linearGradient>
        ))}
        <filter id="isoGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {/* ground glow */}
      <ellipse className="iso-ground" cx="0" cy={W * S * 0.5} rx={half * 1.25} ry={W * S * 0.62} fill="#ff5b1f" opacity="0.22" filter="url(#isoGlow)" />
      {floors.map((f) => (
        <g
          key={f.k}
          className="iso-floor"
          data-k={f.k}
          {...(interactive
            ? {
                role: "button",
                tabIndex: f.k % (FLOORS / BANDS) === 0 ? 0 : -1,
                "aria-label": `Level ${levelOf(f.k) + 1}`,
                onClick: () => onPick(levelOf(f.k)),
                onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && onPick(levelOf(f.k)),
                onMouseEnter: () => setHover(levelOf(f.k)),
                onMouseLeave: () => setHover(null),
                style: {
                  cursor: "pointer",
                  transition: "transform 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.5s",
                  // the picked level slides out of the stack; levels above it lift to make room
                  transform: `translate(${levelOf(f.k) === active ? 34 : 0}px, ${levelOf(f.k) > (active ?? 99) ? -22 : levelOf(f.k) === active ? -11 : 0}px)`,
                  opacity: levelOf(f.k) === active ? 1 : hover === levelOf(f.k) ? 0.85 : 0.38,
                },
              }
            : {})}
        >
          <polygon points={f.left} fill={`url(#glass${f.k})`} />
          <polygon points={f.right} fill={`url(#glass${f.k})`} opacity="0.62" />
          {f.mullions.map(([a, b], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={f.lit[i] ? "#ffd9a8" : f.color} strokeOpacity={f.lit[i] ? 0.85 : 0.28} strokeWidth={f.lit[i] ? 1.6 : 0.8} className={f.lit[i] ? "iso-lit" : undefined} style={f.lit[i] ? { animationDelay: `${((i * 37 + f.k * 91) % 60) / 10}s` } : undefined} />
          ))}
          <polygon points={f.slabL} fill={f.color} opacity="0.9" />
          <polygon points={f.slabR} fill={f.color} opacity="0.55" />
          <polygon className="iso-top" points={f.top} fill="#110a0b" stroke={f.color} strokeWidth="1.4" strokeLinejoin="round" />
          <g className="iso-cells" opacity="0">
            {f.cells.map((c, i) => (
              <polygon key={i} className={`iso-cell${f.k === selected && i === mine ? " iso-mine" : ""}`} points={c} fill={f.color} fillOpacity="0.16" stroke={f.color} strokeOpacity="0.7" strokeWidth="0.7" />
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}
