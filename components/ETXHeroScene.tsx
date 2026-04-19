"use client";

import React, {Suspense, useMemo, useRef} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {ContactShadows, Environment, useGLTF} from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/etx-exterior-panels.glb";
/** Three-quarter front baseline so the cursor "look" reads as cinematic head-turn. */
const BASE_Y_ROTATION = Math.PI - Math.PI * 0.18;
const BASE_X_ROTATION = -0.06;

export type PointerSample = {
  /** Pointer position normalized to viewport, range [-1, 1] (0,0 = center). */
  nx: number;
  ny: number;
  /** Whether the cursor is currently inside the canvas — drives rotation amplitude. */
  active: boolean;
};

export type PointerRef = React.MutableRefObject<PointerSample>;

type ModelProps = Readonly<{
  pointerRef: PointerRef;
}>;

function ETXModel({pointerRef}: ModelProps) {
  const {scene} = useGLTF(MODEL_PATH);

  /** Clone + center + uniformly scale so the model fills a consistent viewport box. */
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const TARGET_SIZE = 4.6;
    if (maxDim > 0) clone.scale.multiplyScalar(TARGET_SIZE / maxDim);

    const centered = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    centered.getCenter(center);
    clone.position.sub(center);

    return clone;
  }, [scene]);

  const groupRef = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  /** Smoothed pointer + idle drift state; written to per-frame, no React re-renders. */
  const state = useRef({
    rotY: BASE_Y_ROTATION,
    rotX: BASE_X_ROTATION,
    floatY: 0,
    idleT: 0,
  });

  useFrame((_s, delta) => {
    if (!groupRef.current || !tiltRef.current) return;

    const dt = Math.min(delta, 0.05);
    const {nx, ny, active} = pointerRef.current;

    /** Larger amplitude when the cursor is inside the canvas (the "ROTATE" zone). */
    const amp = active ? 1 : 0.35;
    const targetY = BASE_Y_ROTATION + nx * 0.95 * amp;
    const targetX = BASE_X_ROTATION - ny * 0.45 * amp;

    /** Cinematic lag — low damping λ ≈ buttery, high inertia. */
    const LAMBDA = active ? 3.6 : 2.2;
    state.current.rotY = THREE.MathUtils.damp(state.current.rotY, targetY, LAMBDA, dt);
    state.current.rotX = THREE.MathUtils.damp(state.current.rotX, targetX, LAMBDA, dt);

    /** Subtle idle hover — gives the static frame a living, photographic feel. */
    state.current.idleT += dt;
    state.current.floatY = Math.sin(state.current.idleT * 0.8) * 0.06;

    tiltRef.current.rotation.y = state.current.rotY;
    tiltRef.current.rotation.x = state.current.rotX;
    groupRef.current.position.y = state.current.floatY;
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
  pointerRef: PointerRef;
}>;

/** Studio-grade hero scene — Environment HDR + contact shadows + key/fill rim. */
export const ETXHeroScene = ({pointerRef}: SceneProps) => {
  return (
    <Canvas
      dpr={[1, 1.8]}
      shadows
      camera={{position: [0, 0.4, 11], fov: 30}}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      {/* Ambient base — keeps shadow side from crushing to pure black. */}
      <ambientLight intensity={0.35} />

      {/* Key light — warm, slightly above-camera, casts the contact shadow. */}
      <directionalLight
        position={[5.5, 7.5, 6]}
        intensity={2.4}
        color={"#fff1e0"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
      />

      {/* Cool fill — opposite side, simulates studio bounce on the far panel. */}
      <directionalLight position={[-7, 5, -3]} intensity={0.9} color={"#7fa8ff"} />

      {/* Rim — picks the silhouette out of the pure-black background. */}
      <directionalLight position={[0, 4, -8]} intensity={1.2} color={"#ffffff"} />

      <Suspense fallback={null}>
        <ETXModel pointerRef={pointerRef} />
        {/* Self-hosted HDR (mirror of drei's `studio` preset). Hosting it
            ourselves keeps CSP `connect-src` locked to `'self'` and avoids
            depending on githack/jsDelivr in production. */}
        <Environment files="/hdr/studio_small_03_1k.hdr" />
        <ContactShadows
          position={[0, -2.55, 0]}
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

export default ETXHeroScene;
