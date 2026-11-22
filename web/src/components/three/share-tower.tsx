"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

/**
 * The hero signature: a building assembled from its own shares. `progress` (0..1, driven by scroll)
 * separates the blocks; past 0.62 one block rises out of the facade and turns brass ("yours").
 */

const BG = "#0b0a09";
const BRASS = new THREE.Color("#e2b56f");
const STONE = new THREE.Color("#2b2621");
const STONE_LIGHT = new THREE.Color("#3a332b");

type Block = {
  base: THREE.Vector3;
  dir: THREE.Vector3;
  dist: number;
  axis: THREE.Vector3;
  spin: number;
  phase: number;
  exterior: boolean;
  lit: boolean;
  face: THREE.Vector3; // outward normal of the facade this block belongs to
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildBlocks(cols: number, depth: number, floors: number) {
  const rand = rng(7);
  const size = new THREE.Vector3(1, 0.62, 1);
  const gap = 0.05;
  const blocks: Block[] = [];
  const cx = ((cols - 1) * (size.x + gap)) / 2;
  const cz = ((depth - 1) * (size.z + gap)) / 2;
  const centre = new THREE.Vector3(0, (floors * (size.y + gap)) / 2, 0);
  for (let y = 0; y < floors; y++)
    for (let x = 0; x < cols; x++)
      for (let z = 0; z < depth; z++) {
        // Setback crown: the top three floors lose their outer ring, like a Haussmann attic.
        if (y >= floors - 3 && (x === 0 || x === cols - 1 || z === 0 || z === depth - 1) && y >= floors - 2) continue;
        const base = new THREE.Vector3(x * (size.x + gap) - cx, y * (size.y + gap) + size.y / 2, z * (size.z + gap) - cz);
        const exterior = x === 0 || x === cols - 1 || z === 0 || z === depth - 1;
        const face =
          z === depth - 1 ? new THREE.Vector3(0, 0, 1) : x === cols - 1 ? new THREE.Vector3(1, 0, 0) : x === 0 ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, -1);
        const dir = base
          .clone()
          .sub(centre)
          .add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(1.4))
          .normalize();
        blocks.push({
          base,
          dir,
          dist: 1.2 + rand() * 3.0 + (y / floors) * 1.4,
          axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
          spin: (rand() - 0.5) * 2.4,
          phase: rand() * Math.PI * 2,
          exterior,
          lit: exterior && y > 0 && rand() > 0.6,
          face,
        });
      }
  // "Yours": a front-facade block a third of the way up.
  const yours = blocks.findIndex((b) => b.face.z === 1 && Math.abs(b.base.x) < 0.6 && b.base.y > floors * 0.6 * 0.33);
  return { blocks, size, yours: yours < 0 ? 0 : yours };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Tower({ progress, compact, still }: { progress: RefObject<number>; compact: boolean; still: boolean }) {
  const { blocks, size, yours } = useMemo(() => buildBlocks(compact ? 5 : 6, 4, compact ? 11 : 14), [compact]);
  const stone = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const mine = useRef<THREE.Mesh>(null);
  const mineMat = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.PointLight>(null);
  const smooth = useRef(0);
  const litIdx = useMemo(() => blocks.map((b, i) => (b.lit ? i : -1)).filter((i) => i >= 0 && i !== yours), [blocks, yours]);

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), w: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), c: new THREE.Color() }),
    [],
  );

  useEffect(() => {
    const mesh = stone.current;
    if (!mesh) return;
    blocks.forEach((b, i) => {
      tmp.c.copy(b.exterior ? STONE_LIGHT : STONE).offsetHSL(0, 0, (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.025);
      mesh.setColorAt(i, tmp.c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks, tmp]);

  useFrame((state, delta) => {
    const target = progress.current ?? 0;
    smooth.current = still ? target : THREE.MathUtils.damp(smooth.current, target, 3.2, delta);
    const p = smooth.current;
    const e = ease(THREE.MathUtils.clamp(p / 0.72, 0, 1));
    const rise = ease(THREE.MathUtils.clamp((p - 0.62) / 0.3, 0, 1));
    const t = state.clock.elapsedTime;
    const mesh = stone.current;
    const win = windows.current;
    if (!mesh || !win) return;

    blocks.forEach((b, i) => {
      // Exploded axonometric: every block slides out along its own grid position, like an
      // architect's exploded drawing, with only a hint of drift so the order stays readable.
      const float = still ? 0 : Math.sin(t * 0.7 + b.phase) * 0.05 * e;
      tmp.p.set(b.base.x * (1 + 0.85 * e), b.base.y * (1 + 0.55 * e), b.base.z * (1 + 1.1 * e));
      tmp.p.addScaledVector(b.dir, 0.35 * e);
      tmp.p.y += float;
      tmp.q.setFromAxisAngle(b.axis, b.spin * 0.12 * e);
      const scale = i === yours ? 0.0001 : 1;
      tmp.s.setScalar(scale);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    });
    mesh.instanceMatrix.needsUpdate = true;

    litIdx.forEach((i, k) => {
      const b = blocks[i];
      mesh.getMatrixAt(i, tmp.m);
      // A pane inset on the block's outward face.
      tmp.w.makeTranslation(b.face.x * 0.505, 0.02, b.face.z * 0.505);
      const rotY = b.face.x !== 0 ? Math.PI / 2 : 0;
      tmp.w.multiply(new THREE.Matrix4().makeRotationY(rotY));
      tmp.m.multiply(tmp.w);
      win.setMatrixAt(k, tmp.m);
    });
    win.instanceMatrix.needsUpdate = true;

    // The brass share: leaves the facade, turns to face the camera.
    const b = blocks[yours];
    if (mine.current && mineMat.current) {
      const from = tmp.p.set(b.base.x * (1 + 0.85 * e), b.base.y * (1 + 0.55 * e), b.base.z * (1 + 1.1 * e));
      // Land the share on the camera axis (which the view offset places over the tower), 9 m out.
      const fwd = state.camera.getWorldDirection(new THREE.Vector3());
      const to = state.camera.position.clone().addScaledVector(fwd, 11).add(new THREE.Vector3(0, 0.3, 0));
      mine.current.position.lerpVectors(from, to, rise);
      mine.current.position.y += still ? 0 : Math.sin(t * 1.1) * 0.05 * rise;
      mine.current.rotation.set(0.38 * rise, (0.65 + t * 0.3) * rise, 0.1 * rise);
      mine.current.scale.setScalar(1 + rise * 0.15);
      if (glow.current) {
        glow.current.position.copy(mine.current.position).addScaledVector(state.camera.getWorldDirection(new THREE.Vector3()), -1.6).add(new THREE.Vector3(0.8, 1.1, 0));
        glow.current.intensity = rise * 22;
      }
      mineMat.current.color.copy(STONE_LIGHT).lerp(BRASS, rise);
      mineMat.current.emissive.copy(BRASS).multiplyScalar(rise * 0.38);
      mineMat.current.metalness = 0.15 + rise * 0.83;
      mineMat.current.roughness = 0.75 - rise * 0.55;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <instancedMesh ref={stone} args={[undefined, undefined, blocks.length]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial roughness={0.82} metalness={0.08} />
      </instancedMesh>
      <instancedMesh ref={windows} args={[undefined, undefined, litIdx.length]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshBasicMaterial color={new THREE.Color("#ff9440").multiplyScalar(1.25)} toneMapped={false} />
      </instancedMesh>
      <mesh ref={mine} castShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial ref={mineMat} roughness={0.75} metalness={0.15} envMapIntensity={3} />
      </mesh>
      <pointLight ref={glow} intensity={0} distance={7} color="#f2c98a" />
    </group>
  );
}

function Rig({ progress, still }: { progress: RefObject<number>; still: boolean }) {
  const look = useMemo(() => new THREE.Vector3(0, 4, 0), []);
  useFrame((state, delta) => {
    const { camera, pointer, size } = state;
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width >= 1024;
    const ox = wide ? -size.width * 0.17 : 0;
    const oy = wide ? size.height * 0.04 : size.height * 0.2;
    if (!cam.view || cam.view.offsetX !== ox || cam.view.offsetY !== oy || cam.view.fullWidth !== size.width) {
      cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height);
    }
    const p = progress.current ?? 0;
    const t = still ? 0 : state.clock.elapsedTime;
    const angle = 0.62 + t * 0.025 + p * 0.45;
    const radius = 22 + p * 3;
    const target = new THREE.Vector3(Math.sin(angle) * radius + (still ? 0 : pointer.x * 0.8), 5.2 + p * 2.6 + (still ? 0 : pointer.y * 0.5), Math.cos(angle) * radius);
    camera.position.lerp(target, still ? 1 : 1 - Math.exp(-2.5 * delta));
    look.lerp(new THREE.Vector3(0.4, 4.2 + p * 0.8, 0), 1 - Math.exp(-2 * delta));
    camera.lookAt(look);
  });
  return null;
}

export default function ShareTower({ progress, className }: { progress: RefObject<number>; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // Client-only component (loaded with ssr: false), so window is available here.
  const [compact] = useState(() => window.innerWidth < 768);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={className}>
      <Canvas
        frameloop={visible ? "always" : "never"}
        shadows
        dpr={[1, compact ? 1.5 : 1.75]}
        camera={{ fov: 30, near: 0.5, far: 120, position: [12, 6, 15] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(BG)}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 16, 48]} />
        <ambientLight intensity={0.18} />
        <hemisphereLight args={["#3d4a5c", "#120e0a", 0.35]} />
        <directionalLight
          position={[-9, 6.5, 7]}
          intensity={2.6}
          color="#ffb877"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[7, 9, -11]} intensity={1.3} color="#86a6cc" />
        <pointLight position={[1.4, 6.8, 6.4]} intensity={9} distance={6} color="#e8b676" />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} color="#ffcf9a" position={[-6, 4, 6]} scale={[6, 3, 1]} />
          <Lightformer form="rect" intensity={1} color="#8fb0d8" position={[6, 6, -6]} scale={[8, 2, 1]} />
        </Environment>

        <Tower progress={progress} compact={compact} still={still} />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#0d0c0a" roughness={0.95} />
        </mesh>
        <ContactShadows position={[0, 0.01, 0]} scale={26} blur={2.6} opacity={0.75} far={10} color="#000" />
        <Rig progress={progress} still={still} />

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.5} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.28} darkness={0.72} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
