"use client";

import * as THREE from "three";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ContactShadows, Environment } from "@react-three/drei";
import { useWebGLBudget } from "@/components/WebGLBudgetContext";

/** Self-hosted studio HDR (CSP; same as @react-three/drei `studio` feel). */
export const ETX_STUDIO_HDR = "/hdr/studio_small_03_1k.hdr" as const;

export const ETX_STUDIO_DPR: [number, number] = [1, 1.6];

/** Aligned with `ETXHeroScene` (About) — use on every ETX `Canvas` for a consistent look. */
export function etxStudioGlProps(
  overrides?: Partial<{
    antialias: boolean;
    toneMappingExposure: number;
    powerPreference: "default" | "high-performance" | "low-power";
    dpr: number;
    precision: "lowp" | "mediump" | "highp";
    failIfMajorPerformanceCaveat: boolean;
    alpha: boolean;
  }> & { stencil?: boolean; depth?: boolean },
) {
  const isLow = overrides?.powerPreference === "low-power";
  return {
    antialias: isLow ? false : (overrides?.antialias ?? true),
    powerPreference: (overrides?.powerPreference ?? "high-performance") as any,
    precision: isLow ? "lowp" : (overrides?.precision ?? "highp"),
    alpha: true,
    stencil: false,
    depth: true,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: overrides?.toneMappingExposure ?? 0.96,
    /** iOS is stricter about lost contexts if this fails — default false in three.js */
    failIfMajorPerformanceCaveat: isLow,
    ...overrides,
  };
}

type EtxStudioRigProps = Readonly<{
  children: ReactNode;
  /** World Y for the contact-shadow plane; tune per layout if the ground reads off. */
  contactShadowY?: number;
  contactShadowScale?: number;
  /** Force lighter lights/shadows (otherwise follows `WebGLBudgetProvider`). */
  lowPower?: boolean;
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
  lowPower: lowPowerProp,
}: EtxStudioRigProps) {
  const { lowPower: fromBudget } = useWebGLBudget();
  const lowPower = lowPowerProp ?? fromBudget;
  const shadowMap = lowPower ? 512 : 2048;
  const contactRes = lowPower ? 256 : 1024;
  const envIntensity = lowPower ? 0.52 : 0.64;

  return (
    <>
      <hemisphereLight args={["#5c6a88", "#140a0a", 0.4]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[5.5, 7.5, 6]}
        intensity={2.05}
        color="#fff4e6"
        castShadow
        shadow-mapSize-width={shadowMap}
        shadow-mapSize-height={shadowMap}
        shadow-bias={-0.0002}
      />
      {!lowPower && (
        <>
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
        </>
      )}
      <Suspense fallback={null}>
        {children}
        <Environment
          files={!lowPower ? ETX_STUDIO_HDR : undefined}
          preset={lowPower ? "city" : undefined}
          background={false}
          environmentIntensity={envIntensity}
        />
        {!lowPower && (
          <ContactShadows
            position={[0, contactShadowY, 0]}
            opacity={0.55}
            scale={contactShadowScale}
            blur={2.6}
            far={4.5}
            resolution={1024}
            color="#000000"
          />
        )}
      </Suspense>
    </>
  );
}
