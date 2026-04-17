"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/etx-exterior-panels.glb";
const BASE_Y_ROTATION = Math.PI;

export const VehicleModel = React.forwardRef<THREE.Group, any>((props, ref) => {
  const { scene } = useGLTF(MODEL_PATH);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => {
              const cloned = m.clone();
              cloned.transparent = true;
              return cloned;
            });
          } else {
            child.material = child.material.clone();
            child.material.transparent = true;
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

export const VehicleScene = ({
  scrollData,
}: {
  scrollData: React.MutableRefObject<{
    hero: number;
    metrics: number;
    urban: number;
    charging: number;
    daylight: number;
  }>;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const vehicleRef = useRef<THREE.Group>(null);

  // Internal state for smoothed values
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

    // 1. Calculate Target Scales
    const isMobile = window.innerWidth < 768;
    const mobileScaleFactor = isMobile ? 0.6 : 1;

    const heroScale = (0.75 + hero * 0.85) * mobileScaleFactor;
    // Elite Performance (metrics): shrink and rotate clockwise (decreasing rotation.y); z matches urban handoff
    const metricsScale = (1.6 - metrics * 1.28) * mobileScaleFactor;
    const urbanScale = (1.8 - urban * 0.4) * mobileScaleFactor;
    const chargingScale = 1.25 * mobileScaleFactor;
    const daylightScale = 1.2 * mobileScaleFactor;

    let targetScale = heroScale;
    if (metrics > 0) targetScale = metricsScale;
    if (urban > 0) targetScale = urbanScale;
    if (charging > 0) targetScale = chargingScale;
    if (daylight > 0) targetScale = daylightScale;

    // 2. Target Positions
    // Bias right so the model clears the Elite Performance copy (still ends ~14 for urban handoff)
    const metricsX = 5 + metrics * 9;
    const urbanX = 14 - urban * 18; // Metrics -> Urban
    // Transition drive-by: enter from left → hold in scene → exit right
    let chargingX: number;
    if (charging < 0.35) {
      // Phase 1: enter from off-screen left, decelerate into center
      const t = charging / 0.35;
      chargingX = -18 + t * 18; // -18 → 0
    } else if (charging < 0.65) {
      // Phase 2: linger in scene with slight forward drift
      const t = (charging - 0.35) / 0.3;
      chargingX = 0 + t * 3; // 0 → 3 (subtle drift)
    } else {
      // Phase 3: accelerate and exit off-screen right
      const t = (charging - 0.65) / 0.35;
      const ease = t * t; // quadratic ease-in for acceleration feel
      chargingX = 3 + ease * 26; // 3 → 29 (exit right)
    }
    const daylightX = -35 + daylight * 70; // Enter from Left (-35) -> Drive to Right (35)

    let targetX = 0;
    if (metrics > 0) targetX = metricsX;
    if (urban > 0) targetX = urbanX;
    if (charging > 0) targetX = chargingX;
    if (daylight > 0) targetX = daylightX;

    // Smooth Y dip
    const targetY = charging > 0 || daylight > 0 ? 0 : 0;
    const heroZ = hero * 2.5; // Push towards camera
    const metricsZ = 2.5 + metrics * 4.5; // Match urban entry z at metrics=1 (urban uses z from 7)
    const urbanZ = 7 - urban * 5.5; // Pull back during urban transition
    const chargingZ = 1.2;
    const daylightZ = 0;

    let targetZ = heroZ;
    if (metrics > 0) targetZ = metricsZ;
    if (urban > 0) targetZ = urbanZ;
    if (charging > 0) targetZ = chargingZ;
    if (daylight > 0) targetZ = daylightZ;

    // 3. Target Rotations & Tilt
    const initialRotation = BASE_Y_ROTATION - Math.PI * 0.15;
    const heroRotationY = hero * Math.PI * 0.5 + initialRotation;
    const metricsRotationY = heroRotationY - metrics * (Math.PI / 4);
    const urbanRotationY = BASE_Y_ROTATION - Math.PI * 0.5; // Fixed heading for urban section
    const chargingRotationY = BASE_Y_ROTATION; // Fixed 180deg heading for straight drive
    // In daylight drive-by, the side profile should be prominent (90 degree rotation)
    const daylightRotationY = BASE_Y_ROTATION + Math.PI * 0.5;

    let targetRotationY = heroRotationY;
    if (metrics > 0) targetRotationY = metricsRotationY;
    if (urban > 0) targetRotationY = urbanRotationY;
    if (charging > 0) targetRotationY = chargingRotationY;
    if (daylight > 0) targetRotationY = daylightRotationY;

    // Lean into the urban section
    const targetTilt =
      charging > 0
        ? 0
        : urban > 0 && urban < 1
          ? Math.sin(urban * Math.PI) * -0.06
          : 0;

    // Opacity management
    let targetOpacity = 1;
    // Charging transition: stay fully visible; fade only as it exits off-screen right
    if (charging > 0.82)
      targetOpacity = Math.max(0, 1 - (charging - 0.82) / 0.18);
    if (daylight > 0) targetOpacity = 1;
    if (daylight > 0.9) targetOpacity = Math.max(0, 1 - (daylight - 0.9) * 10);

    // 4. Apply Smoothing (Lerp)
    const lerpFactor = 1 - Math.exp(-10 * delta);

    smoothed.current.x = THREE.MathUtils.lerp(
      smoothed.current.x,
      targetX,
      lerpFactor,
    );
    smoothed.current.y = THREE.MathUtils.lerp(
      smoothed.current.y,
      targetY,
      lerpFactor,
    );
    smoothed.current.z = THREE.MathUtils.lerp(
      smoothed.current.z,
      targetZ,
      lerpFactor,
    );
    smoothed.current.scale = THREE.MathUtils.lerp(
      smoothed.current.scale,
      targetScale,
      lerpFactor,
    );
    smoothed.current.rotationY = THREE.MathUtils.lerp(
      smoothed.current.rotationY,
      targetRotationY,
      lerpFactor,
    );
    smoothed.current.tilt = THREE.MathUtils.lerp(
      smoothed.current.tilt,
      targetTilt,
      lerpFactor,
    );
    smoothed.current.opacity = THREE.MathUtils.lerp(
      smoothed.current.opacity,
      targetOpacity,
      lerpFactor,
    );

    // 5. Apply to Refs
    groupRef.current.position.x = smoothed.current.x;
    groupRef.current.position.y = smoothed.current.y;
    groupRef.current.position.z = smoothed.current.z;
    vehicleRef.current.scale.setScalar(smoothed.current.scale);
    vehicleRef.current.rotation.y = smoothed.current.rotationY;
    vehicleRef.current.rotation.z = smoothed.current.tilt;

    // Update mesh opacity directly across all internal materials
    if (vehicleRef.current) {
      vehicleRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          // If the material is an array (multi-materials)
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.opacity = smoothed.current.opacity;
              mat.transparent = true;
            });
          } else {
            child.material.opacity = smoothed.current.opacity;
            child.material.transparent = true;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <VehicleModel ref={vehicleRef} />
    </group>
  );
};
