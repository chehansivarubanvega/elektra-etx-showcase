"use client";

import React, {createContext, useContext, useLayoutEffect, useState} from "react";
export type WebGLBudget = {
  /** Cap GPU load on phones / tablets (limited WebGL context pool on iOS). */
  lowPower: boolean;
  /** Device pixel ratio range passed to R3F `Canvas` `dpr`. */
  dpr: [number, number];
  /** Allow MSAA; off on low-power to reduce memory and driver strain. */
  antialias: boolean;
};

const DEFAULT_BUDGET: WebGLBudget = {
  lowPower: true,
  dpr: [1, 1],
  antialias: false,
};

const Ctx = createContext<WebGLBudget>(DEFAULT_BUDGET);

/**
 * Tightens DPR, disables MSAA, and allows `EtxStudioRig` to use lighter shadows
 * on narrow viewports, coarse pointers, and low-RAM devices — reduces iOS
 * WebGL OOM / tab crashes.
 */
export function WebGLBudgetProvider({children}: {children: React.ReactNode}) {
  const [budget, setBudget] = useState<WebGLBudget>(DEFAULT_BUDGET);

  useLayoutEffect(() => {
    const apply = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const nav = navigator as Navigator & {deviceMemory?: number};
      const mem = nav.deviceMemory;
      const low =
        w <= 820 || coarse || (typeof mem === "number" && mem > 0 && mem < 8);
      
      // Force 1.0 on mobile to avoid GPU saturation.
      // High-end desktop capped at 1.5 for performance.
      const maxDpr = low ? 1.0 : 1.5;
      
      setBudget({
        lowPower: low,
        dpr: [1, maxDpr] as [number, number],
        antialias: !low,
      });
    };

    apply();
    window.addEventListener("resize", apply);
    const mqc = window.matchMedia("(pointer: coarse)");
    mqc.addEventListener("change", apply);
    return () => {
      window.removeEventListener("resize", apply);
      mqc.removeEventListener("change", apply);
    };
  }, []);

  return <Ctx.Provider value={budget}>{children}</Ctx.Provider>;
}

export function useWebGLBudget(): WebGLBudget {
  return useContext(Ctx);
}

export function useTabVisibleFrameloop(orbitOrActive: boolean) {
  const [mode, setMode] = useState<"always" | "demand">(() => {
    if (typeof document === "undefined") return "demand";
    if (document.hidden) return "demand";
    return orbitOrActive ? "always" : "demand";
  });
  useLayoutEffect(() => {
    const sync = () => {
      if (document.hidden) {
        setMode("demand");
        return;
      }
      setMode(orbitOrActive ? "always" : "demand");
    };
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => document.removeEventListener("visibilitychange", sync);
  }, [orbitOrActive]);
  return mode;
}
