"use client";

// Procedural building kit for the walkthroughs: textures drawn on canvas, and furniture made of
// primitives. Everything is generated at runtime, so no 3D files need to be downloaded or licensed.

import { useMemo } from "react";
import * as THREE from "three";

export type V3 = [number, number, number];

export function seeded(seed: number) {
  let s = Math.floor(seed) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Canvas textures ─────────────────────────────────────────────────────────
function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: [number, number]) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  draw(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function noise(g: CanvasRenderingContext2D, s: number, alpha: number, seed = 3) {
  const r = seeded(seed);
  for (let i = 0; i < s * s * 0.04; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${alpha * r()})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
  }
}

export const textures = {
  herringbone: (tone = "#8a5f3c", repeat: [number, number] = [4, 4]) =>
    canvasTexture(
      512,
      (g, s) => {
        const r = seeded(11);
        g.fillStyle = tone;
        g.fillRect(0, 0, s, s);
        const w = s / 8;
        const l = w * 3;
        for (let row = -4; row < 12; row++)
          for (let col = -4; col < 12; col++) {
            const x = col * w * 2 + row * w;
            const y = row * w * 2 - col * w * 0 + (col % 2) * w;
            const shade = 0.82 + r() * 0.3;
            g.save();
            g.translate(x, y);
            g.rotate((col % 2 ? 1 : -1) * Math.PI * 0.25);
            g.fillStyle = shadeHex(tone, shade);
            g.fillRect(0, 0, l, w - 2);
            g.strokeStyle = "rgba(0,0,0,.35)";
            g.strokeRect(0, 0, l, w - 2);
            g.restore();
          }
        noise(g, s, 0.12);
      },
      repeat,
    ),
  planks: (tone = "#9b7550", repeat: [number, number] = [3, 3]) =>
    canvasTexture(
      512,
      (g, s) => {
        const r = seeded(5);
        const h = s / 6;
        for (let i = 0; i < 6; i++) {
          let x = -r() * s;
          while (x < s) {
            const len = s * (0.4 + r() * 0.6);
            g.fillStyle = shadeHex(tone, 0.85 + r() * 0.3);
            g.fillRect(x, i * h, len, h - 3);
            x += len + 3;
          }
        }
        noise(g, s, 0.1);
      },
      repeat,
    ),
  zellige: (a = "#1f5c55", b = "#e9e1cf", repeat: [number, number] = [6, 6]) =>
    canvasTexture(
      512,
      (g, s) => {
        const r = seeded(21);
        const n = 8;
        const c = s / n;
        g.fillStyle = "#d8cfbb";
        g.fillRect(0, 0, s, s);
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++) {
            const cx = x * c + c / 2;
            const cy = y * c + c / 2;
            g.fillStyle = shadeHex((x + y) % 2 ? a : b, 0.88 + r() * 0.2);
            g.beginPath();
            // eight-point star from two rotated squares
            for (let k = 0; k < 16; k++) {
              const ang = (k * Math.PI) / 8;
              const rad = k % 2 ? c * 0.3 : c * 0.47;
              g.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
            }
            g.closePath();
            g.fill();
          }
      },
      repeat,
    ),
  tiles: (a = "#e8e2d6", b = "#2a2723", repeat: [number, number] = [8, 8]) =>
    canvasTexture(
      256,
      (g, s) => {
        const c = s / 2;
        for (let y = 0; y < 2; y++)
          for (let x = 0; x < 2; x++) {
            g.fillStyle = (x + y) % 2 ? a : b;
            g.fillRect(x * c, y * c, c, c);
          }
        g.strokeStyle = "rgba(0,0,0,.25)";
        g.strokeRect(0, 0, s, s);
        noise(g, s, 0.06);
      },
      repeat,
    ),
  terracotta: (repeat: [number, number] = [6, 6]) =>
    canvasTexture(
      256,
      (g, s) => {
        const r = seeded(9);
        const c = s / 4;
        g.fillStyle = "#6e3a25";
        g.fillRect(0, 0, s, s);
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            g.fillStyle = shadeHex("#b8673f", 0.8 + r() * 0.35);
            g.fillRect(x * c + 2, y * c + 2, c - 4, c - 4);
          }
        noise(g, s, 0.12);
      },
      repeat,
    ),
  plaster: (tone = "#d9cfbf", repeat: [number, number] = [2, 2]) =>
    canvasTexture(
      256,
      (g, s) => {
        g.fillStyle = tone;
        g.fillRect(0, 0, s, s);
        noise(g, s, 0.07, 17);
      },
      repeat,
    ),
  concrete: (repeat: [number, number] = [4, 4]) =>
    canvasTexture(
      512,
      (g, s) => {
        g.fillStyle = "#77736c";
        g.fillRect(0, 0, s, s);
        const r = seeded(4);
        for (let i = 0; i < 60; i++) {
          g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.05})`;
          g.beginPath();
          g.arc(r() * s, r() * s, 10 + r() * 60, 0, Math.PI * 2);
          g.fill();
        }
        g.strokeStyle = "rgba(0,0,0,.18)";
        g.strokeRect(0, 0, s, s);
        noise(g, s, 0.1);
      },
      repeat,
    ),
  grass: (repeat: [number, number] = [30, 30]) =>
    canvasTexture(
      256,
      (g, s) => {
        g.fillStyle = "#4b5a2c";
        g.fillRect(0, 0, s, s);
        const r = seeded(8);
        for (let i = 0; i < 2500; i++) {
          g.fillStyle = shadeHex(r() > 0.6 ? "#8a7a44" : "#5d6e33", 0.7 + r() * 0.5);
          g.fillRect(r() * s, r() * s, 1.5, 3 + r() * 3);
        }
      },
      repeat,
    ),
};

export function shadeHex(hex: string, f: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

/** Memoised texture factory call. */
export function useTex<T extends (...a: never[]) => THREE.Texture>(fn: T, ...args: Parameters<T>) {
  const key = JSON.stringify(args);
  // Textures depend only on the serialised arguments.
   
  return useMemo(() => fn(...(JSON.parse(key) as Parameters<T>)), [fn, key]);
}

// ── Primitives ──────────────────────────────────────────────────────────────
type Mat = { color?: string; map?: THREE.Texture; roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number };

export function Box({ p, s, r, mat = {}, shadow = true }: { p: V3; s: V3; r?: V3; mat?: Mat; shadow?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={mat.color ?? "#ffffff"} map={mat.map} roughness={mat.roughness ?? 0.8} metalness={mat.metalness ?? 0} emissive={mat.emissive ?? "#000"} emissiveIntensity={mat.emissiveIntensity ?? 1} />
    </mesh>
  );
}

export function Floor({ w, d, p = [0, 0, 0], map, color = "#fff", roughness = 0.6 }: { w: number; d: number; p?: V3; map?: THREE.Texture; color?: string; roughness?: number }) {
  return (
    <mesh position={p} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={map} color={color} roughness={roughness} />
    </mesh>
  );
}

/** A wall along X (rotate with ry) with rectangular openings; each opening may get a glazing pane. */
export function Wall({
  len,
  h,
  t = 0.18,
  p,
  ry = 0,
  openings = [],
  color = "#e6ddcf",
  map,
  glass = "#bcd3e6",
}: {
  len: number;
  h: number;
  t?: number;
  p: V3;
  ry?: number;
  openings?: { x: number; w: number; y0: number; y1: number; glazed?: boolean }[];
  color?: string;
  map?: THREE.Texture;
  glass?: string;
}) {
  const pieces: { x: number; y: number; w: number; h: number }[] = [];
  const sorted = [...openings].sort((a, b) => a.x - b.x);
  let cursor = -len / 2;
  for (const o of sorted) {
    const left = o.x - o.w / 2;
    if (left > cursor) pieces.push({ x: (cursor + left) / 2, y: h / 2, w: left - cursor, h });
    if (o.y0 > 0) pieces.push({ x: o.x, y: o.y0 / 2, w: o.w, h: o.y0 });
    if (o.y1 < h) pieces.push({ x: o.x, y: (o.y1 + h) / 2, w: o.w, h: h - o.y1 });
    cursor = o.x + o.w / 2;
  }
  if (cursor < len / 2) pieces.push({ x: (cursor + len / 2) / 2, y: h / 2, w: len / 2 - cursor, h });
  return (
    <group position={p} rotation-y={ry}>
      {pieces.map((q, i) => (
        <mesh key={i} position={[q.x, q.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[q.w, q.h, t]} />
          <meshStandardMaterial color={color} map={map} roughness={0.92} />
        </mesh>
      ))}
      {openings
        .filter((o) => o.glazed)
        .map((o, i) => (
          <group key={`g${i}`} position={[o.x, (o.y0 + o.y1) / 2, 0]}>
            <mesh>
              <planeGeometry args={[o.w, o.y1 - o.y0]} />
              <meshBasicMaterial color={new THREE.Color(glass).multiplyScalar(1.4)} toneMapped={false} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {/* mullions */}
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[0.04, o.y1 - o.y0, 0.05]} />
              <meshStandardMaterial color="#e9e4da" />
            </mesh>
            <mesh position={[0, (o.y1 - o.y0) * 0.18, 0.02]}>
              <boxGeometry args={[o.w, 0.04, 0.05]} />
              <meshStandardMaterial color="#e9e4da" />
            </mesh>
          </group>
        ))}
    </group>
  );
}

/** Cornice moulding running around a rectangular room at ceiling height. */
export function Cornice({ w, d, h, p = [0, 0, 0], color = "#efe8dc" }: { w: number; d: number; h: number; p?: V3; color?: string }) {
  const s = 0.14;
  return (
    <group position={p}>
      {[
        [[0, h - s / 2, -d / 2 + s / 2], [w, s, s]],
        [[0, h - s / 2, d / 2 - s / 2], [w, s, s]],
        [[-w / 2 + s / 2, h - s / 2, 0], [s, s, d]],
        [[w / 2 - s / 2, h - s / 2, 0], [s, s, d]],
      ].map(([pos, size], i) => (
        <Box key={i} p={pos as V3} s={size as V3} mat={{ color }} shadow={false} />
      ))}
    </group>
  );
}

export function Lamp({ p, color = "#ffcf8f", intensity = 5, distance = 7, shade = "#e8dcc6", drop = 0.9 }: { p: V3; color?: string; intensity?: number; distance?: number; shade?: string; drop?: number }) {
  return (
    <group position={p}>
      <mesh position={[0, -drop / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, drop]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, -drop, 0]}>
        <cylinderGeometry args={[0.12, 0.28, 0.26, 24, 1, true]} />
        <meshStandardMaterial color={shade} side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, -drop - 0.04, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(3)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, -drop - 0.15, 0]} intensity={intensity} distance={distance} decay={1.6} color={color} />
    </group>
  );
}

export function Lantern({ p, color = "#ffb45e", intensity = 4 }: { p: V3; color?: string; intensity?: number }) {
  return (
    <group position={p}>
      <mesh>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
      <pointLight intensity={intensity} distance={6} decay={1.7} color={color} />
    </group>
  );
}

export function Sofa({ p, ry = 0, color = "#7d6a55", w = 2.2 }: { p: V3; ry?: number; color?: string; w?: number }) {
  return (
    <group position={p} rotation-y={ry}>
      <Box p={[0, 0.22, 0]} s={[w, 0.24, 0.9]} mat={{ color, roughness: 0.95 }} />
      <Box p={[0, 0.42, 0.05]} s={[w - 0.3, 0.16, 0.75]} mat={{ color: shadeHex(color, 1.12), roughness: 1 }} />
      <Box p={[0, 0.6, -0.38]} s={[w, 0.6, 0.18]} mat={{ color, roughness: 0.95 }} />
      <Box p={[-w / 2 + 0.1, 0.45, 0]} s={[0.2, 0.5, 0.9]} mat={{ color, roughness: 0.95 }} />
      <Box p={[w / 2 - 0.1, 0.45, 0]} s={[0.2, 0.5, 0.9]} mat={{ color, roughness: 0.95 }} />
    </group>
  );
}

export function Table({ p, s = [1.8, 0.75, 0.9], color = "#5b3d27", top }: { p: V3; s?: V3; color?: string; top?: string }) {
  const [w, h, d] = s;
  return (
    <group position={p}>
      <Box p={[0, h, 0]} s={[w, 0.05, d]} mat={{ color: top ?? color, roughness: 0.5 }} />
      {[
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
      ].map(([x, z], i) => (
        <Box key={i} p={[x, h / 2, z]} s={[0.05, h, 0.05]} mat={{ color }} />
      ))}
    </group>
  );
}

export function Chair({ p, ry = 0, color = "#3a2a1f" }: { p: V3; ry?: number; color?: string }) {
  return (
    <group position={p} rotation-y={ry}>
      <Box p={[0, 0.45, 0]} s={[0.45, 0.05, 0.45]} mat={{ color }} />
      <Box p={[0, 0.75, -0.2]} s={[0.45, 0.55, 0.04]} mat={{ color }} />
      {[
        [-0.19, -0.19],
        [0.19, -0.19],
        [-0.19, 0.19],
        [0.19, 0.19],
      ].map(([x, z], i) => (
        <Box key={i} p={[x, 0.22, z]} s={[0.035, 0.45, 0.035]} mat={{ color }} shadow={false} />
      ))}
    </group>
  );
}

export function Bed({ p, ry = 0, linen = "#ece6da", frame = "#4a3527", w = 1.7 }: { p: V3; ry?: number; linen?: string; frame?: string; w?: number }) {
  return (
    <group position={p} rotation-y={ry}>
      <Box p={[0, 0.2, 0]} s={[w, 0.3, 2.1]} mat={{ color: frame }} />
      <Box p={[0, 0.45, 0.05]} s={[w - 0.08, 0.22, 2]} mat={{ color: linen, roughness: 1 }} />
      <Box p={[0, 0.58, 0.45]} s={[w - 0.04, 0.06, 1.2]} mat={{ color: "#b9a68a", roughness: 1 }} />
      <Box p={[-w / 4, 0.64, -0.75]} s={[w / 2 - 0.12, 0.14, 0.38]} mat={{ color: "#f4efe6", roughness: 1 }} />
      <Box p={[w / 4, 0.64, -0.75]} s={[w / 2 - 0.12, 0.14, 0.38]} mat={{ color: "#f4efe6", roughness: 1 }} />
      <Box p={[0, 0.75, -1.05]} s={[w + 0.1, 1.1, 0.08]} mat={{ color: frame }} />
    </group>
  );
}

export function Plant({ p, scale = 1, leaf = "#3f5a35" }: { p: V3; scale?: number; leaf?: string }) {
  return (
    <group position={p} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.5, 20]} />
        <meshStandardMaterial color="#b8a58a" roughness={0.9} />
      </mesh>
      {[
        [0, 1.0, 0, 0.45],
        [0.18, 1.35, 0.05, 0.35],
        [-0.15, 1.3, -0.08, 0.32],
        [0.02, 1.65, 0, 0.26],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={shadeHex(leaf, 0.85 + i * 0.08)} roughness={0.9} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.6]} />
        <meshStandardMaterial color="#5a4330" />
      </mesh>
    </group>
  );
}

export function Rug({ p, w, d, color = "#7a3e2c", ry = 0 }: { p: V3; w: number; d: number; color?: string; ry?: number }) {
  return (
    <group position={p} rotation-y={ry}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, 0]} receiveShadow>
        <planeGeometry args={[w - 0.3, d - 0.3]} />
        <meshStandardMaterial color={shadeHex(color, 1.25)} roughness={1} />
      </mesh>
    </group>
  );
}

export function Artwork({ p, ry = 0, w = 1.2, h = 0.9, palette = ["#c9a26b", "#2d3a3a", "#b5654e", "#e9dcc0"], seed = 1 }: { p: V3; ry?: number; w?: number; h?: number; palette?: string[]; seed?: number }) {
  const map = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = Math.round((256 * h) / w);
    const g = c.getContext("2d")!;
    const r = seeded(seed * 97);
    g.fillStyle = palette[3];
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = palette[Math.floor(r() * 3)];
      g.globalAlpha = 0.85;
      if (r() > 0.5) g.fillRect(r() * c.width * 0.7, r() * c.height * 0.7, 40 + r() * 120, 30 + r() * 90);
      else {
        g.beginPath();
        g.arc(r() * c.width, r() * c.height, 20 + r() * 60, 0, Math.PI * 2);
        g.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [w, h, palette, seed]);
  return (
    <group position={p} rotation-y={ry}>
      <Box p={[0, 0, 0]} s={[w + 0.08, h + 0.08, 0.04]} mat={{ color: "#1d1915" }} shadow={false} />
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={map} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Shelf({ p, ry = 0, w = 1.6, h = 2.2, seed = 2 }: { p: V3; ry?: number; w?: number; h?: number; seed?: number }) {
  const books = useMemo(() => {
    const r = seeded(seed * 31);
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    const rows = Math.floor(h / 0.42);
    for (let row = 0; row < rows; row++) {
      let x = -w / 2 + 0.06;
      while (x < w / 2 - 0.12) {
        const bw = 0.03 + r() * 0.05;
        const bh = 0.22 + r() * 0.12;
        if (r() > 0.12) out.push({ x: x + bw / 2, y: 0.08 + row * 0.42 + bh / 2, w: bw, h: bh, c: ["#7a2f2a", "#2f4a5a", "#c9a26b", "#e9e1cf", "#38463a", "#1f1b17"][Math.floor(r() * 6)] });
        x += bw + 0.005;
      }
    }
    return out;
  }, [w, h, seed]);
  return (
    <group position={p} rotation-y={ry}>
      <Box p={[0, h / 2, -0.16]} s={[w, h, 0.03]} mat={{ color: "#2b2119" }} />
      {Array.from({ length: Math.floor(h / 0.42) + 1 }).map((_, i) => (
        <Box key={i} p={[0, 0.04 + i * 0.42, 0]} s={[w, 0.03, 0.34]} mat={{ color: "#3a2c21" }} shadow={false} />
      ))}
      {books.map((b, i) => (
        <Box key={`b${i}`} p={[b.x, b.y, 0]} s={[b.w, b.h, 0.24]} mat={{ color: b.c, roughness: 0.9 }} shadow={false} />
      ))}
    </group>
  );
}

/** A wall panel with a pointed (horseshoe-ish) arch cut out, extruded. */
export function ArchPanel({ p, ry = 0, w = 2.6, h = 3.2, aw = 1.7, ah = 2.6, depth = 0.4, color = "#c98a5e" }: { p: V3; ry?: number; w?: number; h?: number; aw?: number; ah?: number; depth?: number; color?: string }) {
  const geom = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.lineTo(-w / 2, h);
    s.lineTo(-w / 2, 0);
    const hole = new THREE.Path();
    const spring = ah - aw / 2;
    hole.moveTo(-aw / 2, 0);
    hole.lineTo(-aw / 2, spring);
    hole.quadraticCurveTo(-aw / 2, ah, 0, ah + 0.12);
    hole.quadraticCurveTo(aw / 2, ah, aw / 2, spring);
    hole.lineTo(aw / 2, 0);
    hole.lineTo(-aw / 2, 0);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [w, h, aw, ah, depth]);
  return (
    <mesh geometry={geom} position={p} rotation-y={ry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

export function Tree({ p, scale = 1, canopy = "#3e5a2e", fruit }: { p: V3; scale?: number; canopy?: string; fruit?: string }) {
  const fruits = useMemo(() => {
    if (!fruit) return [];
    const r = seeded(p[0] * 13 + p[2] * 7 + 5);
    return Array.from({ length: 14 }, () => {
      const th = r() * Math.PI * 2;
      const ph = r() * Math.PI * 0.6;
      return [Math.cos(th) * Math.sin(ph) * 0.85, 1.9 + Math.cos(ph) * 0.75, Math.sin(th) * Math.sin(ph) * 0.85] as V3;
    });
  }, [fruit, p]);
  return (
    <group position={p} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 1.6, 8]} />
        <meshStandardMaterial color="#5a4330" roughness={1} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial color={canopy} roughness={0.95} flatShading />
      </mesh>
      {fruits.map((f, i) => (
        <mesh key={i} position={f}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={fruit} roughness={0.6} emissive={fruit} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}
