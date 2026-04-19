"use client";

import React, {Suspense, useEffect, useImperativeHandle, useMemo, useRef} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {ContactShadows, Environment, useGLTF} from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/etx-exterior-panels.glb";

/** Cinematic ¾ rear-wheel framing — close enough to read as a "macro" detail
 *  shot of the rear deck / charging panel without losing silhouette context. */
const BASE_Y_ROTATION = Math.PI - Math.PI * 0.78;
const BASE_X_ROTATION = -0.05;

export type ContactPointerSample = {
  /** Pointer Y normalized to viewport — range [-1, 1] (top → +1, bottom → -1). */
  ny: number;
  /** Pointer X used only for the subtle parallax tilt — keeps Y as the lead axis. */
  nx: number;
  /** Inside-canvas flag — drives glow intensity. */
  active: boolean;
};

export type ContactPointerRef = React.MutableRefObject<ContactPointerSample>;

export type ContactSceneHandle = {
  /** Fire a "Signal sent" pulse — bloom-like emissive flash + camera punch. */
  pulse: () => void;
};

/** Two distinct framings — desktop sits in a 50vw fixed column; mobile lives in
 *  a stacked hero where the canvas is portrait-ish. We pull the camera back and
 *  shrink the model so the silhouette actually fills the frame on small screens.
 */
type Framing = "desktop" | "mobile";

type ModelProps = Readonly<{
  pointerRef: ContactPointerRef;
  /** Bridges the imperative pulse signal into the per-frame loop without rerenders. */
  pulseStateRef: React.MutableRefObject<{t: number; firing: boolean}>;
  framing: Framing;
}>;

/**
 * Macro ETX rear-quarter w/ cursor-driven emissive glow.
 * — Pointer Y → smoothly rotates the model on the X axis.
 * — Pointer X → very subtle yaw parallax for liveness.
 * — Emissive intensity tracks pointer Y plus a transient "pulse" envelope.
 */
function ContactModel({pointerRef, pulseStateRef, framing}: ModelProps) {
  const {scene} = useGLTF(MODEL_PATH);

  /** Clone, normalize, capture all materials so we can drive emissive globally.
   *  TARGET_SIZE is chosen per framing so the silhouette consistently fills the
   *  visible frustum on desktop (wide) AND mobile (taller, narrower viewport). */
  const {cloned, emissiveMaterials} = useMemo(() => {
    const clone = scene.clone(true);
    const mats: THREE.MeshStandardMaterial[] = [];

    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;

      /** Clone the original material AS-IS (preserves color, maps, type — works
       *  for MeshStandardMaterial AND MeshPhysicalMaterial). Then layer our
       *  brand-orange emissive on top so we never destroy the model's PBR look.
       *  Only standard-family materials support `emissive`/`emissiveIntensity`,
       *  so non-standard materials are simply cloned and skipped for emissive.
       */
      const wrap = (m: THREE.Material): THREE.Material => {
        const c = m.clone();
        if (
          c instanceof THREE.MeshStandardMaterial ||
          c instanceof THREE.MeshPhysicalMaterial
        ) {
          c.emissive = new THREE.Color("#FF5722");
          c.emissiveIntensity = 0;
          mats.push(c);
        }
        return c;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(wrap);
      } else if (mesh.material) {
        mesh.material = wrap(mesh.material);
      }
    });

    /** Normalize size — desktop reads as a "macro" detail shot at ~5.4 units;
     *  mobile slightly smaller (~4.6) so the whole silhouette fits the portrait
     *  frame with breathing room for the HUD overlays. */
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const TARGET_SIZE = framing === "mobile" ? 4.6 : 5.4;
    if (maxDim > 0) clone.scale.multiplyScalar(TARGET_SIZE / maxDim);

    const centered = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    centered.getCenter(center);
    clone.position.sub(center);

    return {cloned: clone, emissiveMaterials: mats};
  }, [scene, framing]);

  const groupRef = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);

  /** Smoothed pointer + idle state — written per-frame, no React rerenders. */
  const state = useRef({
    rotY: BASE_Y_ROTATION,
    rotX: BASE_X_ROTATION,
    floatY: 0,
    idleT: 0,
    glow: 0,
  });

  useFrame((_s, delta) => {
    if (!groupRef.current || !tiltRef.current) return;
    const dt = Math.min(delta, 0.05);
    const {nx, ny, active} = pointerRef.current;

    state.current.idleT += dt;

    /** Mobile gets a slow auto-yaw + a slight breathing tilt when no touch is
     *  active — without it, the model just sits motionless on phones (because
     *  pointermove doesn't fire without a finger down). */
    const isMobile = framing === "mobile";
    const idleYaw = isMobile && !active ? Math.sin(state.current.idleT * 0.32) * 0.55 : 0;
    const idleTilt = isMobile && !active ? Math.sin(state.current.idleT * 0.21) * 0.06 : 0;

    /** Y-axis is the lead — pull head down/up as cursor moves vertically. */
    const yAmp = active ? 0.9 : 0.55;
    const xAmp = active ? 0.32 : 0.18;
    const targetX = BASE_X_ROTATION - ny * yAmp + idleTilt;
    const targetY = BASE_Y_ROTATION + nx * xAmp + idleYaw;

    const LAMBDA = active ? 4.2 : 2.8;
    state.current.rotY = THREE.MathUtils.damp(state.current.rotY, targetY, LAMBDA, dt);
    state.current.rotX = THREE.MathUtils.damp(state.current.rotX, targetX, LAMBDA, dt);

    state.current.floatY = Math.sin(state.current.idleT * 0.7) * 0.05;

    /** Glow envelope:
     *   base   = brighter the higher the cursor sits (ny near +1).
     *   pulse  = transient burst when `pulse()` is invoked from the form.
     *   On mobile we keep a soft "breathing" base so the emissive accents
     *   are always perceptible without requiring a touch event.
     *   Total clamps to [0, ~3.4] so we don't blow out the tone-mapper.
     */
    const pulseS = pulseStateRef.current;
    if (pulseS.firing) {
      pulseS.t += dt;
      // Pulse envelope: fast attack, slow decay over ~1.4s.
      if (pulseS.t > 1.4) {
        pulseS.firing = false;
        pulseS.t = 0;
      }
    }
    const pulseEnv = pulseS.firing
      ? Math.sin(Math.min(pulseS.t / 0.18, Math.PI)) *
        Math.exp(-Math.max(pulseS.t - 0.18, 0) * 2.4) *
        2.6
      : 0;

    let baseGlow: number;
    if (active) {
      baseGlow = THREE.MathUtils.clamp((ny + 1) * 0.5, 0, 1);
    } else if (isMobile) {
      // Soft 0.18 → 0.45 breathing on mobile so the orange always reads.
      baseGlow = 0.32 + Math.sin(state.current.idleT * 1.1) * 0.13;
    } else {
      baseGlow = 0.05;
    }
    const targetGlow = baseGlow * 0.85 + pulseEnv;
    state.current.glow = THREE.MathUtils.damp(state.current.glow, targetGlow, 12, dt);

    tiltRef.current.rotation.y = state.current.rotY;
    tiltRef.current.rotation.x = state.current.rotX;
    groupRef.current.position.y = state.current.floatY;

    /** Apply emissive uniformly. Cheap loop — typical ETX model is < 30 mats. */
    const g = state.current.glow;
    for (let i = 0; i < emissiveMaterials.length; i++) {
      emissiveMaterials[i].emissiveIntensity = g;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={tiltRef}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

if (typeof globalThis.window !== "undefined") {
  useGLTF.preload(MODEL_PATH);
}

type SceneProps = Readonly<{
  pointerRef: ContactPointerRef;
  /** Imperative handle the form uses to trigger the pulse on submit. */
  handleRef: React.Ref<ContactSceneHandle>;
  /** Adjusts camera + model size for the desktop column vs. the mobile hero. */
  framing?: Framing;
}>;

/** Bridges the imperative pulse() handle into the per-frame state. */
function PulseBridge({
  handleRef,
  pulseStateRef,
}: {
  handleRef: React.Ref<ContactSceneHandle>;
  pulseStateRef: React.MutableRefObject<{t: number; firing: boolean}>;
}) {
  useImperativeHandle(handleRef, () => ({
    pulse: () => {
      pulseStateRef.current.firing = true;
      pulseStateRef.current.t = 0;
    },
  }));
  return null;
}

/**
 * Fixed full-bleed canvas designed to live in the left column of the Contact
 * page (or the mobile hero). Uses an HDR studio environment so the macro detail
 * picks up plausible reflections regardless of the orange emissive load.
 *
 * The desktop framing is tight + cinematic; the mobile framing pulls the
 * camera back and centers it so the silhouette reads on a portrait viewport.
 */
export const ContactScene = ({pointerRef, handleRef, framing = "desktop"}: SceneProps) => {
  const pulseStateRef = useRef({t: 0, firing: false});

  /** Mark inactive when the tab is hidden — keeps the GPU quiet on background tabs. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.hidden) pointerRef.current.active = false;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pointerRef]);

  /** Camera tuned per framing:
   *   desktop — slightly off-axis ¾ macro shot
   *   mobile  — centered + pulled back, wider FOV so portrait crop still
   *             frames the whole vehicle without cropping panels. */
  const cameraConfig =
    framing === "mobile"
      ? {position: [0, 0.3, 11] as [number, number, number], fov: 36}
      : {position: [0.4, 0.6, 8.6] as [number, number, number], fov: 28};

  return (
    <Canvas
      dpr={[1, 1.8]}
      shadows
      camera={cameraConfig}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: framing === "mobile" ? 1.12 : 1.05,
      }}
    >
      <ambientLight intensity={framing === "mobile" ? 0.45 : 0.32} />
      <directionalLight
        position={[5.5, 7.5, 6]}
        intensity={2.2}
        color={"#fff1e0"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-7, 5, -3]} intensity={0.85} color={"#7fa8ff"} />
      <directionalLight position={[0, 4, -8]} intensity={1.1} color={"#ffffff"} />
      {/* Warm orange rim from the cursor side — ties together the emissive look. */}
      <pointLight position={[3, 1.4, 4]} intensity={1.4} color={"#FF5722"} distance={14} decay={1.6} />

      <Suspense fallback={null}>
        <PulseBridge handleRef={handleRef} pulseStateRef={pulseStateRef} />
        <ContactModel pointerRef={pointerRef} pulseStateRef={pulseStateRef} framing={framing} />
        <Environment files="/hdr/studio_small_03_1k.hdr" />
        <ContactShadows
          position={[0, -2.5, 0]}
          opacity={0.55}
          scale={16}
          blur={2.6}
          far={4.5}
          resolution={1024}
          color={"#000000"}
        />
      </Suspense>
    </Canvas>
  );
};

export default ContactScene;
