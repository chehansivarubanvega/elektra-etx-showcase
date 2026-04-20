"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGLTF, useProgress } from "@react-three/drei";
import {
  ETX_EXTERIOR_GLB,
  preloadHeroBackgroundImages,
} from "@/lib/site-assets";

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

/** Once the hero loader has finished in this session, skip it on repeat mounts of "/". */
let hasCompletedOnce = false;

/** Short beat after 100% so the bar reads “done” without delaying the model. */
const POST_PROGRESS_HOLD_MS = 420;

/**
 * Covers drei's progress stuck at 0% after LoadingManager state was clobbered
 * elsewhere — only after we know THREE saw real activity and we're not mid-decode.
 */
const STALE_PROGRESS_SETTLE_MS = 1100;

const MAX_WAIT_MS = 45_000;

export const Loader = () => {
  const { progress, active, total } = useProgress();
  const [textIndex, setTextIndex] = useState(0);
  const [mounted, setMounted] = useState(!hasCompletedOnce);
  /** Fade overlay when exiting via stale progress path (progress never hits 100). */
  const [staleFadeOut, setStaleFadeOut] = useState(false);
  const lockedRef = useRef(false);
  const unlockedRef = useRef(false);
  const loadingActivitySeenRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % funnyPhrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasCompletedOnce) return;
    useGLTF.preload(ETX_EXTERIOR_GLB);
    void preloadHeroBackgroundImages();
  }, []);

  /** Skip-loader visits: fire after listeners attach (child effects run before parent). */
  useEffect(() => {
    if (!hasCompletedOnce) return;
    queueMicrotask(() => {
      globalThis.dispatchEvent(new Event("elektra-hero-ready"));
    });
  }, []);

  useEffect(() => {
    if (active || total > 0 || progress > 0) {
      loadingActivitySeenRef.current = true;
    }
  }, [active, total, progress]);

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

  const finish = () => {
    if (!unlockedRef.current) {
      unlockedRef.current = true;
      document.body.style.overflow = "";
    }
    hasCompletedOnce = true;
    setMounted(false);
    globalThis.dispatchEvent(new Event("elektra-hero-ready"));
  };

  useEffect(() => {
    if (!mounted || hasCompletedOnce) return;
    const t = setTimeout(() => finish(), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (active) return;
    if (!loadingActivitySeenRef.current) return;
    if (progress >= 100) return;
    if (progress > 0 && progress < 100) return;

    const t = setTimeout(() => {
      if (active) return;
      if (progress >= 100) return;
      if (progress > 0 && progress < 100) return;
      setStaleFadeOut(true);
      setTimeout(() => finish(), POST_PROGRESS_HOLD_MS);
    }, STALE_PROGRESS_SETTLE_MS);
    return () => clearTimeout(t);
  }, [mounted, active, progress, total]);

  useEffect(() => {
    if (progress < 100) return;
    if (!unlockedRef.current) {
      unlockedRef.current = true;
      document.body.style.overflow = "";
    }
    const t = setTimeout(() => finish(), POST_PROGRESS_HOLD_MS);
    return () => clearTimeout(t);
  }, [progress]);

  if (!mounted) return null;

  const visuallyReady = progress >= 100 || staleFadeOut;

  return (
    <div
      data-elektra-loader="1"
      className={`fixed inset-0 z-[10000] bg-[#000000] flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${
        visuallyReady
          ? "opacity-0 pointer-events-none"
          : "opacity-100 pointer-events-auto"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[min(340px,calc(100%-2rem))] flex-col items-center px-4 text-center">
        <div className="h-8 mb-6 flex items-center justify-center">
          <p className="text-white font-mono text-[11px] tracking-[0.2em] uppercase animate-pulse">
            {funnyPhrases[textIndex]}
          </p>
        </div>

        <div className="w-full bg-white/10 h-[2px] rounded-full overflow-hidden mb-4 relative flex items-center">
          <div
            className="absolute top-0 left-0 h-full bg-[#FF6B00] transition-all duration-300 ease-out shadow-[0_0_15px_rgba(255,107,0,0.8)]"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className="text-white/40 font-mono text-[10px] tracking-[0.3em]">
          {Math.floor(Math.min(100, progress))}%
        </div>
      </div>
    </div>
  );
};
