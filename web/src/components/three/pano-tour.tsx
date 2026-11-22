"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Expand, Pause, Play } from "lucide-react";
import * as THREE from "three";
import type { Asset } from "@/lib/api";
import { cx, withBase } from "@/lib/format";
import { useLang } from "@/lib/i18n";

/**
 * 360° visit built from real equirectangular photographs (Poly Haven, CC0).
 * Each room loads its 1K preview first, then swaps to the 4K panorama. Changing room
 * crossfades two spheres while the lens pushes in, like a cut in a property film.
 */

const ROOM_SECONDS = 9;
type Room = NonNullable<Asset["tour"]>[number];

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();
function load(url: string): Promise<THREE.Texture> {
  const hit = cache.get(url);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) =>
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        cache.set(url, t);
        resolve(t);
      },
      undefined,
      reject,
    ),
  );
}

type Look = { yaw: number; pitch: number; vYaw: number; vPitch: number; dragging: boolean; idle: number };

function Spheres({ rooms, idx, lookRef, still, onReady }: { rooms: Room[]; idx: number; lookRef: React.RefObject<Look>; still: boolean; onReady: () => void }) {
  const a = useRef<THREE.MeshBasicMaterial>(null);
  const b = useRef<THREE.MeshBasicMaterial>(null);
  const ma = useRef<THREE.Mesh>(null);
  const mb = useRef<THREE.Mesh>(null);
  const front = useRef<"a" | "b">("a");
  const fade = useRef(1);
  const shown = useRef(-1);
  const geom = useMemo(() => {
    const g = new THREE.SphereGeometry(50, 96, 64);
    g.scale(-1, 1, 1);
    return g;
  }, []);

  useEffect(() => {
    let live = true;
    const room = rooms[idx];
    const target = () => (front.current === "a" ? b.current : a.current);
    // Low-res first for an instant cut, then the sharp panorama.
    load(withBase(room.preview))
      .then((low) => {
        if (!live) return;
        const mat = shown.current === -1 ? (front.current === "a" ? a.current : b.current) : target();
        if (!mat) return;
        mat.map = low;
        mat.needsUpdate = true;
        if (shown.current !== -1) {
          front.current = front.current === "a" ? "b" : "a";
          fade.current = 0;
        }
        shown.current = idx;
        onReady();
        return load(withBase(room.pano)).then((hi) => {
          if (!live || shown.current !== idx) return;
          const cur = front.current === "a" ? a.current : b.current;
          if (cur) {
            cur.map = hi;
            cur.needsUpdate = true;
          }
        });
      })
      .catch(() => undefined);
    // Warm the cache for the next room.
    const next = rooms[(idx + 1) % rooms.length];
    load(withBase(next.preview)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [idx, rooms, onReady]);

  useFrame((state, delta) => {
    const l = lookRef.current;
    const cam = state.camera as THREE.PerspectiveCamera;
    fade.current = Math.min(1, fade.current + delta / 1.1);
    const k = fade.current;
    const ease = 1 - Math.pow(1 - k, 3);
    const top = front.current === "a" ? a.current : b.current;
    const bottom = front.current === "a" ? b.current : a.current;
    const topMesh = front.current === "a" ? ma.current : mb.current;
    const bottomMesh = front.current === "a" ? mb.current : ma.current;
    if (top && bottom && topMesh && bottomMesh) {
      // The incoming room sits on a slightly smaller sphere, drawn last, and fades in over the old one.
      topMesh.renderOrder = 1;
      topMesh.scale.setScalar(0.98);
      bottomMesh.renderOrder = 0;
      bottomMesh.scale.setScalar(1);
      top.opacity = ease;
      top.transparent = ease < 1;
      bottom.opacity = 1;
      bottom.transparent = false;
      bottomMesh.visible = ease < 1;
      topMesh.visible = true;
    }
    // Lens push during the cut, then settle.
    const targetFov = 70 - (1 - ease) * 14;
    cam.fov += (targetFov - cam.fov) * Math.min(1, delta * 6);
    cam.updateProjectionMatrix();

    if (!l.dragging) {
      l.yaw += l.vYaw;
      l.pitch += l.vPitch;
      l.vYaw *= 0.92;
      l.vPitch *= 0.92;
      l.idle += delta;
      if (!still && l.idle > 2.5) l.yaw += delta * 0.045;
    }
    l.pitch = THREE.MathUtils.clamp(l.pitch, -1.1, 1.1);
    const dir = new THREE.Vector3(Math.sin(l.yaw) * Math.cos(l.pitch), Math.sin(l.pitch), -Math.cos(l.yaw) * Math.cos(l.pitch));
    cam.position.set(0, 0, 0);
    cam.lookAt(dir);
  });

  return (
    <>
      <mesh ref={ma} geometry={geom}>
        <meshBasicMaterial ref={a} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={mb} geometry={geom} visible={false}>
        <meshBasicMaterial ref={b} toneMapped={false} depthWrite={false} transparent opacity={0} />
      </mesh>
    </>
  );
}

export default function PanoTour({ asset, className, compact = false }: { asset: Asset; className?: string; compact?: boolean }) {
  const { lang, pick } = useLang();
  const fr = lang === "fr";
  const rooms = useMemo(() => asset.tour ?? [], [asset.tour]);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const look = useRef<Look>({ yaw: 0, pitch: -0.05, vYaw: 0, vPitch: 0, dragging: false, idle: 0 });
  // Client-only component (loaded with ssr: false), so window is available here.
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(() => !still);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const markReady = useMemo(() => () => setReady(true), []);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  if (!rooms.length) return null;
  const go = (i: number) => setIdx(((i % rooms.length) + rooms.length) % rooms.length);
  const active = playing && visible && ready;
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrap.current?.requestFullscreen?.();
  };

  return (
    <div ref={wrap} className={cx("group/tour relative w-full overflow-hidden rounded-[28px] bg-ink [&:fullscreen]:rounded-none", compact ? "aspect-[4/5] sm:aspect-[16/9]" : "aspect-[4/5] sm:aspect-[16/8.5]", className)}>
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 200, position: [0, 0, 0] }}
        gl={{ antialias: false, toneMapping: THREE.NoToneMapping }}
        className="cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          look.current.dragging = true;
          look.current.idle = 0;
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          look.current.yaw -= dx * 0.0032;
          look.current.pitch += dy * 0.0028;
          look.current.vYaw = -dx * 0.0032;
          look.current.vPitch = dy * 0.0028;
        }}
        onPointerUp={() => {
          drag.current = null;
          look.current.dragging = false;
          look.current.idle = 0;
        }}
        onPointerLeave={() => {
          drag.current = null;
          look.current.dragging = false;
        }}
      >
        <Spheres rooms={rooms} idx={idx} lookRef={look} still={still} onReady={markReady} />
      </Canvas>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="label !text-white/70">{fr ? "Chargement de la visite…" : "Loading the visit…"}</span>
        </div>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

      <div className="pointer-events-none absolute inset-x-5 top-5 flex items-start justify-between gap-4 sm:inset-x-7 sm:top-7">
        <div className="text-white">
          <p className="label !text-white/75">
            <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-accent" />
            {fr ? "Visite 360° · photographies réelles" : "360° visit · real photography"}
          </p>
          {!compact && <p className="font-display mt-2 text-[22px] leading-none sm:text-[28px]">{pick(asset, "name")}</p>}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="glass-dark flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/25">
            {playing ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
          </button>
          <button onClick={fullscreen} aria-label={fr ? "Plein écran" : "Fullscreen"} className="glass-dark flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/25">
            <Expand size={14} />
          </button>
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-7">
        <div className="mb-4 flex items-end justify-between gap-4 text-white">
          <p key={idx} className="font-display fade-up text-[34px] leading-[0.95] tracking-[-0.03em] sm:text-[56px]">
            {fr ? rooms[idx].fr : rooms[idx].en}
          </p>
          <p className="label hidden !text-white/60 sm:block">
            {String(idx + 1).padStart(2, "0")} / {String(rooms.length).padStart(2, "0")} · {fr ? "glissez pour regarder" : "drag to look around"}
          </p>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(0, 1fr))` }}>
          {rooms.map((r, i) => (
            <button key={r.pano + i} onClick={() => go(i)} className="group/room text-left" aria-label={fr ? r.fr : r.en}>
              <span className={cx("relative block h-14 overflow-hidden rounded-xl border-2 transition sm:h-16", i === idx ? "border-white" : "border-transparent opacity-70 hover:opacity-100")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={withBase(r.preview)} alt="" className="h-full w-full scale-[1.6] object-cover" loading="lazy" />
              </span>
              <span className="relative mt-2 block h-[2px] overflow-hidden rounded-full bg-white/25">
                {i < idx && <span className="absolute inset-0 bg-white" />}
                {i === idx && (
                  <span
                    key={`${idx}-${active}`}
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{ width: active ? undefined : "100%", animation: active ? `tour-progress ${ROOM_SECONDS}s linear forwards` : undefined }}
                    onAnimationEnd={() => go(idx + 1)}
                  />
                )}
              </span>
              <span className={cx("label mt-1.5 hidden truncate !text-[9.5px] sm:block", i === idx ? "!text-white" : "!text-white/55")}>{fr ? r.fr : r.en}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
