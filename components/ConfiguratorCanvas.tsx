"use client";

/**
 * ConfiguratorCanvas — the "Digital Twin" stage.
 *
 * Self-contained @react-three/fiber Canvas that the Brutalist HUD drives via
 * a single declarative `state` prop. Heavy lifting:
 *   - Camera director — GSAP-tween position / fov / lookAt across a small set of
 *     cinematic focus presets (idle / color / quantity / submit / launch).
 *   - Real-time color + metalness lerp — mutates the shared GLB's body
 *     materials per-frame, never re-cloning the scene.
 *   - Ghosted fleet — N additional silhouettes flank the hero ETX as the user
 *     dials Quantity higher.
 *   - Light-Speed launch — particle streaks + vehicle slingshots toward the
 *     camera, then fades to black; one-shot timeline calls back to the HUD.
 *
 * Designed to be cheap (single GLB, materials patched in place) and pure (the
 * HUD owns all state — the Canvas only reads it).
 */

import React, { useEffect, useMemo, useRef } from "react";
import {
  useTabVisibleFrameloop,
  useWebGLBudget,
} from "@/components/WebGLBudgetContext";
import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import {ETX_EXTERIOR_GLB} from "@/lib/site-assets";
import {
  optimizeVehicle,
} from "@/lib/etx-vehicle-materials";
import {CanvasErrorBoundary} from "./CanvasErrorBoundary";
import {EtxStudioRig, etxStudioGlProps} from "./EtxStudioRig";

const MODEL_PATH = ETX_EXTERIOR_GLB;
const MAX_FLEET = 5;

export type FocusTarget =
  | "idle"
  | "email"
  | "color"
  | "quantity"
  | "submit"
  | "launch";

export type ConfiguratorState = Readonly<{
  color: string;
  metalness: number;
  /** 1..MAX_FLEET — drives ghosted background instances. */
  quantity: number;
  focus: FocusTarget;
  launching: boolean;
}>;

export type ConfiguratorCanvasProps = Readonly<{
  state: ConfiguratorState;
  onLaunchComplete?: () => void;
  onCanvasPointer?: (active: boolean) => void;
}>;

/* ------------------------------------------------------------------ */
/* Camera presets                                                      */
/* ------------------------------------------------------------------ */

type CameraPose = {pos: [number, number, number]; lookAt: [number, number, number]; fov: number};

const FOCUS_CAMERA: Record<FocusTarget, CameraPose> = {
  idle: {pos: [4.6, 1.15, 6.6], lookAt: [0, 0.1, 0], fov: 32},
  email: {pos: [5.2, 1.4, 6.1], lookAt: [0.2, 0.3, 0], fov: 32},
  color: {pos: [2.0, 0.35, 3.0], lookAt: [-0.1, 0.05, 0], fov: 22},
  quantity: {pos: [0, 2.6, 13.5], lookAt: [0, 0.1, 0], fov: 40},
  submit: {pos: [0, 0.55, 5.0], lookAt: [0, 0.1, 0], fov: 30},
  launch: {pos: [0, 0.1, 1.4], lookAt: [0, 0, -10], fov: 70},
};

/* ------------------------------------------------------------------ */
/* Vehicle — per-frame body tinting                                    */
/* ------------------------------------------------------------------ */

type BodyMatRecord = {
  mat: THREE.MeshStandardMaterial;
};

type ETXModelProps = Readonly<{
  state: ConfiguratorState;
  ghosted?: boolean;
  ghostOpacity?: number;
  lowPower?: boolean;
}>;

function ETXModel({
  state,
  ghosted = false,
  ghostOpacity = 0.18,
  lowPower,
}: ETXModelProps) {
  const {scene} = useGLTF(MODEL_PATH);

  // Each ETX instance gets its own deep clone with private materials so the
  // hero's color lerp doesn't bleed into the ghosted fleet.
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    optimizeVehicle(clone, !!lowPower);

    // Center + uniform scale to a predictable bounding box.
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const TARGET = 4.4;
    if (maxDim > 0) clone.scale.multiplyScalar(TARGET / maxDim);
    const cb = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    cb.getCenter(center);
    clone.position.sub(center);


    return clone;
  }, [scene, ghosted, lowPower]);



  const bodyMatsRef = useRef<BodyMatRecord[]>([]);
  const allMatsRef = useRef<THREE.Material[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  // One-time material classification: anything light-colored or named like a
  // body panel becomes a "tintable" surface; everything else (glass / wheels /
  // dark trim) is left untouched.
  useEffect(() => {
    const body: BodyMatRecord[] = [];
    const all: THREE.Material[] = [];
    cloned.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat) return;
        all.push(mat);
        if (mat instanceof THREE.MeshStandardMaterial) {
          const c = mat.color;
          const lum = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
          const matchesName = /body|shell|panel|skin|exterior|paint/i.test(mat.name);
          if (lum > 0.5 || matchesName) {
            body.push({mat});
          }
        }
      });
    });
    // Fallback: if the heuristic missed (very dark model), tint the largest
    // standard materials so the user always sees their color choice land.
    if (body.length === 0) {
      all.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          body.push({mat: m});
        }
      });
    }
    bodyMatsRef.current = body;
    allMatsRef.current = all;
  }, [cloned]);

  const targetColor = useMemo(() => new THREE.Color(state.color), [state.color]);
  const launchTRef = useRef(0);

  useFrame((_s, delta) => {
    const dt = Math.min(delta, 0.05);

    // Hero color + metalness lerp. Ghosts stay desaturated white.
    if (!ghosted) {
      const lerpAmt = 1 - Math.exp(-7 * dt);
      bodyMatsRef.current.forEach(({mat}) => {
        mat.color.lerp(targetColor, lerpAmt);
        mat.metalness = THREE.MathUtils.damp(mat.metalness, state.metalness, 6, dt);
      });
    } else {
      const ghostColor = new THREE.Color("#aab2bd");
      bodyMatsRef.current.forEach(({mat}) => {
        mat.color.lerp(ghostColor, 0.05);
      });
      // Ghosts must be transparent so they don't punch holes in the void.
      allMatsRef.current.forEach((m) => {
        const sm = m as THREE.MeshStandardMaterial;
        sm.transparent = true;
        sm.opacity = THREE.MathUtils.damp(sm.opacity ?? 1, ghostOpacity, 6, dt);
        sm.depthWrite = false;
      });
    }

    // Launch: hero ETX accelerates toward the camera and dissolves. We mutate
    // a wrapper group ref (not the useMemo-returned scene) so React 19's
    // hook-immutability rule stays happy.
    if (!ghosted && groupRef.current) {
      const g = groupRef.current;
      const targetT = state.launching ? 1 : 0;
      launchTRef.current = THREE.MathUtils.damp(launchTRef.current, targetT, 4, dt);
      const t = launchTRef.current;
      g.position.z = THREE.MathUtils.lerp(0, 6.5, t * t);
      g.scale.setScalar(THREE.MathUtils.lerp(1, 1.65, t));
      const fade = 1 - Math.max(0, (t - 0.55) / 0.45);
      allMatsRef.current.forEach((m) => {
        const sm = m as THREE.MeshStandardMaterial;
        sm.transparent = true;
        sm.opacity = THREE.MathUtils.damp(sm.opacity ?? 1, fade, 8, dt);
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

if (typeof globalThis.window !== "undefined") {
  useGLTF.preload(MODEL_PATH);
}

/* ------------------------------------------------------------------ */
/* Camera director — GSAP-driven                                       */
/* ------------------------------------------------------------------ */

function CameraDirector({focus}: {focus: FocusTarget}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const lookProxy = useRef({x: 0, y: 0.1, z: 0});
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    const target = FOCUS_CAMERA[focus];
    const dur = focus === "launch" ? 0.9 : 1.6;
    const ease = focus === "launch" ? "power4.in" : "power3.inOut";
    gsap.to(camera.position, {x: target.pos[0], y: target.pos[1], z: target.pos[2], duration: dur, ease});
    gsap.to(camera, {
      fov: target.fov,
      duration: dur,
      ease,
      onUpdate: () => camera.updateProjectionMatrix(),
    });
    gsap.to(lookProxy.current, {
      x: target.lookAt[0],
      y: target.lookAt[1],
      z: target.lookAt[2],
      duration: dur,
      ease,
    });
  }, [focus, camera]);

  useFrame(() => {
    tmp.current.set(lookProxy.current.x, lookProxy.current.y, lookProxy.current.z);
    camera.lookAt(tmp.current);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Light-speed particle field                                          */
/* ------------------------------------------------------------------ */

function LightSpeedField({launching}: {launching: boolean}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const geom = useMemo(() => {
    // Seeded PRNG keeps the geometry stable across re-renders (the React
    // purity rule forbids Math.random inside useMemo).
    let s = 0x9E3779B9;
    const rng = () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const COUNT = 1400;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 1.2 + rng() * 6;
      const a = rng() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r * 0.6;
      positions[i * 3 + 2] = -120 + rng() * 120;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((_s, delta) => {
    if (!pointsRef.current || !matRef.current) return;
    const dt = Math.min(delta, 0.05);
    const speed = launching ? 220 : 4;
    const targetOpacity = launching ? 1 : 0.08;
    matRef.current.opacity = THREE.MathUtils.damp(
      matRef.current.opacity,
      targetOpacity,
      6,
      dt,
    );
    matRef.current.size = THREE.MathUtils.damp(
      matRef.current.size,
      launching ? 0.18 : 0.04,
      6,
      dt,
    );

    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 2; i < arr.length; i += 3) {
      arr[i] += speed * dt;
      if (arr[i] > 8) {
        arr[i] = -120 - Math.random() * 40;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geom}>
      <pointsMaterial
        ref={matRef}
        color={"#ffffff"}
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Ghosted fleet                                                       */
/* ------------------------------------------------------------------ */

const GHOST_OFFSETS: ReadonlyArray<{x: number; z: number; rot: number}> = [
  {x: -3.6, z: -1.6, rot: 0.18},
  {x: 3.6, z: -1.6, rot: -0.18},
  {x: -7.0, z: -3.4, rot: 0.32},
  {x: 7.0, z: -3.4, rot: -0.32},
];

function GhostFleet({state, lowPower}: {state: ConfiguratorState; lowPower?: boolean}) {
  // Always render the maximum so we don't pay a re-mount cost when the user
  // dials Quantity up; we just modulate visibility per slot.
  // DISABLED ON MOBILE/LOW-POWER: 5 vehicle instances is too much RAM.
  if (lowPower) return null;

  const visibleSlots = Math.max(0, Math.min(state.quantity - 1, MAX_FLEET - 1));
  return (
    <group>
      {GHOST_OFFSETS.map((g, i) => {
        const visible = i < visibleSlots;
        return (
          <group
            key={i}
            position={[g.x, 0, g.z]}
            rotation={[0, g.rot, 0]}
            scale={visible ? 0.85 : 0.001}
          >
            <ETXModel state={state} ghosted ghostOpacity={visible ? 0.16 : 0} lowPower={lowPower} />
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Launch watchdog — fires onLaunchComplete after the timeline lands   */
/* ------------------------------------------------------------------ */

function LaunchWatchdog({launching, onComplete}: {launching: boolean; onComplete?: () => void}) {
  useEffect(() => {
    if (!launching || !onComplete) return;
    const id = window.setTimeout(onComplete, 1900);
    return () => window.clearTimeout(id);
  }, [launching, onComplete]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export const ConfiguratorCanvas = ({
  state,
  onLaunchComplete,
  onCanvasPointer,
}: ConfiguratorCanvasProps) => {
  const {dpr, antialias, lowPower} = useWebGLBudget();
  const gl = useMemo(
    () =>
      etxStudioGlProps({
        antialias,
        powerPreference: lowPower ? "low-power" : "high-performance",
        precision: lowPower ? "lowp" : "highp",
      }),
    [antialias, lowPower],
  );
  const frameloop = useTabVisibleFrameloop(true);

  return (
    <div className="h-full w-full">
      <CanvasErrorBoundary>
        <Canvas
          dpr={dpr}
          frameloop={frameloop}
          shadows
          camera={{position: FOCUS_CAMERA.idle.pos, fov: FOCUS_CAMERA.idle.fov}}
          gl={gl}
          performance={{min: lowPower ? 0.4 : 0.5}}
          onPointerOver={() => onCanvasPointer?.(true)}
          onPointerOut={() => onCanvasPointer?.(false)}
          style={{background: 'transparent'}}
        >
          <EtxStudioRig contactShadowY={-1.45} contactShadowScale={18}>
            <GhostFleet state={state} lowPower={lowPower} />
            <ETXModel state={state} lowPower={lowPower} />
          </EtxStudioRig>

          <LightSpeedField launching={state.launching} />
          <CameraDirector focus={state.focus} />
          <LaunchWatchdog launching={state.launching} onComplete={onLaunchComplete} />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
};

export default ConfiguratorCanvas;
