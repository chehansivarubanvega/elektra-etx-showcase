"use client";

import * as THREE from "three";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ContactShadows, Environment } from "@react-three/drei";

/** Self-hosted studio HDR (CSP; same as @react-three/drei `studio` feel). */
export const ETX_STUDIO_HDR = "/hdr/studio_small_03_1k.hdr" as const;

export const ETX_STUDIO_DPR: [number, number] = [1, 1.8];

/** Aligned with `ETXHeroScene` (About) — use on every ETX `Canvas` for a consistent look. */
export function etxStudioGlProps(
  overrides?: Partial<{
    antialias: boolean;
    toneMappingExposure: number;
  }> & { stencil?: boolean; depth?: boolean },
) {
  return {
    antialias: true,
    powerPreference: "high-performance" as const,
    alpha: true,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 0.96,
    ...overrides,
  };
}

type EtxStudioRigProps = Readonly<{
  children: ReactNode;
  /** World Y for the contact-shadow plane; tune per layout if the ground reads off. */
  contactShadowY?: number;
  contactShadowScale?: number;
}>;

/**
 * Key/fill/rim + hemisphere, HDR IBL, and `ContactShadows` — the same “studio”
 * treatment as the About page `ETXHeroScene`. Children (vehicle / HUD meshes)
 * should render *inside* the inner `Suspense` after this component mounts, so
 * they load with the same asset batch as the HDR.
 */
export function EtxStudioRig({
  children,
  contactShadowY = -2.55,
  contactShadowScale = 16,
}: EtxStudioRigProps) {
  return (
    <>
      <hemisphereLight args={["#5c6a88", "#140a0a", 0.4]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[5.5, 7.5, 6]}
        intensity={2.05}
        color="#fff4e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
      />
      <directionalLight
        position={[-7, 5, -3]}
        intensity={0.78}
        color="#8eb0f0"
      />
      <directionalLight
        position={[0, 4, -8]}
        intensity={0.95}
        color="#ffffff"
      />
      <Suspense fallback={null}>
        {children}
        <Environment
          files={ETX_STUDIO_HDR}
          background={false}
          environmentIntensity={0.64}
        />
        <ContactShadows
          position={[0, contactShadowY, 0]}
          opacity={0.55}
          scale={contactShadowScale}
          blur={2.6}
          far={4.5}
          resolution={1024}
          color="#000000"
        />
      </Suspense>
    </>
  );
}
