"use client";

/**
 * ETXExperience — Parent controller for the ETX homepage.
 *
 * Responsibilities:
 *  1. Owns the GSAP master timeline + ScrollTrigger pin that orchestrates all
 *     5 hero sub-stages (Hero → Metrics → Urban → Charging → Daylight).
 *  2. Owns the `scrollData` ref consumed by `VehicleScene` every R3F frame.
 *  3. Renders the Three.js Canvas (EtxStudioRig + VehicleScene).
 *  4. Composes the DOM overlay layers (BackgroundLayers, HeroHud, sidebars).
 *  5. Lazy-loads DesignEngineering, CargoSketchSection, InteractiveStudio.
 *  6. Applies the global film-grain overlay and orange frame chrome.
 *
 * Architecture rule: this file owns *wiring*. Visual JSX lives in
 * `HeroOverlays.tsx`; 3D kinematics live in `VehicleScene.tsx`.
 */

import React, { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { EtxStudioRig, etxStudioGlProps } from "@/components/EtxStudioRig";
import {
  useTabVisibleFrameloop,
  useWebGLBudget,
} from "@/components/WebGLBudgetContext";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { VehicleScene } from "@/components/VehicleScene";
import { Loader } from "@/components/Loader";
import SnapController from "@/components/SnapController";
import { CanvasErrorBoundary } from "@/components/CanvasErrorBoundary";
import {
  optimizeVehicle,
} from "@/lib/etx-vehicle-materials";
import { scheduleHomeScrollSequencesWarmup } from "@/lib/site-assets";
import type { ScrollData } from "@/types/scroll-data";
import {
  BackgroundLayers,
  HeroHud,
  MetricsSidebar,
  UrbanSidebar,
  DaylightSidebar,
} from "./HeroOverlays";

// ── Dynamically imported sections (code-split; load after hero) ──────────────
const DesignEngineering = dynamic(
  () => import("@/components/DesignEngineering"),
  { loading: () => null }
);
const CargoSketchSection = dynamic(
  () => import("@/components/CargoSketchSection"),
  { loading: () => null }
);
const InteractiveStudio = dynamic(
  () => import("@/components/InteractiveStudio"),
  { loading: () => null }
);

// ── Plugin registration (client-only) ────────────────────────────────────────
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Smoothstep S-curve [0, 1] → [0, 1].
 * Applied to every channel so section boundaries ease in and ease out —
 * the vehicle never stops abruptly, it "glides" between states.
 */
function sm(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Hero pin end position — responsive.
 * Desktop: 500 % viewport (5 full screens of scroll for the 5 sub-stages).
 * Mobile:  235 % (compressed but still drives all 5 stages).
 */
function heroPinEnd(): string {
  if (typeof globalThis.window === "undefined") return "+=500%";
  return globalThis.window.matchMedia("(max-width: 767px)").matches
    ? "+=235%"
    : "+=500%";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ETXExperience() {
  // ── WebGL budget (DPR cap, MSAA, power mode) ─────────────────────────────
  const { dpr, antialias, lowPower } = useWebGLBudget();
  const gl = useMemo(
    () =>
      etxStudioGlProps({
        antialias,
        powerPreference: lowPower ? "low-power" : "high-performance",
        precision: lowPower ? "mediump" : "highp",
        failIfMajorPerformanceCaveat: false,
      }),
    [antialias, lowPower]
  );
  const frameloop = useTabVisibleFrameloop(true);

  // ── Shared refs ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * The 5-channel scroll data bus.
   * Written by the GSAP ScrollTrigger `onUpdate` callback (below).
   * Read by `VehicleScene.useFrame` every animation frame.
   * Using a ref (not state) keeps updates off the React scheduler — zero re-renders.
   */
  const scrollData = useRef<ScrollData>({
    hero: 0,
    metrics: 0,
    urban: 0,
    charging: 0,
    daylight: 0,
    velocity: 0,
  });

  /**
   * Normalized mouse position (−1…1) for cursor-follow micro-rotations.
   * Updated via pointermove on the hero section. Passed to VehicleScene.
   */
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // ── Sequence warmup (fires after 3D hero signals ready) ──────────────────
  useEffect(() => {
    const onHeroReady = () => scheduleHomeScrollSequencesWarmup();
    globalThis.addEventListener("elektra-hero-ready", onHeroReady);
    return () =>
      globalThis.removeEventListener("elektra-hero-ready", onHeroReady);
  }, []);

  // ── Master GSAP Timeline ──────────────────────────────────────────────────
  useGSAP(
    () => {
      if (!containerRef.current) return;

      ScrollTrigger.config({ ignoreMobileResize: false });
      /** Smoothing so scrub motion doesn't stutter on trackpads / touch. */
      gsap.ticker.lagSmoothing(720, 30);

      const mainTl = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        scrollTrigger: {
          id: "etx-hero-pin",
          trigger: containerRef.current,
          start: "top top",
          end: heroPinEnd,
          /**
           * scrub: 0.8 — GSAP timeline lags 0.8 s behind scroll position.
           * Higher value = more inertia = calmer section-to-section flow.
           */
          scrub: 0.8,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
          preventOverlaps: true,

          /**
           * The 5-Channel System.
           * Progress (0→1) is sliced into 5 non-overlapping windows, each
           * run through the smoothstep S-curve so transitions ease in/out.
           */
          onUpdate: (self) => {
            const p = self.progress;

            // Stage 1 — Hero:    0.00 → 0.20
            scrollData.current.hero = sm(gsap.utils.clamp(0, 1, p * 5));

            // Stage 2 — Metrics: 0.20 → 0.40
            scrollData.current.metrics = sm(
              gsap.utils.clamp(0, 1, (p - 0.2) * 5)
            );

            // Stage 3 — Urban:   0.40 → 0.60  (extra snap ramp at the boundary)
            const urbanLinear = (p - 0.4) * 5;
            const urbanSnapRamp = (p - 0.4) / 0.1;
            scrollData.current.urban = sm(
              gsap.utils.clamp(0, 1, Math.max(urbanLinear, urbanSnapRamp))
            );

            // Stage 4 — Charging: 0.60 → 0.80
            scrollData.current.charging = sm(
              gsap.utils.clamp(0, 1, (p - 0.6) * 5)
            );

            // Stage 5 — Daylight: 0.80 → 1.00
            scrollData.current.daylight = sm(
              gsap.utils.clamp(0, 1, (p - 0.8) * 5)
            );

            // Velocity — normalized: px/s clamped to [0, 1] for lean + FOV warp.
            const rawVel = Math.abs(self.getVelocity());
            scrollData.current.velocity = gsap.utils.clamp(
              0,
              1,
              rawVel / 3000
            );
          },
        },
      });

      // ── Stage 1: Hero — dissolve HUD & ETX embossed text ─────────────────
      mainTl.to(".hero-hud", {
        autoAlpha: 0,
        y: -30,
        duration: 1,
        ease: "power2.inOut",
      });
      mainTl.to(
        ".bg-text",
        {
          autoAlpha: 0,
          scale: 3,
          force3D: true,
          duration: 1.5,
          ease: "power2.in",
        },
        "<" // simultaneous with hero-hud exit
      );

      // ── Stage 2: Metrics — spec card + background photo entrance ─────────
      mainTl.fromTo(
        ".metrics-sidebar",
        { autoAlpha: 0, x: 50 },
        { autoAlpha: 1, x: 0, pointerEvents: "auto", duration: 1.5 },
        ">"
      );
      mainTl.fromTo(
        ".metrics-bg",
        { autoAlpha: 0, scale: 1.08 },
        { autoAlpha: 0.7, scale: 1, duration: 1.5, ease: "power2.out" },
        "<"
      );
      mainTl.fromTo(
        ".metric-item",
        { autoAlpha: 0, x: -30 },
        { autoAlpha: 1, x: 0, stagger: 0.1, duration: 0.8 },
        "<0.5" // 0.5 s after the card starts fading in
      );

      // ── Stage 2 → 3: Metrics hold, then exit left ────────────────────────
      mainTl.to(".metrics-bg", { autoAlpha: 0.7, duration: 3.5 }, ">");

      // ── Cinematic: Vignette darkening during metrics ─────────────────────
      // Radial gradient edges darken to create a cinematic "focus" frame.
      mainTl.to(
        ".vignette-overlay",
        { autoAlpha: 0.85, duration: 1.5, ease: "power2.inOut" },
        "<"
      );
      mainTl.to(
        ".metrics-sidebar",
        { autoAlpha: 0, x: -50, duration: 1.35, ease: "expo.inOut" },
        "+=0.5"
      );
      mainTl.to(
        ".metrics-bg",
        {
          autoAlpha: 0,
          scale: 1.04,
          duration: 1.9,
          ease: "expo.inOut",
          force3D: true,
        },
        "<"
      );

      // Fade out vignette as we leave metrics
      mainTl.to(
        ".vignette-overlay",
        { autoAlpha: 0, duration: 1, ease: "power2.out" },
        "<"
      );

      // ── Stage 3: Urban — city photo + "Conquer the City" card ────────────
      mainTl.fromTo(
        ".urban-bg-image",
        { autoAlpha: 0, scale: 1.16, yPercent: 8 },
        {
          autoAlpha: 0.78,
          scale: 1,
          yPercent: 0,
          duration: 1.8,
          ease: "power4.out",
          force3D: true,
        },
        "<0.1"
      );
      mainTl.fromTo(
        ".urban-bg-overlay, .urban-bg-glow",
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 1.4, ease: "power2.out", force3D: true },
        "<"
      );
      mainTl.fromTo(
        ".urban-sidebar",
        { autoAlpha: 0, x: 50 },
        { autoAlpha: 1, x: 0, pointerEvents: "auto", duration: 1.5 },
        ">"
      );
      mainTl.fromTo(
        ".urban-text-stagger",
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, stagger: 0.1, duration: 1 },
        "<0.5"
      );

      // ── Stage 3 → 4: Urban exit ───────────────────────────────────────────
      mainTl.to(
        ".urban-sidebar",
        { autoAlpha: 0, x: 100, duration: 1.15, ease: "expo.inOut" },
        "+=1.1"
      );
      mainTl.to(
        ".urban-bg-image",
        {
          autoAlpha: 0,
          scale: 1.04,
          yPercent: -3,
          duration: 1.15,
          ease: "expo.inOut",
          force3D: true,
        },
        "<"
      );
      mainTl.to(
        ".urban-bg-overlay, .urban-bg-glow",
        { autoAlpha: 0, duration: 1.15, ease: "expo.inOut" },
        "<"
      );

      /**
       * ── Stage 4: Charging — 3D-ONLY BEAT ─────────────────────────────────
       * No UI tweens here. The VehicleScene performs the Charging Rocket:
       *   Enter from X=−18 → pause at center → rocket to X=+29 → fade out.
       * The 2.5 s breath gives the model time to complete the traverse before
       * the Daylight flood begins.
       */
      mainTl.to({}, { duration: 2.5 });

      // ── Cinematic: Ghost trail streak during charging rocket exit ────────
      // An orange horizontal streak that slides across as the model rockets away.
      mainTl.fromTo(
        ".ghost-trail",
        { autoAlpha: 0, xPercent: -120 },
        {
          autoAlpha: 0.6,
          xPercent: 120,
          duration: 1.2,
          ease: "power4.in",
        },
        "<1.5" // fires in the back half of the charging breath
      );
      mainTl.to(".ghost-trail", {
        autoAlpha: 0,
        duration: 0.3,
        ease: "power2.out",
      });

      // ── Stage 5: Daylight — cream flood + "Freedom Defined" ───────────────
      mainTl.to(
        ".daylight-flood",
        { autoAlpha: 1, duration: 1.65, ease: "expo.inOut" },
        ">"
      );
      mainTl.fromTo(
        ".daylight-sidebar",
        { autoAlpha: 0, y: 50 },
        { autoAlpha: 1, y: 0, pointerEvents: "auto", duration: 1.5 },
        "<"
      );
      mainTl.fromTo(
        ".daylight-text-stagger",
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, stagger: 0.2, duration: 1, ease: "power2.out" },
        "<0.5"
      );
      // Transition navbar text to charcoal (readable on the cream flood)
      mainTl.to(
        ".navbar-logo, .navbar-item",
        { color: "#1A1A1A", duration: 0.5 },
        "<"
      );
      mainTl.to(".daylight-sidebar", { autoAlpha: 0, duration: 1 }, ">+=1.5");

      // Double-rAF refresh so pin geometry is stable after hydration
      queueMicrotask(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          requestAnimationFrame(() => {
            ScrollTrigger.refresh();
          });
        });
      });
    },
    { scope: containerRef }
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-w-0 max-w-full overflow-x-clip bg-[#000000] text-white">
      {/* ── Global film-grain overlay ─────────────────────────────────────
          Fixed so it covers every section. z-[200] sits above all content
          but below the loader (z-10000) and navbar (z-100). mix-blend-overlay
          applies the grain as light variation rather than darkening. */}
      <div
        aria-hidden
        className="fixed inset-0 z-[200] pointer-events-none opacity-[0.038] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
          backgroundSize: "300px 300px",
        }}
      />

      <Loader />
      <SnapController />

      {/* Orange HUD frame — signature 40 px rounded orange perimeter */}
      <div className="fixed inset-4 orange-frame grid-overlay pointer-events-none z-50 opacity-20" />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION — pinned for 500 vh (desktop) / 235 vh (mobile)
          All 5 sub-stages play out while this element stays at top:0.
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        ref={containerRef}
        data-snap-stage="hero"
        className="relative min-h-[100svh] h-[100svh] w-full min-w-0 max-w-full overflow-hidden bg-black"
      >
        {/* ── Background image + effect layers (z-0 / z-[5]) ────────────── */}
        <BackgroundLayers />

        {/* ── Embossed "ETX" text — dissolves at the start of scroll ─────── */}
        <div
          className="absolute inset-0 flex items-start justify-center overflow-hidden pt-[26svh] sm:pt-[20svh] md:pt-[15svh] pointer-events-none z-0"
          style={{ perspective: "1400px", perspectiveOrigin: "50% 80%" }}
        >
          <h1
            className="bg-text max-w-full text-[clamp(5.5rem,36vw,26.25rem)] font-[900] tracking-[-0.05em] leading-[1] select-none font-sans uppercase md:text-[420px]"
            style={{
              color: "#f4f6fb",
              transform: "translateZ(160px) scale(1.04)",
              transformOrigin: "50% 65%",
              willChange: "transform, opacity",
              textShadow: [
                "0 -1px 0 rgba(255,255,255,0.55)",
                "0 1px 0 rgba(70,75,90,0.95)",
                "0 2px 0 rgba(60,64,78,0.92)",
                "0 4px 0 rgba(48,52,66,0.9)",
                "0 7px 0 rgba(36,40,54,0.88)",
                "0 11px 0 rgba(26,30,42,0.86)",
                "0 16px 0 rgba(18,22,32,0.84)",
                "0 22px 0 rgba(12,15,22,0.82)",
                "0 30px 0 rgba(6,8,14,0.78)",
                "0 40px 60px rgba(0,0,0,0.95)",
                "0 70px 120px rgba(0,0,0,0.85)",
                "0 0 90px rgba(255,55,20,0.18)",
              ].join(", "),
            }}
          >
            ETX
          </h1>
        </div>

        {/* ── Three.js Canvas — fixed camera z=15, vehicle does all movement */}
        <div className="absolute inset-0 z-10 w-full h-full">
          <CanvasErrorBoundary>
            <Canvas
              dpr={lowPower ? 1 : dpr}
              gl={gl}
              frameloop={frameloop}
              camera={{ position: [0, 0, 15], fov: 30 }}
              shadows
              performance={{ min: lowPower ? 0.4 : 0.5 }}
              style={{ background: 'transparent' }}
            >
              <EtxStudioRig>
                {/* VehicleScene reads scrollData + mouseRef every frame */}
                <VehicleScene
                  scrollData={scrollData}
                  mouseRef={mouseRef}
                  lowPower={lowPower}
                />
              </EtxStudioRig>
            </Canvas>
          </CanvasErrorBoundary>
        </div>

        {/* ── DOM overlays (z-20 → z-[35] → z-30) ─────────────────────────── */}
        <HeroHud />
        <MetricsSidebar />
        <UrbanSidebar />
        <DaylightSidebar />

        {/* ── Cinematic: Vignette overlay (GSAP-controlled) ─────────────── */}
        {!lowPower && (
          <div
            aria-hidden
            className="vignette-overlay absolute inset-0 z-[15] pointer-events-none opacity-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
            }}
          />
        )}

        {/* ── Cinematic: Ghost trail streak (charging rocket exit) ───────── */}
        {!lowPower && (
          <div
            aria-hidden
            className="ghost-trail absolute top-1/2 left-0 z-[9] w-full h-[6px] -translate-y-1/2 pointer-events-none opacity-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #FF6B00 30%, #FF8C00 50%, #FF6B00 70%, transparent 100%)",
              filter: "blur(3px)",
              boxShadow: "0 0 20px rgba(255,107,0,0.6), 0 0 40px rgba(255,107,0,0.3)",
            }}
          />
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BELOW-THE-FOLD SECTIONS
          Lazy-loaded after the hero 3D asset fires "elektra-hero-ready".
      ═══════════════════════════════════════════════════════════════════ */}

      {/* Part 3 — 40-frame .webp sequence + staggered text cross-fades */}
      <DesignEngineering />

      {/* Part 4 — 19-frame sketch sequence + headline wireframe→fill + callouts */}
      <CargoSketchSection />

      {/* Part 5 — OrbitControls 360° viewer + GSAP camera reset */}
      <InteractiveStudio />
    </main>
  );
}
