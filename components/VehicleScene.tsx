"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/etx-exterior-panels.glb";
const BASE_Y_ROTATION = Math.PI;

type AnyMaterial = THREE.Material & { opacity?: number; transparent?: boolean };

export const VehicleModel = React.forwardRef<
  THREE.Group,
  React.ComponentPropsWithoutRef<"group">
>((props, ref) => {
  const { scene } = useGLTF(MODEL_PATH);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => {
              const cloned = m.clone() as AnyMaterial;
              cloned.transparent = true;
              return cloned;
            });
          } else {
            child.material = (
              child.material as AnyMaterial
            ).clone() as AnyMaterial;
            (child.material as AnyMaterial).transparent = true;
          }
        }
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const TARGET_SIZE = 6;
    if (maxDim > 0) {
      const scaleFactor = TARGET_SIZE / maxDim;
      clone.scale.multiplyScalar(scaleFactor);
    }

    const centeredBox = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    centeredBox.getCenter(center);
    clone.position.sub(center);

    return clone;
  }, [scene]);

  return (
    <group ref={ref} {...props}>
      <primitive object={clonedScene} />
    </group>
  );
});
VehicleModel.displayName = "VehicleModel";

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_PATH);
}

type ScrollData = {
  hero: number;
  metrics: number;
  urban: number;
  charging: number;
  daylight: number;
};

export const VehicleScene = ({
  scrollData,
}: {
  scrollData: React.MutableRefObject<ScrollData>;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const vehicleRef = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  const isMobileRef = useRef<boolean>(false);
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    const update = () => {
      isMobileRef.current = globalThis.window.innerWidth < 768;
      invalidate();
    };
    update();
    globalThis.window.addEventListener("resize", update, { passive: true });
    return () => globalThis.window.removeEventListener("resize", update);
  }, [invalidate]);

  const materialsRef = useRef<AnyMaterial[]>([]);
  const lastOpacityRef = useRef<number>(-1);

  useEffect(() => {
    if (!vehicleRef.current) return;
    const mats: AnyMaterial[] = [];
    vehicleRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => mats.push(m as AnyMaterial));
        } else if (mesh.material) {
          mats.push(mesh.material as AnyMaterial);
        }
      }
    });
    materialsRef.current = mats;
  });

  const smoothed = useRef({
    x: 0,
    y: 0,
    z: 0,
    scale: 0.6,
    rotationY: BASE_Y_ROTATION - Math.PI * 0.15,
    tilt: 0,
    opacity: 1,
  });

  useFrame((_state, delta) => {
    if (!groupRef.current || !vehicleRef.current) return;

    const { hero, metrics, urban, charging, daylight } = scrollData.current;
    const isMobile = isMobileRef.current;
    const mobileScaleFactor = isMobile ? 0.6 : 1;

    const heroScale = (0.75 + hero * 0.85) * mobileScaleFactor;
    const metricsScale = (1.16 - metrics * 1.28) * mobileScaleFactor;
    // Urban / "Conquer the City": keep the vehicle noticeably smaller than the legacy ~1.4–1.8 range
    const urbanScale = (0.98 - urban * 0.2) * mobileScaleFactor;
    const chargingScale = 1.25 * mobileScaleFactor;
    const daylightScale = 1.2 * mobileScaleFactor;

    let targetScale = heroScale;
    if (metrics > 0) targetScale = metricsScale;
    if (urban > 0) targetScale = urbanScale;
    if (charging > 0) targetScale = chargingScale;
    if (daylight > 0) targetScale = daylightScale;

    const metricsX = 5 + metrics * 9;
    const urbanX = 14 - urban * 18;

    let chargingX: number;
    if (charging < 0.35) {
      const t = charging / 0.35;
      chargingX = -18 + t * 18;
    } else if (charging < 0.65) {
      const t = (charging - 0.35) / 0.3;
      chargingX = 0 + t * 3;
    } else {
      const t = (charging - 0.65) / 0.35;
      const ease = t * t;
      chargingX = 3 + ease * 26;
    }
    const daylightX = -35 + daylight * 70;

    let targetX = 0;
    if (metrics > 0) targetX = metricsX;
    if (urban > 0) targetX = urbanX;
    if (charging > 0) targetX = chargingX;
    if (daylight > 0) targetX = daylightX;

    let targetY = 0;
    const heroZ = hero * 2.5;
    const metricsZ = 2.5 + metrics * 4.5;
    const urbanZ = 7 - urban * 5.5;
    const chargingZ = 1.2;
    const daylightZ = 0;

    let targetZ = heroZ;
    if (metrics > 0) targetZ = metricsZ;
    if (urban > 0) targetZ = urbanZ;
    if (charging > 0) targetZ = chargingZ;
    if (daylight > 0) targetZ = daylightZ;

    const initialRotation = BASE_Y_ROTATION - Math.PI * 0.15;
    const heroRotationY = hero * Math.PI * 0.5 + initialRotation;
    const metricsRotationY = heroRotationY - metrics * (Math.PI / 4);
    const urbanRotationY = BASE_Y_ROTATION - Math.PI * 0.5;
    const chargingRotationY = BASE_Y_ROTATION;
    const daylightRotationY = BASE_Y_ROTATION + Math.PI * 0.5;

    let targetRotationY = heroRotationY;
    if (metrics > 0) targetRotationY = metricsRotationY;
    if (urban > 0) targetRotationY = urbanRotationY;
    if (charging > 0) targetRotationY = chargingRotationY;
    if (daylight > 0) targetRotationY = daylightRotationY;

    let urbanTilt = 0;
    if (urban > 0 && urban < 1) urbanTilt = Math.sin(urban * Math.PI) * -0.06;
    let targetTilt = charging > 0 ? 0 : urbanTilt;

    let targetOpacity = 1;
    if (charging > 0.82)
      targetOpacity = Math.max(0, 1 - (charging - 0.82) / 0.18);
    if (daylight > 0) targetOpacity = 1;
    if (daylight > 0.9) targetOpacity = Math.max(0, 1 - (daylight - 0.9) * 10);

    if (
      isMobile &&
      urban === 0 &&
      charging === 0 &&
      daylight === 0 &&
      metrics === 0
    ) {
      targetX = 0;
      const hy = hero * hero;
      targetY = THREE.MathUtils.lerp(0.38, 0.52, hy);
      // Stronger Z = reads as driving toward the camera through the hero scrub
      targetZ = THREE.MathUtils.lerp(0.45, 4.35, hero);
      targetScale = THREE.MathUtils.lerp(0.78, 1.14, hero);
      targetTilt = 0;
      // Avoid large in-place yaw during hero on mobile (was π/2 via heroRotationY)
      targetRotationY = initialRotation + hero * 0.2;
    }

    const mobileMetricsArc = isMobile && metrics > 0 && urban === 0;
    if (mobileMetricsArc) {
      const t = THREE.MathUtils.clamp(metrics, 0, 1);
      const ease = (u: number) => u * u * (3 - 2 * u);

      // Continuity with mobile hero end (hero pegged at 1 while metrics runs)
      const startX = 0;
      const startY = 0.52;
      const startZ = 4.35;
      const startS = 1.14;
      const startYaw = initialRotation + 0.2;

      // Bottom-right on screen ≈ +X, −Y in default camera space; stable 3/4 view
      const restX = 3.85;
      const restY = -2.75;
      const restZ = 5.45;
      const restS = 0.9;
      const restYaw = BASE_Y_ROTATION - Math.PI * 0.28;

      const exitX = 14.5;
      const exitY = -3.05;
      const exitZ = 6.85;
      const exitS = 0.38;

      const tToCorner = 0.3;
      const tRestEnd = 0.55;

      if (t < tToCorner) {
        const u = ease(t / tToCorner);
        targetX = THREE.MathUtils.lerp(startX, restX, u);
        targetY = THREE.MathUtils.lerp(startY, restY, u);
        targetZ = THREE.MathUtils.lerp(startZ, restZ, u);
        targetScale = THREE.MathUtils.lerp(startS, restS, u);
        targetRotationY = THREE.MathUtils.lerp(startYaw, restYaw, u);
      } else if (t < tRestEnd) {
        targetX = restX;
        targetY = restY;
        targetZ = restZ;
        targetScale = restS;
        targetRotationY = restYaw;
      } else {
        const u = ease((t - tRestEnd) / (1 - tRestEnd));
        targetX = THREE.MathUtils.lerp(restX, exitX, u);
        targetY = THREE.MathUtils.lerp(restY, exitY, u);
        targetZ = THREE.MathUtils.lerp(restZ, exitZ, u);
        targetScale = THREE.MathUtils.lerp(restS, exitS, u);
        targetRotationY = restYaw;
      }

      targetTilt = 0;

      // Fade out as it leaves frame (urban section brings opacity back up)
      if (t > 0.72) {
        const u = (t - 0.72) / 0.28;
        targetOpacity = Math.max(0, 1 - ease(u));
      }
    }

    // Urban / "Conquer the City" on mobile: same right→left X drive, but negative
    // world Y keeps the pass along the bottom third (positive Y was center-screen).
    const mobileUrban =
      isMobile && urban > 0 && charging === 0 && daylight === 0;
    if (mobileUrban) {
      targetX = urbanX;
      targetY = THREE.MathUtils.lerp(-1.92, -2.55, urban);
      targetZ = THREE.MathUtils.lerp(1.65, 1.35, urban);
      targetScale = urbanScale;
      targetRotationY = urbanRotationY;
      targetTilt = 0;
    }

    const dt = Math.min(delta, 0.05);
    const damp = (current: number, target: number, lambda: number) =>
      THREE.MathUtils.damp(current, target, lambda, dt);

    smoothed.current.x = damp(smoothed.current.x, targetX, 9);
    smoothed.current.y = damp(smoothed.current.y, targetY, 9);
    smoothed.current.z = damp(smoothed.current.z, targetZ, 9);
    smoothed.current.scale = damp(smoothed.current.scale, targetScale, 10);
    smoothed.current.rotationY = damp(
      smoothed.current.rotationY,
      targetRotationY,
      9,
    );
    smoothed.current.tilt = damp(smoothed.current.tilt, targetTilt, 9);
    smoothed.current.opacity = damp(
      smoothed.current.opacity,
      targetOpacity,
      12,
    );

    const g = groupRef.current;
    g.position.x = smoothed.current.x;
    g.position.y = smoothed.current.y;
    g.position.z = smoothed.current.z;

    const v = vehicleRef.current;
    v.scale.setScalar(smoothed.current.scale);
    v.rotation.y = smoothed.current.rotationY;
    v.rotation.z = smoothed.current.tilt;

    const o = smoothed.current.opacity;
    if (Math.abs(o - lastOpacityRef.current) > 0.005) {
      const mats = materialsRef.current;
      for (let i = 0; i < mats.length; i++) {
        const mat = mats[i];
        mat.opacity = o;
        mat.transparent = true;
      }
      lastOpacityRef.current = o;
    }
  });

  return (
    <group ref={groupRef}>
      <VehicleModel ref={vehicleRef} />
    </group>
  );
};
