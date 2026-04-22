"use client";

import React, {useMemo, useRef, useState, useEffect, useCallback} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
import {ETX_EXTERIOR_GLB} from "@/lib/site-assets";
import {
  applyEtxBodyPaint,
  toneDownEtxReflectionsOnObject,
} from "@/lib/etx-vehicle-materials";
import {EtxStudioRig, ETX_STUDIO_DPR, etxStudioGlProps} from "./EtxStudioRig";
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

    toneDownEtxReflectionsOnObject(clone);
    applyEtxBodyPaint(clone);
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

/** Studio-grade hero scene — Environment HDR + contact shadows + key/fill rim.
 *  Wrapped in an error boundary and visibility gate so iOS Safari's limited
 *  WebGL context pool isn't exhausted by off-screen canvases. */
export const ETXHeroScene = ({pointerRef}: SceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  /** Track context-loss so we can remount the Canvas on restore. */
  const [contextKey, setContextKey] = useState(0);

  // Defer Canvas mount until the container enters the viewport (± 400 px).
  // Prevents burning a WebGL context for a section the user hasn't reached.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Handle WebGL context lost / restored — remount the Canvas on restore. */
  const onCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.warn('[ETXHeroScene] WebGL context lost');
    };
    const onRestored = () => {
      // eslint-disable-next-line no-console
      console.info('[ETXHeroScene] WebGL context restored — remounting');
      setContextKey((k) => k + 1);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    // Cleanup handled by Canvas unmount — no need for manual removeEventListener
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <CanvasErrorBoundary>
        {visible && (
          <Canvas
            key={contextKey}
            dpr={ETX_STUDIO_DPR}
            shadows
            camera={{position: [0, 0.4, 11], fov: 30}}
            gl={etxStudioGlProps()}
            onCreated={onCreated}
          >
            <EtxStudioRig>
              <ETXModel pointerRef={pointerRef} />
            </EtxStudioRig>
          </Canvas>
        )}
      </CanvasErrorBoundary>
    </div>
  );
};

export default ETXHeroScene;
