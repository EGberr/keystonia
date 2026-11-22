"use client";

// Six procedural walkthrough scenes. Each returns its geometry plus a camera path of chapters.
// Units are metres; eye height is 1.6 m.

import { useMemo } from "react";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import type { Asset } from "@/lib/api";
import {
  ArchPanel,
  Artwork,
  Bed,
  Box,
  Chair,
  Cornice,
  Floor,
  Lamp,
  Lantern,
  Plant,
  Rug,
  Shelf,
  Sofa,
  Table,
  Tree,
  Wall,
  seeded,
  shadeHex,
  textures,
  useTex,
  type V3,
} from "./kit";

export type Chapter = { en: string; fr: string; pos: V3; look: V3 };
export type SceneDef = {
  kind: string;
  chapters: Chapter[];
  background: string;
  fog: [number, number];
  exposure: number;
  Scene: (props: { seed: number }) => React.ReactNode;
};

// ── Shared outdoor backdrop for interiors: a row of facades across the street ──
function StreetBackdrop({ z = -9, lit = "#ffcf8f", tone = "#cbbba2", seed = 1 }: { z?: number; lit?: string; tone?: string; seed?: number }) {
  const wins = useMemo(() => {
    const r = seeded(seed * 41);
    const out: V3[] = [];
    for (let x = -14; x <= 28; x += 1.6) for (let y = 1.5; y < 14; y += 2.6) if (r() > 0.55) out.push([x, y, z + 0.13]);
    return out;
  }, [z, seed]);
  return (
    <group>
      <Box p={[7, 7.5, z - 0.4]} s={[48, 16, 1]} mat={{ color: tone, roughness: 1 }} shadow={false} />
      {wins.map((w, i) => (
        <mesh key={i} position={w}>
          <planeGeometry args={[0.8, 1.5]} />
          <meshBasicMaterial color={new THREE.Color(lit).multiplyScalar(1.4)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── 1. Apartment enfilade (Paris / London / Lisbon residential) ──────────────
function Apartment({ seed }: { seed: number }) {
  const r = seeded(seed);
  const wall = ["#e7dfd1", "#dcd6c8", "#e4d9c6", "#d6dbd6"][Math.floor(r() * 4)];
  const sofa = ["#6e5a48", "#3f4d57", "#7a5640", "#4f5a45"][Math.floor(r() * 4)];
  const oak = useTex(textures.herringbone, "#8a5f3c", [5, 3]);
  const H = 3.4;
  const D = 5.6;
  const win = (x: number) => ({ x, w: 1.3, y0: 0.1, y1: 3.0, glazed: true });
  return (
    <group>
      <Floor w={17} d={D} p={[8, 0, D / 2]} map={oak} roughness={0.45} />
      <Floor w={17} d={D} p={[8, H, D / 2]} color="#efe9df" />
      <mesh position={[8, H - 0.001, D / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[17, D]} />
        <meshStandardMaterial color="#f1ece3" roughness={1} />
      </mesh>
      {/* street facade with French windows */}
      <Wall len={16.6} h={H} p={[8, 0, 0]} openings={[win(1.6 - 8 + 0.5), win(4.3 - 8 + 0.5), win(9.2 - 8), win(13.8 - 8)]} color={wall} />
      <Wall len={16.6} h={H} p={[8, 0, D]} color={wall} openings={[{ x: -6.2, w: 1.1, y0: 0, y1: 2.4 }]} />
      <Wall len={D} h={H} p={[-0.3, 0, D / 2]} ry={Math.PI / 2} color={wall} />
      <Wall len={D} h={H} p={[16.3, 0, D / 2]} ry={Math.PI / 2} color={wall} />
      {/* enfilade partitions with double doors aligned on z = 3.2 */}
      <Wall len={D} h={H} p={[7, 0, D / 2]} ry={Math.PI / 2} color={wall} openings={[{ x: -0.4, w: 1.5, y0: 0, y1: 2.7 }]} />
      <Wall len={D} h={H} p={[11.5, 0, D / 2]} ry={Math.PI / 2} color={wall} openings={[{ x: -0.4, w: 1.5, y0: 0, y1: 2.7 }]} />
      <Cornice w={17} d={D} h={H} p={[8, 0, D / 2]} />
      {/* balconies: wrought-iron rails just outside the windows */}
      {[-5.9, -3.2, 1.2, 5.8].map((x, i) => (
        <group key={i} position={[8 + x, 0, -0.45]}>
          <Box p={[0, 1.0, 0]} s={[1.5, 0.05, 0.05]} mat={{ color: "#1a1a1a", metalness: 0.6, roughness: 0.4 }} shadow={false} />
          {Array.from({ length: 9 }).map((_, k) => (
            <Box key={k} p={[-0.7 + k * 0.175, 0.5, 0]} s={[0.02, 1, 0.02]} mat={{ color: "#1a1a1a" }} shadow={false} />
          ))}
        </group>
      ))}
      <StreetBackdrop seed={seed} />

      {/* salon */}
      <Rug p={[3.5, 0, 3.2]} w={3.6} d={2.6} color="#6a3a2c" />
      <Sofa p={[3.5, 0, 4.7]} ry={Math.PI} color={sofa} />
      <Sofa p={[1.3, 0, 3.1]} ry={Math.PI / 2} color={shadeHex(sofa, 1.2)} w={1.6} />
      <Table p={[3.5, 0, 3.2]} s={[1.2, 0.4, 0.7]} color="#2a2018" top="#d9d2c4" />
      {/* fireplace */}
      <group position={[3.5, 0, D - 0.25]}>
        <Box p={[0, 0.6, 0]} s={[1.8, 1.2, 0.35]} mat={{ color: "#e6e0d5", roughness: 0.35 }} />
        <Box p={[0, 0.45, 0.05]} s={[0.9, 0.7, 0.3]} mat={{ color: "#141210" }} />
        <mesh position={[0, 0.3, 0.12]}>
          <boxGeometry args={[0.5, 0.12, 0.1]} />
          <meshBasicMaterial color={new THREE.Color("#ff8a3d").multiplyScalar(2.5)} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.5, 0.6]} intensity={2.5} distance={4} color="#ff9a4d" />
        <Box p={[0, 1.95, -0.05]} s={[1.6, 1.3, 0.04]} mat={{ color: "#c9c4ba", metalness: 0.9, roughness: 0.08 }} shadow={false} />
      </group>
      <Artwork p={[0.3 - 0.3 + 0.12, 1.9, 1.6]} ry={Math.PI / 2} seed={seed} />
      <Plant p={[6.3, 0, 0.7]} scale={1.2} />
      <Lamp p={[3.5, H, 3.2]} intensity={4} />

      {/* dining */}
      <Table p={[9.25, 0, 3]} s={[2.0, 0.76, 1.0]} color="#3a2a1f" top="#5b3d27" />
      {[-0.6, 0.6].flatMap((x) => [
        <Chair key={`a${x}`} p={[9.25 + x, 0, 2.35]} color="#2a2018" />,
        <Chair key={`b${x}`} p={[9.25 + x, 0, 3.65]} ry={Math.PI} color="#2a2018" />,
      ])}
      <Shelf p={[9.25, 0, D - 0.3]} ry={Math.PI} w={2.6} h={2.6} seed={seed} />
      <Lamp p={[9.25, H, 3]} intensity={4} drop={1.3} />

      {/* bedroom */}
      <Bed p={[14.2, 0, 3.9]} ry={Math.PI} />
      <Artwork p={[14.2, 1.8, D - 0.12]} ry={Math.PI} w={1.6} h={1} seed={seed + 3} />
      <Lamp p={[12.6, 0.95, 4.9]} intensity={1.8} drop={0.2} distance={3} />
      <Box p={[12.6, 0.3, 4.9]} s={[0.45, 0.6, 0.4]} mat={{ color: "#3a2a1f" }} />
      <Plant p={[15.6, 0, 0.7]} />

      <ambientLight intensity={0.35} color="#e8dccb" />
      <hemisphereLight args={["#c8d6e8", "#5a4636", 0.45]} />
      <directionalLight position={[2, 9, -12]} intensity={3.2} color="#ffe2b8" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={8} shadow-camera-bottom={-4} shadow-bias={-0.0005} target-position={[8, 0, 3]} />
    </group>
  );
}

const APARTMENT: Omit<SceneDef, "Scene"> = {
  kind: "apartment",
  background: "#0b0a09",
  fog: [18, 40],
  exposure: 1.0,
  chapters: [
    { en: "The salon", fr: "Le salon", pos: [0.9, 1.6, 4.9], look: [5, 1.2, 1.2] },
    { en: "French windows", fr: "Les portes-fenêtres", pos: [4.4, 1.65, 1.6], look: [3.6, 2.2, -6] },
    { en: "The enfilade", fr: "L'enfilade", pos: [5.4, 1.6, 2.9], look: [16, 1.4, 3.0] },
    { en: "Dining room", fr: "La salle à manger", pos: [10.6, 1.7, 1.3], look: [8.6, 1.0, 3.6] },
    { en: "The bedroom", fr: "La chambre", pos: [12.3, 1.6, 1.0], look: [15, 0.8, 4.2] },
  ],
};

// ── 2. Riad (Marrakech hospitality) ─────────────────────────────────────────
function Riad({ seed }: { seed: number }) {
  const zel = useTex(textures.zellige, "#1f5c55", "#e9e1cf", [4, 4]);
  const zelBand = useTex(textures.zellige, "#1f5c55", "#e9e1cf", [6, 0.75]);
  const zelRing = useTex(textures.zellige, "#7b2f2a", "#e9e1cf", [3, 0.4]);
  const terra = useTex(textures.terracotta, [10, 10]);
  const tadelakt = "#c98a5e";
  const S = 10; // courtyard incl. galleries
  const level = 3.4;
  const sides: { p: V3; ry: number }[] = [
    { p: [0, 0, -S / 2 + 1.4], ry: 0 },
    { p: [0, 0, S / 2 - 1.4], ry: Math.PI },
    { p: [-S / 2 + 1.4, 0, 0], ry: Math.PI / 2 },
    { p: [S / 2 - 1.4, 0, 0], ry: -Math.PI / 2 },
  ];
  const r = seeded(seed);
  return (
    <group>
      <Sky sunPosition={[-30, 6, -60]} turbidity={9} rayleigh={2.4} mieCoefficient={0.012} mieDirectionalG={0.86} />
      <Floor w={S + 4} d={S + 4} map={zel} roughness={0.35} />
      {/* outer walls, two storeys */}
      {[0, 1, 2, 3].map((i) => (
        <Wall key={i} len={S + 0.4} h={level * 2} t={0.4} p={[[0, 0, -S / 2], [0, 0, S / 2], [-S / 2, 0, 0], [S / 2, 0, 0]][i] as V3} ry={i > 1 ? Math.PI / 2 : 0} color={shadeHex(tadelakt, 0.92)} />
      ))}
      {/* arcades on both storeys */}
      {sides.map((s, i) =>
        [0, level].map((y) => (
          <group key={`${i}-${y}`} position={[s.p[0], y, s.p[2]]} rotation-y={s.ry}>
            {[-2.4, 0, 2.4].map((x) => (
              <ArchPanel key={x} p={[x, 0, 0]} w={2.4} h={level} aw={1.6} ah={y ? 2.4 : 2.7} depth={0.35} color={tadelakt} />
            ))}
            {/* gallery floor / ceiling */}
            <Box p={[0, level - 0.08, -0.7]} s={[7.2, 0.16, 1.4]} mat={{ color: "#a8714c" }} />
            {y > 0 && (
              <group>
                {Array.from({ length: 13 }).map((_, k) => (
                  <Box key={k} p={[-3.1 + k * 0.52, 0.55, 0.2]} s={[0.05, 1.0, 0.05]} mat={{ color: "#2a1d14" }} shadow={false} />
                ))}
                <Box p={[0, 1.05, 0.2]} s={[7.2, 0.08, 0.1]} mat={{ color: "#2a1d14" }} shadow={false} />
              </group>
            )}
            <Lantern p={[0, (y ? level : level) - 0.7, -0.6]} intensity={y ? 2.2 : 3.2} />
          </group>
        )),
      )}
      {/* zellige dado on the ground-floor walls */}
      {(
        [
          [[0, 0.6, -S / 2 + 0.21], 0],
          [[0, 0.6, S / 2 - 0.21], Math.PI],
          [[-S / 2 + 0.21, 0.6, 0], Math.PI / 2],
          [[S / 2 - 0.21, 0.6, 0], -Math.PI / 2],
        ] as [V3, number][]
      ).map(([pos, ry], i) => (
        <mesh key={`d${i}`} position={pos} rotation-y={ry}>
          <planeGeometry args={[S - 0.5, 1.2]} />
          <meshStandardMaterial map={zelBand} roughness={0.3} />
        </mesh>
      ))}
      {/* fountain */}
      <group>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.35, 1.45, 0.5, 8]} />
          <meshStandardMaterial map={zelRing} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.04, 8]} />
          <meshStandardMaterial color="#3e7f86" roughness={0.04} metalness={0.4} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.2, 0.9, 12]} />
          <meshStandardMaterial color="#e9e1cf" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.38, 0]}>
          <cylinderGeometry args={[0.45, 0.2, 0.12, 16]} />
          <meshStandardMaterial color="#e9e1cf" roughness={0.4} />
        </mesh>
        {Array.from({ length: 10 }).map((_, k) => (
          <mesh key={k} position={[Math.cos((k / 10) * Math.PI * 2) * 0.9, 0.52, Math.sin((k / 10) * Math.PI * 2) * 0.9]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.07, 12]} />
            <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* orange trees in the four corners of the court */}
      {[
        [-2.4, -2.4],
        [2.4, -2.4],
        [-2.4, 2.4],
        [2.4, 2.4],
      ].map(([x, z], i) => (
        <group key={i}>
          <Box p={[x, 0.3, z]} s={[1.1, 0.6, 1.1]} mat={{ color: "#e9e1cf", roughness: 0.5 }} />
          <Tree p={[x, 0.55, z]} scale={0.9 + r() * 0.2} canopy="#2f5226" fruit="#f08a24" />
        </group>
      ))}
      {/* seating in the gallery */}
      <Sofa p={[0, 0, -S / 2 + 0.75]} color="#7b2f2a" w={3.2} />
      <Rug p={[0, 0, -S / 2 + 1.5]} w={3} d={1.4} color="#8a3226" />
      {/* roof terrace: a ring around the open courtyard */}
      {(
        [
          [[0, level * 2, -S / 2 + 1.5], [S + 0.4, 0.2, 3]],
          [[0, level * 2, S / 2 - 1.5], [S + 0.4, 0.2, 3]],
          [[-S / 2 + 1.5, level * 2, 0], [3, 0.2, S - 5.6]],
          [[S / 2 - 1.5, level * 2, 0], [3, 0.2, S - 5.6]],
        ] as [V3, V3][]
      ).map(([pos, size], i) => (
        <mesh key={`roof${i}`} position={pos} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial map={terra} roughness={0.9} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <group key={`m${i}`} rotation-y={(i * Math.PI) / 2}>
          {Array.from({ length: 11 }).map((_, k) => (
            <Box key={k} p={[-S / 2 + 0.45 + k * 0.92, level * 2 + 0.55 + (k % 2) * 0.18, S / 2 - 0.1]} s={[0.55, 1.1 + (k % 2) * 0.36, 0.3]} mat={{ color: shadeHex(tadelakt, 0.95) }} />
          ))}
        </group>
      ))}
      {/* loungers on the terrace */}
      <Box p={[2.8, level * 2 + 0.32, 3.8]} s={[1.8, 0.24, 0.75]} mat={{ color: "#e9e1cf" }} />
      <Box p={[0.6, level * 2 + 0.32, 3.8]} s={[1.8, 0.24, 0.75]} mat={{ color: "#e9e1cf" }} />
      <Plant p={[-3.8, level * 2, 3.8]} scale={1.3} leaf="#5e7a3a" />
      {/* the medina and the Atlas beyond */}
      {useMemo(() => {
        const rr = seeded(seed * 5 + 1);
        return Array.from({ length: 70 }, (_, i) => {
          const a = rr() * Math.PI * 2;
          const d = 12 + rr() * 30;
          const h = 4 + rr() * 6;
          return <Box key={`c${i}`} p={[Math.cos(a) * d, h / 2, Math.sin(a) * d]} s={[3 + rr() * 5, h, 3 + rr() * 5]} mat={{ color: shadeHex("#c47c52", 0.7 + rr() * 0.35) }} shadow={false} />;
        });
      }, [seed])}
      <mesh position={[-40, 4, -120]}>
        <coneGeometry args={[60, 26, 5]} />
        <meshStandardMaterial color="#6b5a66" roughness={1} flatShading />
      </mesh>
      <mesh position={[40, 2, -130]}>
        <coneGeometry args={[70, 22, 5]} />
        <meshStandardMaterial color="#5f5463" roughness={1} flatShading />
      </mesh>
      <ambientLight intensity={0.35} color="#ffd9b0" />
      <hemisphereLight args={["#f1b98a", "#5a3523", 0.55]} />
      <directionalLight position={[-14, 10, -18]} intensity={2.4} color="#ffb070" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0005} />
    </group>
  );
}

const RIAD: Omit<SceneDef, "Scene"> = {
  kind: "riad",
  background: "#d99a6c",
  fog: [30, 140],
  exposure: 0.95,
  chapters: [
    { en: "Entrance gallery", fr: "La galerie d'entrée", pos: [0, 1.6, 4.4], look: [0, 1.2, 0] },
    { en: "The courtyard", fr: "Le patio", pos: [2.2, 1.5, 1.4], look: [-1.5, 2.6, -3] },
    { en: "Upper gallery", fr: "La galerie haute", pos: [3.9, 4.95, -3.9], look: [-0.5, 1.4, 0.5] },
    { en: "Roof terrace", fr: "La terrasse", pos: [-3.2, 8.5, 3.4], look: [12, 6.5, -24] },
  ],
};

// ── 3. Hotel (hospitality elsewhere): lobby → lounge → corridor → suite ─────
function Hotel({ seed }: { seed: number }) {
  const marble = useTex(textures.tiles, "#e9e4da", "#1f1d1a", [10, 6]);
  const carpet = useTex(textures.plaster, "#5a2d2a", [6, 6]);
  const oak = useTex(textures.planks, "#7a5536", [4, 3]);
  const r = seeded(seed);
  const accent = ["#2f4a4a", "#5a2d2a", "#2c3550"][Math.floor(r() * 3)];
  return (
    <group>
      {/* lobby: double height, 12 x 10 */}
      <Floor w={12} d={10} p={[0, 0, 0]} map={marble} roughness={0.12} />
      <Floor w={12} d={10} p={[0, 6, 0]} color="#ddd5c8" />
      <mesh position={[0, 5.99, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color="#e6ddcf" />
      </mesh>
      <Wall len={12} h={6} p={[0, 0, -5]} color="#d9cfbf" openings={[{ x: -3, w: 2.2, y0: 0.4, y1: 5.2, glazed: true }, { x: 3, w: 2.2, y0: 0.4, y1: 5.2, glazed: true }]} />
      <Wall len={10} h={6} p={[-6, 0, 0]} ry={Math.PI / 2} color="#d9cfbf" />
      <Wall len={10} h={6} p={[6, 0, 0]} ry={Math.PI / 2} color="#d9cfbf" openings={[{ x: 2.6, w: 2.2, y0: 0, y1: 2.8 }]} />
      <Wall len={12} h={6} p={[0, 0, 5]} color="#d9cfbf" />
      {/* marble columns and wall sconces */}
      {[-3.6, 3.6].flatMap((x) =>
        [-2.2, 1.6].map((z) => (
          <mesh key={`col${x}${z}`} position={[x, 3, z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.36, 6, 24]} />
            <meshStandardMaterial color="#ece6da" roughness={0.18} />
          </mesh>
        )),
      )}
      {[-3.5, 3.5].map((z) => (
        <group key={`sc${z}`}>
          <Lantern p={[-5.75, 2.6, z]} color="#ffc98a" intensity={2.4} />
          <Lantern p={[5.75, 2.6, z]} color="#ffc98a" intensity={2.4} />
        </group>
      ))}
      <Box p={[0, 0.6, -4.88]} s={[11.8, 1.2, 0.06]} mat={{ color: accent, roughness: 0.6 }} shadow={false} />
      <Box p={[0, 3.3, 4.9]} s={[3.6, 2.2, 0.04]} mat={{ color: "#c9c4ba", metalness: 0.9, roughness: 0.08 }} shadow={false} />
      {/* reception desk */}
      <Box p={[0, 0.55, 3.6]} s={[4.2, 1.1, 0.8]} mat={{ color: accent, roughness: 0.4 }} />
      <Box p={[0, 1.12, 3.6]} s={[4.4, 0.05, 0.9]} mat={{ color: "#c9a26b", metalness: 0.8, roughness: 0.25 }} />
      <Shelf p={[-3.4, 0, 4.75]} ry={Math.PI} w={2.6} h={3} seed={seed} />
      <Shelf p={[3.4, 0, 4.75]} ry={Math.PI} w={2.6} h={3} seed={seed + 1} />
      {/* chandelier */}
      <group position={[0, 4.6, -0.5]}>
        {Array.from({ length: 12 }).map((_, k) => {
          const a = (k / 12) * Math.PI * 2;
          return (
            <mesh key={k} position={[Math.cos(a) * 1.1, Math.sin(k) * 0.15, Math.sin(a) * 1.1]}>
              <sphereGeometry args={[0.09, 12, 12]} />
              <meshBasicMaterial color={new THREE.Color("#ffd49a").multiplyScalar(3)} toneMapped={false} />
            </mesh>
          );
        })}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.1, 0.025, 8, 64]} />
          <meshStandardMaterial color="#c9a26b" metalness={0.9} roughness={0.2} />
        </mesh>
        <pointLight intensity={14} distance={12} color="#ffcf8f" />
      </group>
      {/* lounge */}
      <Rug p={[-2.6, 0, -1.8]} w={4} d={3} color={accent} />
      <Sofa p={[-2.6, 0, -0.4]} ry={Math.PI} color="#d8cbb4" w={2.6} />
      <Sofa p={[-4.6, 0, -1.8]} ry={Math.PI / 2} color="#d8cbb4" w={1.8} />
      <Table p={[-2.6, 0, -1.9]} s={[1.3, 0.4, 0.8]} color="#1a1714" top="#c9a26b" />
      <Plant p={[5.2, 0, -4.2]} scale={1.6} />
      <Plant p={[-5.2, 0, -4.2]} scale={1.6} />
      <Artwork p={[-5.88, 2.6, 1.8]} ry={Math.PI / 2} w={2.2} h={1.6} seed={seed} />

      {/* corridor heading east from the lobby door */}
      <group position={[6, 0, 2.6]}>
        <Floor w={14} d={2.2} p={[7, 0, 0]} map={carpet} roughness={1} />
        <Floor w={14} d={2.2} p={[7, 2.8, 0]} color="#e6ddcf" />
        <mesh position={[7, 2.79, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[14, 2.2]} />
          <meshStandardMaterial color="#e6ddcf" />
        </mesh>
        <Wall len={14} h={2.8} p={[7, 0, -1.1]} color="#cfc3b0" openings={[3, 7, 11].map((x) => ({ x: x - 7, w: 0.95, y0: 0, y1: 2.2 }))} />
        <Wall len={14} h={2.8} p={[7, 0, 1.1]} color="#cfc3b0" openings={[{ x: 5, w: 0.95, y0: 0, y1: 2.2 }]} />
        {[3, 7, 11].map((x) => (
          <group key={x}>
            <Box p={[x, 1.1, -1.16]} s={[0.92, 2.2, 0.06]} mat={{ color: accent }} />
            <Lamp p={[x, 2.8, 0]} drop={0.08} intensity={2.4} distance={4} />
          </group>
        ))}
      </group>

      {/* suite through the last door on the right */}
      <group position={[18, 0, 6.3]}>
        <Floor w={6} d={5} map={oak} roughness={0.5} />
        <Floor w={6} d={5} p={[0, 2.9, 0]} color="#efe8dc" />
        <mesh position={[0, 2.89, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[6, 5]} />
          <meshStandardMaterial color="#efe8dc" />
        </mesh>
        <Wall len={6} h={2.9} p={[0, 0, -2.5]} color="#e2d7c6" openings={[{ x: -1, w: 0.95, y0: 0, y1: 2.2 }]} />
        <Wall len={6} h={2.9} p={[0, 0, 2.5]} color="#e2d7c6" openings={[{ x: 0.6, w: 3.6, y0: 0.5, y1: 2.6, glazed: true }]} glass="#f6c999" />
        <Wall len={5} h={2.9} p={[-3, 0, 0]} ry={Math.PI / 2} color="#e2d7c6" />
        <Wall len={5} h={2.9} p={[3, 0, 0]} ry={Math.PI / 2} color="#e2d7c6" />
        <Bed p={[-1.4, 0, 0.2]} ry={Math.PI / 2} linen="#f2ede4" frame={accent} w={1.9} />
        <Sofa p={[1.8, 0, 1.6]} ry={-Math.PI / 2} color="#cbbfa8" w={1.6} />
        <Lamp p={[-2.6, 0.9, -1.3]} drop={0.2} intensity={1.6} distance={3} />
        <Box p={[-2.6, 0.3, -1.3]} s={[0.4, 0.6, 0.4]} mat={{ color: accent }} />
      </group>
      <StreetBackdrop z={-12} seed={seed} />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#ffe9cc", "#3a2a20", 0.5]} />
      <directionalLight position={[-4, 10, -16]} intensity={1.6} color="#ffd2a1" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={10} shadow-camera-bottom={-6} />
    </group>
  );
}

const HOTEL: Omit<SceneDef, "Scene"> = {
  kind: "hotel",
  background: "#0b0a09",
  fog: [24, 60],
  exposure: 1.0,
  chapters: [
    { en: "Arrival", fr: "L'arrivée", pos: [2.4, 1.75, -3.6], look: [-1.2, 2.5, 3.2] },
    { en: "The lounge", fr: "Le salon", pos: [0.4, 1.4, -3.4], look: [-3.6, 0.8, -0.8] },
    { en: "Corridor", fr: "Le couloir", pos: [7.2, 1.6, 2.6], look: [19, 1.5, 2.6] },
    { en: "The suite", fr: "La suite", pos: [17, 1.6, 4.4], look: [18.4, 1.2, 8.6] },
  ],
};

// ── 4. Student studio: corridor → common room → studio ──────────────────────
function Studio({ seed }: { seed: number }) {
  const conc = useTex(textures.concrete, [4, 2]);
  const oak = useTex(textures.planks, "#a8845c", [3, 3]);
  const r = seeded(seed);
  const pop = ["#c9a26b", "#4f7a6a", "#b5654e"][Math.floor(r() * 3)];
  return (
    <group>
      {/* corridor along x */}
      <Floor w={14} d={2.4} p={[7, 0, 0]} map={conc} roughness={0.5} />
      <mesh position={[7, 2.7, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[14, 2.4]} />
        <meshStandardMaterial color="#e8e4dd" />
      </mesh>
      <Wall len={14} h={2.7} p={[7, 0, -1.2]} color="#ebe7e0" openings={[2, 5, 8].map((x) => ({ x: x - 7, w: 0.95, y0: 0, y1: 2.15 }))} />
      <Wall len={14} h={2.7} p={[7, 0, 1.2]} color="#ebe7e0" openings={[{ x: 4.5, w: 0.95, y0: 0, y1: 2.15 }]} />
      {[2, 5, 8].map((x, i) => (
        <group key={x}>
          <Box p={[x, 1.07, -1.24]} s={[0.92, 2.15, 0.05]} mat={{ color: i === 1 ? pop : "#d6d0c6" }} />
          <mesh position={[x - 0.62, 1.55, -1.18]}>
            <planeGeometry args={[0.18, 0.12]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[x, 2.68, 0]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[1.2, 0.18]} />
            <meshBasicMaterial color={new THREE.Color("#fff4e2").multiplyScalar(2)} toneMapped={false} />
          </mesh>
          <pointLight position={[x, 2.4, 0]} intensity={2.2} distance={4.5} color="#fff1dc" />
        </group>
      ))}
      <Wall len={2.4} h={2.7} p={[0, 0, 0]} ry={Math.PI / 2} color="#ebe7e0" />

      {/* common room at the end */}
      <group position={[17, 0, 0]}>
        <Floor w={6} d={7} map={oak} roughness={0.55} />
        <mesh position={[0, 3, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[6, 7]} />
          <meshStandardMaterial color="#efebe5" />
        </mesh>
        <Wall len={7} h={3} p={[3, 0, 0]} ry={Math.PI / 2} color="#ebe7e0" openings={[{ x: -1.6, w: 2.2, y0: 0.6, y1: 2.6, glazed: true }, { x: 1.6, w: 2.2, y0: 0.6, y1: 2.6, glazed: true }]} />
        <Wall len={6} h={3} p={[0, 0, -3.5]} color="#ebe7e0" />
        <Wall len={6} h={3} p={[0, 0, 3.5]} color="#ebe7e0" />
        <Wall len={7} h={3} p={[-3, 0, 0]} ry={Math.PI / 2} color="#ebe7e0" openings={[{ x: 0, w: 2.4, y0: 0, y1: 2.7 }]} />
        <Table p={[0.2, 0, -1.2]} s={[2.6, 0.75, 1]} color="#2a2622" top="#e8e2d6" />
        {[-0.9, 0, 0.9].flatMap((x) => [
          <Chair key={`a${x}`} p={[0.2 + x, 0, -1.85]} color={pop} />,
          <Chair key={`b${x}`} p={[0.2 + x, 0, -0.55]} ry={Math.PI} color={pop} />,
        ])}
        <Box p={[-1.2, 0.45, 3.1]} s={[3.2, 0.9, 0.6]} mat={{ color: "#d9d4cb" }} />
        <Box p={[-1.2, 0.92, 3.1]} s={[3.3, 0.04, 0.65]} mat={{ color: "#2b2723", roughness: 0.3 }} />
        <Sofa p={[1.4, 0, 2]} ry={-Math.PI / 2} color="#5e6b72" w={1.8} />
        <Plant p={[2.5, 0, -3]} scale={1.2} />
        <Lamp p={[0.2, 3, -1.2]} intensity={4} drop={0.9} />
      </group>

      {/* studio room behind the coloured door (z < -1.2, x 4..6.6) */}
      <group position={[5.3, 0, -3.6]}>
        <Floor w={3.2} d={4.6} map={oak} roughness={0.55} />
        <mesh position={[0, 2.7, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[3.2, 4.6]} />
          <meshStandardMaterial color="#efebe5" />
        </mesh>
        <Wall len={3.2} h={2.7} p={[0, 0, -2.3]} color="#ebe7e0" openings={[{ x: 0.3, w: 1.6, y0: 0.8, y1: 2.4, glazed: true }]} />
        <Wall len={4.6} h={2.7} p={[-1.6, 0, 0]} ry={Math.PI / 2} color="#ebe7e0" />
        <Wall len={4.6} h={2.7} p={[1.6, 0, 0]} ry={Math.PI / 2} color="#ebe7e0" />
        <Bed p={[-0.75, 0, 0.4]} w={1.2} linen="#e8e4dc" frame="#c4b8a6" />
        <Table p={[0.95, 0, -1.6]} s={[1.2, 0.74, 0.6]} color="#c4b8a6" top="#e8e2d6" />
        <Chair p={[0.95, 0, -1.0]} ry={Math.PI} color={pop} />
        <Shelf p={[1.42, 0, 0.6]} ry={-Math.PI / 2} w={1.2} h={1.8} seed={seed} />
        <Lamp p={[0.95, 1.05, -1.85]} drop={0.2} intensity={1.6} distance={3} />
      </group>
      <StreetBackdrop z={-12} seed={seed} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#dfe9f2", "#3a3a3a", 0.5]} />
      <directionalLight position={[12, 9, -14]} intensity={2.4} color="#ffe6c4" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={8} shadow-camera-bottom={-8} />
    </group>
  );
}

const STUDIO: Omit<SceneDef, "Scene"> = {
  kind: "studio",
  background: "#0b0a09",
  fog: [20, 50],
  exposure: 1.0,
  chapters: [
    { en: "Corridor", fr: "Le couloir", pos: [0.8, 1.6, 0.2], look: [12, 1.4, -0.4] },
    { en: "A studio", fr: "Un studio", pos: [5.0, 1.6, -1.6], look: [5.5, 1.1, -5.6] },
    { en: "Common room", fr: "La salle commune", pos: [14.9, 1.65, 2.2], look: [18.6, 1.0, -1.6] },
    { en: "Study table", fr: "La table d'étude", pos: [19.2, 1.4, 0.8], look: [16.4, 0.9, -1.5] },
  ],
};

// ── 5. Loft (commercial): street front → ground floor → workspace → meeting ──
function Loft({ seed }: { seed: number }) {
  const conc = useTex(textures.concrete, [6, 4]);
  const r = seeded(seed);
  const brick = ["#7a4a36", "#5d5650", "#8a5a42"][Math.floor(r() * 3)];
  const W = 16;
  const D = 10;
  return (
    <group>
      <Floor w={60} d={40} p={[0, -0.01, -10]} color="#2a2826" roughness={0.9} />
      <Floor w={W} d={D} p={[0, 0, D / 2]} map={conc} roughness={0.35} />
      <mesh position={[0, 4.2, D / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#3a3835" />
      </mesh>
      {/* glass storefront */}
      <Wall len={W} h={4.2} t={0.25} p={[0, 0, 0]} color={brick} openings={[-5.2, 0, 5.2].map((x) => ({ x, w: 4.4, y0: 0.05, y1: 3.6, glazed: true }))} glass="#9fb4c4" />
      <Wall len={W} h={4.2} t={0.25} p={[0, 0, D]} color={brick} />
      <Wall len={D} h={4.2} t={0.25} p={[-W / 2, 0, D / 2]} ry={Math.PI / 2} color={brick} />
      <Wall len={D} h={4.2} t={0.25} p={[W / 2, 0, D / 2]} ry={Math.PI / 2} color={brick} />
      {/* columns and ceiling beams */}
      {[-4, 0, 4].map((x) => (
        <group key={x}>
          <Box p={[x, 2.1, 5]} s={[0.4, 4.2, 0.4]} mat={{ color: "#8d8a84" }} />
          <Box p={[x, 4.0, D / 2]} s={[0.3, 0.4, D]} mat={{ color: "#4a4743" }} shadow={false} />
        </group>
      ))}
      {/* desks */}
      {[2.4, 7.6].map((z) =>
        [-5.5, -1.8].map((x) => (
          <group key={`${x}${z}`}>
            <Table p={[x, 0, z]} s={[3, 0.74, 1.4]} color="#1d1b19" top="#d8d2c6" />
            {[-0.9, 0.9].map((dx) => (
              <group key={dx}>
                <Box p={[x + dx, 1.05, z - 0.3]} s={[0.6, 0.38, 0.03]} mat={{ color: "#121212", emissive: "#2a4a5a", emissiveIntensity: 0.6 }} shadow={false} />
                <Chair p={[x + dx, 0, z + 0.55]} ry={Math.PI} color="#2b2b2b" />
              </group>
            ))}
          </group>
        )),
      )}
      {/* glass meeting box */}
      <group position={[4.8, 0, 6.6]}>
        {[
          [0, -1.6, 0],
          [0, 1.6, 0],
          [-2.2, 0, Math.PI / 2],
          [2.2, 0, Math.PI / 2],
        ].map(([x, z, ry], i) => (
          <mesh key={i} position={[x, 1.4, z]} rotation-y={ry}>
            <planeGeometry args={[i < 2 ? 4.4 : 3.2, 2.8]} />
            <meshStandardMaterial color="#cfe1ea" transparent opacity={0.16} roughness={0.05} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
        <Table p={[0, 0, 0]} s={[2.6, 0.74, 1.1]} color="#1d1b19" top="#5b3d27" />
        <Lamp p={[0, 4.2, 0]} drop={2.0} intensity={4} />
        <Artwork p={[0, 1.6, 1.56]} ry={Math.PI} w={1.8} h={1} seed={seed} />
      </group>
      <Shelf p={[-7.7, 0, 6]} ry={Math.PI / 2} w={3} h={2.6} seed={seed} />
      <Plant p={[-7.2, 0, 1]} scale={1.6} />
      <Plant p={[7.2, 0, 1]} scale={1.6} />
      {[-4, 0, 4].map((x) => [3, 7].map((z) => <Lamp key={`${x}${z}`} p={[x + 2, 4.2, z]} drop={1.4} intensity={3.2} shade="#1d1b19" />))}
      {/* the street outside */}
      <StreetBackdrop z={-14} seed={seed} lit="#ffd8a8" tone="#6d655c" />
      <Box p={[0, 0.07, -3]} s={[60, 0.14, 4]} mat={{ color: "#4a4744" }} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#aebfcf", "#2a2522", 0.45]} />
      <directionalLight position={[-10, 8, -14]} intensity={2.2} color="#ffd9b0" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={10} shadow-camera-bottom={-10} />
    </group>
  );
}

const LOFT: Omit<SceneDef, "Scene"> = {
  kind: "loft",
  background: "#0b0a09",
  fog: [20, 60],
  exposure: 1.0,
  chapters: [
    { en: "The street front", fr: "La façade sur rue", pos: [-2.5, 1.7, -7.5], look: [0, 1.8, 3] },
    { en: "Ground floor", fr: "Le plateau", pos: [-6.6, 1.7, 0.9], look: [4, 1.4, 7] },
    { en: "Workspace", fr: "Les postes de travail", pos: [-3.6, 1.45, 5], look: [-6, 0.9, 2] },
    { en: "Meeting room", fr: "La salle de réunion", pos: [1.6, 1.6, 4.4], look: [5.4, 1.2, 7.4] },
  ],
};

// ── 6. Estate (land): vineyard or olive grove at golden hour ────────────────
function Estate({ seed, olive }: { seed: number; olive: boolean }) {
  const grass = useTex(textures.grass, [40, 40]);
  const terrain = useMemo(() => {
    const g = new THREE.PlaneGeometry(220, 220, 120, 120);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h = Math.sin(x * 0.04) * 2.2 + Math.cos(y * 0.05) * 1.6 + Math.sin((x + y) * 0.015) * 4 + Math.max(0, -y - 40) * 0.12;
      pos.setZ(i, h);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const heightAt = (x: number, z: number) => Math.sin(x * 0.04) * 2.2 + Math.cos(-z * 0.05) * 1.6 + Math.sin((x - z) * 0.015) * 4 + Math.max(0, z - 40) * 0.12;

  const rows = useMemo(() => {
    const r = seeded(seed * 3);
    const out: { x: number; z: number; s: number }[] = [];
    if (olive) {
      for (let x = -40; x < 40; x += 4.2) for (let z = -40; z < 30; z += 4.2) if (Math.abs(x) > 3) out.push({ x: x + (r() - 0.5) * 1.2, z: z + (r() - 0.5) * 1.2, s: 0.8 + r() * 0.5 });
    } else {
      for (let x = -40; x < 40; x += 2.2) for (let z = -40; z < 30; z += 1.1) if (Math.abs(x) > 2.5) out.push({ x, z, s: 0.9 + r() * 0.2 });
    }
    return out;
  }, [seed, olive]);

  const plants = useMemo(() => {
    const m = new THREE.InstancedMesh(
      olive ? new THREE.IcosahedronGeometry(1.1, 1) : new THREE.BoxGeometry(0.5, 0.75, 0.9),
      new THREE.MeshStandardMaterial({ color: olive ? "#6f7d55" : "#4f6a2c", roughness: 0.95, flatShading: true }),
      rows.length,
    );
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.09, olive ? 1.4 : 0.9, 6), new THREE.MeshStandardMaterial({ color: "#5a4330", roughness: 1 }), rows.length);
    const mtx = new THREE.Matrix4();
    const col = new THREE.Color();
    const r = seeded(seed * 9);
    rows.forEach((row, i) => {
      const y = heightAt(row.x, row.z);
      mtx.compose(new THREE.Vector3(row.x, y + (olive ? 2.0 : 1.05) * row.s, row.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 3, 0)), new THREE.Vector3(row.s * (olive ? 1.1 : 1), row.s, row.s));
      m.setMatrixAt(i, mtx);
      m.setColorAt(i, col.set(olive ? "#6f7d55" : "#4f6a2c").offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.08));
      mtx.compose(new THREE.Vector3(row.x, y + (olive ? 0.7 : 0.45), row.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      trunks.setMatrixAt(i, mtx);
    });
    m.castShadow = true;
    trunks.castShadow = true;
    return { m, trunks };
     
  }, [rows, olive, seed]);

  const hx = 9;
  const hz = 6;
  const hy = heightAt(hx, hz);
  return (
    <group>
      <Sky sunPosition={[-120, 10, 30]} turbidity={4} rayleigh={1.4} mieCoefficient={0.004} mieDirectionalG={0.78} />
      <mesh geometry={terrain} rotation-x={-Math.PI / 2} receiveShadow>
        <meshStandardMaterial map={grass} roughness={1} color="#c8b88a" />
      </mesh>
      <primitive object={plants.m} />
      <primitive object={plants.trunks} />
      {/* dirt track through the middle, draped on the terrain */}
      <Track heightAt={heightAt} />
      {/* farmhouse (quinta / ferme) */}
      <group position={[hx, hy, hz]}>
        <Box p={[0, 1.6, 0]} s={[8, 3.2, 5]} mat={{ color: "#efe7d8", roughness: 0.95 }} />
        <mesh position={[0, 3.2, 0]} rotation-y={Math.PI / 2} rotation-z={0} castShadow>
          <extrudeGeometry args={[new THREE.Shape([new THREE.Vector2(-2.9, 0), new THREE.Vector2(2.9, 0), new THREE.Vector2(0, 1.7)]), { depth: 8.6, bevelEnabled: false }]} />
          <meshStandardMaterial color="#a4512f" roughness={0.9} />
        </mesh>
        {[-2.6, 0, 2.6].map((x) => (
          <group key={x}>
            <mesh position={[x, 1.5, -2.52]}>
              <planeGeometry args={[0.9, 1.4]} />
              <meshBasicMaterial color={new THREE.Color("#ffbf73").multiplyScalar(2.2)} toneMapped={false} />
            </mesh>
            <Box p={[x - 0.62, 1.5, -2.55]} s={[0.32, 1.5, 0.04]} mat={{ color: "#2f5a4a" }} shadow={false} />
            <Box p={[x + 0.62, 1.5, -2.55]} s={[0.32, 1.5, 0.04]} mat={{ color: "#2f5a4a" }} shadow={false} />
          </group>
        ))}
        {/* pergola terrace */}
        <Floor w={8} d={3.4} p={[0, 0.03, -4.3]} color="#b8673f" roughness={0.9} />
        {[-3.8, -1.3, 1.3, 3.8].map((x) => (
          <Box key={x} p={[x, 1.25, -5.8]} s={[0.15, 2.5, 0.15]} mat={{ color: "#6b4b33" }} />
        ))}
        {Array.from({ length: 9 }).map((_, k) => (
          <Box key={k} p={[-3.8 + k * 0.95, 2.55, -4.3]} s={[0.08, 0.12, 3.4]} mat={{ color: "#6b4b33" }} />
        ))}
        <Table p={[0, 0, -4.3]} s={[2.6, 0.75, 1.0]} color="#5b3d27" top="#d8cfbf" />
        {[-0.8, 0, 0.8].map((x) => (
          <Chair key={x} p={[x, 0, -5]} color="#3a2a1f" />
        ))}
        <Lantern p={[0, 2.3, -4.3]} intensity={3} />
        <Tree p={[-6, 0, -3]} scale={1.6} canopy="#5e6b3c" />
      </group>
      {/* distant ridges */}
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[k * 90, -2, -150 - Math.abs(k) * 20]}>
          <coneGeometry args={[80, 30, 6]} />
          <meshStandardMaterial color="#6d6a6e" roughness={1} flatShading />
        </mesh>
      ))}
      <ambientLight intensity={0.3} color="#ffd8b0" />
      <hemisphereLight args={["#f3b98a", "#3c3520", 0.6]} />
      <directionalLight position={[-50, 16, 14]} intensity={3} color="#ffae6b" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-far={140} shadow-bias={-0.0004} />
    </group>
  );
}

function Track({ heightAt }: { heightAt: (x: number, z: number) => number }) {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(2.4, 80, 1, 80);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) - 6;
      pos.setZ(i, z);
      pos.setY(i, heightAt(x, z) + 0.04);
    }
    g.computeVertexNormals();
    return g;
  }, [heightAt]);
  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial color="#8f6f4c" roughness={1} />
    </mesh>
  );
}

function estateChapters(): Chapter[] {
  return [
    { en: "Arrival", fr: "L'arrivée", pos: [0.4, 4.5, 26], look: [0, 2, -10] },
    { en: "Among the rows", fr: "Entre les rangs", pos: [-1.1, 3.2, 4], look: [-10, 2, -12] },
    { en: "The farmhouse", fr: "La ferme", pos: [5.2, 4.2, -6], look: [9, 4, 2] },
    { en: "From the ridge", fr: "Depuis la crête", pos: [-22, 16, 30], look: [4, 2, -12] },
  ];
}

// ── Picker ──────────────────────────────────────────────────────────────────
export function sceneFor(a: Asset): SceneDef {
  const seed = [...a.id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) % 100000;
  if (a.category === "land") {
    const olive = /olive/i.test(`${a.name} ${a.layout} ${a.tagline}`);
    return {
      kind: olive ? "olive grove" : "vineyard",
      background: "#d9a27a",
      fog: [60, 220],
      exposure: 0.72,
      chapters: estateChapters(),
      Scene: () => <Estate seed={seed} olive={olive} />,
    };
  }
  if (a.category === "hospitality" && a.city === "marrakech") return { ...RIAD, Scene: () => <Riad seed={seed} /> };
  if (a.category === "hospitality") return { ...HOTEL, Scene: () => <Hotel seed={seed} /> };
  if (a.category === "student") return { ...STUDIO, Scene: () => <Studio seed={seed} /> };
  if (a.category === "commercial") return { ...LOFT, Scene: () => <Loft seed={seed} /> };
  return { ...APARTMENT, Scene: () => <Apartment seed={seed} /> };
}
