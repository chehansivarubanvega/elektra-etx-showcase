"use client";

import React, {useCallback, useMemo, useRef, useState, useEffect} from "react";
import {
  useTabVisibleFrameloop,
  useWebGLBudget,
} from "@/components/WebGLBudgetContext";
import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
import {ETX_EXTERIOR_GLB} from "@/lib/site-assets";
import {
  optimizeVehicle,
} from "@/lib/etx-vehicle-materials";
import {EtxStudioRig, etxStudioGlProps} from "./EtxStudioRig";
import {CanvasErrorBoundary} from "./CanvasErrorBoundary";

const MODEL_PATH = ETX_EXTERIOR_GLB;
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

function ETXModel({pointerRef, lowPower}: ModelProps & {lowPower?: boolean}) {
  const {scene} = useGLTF(MODEL_PATH);

  /** Clone + center + uniformly scale so the model fills a consistent viewport box. */
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    optimizeVehicle(clone, !!lowPower);

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
  }, [scene, lowPower]);



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

/** Listens for context loss/restore and remounts when the GPU recovers; cleans up listeners. */
function WebGLContextRecovery({onRestored}: {onRestored: () => void}) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      if (process.env.NODE_ENV === "development") {
        console.warn("[ETXHeroScene] WebGL context lost");
      }
    };
    const onRestoredHandler = () => {
      if (process.env.NODE_ENV === "development") {
        console.info("[ETXHeroScene] WebGL context restored — remounting");
      }
      onRestored();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestoredHandler);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestoredHandler);
    };
  }, [gl, onRestored]);
  return null;
}

type SceneProps = Readonly<{
  pointerRef: PointerRef;
}>;

/** Studio-grade hero scene — Environment HDR + contact shadows + key/fill rim.
 *  Wrapped in an error boundary and visibility gate so iOS Safari's limited
 *  WebGL context pool isn't exhausted by off-screen canvases. */
export const ETXHeroScene = ({pointerRef}: SceneProps) => {
  const {dpr, antialias, lowPower} = useWebGLBudget();
  const gl = useMemo(
    () =>
      etxStudioGlProps({
        antialias,
        powerPreference: lowPower ? "low-power" : "high-performance",
        precision: lowPower ? "mediump" : "highp",
        failIfMajorPerformanceCaveat: false,
        toneMappingExposure: lowPower ? 1.05 : 0.96,
      }),
    [antialias, lowPower],
  );
  const frameloop = useTabVisibleFrameloop(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  /** Track context-loss so we can remount the Canvas on restore. */
  const [contextKey, setContextKey] = useState(0);
  const bumpContext = useCallback(() => setContextKey((k) => k + 1), []);

  // Defer Canvas mount until the container enters the viewport (± 400 px).
  // Prevents burning a WebGL context for a section the user hasn't reached.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      {rootMargin: "400px 0px"},
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <CanvasErrorBoundary>
        {visible && (
          <Canvas
            key={contextKey}
            dpr={dpr}
            frameloop={frameloop}
            shadows
            camera={{position: [0, 0.4, 11], fov: 30}}
            gl={gl}
            style={{background: 'transparent'}}
          >
            <WebGLContextRecovery onRestored={bumpContext} />
            <EtxStudioRig>
              <ETXModel pointerRef={pointerRef} lowPower={lowPower} />
            </EtxStudioRig>
          </Canvas>
        )}
      </CanvasErrorBoundary>
    </div>
  );
};

export default ETXHeroScene;
