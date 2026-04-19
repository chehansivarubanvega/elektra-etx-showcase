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

type ModelProps = Readonly<{
  pointerRef: ContactPointerRef;
  /** Bridges the imperative pulse signal into the per-frame loop without rerenders. */
  pulseStateRef: React.MutableRefObject<{t: number; firing: boolean}>;
}>;

/**
 * Macro ETX rear-quarter w/ cursor-driven emissive glow.
 * — Pointer Y → smoothly rotates the model on the X axis.
 * — Pointer X → very subtle yaw parallax for liveness.
 * — Emissive intensity tracks pointer Y plus a transient "pulse" envelope.
 */
function ContactModel({pointerRef, pulseStateRef}: ModelProps) {
  const {scene} = useGLTF(MODEL_PATH);

  /** Clone, normalize, capture all materials so we can drive emissive globally. */
  const {cloned, emissiveMaterials} = useMemo(() => {
    const clone = scene.clone(true);
    const mats: THREE.MeshStandardMaterial[] = [];

    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;

      const wrap = (m: THREE.Material): THREE.Material => {
        // Promote to standard so emissive control is uniform across the model.
        if (m instanceof THREE.MeshStandardMaterial) {
          const c = m.clone();
          c.emissive = new THREE.Color("#FF5722");
          c.emissiveIntensity = 0;
          mats.push(c);
          return c;
        }
        const fallback = new THREE.MeshStandardMaterial({
          color: "#1a1a1a",
          metalness: 0.6,
          roughness: 0.35,
          emissive: new THREE.Color("#FF5722"),
          emissiveIntensity: 0,
        });
        mats.push(fallback);
        return fallback;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(wrap);
      } else if (mesh.material) {
        mesh.material = wrap(mesh.material);
      }
    });

    /** Normalize size so the shot reads as a consistent "macro" framing. */
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const TARGET_SIZE = 5.4;
    if (maxDim > 0) clone.scale.multiplyScalar(TARGET_SIZE / maxDim);

    const centered = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    centered.getCenter(center);
    clone.position.sub(center);

    return {cloned: clone, emissiveMaterials: mats};
  }, [scene]);

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

    /** Y-axis is the lead — pull head down/up as cursor moves vertically. */
    const yAmp = active ? 0.9 : 0.55;
    const xAmp = active ? 0.32 : 0.18;
    const targetX = BASE_X_ROTATION - ny * yAmp;
    const targetY = BASE_Y_ROTATION + nx * xAmp;

    const LAMBDA = active ? 4.2 : 2.8;
    state.current.rotY = THREE.MathUtils.damp(state.current.rotY, targetY, LAMBDA, dt);
    state.current.rotX = THREE.MathUtils.damp(state.current.rotX, targetX, LAMBDA, dt);

    state.current.idleT += dt;
    state.current.floatY = Math.sin(state.current.idleT * 0.7) * 0.05;

    /** Glow envelope:
     *   base   = brighter the higher the cursor sits (ny near +1).
     *   pulse  = transient burst when `pulse()` is invoked from the form.
     *   total clamps to [0, ~3.4] so we don't blow out the tone-mapper.
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

    const cursorGlow = active ? THREE.MathUtils.clamp((ny + 1) * 0.5, 0, 1) : 0.05;
    const targetGlow = cursorGlow * 0.85 + pulseEnv;
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
 */
export const ContactScene = ({pointerRef, handleRef}: SceneProps) => {
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

  return (
    <Canvas
      dpr={[1, 1.8]}
      shadows
      camera={{position: [0.4, 0.6, 8.6], fov: 28}}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <ambientLight intensity={0.32} />
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
        <ContactModel pointerRef={pointerRef} pulseStateRef={pulseStateRef} />
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
