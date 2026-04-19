"use client";

import React, { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";

const funnyPhrases = [
  "Waking up the engine hamsters...",
  "Charging the flux capacitor...",
  "Polishing the cyber-paint...",
  "Downloading more horsepower...",
  "Bargaining with your GPU...",
  "Attaching digital wheels...",
  "Checking blinker fluid levels...",
  "Calibrating the aerodynamic swoosh...",
  "Warming up the pixels...",
  "Almost ready to conquer the city...",
];

// Module-scoped flag: once the hero loader has completed in this session, we
// don't show it again on subsequent revisits to "/". The GLB is cached via
// useGLTF.preload, so re-mounts hit the cache and drei's useProgress can
// report stale 0% values (it shares THREE.DefaultLoadingManager state with
// other 3D scenes on the site, and saveLastTotalLoaded gets clobbered when
// other pages load assets — see drei's Progress.js).
let hasCompletedOnce = false;

// Grace window: if no real loading activity happens within this window after
// the loader mounts, assume the model is cached and hide. This is the
// safety-net for the race where progress is stuck at 0 because nothing new
// is actually loading.
const IDLE_TIMEOUT_MS = 1200;

export const Loader = () => {
  const { progress, active, total } = useProgress();
  const [textIndex, setTextIndex] = useState(0);
  const [mounted, setMounted] = useState(!hasCompletedOnce);
  const lockedRef = useRef(false);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % funnyPhrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!lockedRef.current) {
      lockedRef.current = true;
      document.body.style.overflow = "hidden";
      globalThis.scrollTo(0, 0);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mounted]);

  // Idle-timeout safety net: if nothing is actively loading shortly after
  // mount (cached navigation), unstick the loader regardless of the
  // reported progress value.
  useEffect(() => {
    if (!mounted) return;
    if (active) return;
    const t = setTimeout(() => {
      if (!active) {
        hasCompletedOnce = true;
        if (!unlockedRef.current) {
          unlockedRef.current = true;
          document.body.style.overflow = "";
        }
        setMounted(false);
      }
    }, IDLE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [mounted, active, total]);

  useEffect(() => {
    if (progress < 100) return;
    if (!unlockedRef.current) {
      unlockedRef.current = true;
      document.body.style.overflow = "";
    }
    const t = setTimeout(() => {
      hasCompletedOnce = true;
      setMounted(false);
    }, 1000);
    return () => clearTimeout(t);
  }, [progress]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] bg-[#000000] flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${
        progress >= 100
          ? "opacity-0 pointer-events-none"
          : "opacity-100 pointer-events-auto"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[min(340px,calc(100%-2rem))] flex-col items-center px-4 text-center">
        {/* <div className="text-[#FF6B00] text-7xl mb-8 animate-bounce">⚡</div> */}

        <div className="h-8 mb-6 flex items-center justify-center">
          <p className="text-white font-mono text-[11px] tracking-[0.2em] uppercase animate-pulse">
            {funnyPhrases[textIndex]}
          </p>
        </div>

        <div className="w-full bg-white/10 h-[2px] rounded-full overflow-hidden mb-4 relative flex items-center">
          <div
            className="absolute top-0 left-0 h-full bg-[#FF6B00] transition-all duration-300 ease-out shadow-[0_0_15px_rgba(255,107,0,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-white/40 font-mono text-[10px] tracking-[0.3em]">
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  );
};
