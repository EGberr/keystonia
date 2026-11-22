"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Expand, Move3d, Pause, Play } from "lucide-react";
import * as THREE from "three";
import type { Asset } from "@/lib/api";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { sceneFor, type Chapter } from "./scenes";

const TRAVEL = 3.4; // seconds between chapters
const DWELL = 7.2; // seconds per chapter in auto-play (travel included)

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Director({ chapters, idx, still, lookRef }: { chapters: Chapter[]; idx: number; still: boolean; lookRef: React.RefObject<{ yaw: number; pitch: number; dragging: boolean }> }) {
  const anim = useRef({ fromPos: new THREE.Vector3(...chapters[0].pos), fromLook: new THREE.Vector3(...chapters[0].look), t: 1, idx: -1 });
  const cur = useRef({ pos: new THREE.Vector3(...chapters[0].pos), look: new THREE.Vector3(...chapters[0].look) });
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), target: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), side: new THREE.Vector3() }), []);

  useFrame((state, delta) => {
    const camera = state.camera;
    const a = anim.current;
    if (a.idx !== idx) {
      a.fromPos.copy(cur.current.pos);
      a.fromLook.copy(cur.current.look);
      a.t = a.idx === -1 || still ? 1 : 0;
      a.idx = idx;
    }
    a.t = Math.min(1, a.t + delta / TRAVEL);
    const k = easeInOut(a.t);
    const to = chapters[idx];
    cur.current.pos.lerpVectors(a.fromPos, tmp.target.set(...to.pos), k);
    // A slight crane arc while travelling gives the move a camera-operator feel.
    cur.current.pos.y += Math.sin(Math.PI * k) * 0.25 * (a.t < 1 ? 1 : 0);
    cur.current.look.lerpVectors(a.fromLook, tmp.target.set(...to.look), k);

    // Idle breathing + pointer-drag look offset.
    const l = lookRef.current;
    if (!l.dragging) {
      l.yaw *= Math.exp(-1.2 * delta);
      l.pitch *= Math.exp(-1.2 * delta);
    }
    const t = state.clock.elapsedTime;
    const breathe = still ? 0 : 1;
    camera.position.copy(cur.current.pos);
    camera.position.y += Math.sin(t * 0.6) * 0.015 * breathe;
    tmp.dir.copy(cur.current.look).sub(cur.current.pos);
    tmp.dir.applyAxisAngle(tmp.up, l.yaw + Math.sin(t * 0.17) * 0.03 * breathe);
    tmp.side.crossVectors(tmp.dir, tmp.up).normalize();
    tmp.dir.applyAxisAngle(tmp.side, l.pitch);
    camera.lookAt(tmp.target.copy(camera.position).add(tmp.dir));
  });
  return null;
}

export default function Walkthrough({ asset, className }: { asset: Asset; className?: string }) {
  const { lang, pick } = useLang();
  const fr = lang === "fr";
  const def = useMemo(() => sceneFor(asset), [asset]);
  const wrap = useRef<HTMLDivElement>(null);
  const look = useRef({ yaw: 0, pitch: 0, dragging: false });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [idx, setIdx] = useState(0);
  // Client-only component (loaded with ssr: false), so window is available here.
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [playing, setPlaying] = useState(() => !still);
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    setIdx(((i % def.chapters.length) + def.chapters.length) % def.chapters.length);
  };
  const fullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };
  const Scene = def.Scene;
  const active = playing && visible;

  return (
    <div ref={wrap} className={cx("group/tour relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-[#0b0a09] sm:aspect-[16/9] [&:fullscreen]:rounded-none", className)}>
      <Canvas
        frameloop={visible ? "always" : "never"}
        shadows
        dpr={[1, 1.6]}
        camera={{ fov: 52, near: 0.05, far: 600, position: def.chapters[0].pos }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: def.exposure }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          look.current.dragging = true;
          setHint(false);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          look.current.yaw = THREE.MathUtils.clamp(look.current.yaw + dx * 0.004, -0.9, 0.9);
          look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - dy * 0.003, -0.45, 0.45);
        }}
        onPointerUp={() => {
          drag.current = null;
          look.current.dragging = false;
        }}
        onPointerLeave={() => {
          drag.current = null;
          look.current.dragging = false;
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        <color attach="background" args={[def.background]} />
        <fog attach="fog" args={[def.background, ...def.fog]} />
        <Scene seed={0} />
        <Director chapters={def.chapters} idx={idx} still={still} lookRef={look} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.55} luminanceThreshold={0.9} luminanceSmoothing={0.15} mipmapBlur />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      </Canvas>

      {/* letterbox gradients */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/80 to-transparent" />

      <div className="pointer-events-none absolute inset-x-5 top-5 flex items-start justify-between gap-4 sm:inset-x-7 sm:top-6">
        <div>
          <p className="label !text-white/60">
            <span className="text-accent">●</span> {fr ? "Visite 3D" : "3D walkthrough"} · {def.kind}
          </p>
          <p className="mt-2 font-serif text-[22px] leading-none text-white sm:text-[28px]">{pick(asset, "name")}</p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10">
            {playing ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
          </button>
          <button onClick={fullscreen} aria-label={fr ? "Plein écran" : "Fullscreen"} className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10">
            <Expand size={14} />
          </button>
        </div>
      </div>

      {hint && (
        <p className="glass pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full px-4 py-2 text-[12px] text-white/85 opacity-0 transition-opacity duration-500 group-hover/tour:opacity-100">
          <Move3d size={14} /> {fr ? "Glissez pour regarder autour" : "Drag to look around"}
        </p>
      )}

      <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-6">
        <p className="mb-3 font-serif text-[26px] italic leading-none text-white sm:text-[34px]">{fr ? def.chapters[idx].fr : def.chapters[idx].en}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${def.chapters.length}, minmax(0, 1fr))` }}>
          {def.chapters.map((c, i) => (
            <button key={c.en} onClick={() => go(i)} className="group/ch text-left">
              <span className="relative block h-[2px] overflow-hidden rounded-full bg-white/20">
                {i < idx && <span className="absolute inset-0 bg-white/70" />}
                {i === idx && (
                  <span
                    key={`${idx}-${active}`}
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{ width: active ? undefined : "100%", animation: active ? `tour-progress ${DWELL}s linear forwards` : undefined }}
                    onAnimationEnd={() => go(idx + 1)}
                  />
                )}
              </span>
              <span className={cx("label mt-2 hidden !text-[9.5px] sm:block", i === idx ? "!text-white" : "!text-white/45 group-hover/ch:!text-white/75")}>
                {String(i + 1).padStart(2, "0")} {fr ? c.fr : c.en}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="label pointer-events-none absolute bottom-5 right-5 hidden !text-[9px] !text-white/35 lg:block" style={{ bottom: "64px" }}>
        {fr ? "Bien fictif · modèle procédural" : "Fictional property · procedural model"}
      </p>
    </div>
  );
}
