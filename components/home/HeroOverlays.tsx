"use client";

/**
 * HeroOverlays — all DOM overlay layers that sit above the hero 3D Canvas.
 *
 * Extracted from ETXExperience so the parent controller stays lean. Every
 * component here is GSAP-class-driven — no local state. The master timeline
 * in ETXExperience animates `.hero-hud`, `.metrics-sidebar`, `.metric-item`,
 * `.urban-sidebar`, `.urban-text-stagger`, `.daylight-sidebar`,
 * `.daylight-text-stagger`, `.metrics-bg`, `.urban-bg-image`, etc.
 *
 * Layout tree:
 *   BackgroundLayers  — z-0 / z-[5]  image + gradient + flood divs
 *   HeroHud           — z-20         corner labels + scroll cue
 *   MetricsSidebar    — z-[35]       frosted spec card (Stage 2)
 *   UrbanSidebar      — z-[35]       "Conquer the City" card (Stage 3)
 *   DaylightSidebar   — z-30         "Freedom Defined" centred layout (Stage 5)
 */

import React from "react";
import { HERO_SCROLL_BG_IMAGES } from "@/lib/site-assets";

// ── 1. Background image & effect layers ──────────────────────────────────────
// GSAP scrubs opacity / scale / yPercent on these from ETXExperience mainTl.

export function BackgroundLayers() {
  return (
    <>
      {/* ── Metrics background photo (Stage 2) ─────────────────────────── */}
      <div
        className="metrics-bg absolute inset-0 z-0 opacity-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${HERO_SCROLL_BG_IMAGES[0]}')`,
          willChange: "transform, opacity",
          transform: "translateZ(0)",
        }}
      />
      {/* Dark gradient scrim over the photo */}
      <div
        className="metrics-bg absolute inset-0 z-0 opacity-0 pointer-events-none bg-gradient-to-b from-black/90 via-black/75 to-black/85"
        style={{ willChange: "opacity" }}
      />

      {/* ── Urban city photo (Stage 3) ──────────────────────────────────── */}
      <div
        className="urban-bg-image absolute inset-0 z-0 opacity-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${HERO_SCROLL_BG_IMAGES[1]}')`,
          willChange: "transform, opacity",
          transform: "translateZ(0)",
        }}
      />
      {/* Scrim + orange radial glow */}
      <div
        className="urban-bg-overlay absolute inset-0 z-0 opacity-0 pointer-events-none bg-gradient-to-b from-black/85 via-black/55 to-black/82"
        style={{ willChange: "opacity" }}
      />
      <div
        className="urban-bg-glow absolute inset-0 z-0 opacity-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,107,0,0.16)_0%,rgba(0,0,0,0)_55%)]"
        style={{ willChange: "opacity" }}
      />

      {/* ── Daylight cream flood (Stage 5) ──────────────────────────────── */}
      {/* Uses #F9F8F3 cream per the Awwwards brief — not pure white. */}
      <div
        className="daylight-flood absolute inset-0 z-[5] opacity-0 pointer-events-none"
        style={{ backgroundColor: "#F9F8F3", willChange: "opacity" }}
      />
    </>
  );
}

// ── 2. Hero HUD ───────────────────────────────────────────────────────────────
// Visible on first load; fades out + slides up at the start of Stage 1 scroll.

export function HeroHud() {
  return (
    <div className="hero-hud absolute inset-0 z-20 pointer-events-none">
      {/* Corner micro-labels */}
      <div className="absolute top-[96px] left-1/2 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-center gap-2 text-center md:contents">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 md:absolute md:top-[120px] md:left-[80px] md:w-auto md:max-w-none md:text-left">
          Driven by Innovation
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 md:absolute md:top-[120px] md:right-[80px] md:left-auto md:w-auto md:max-w-none md:text-right">
          Product of Sri Lanka
        </div>
      </div>

      {/* Scroll cue — thin line + label */}
      <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-[12px] opacity-40">
        <span className="text-[9px] tracking-[0.4em] uppercase font-sans">
          Scroll to explore
        </span>
        <div className="w-[1px] h-[60px] bg-linear-to-b from-white to-transparent" />
      </div>
    </div>
  );
}

// ── 3. Metrics Sidebar — "Elite Performance" (Stage 2) ───────────────────────
// Fades in from the right; metric items stagger in from the left.

const METRICS = [
  {
    value: "150 km",
    label: "RANGE",
    detail: "Optimized for long-distance urban commuting.",
  },
  {
    value: "70 kmph",
    label: "TOP SPEED",
    detail: "Electronically capped for maximum safety.",
  },
  {
    value: "10 kW",
    label: "PEAK POWER",
    detail: "High-torque brushless DC motor.",
  },
  {
    value: "18°",
    label: "GRADEABILITY",
    detail: "Seamlessly tackle steep urban inclines.",
  },
] as const;

export function MetricsSidebar() {
  return (
    <div className="metrics-sidebar absolute inset-0 z-[35] isolate flex items-center px-6 sm:px-12 md:px-24 pointer-events-none opacity-0">
      <div className="max-w-xl pointer-events-auto">
        <div className="relative rounded-2xl border border-white/[0.12] bg-black/80 px-6 py-8 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-md md:px-10 md:py-10">
          {/* Inner gradient */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-black/90 via-black/70 to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            {/* Header */}
            <div className="mb-10 md:mb-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 shrink-0 rounded-full bg-[#FF6B00]" />
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/85">
                  TECHNICAL SPECIFICATIONS
                </span>
              </div>
              <h2 className="text-5xl font-bold uppercase tracking-tighter leading-[0.9] text-white italic [text-shadow:0_2px_24px_rgba(0,0,0,0.85)] md:text-7xl">
                ELITE PERFORMANCE
              </h2>
            </div>

            {/* Metric items — staggered by GSAP */}
            <div className="flex flex-col gap-8 md:gap-10">
              {METRICS.map((item) => (
                <div key={item.label} className="metric-item">
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-4xl font-bold text-white [text-shadow:0_1px_18px_rgba(0,0,0,0.9)] font-sans md:text-5xl">
                      {item.value}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-[0.4em] text-white/80 md:text-[10px]">
                      {item.label}
                    </span>
                  </div>
                  <p className="max-w-sm text-[10px] leading-relaxed tracking-tight text-white/70 md:text-[11px]">
                    {item.detail}
                  </p>
                  <div className="mt-4 h-px w-12 bg-white/20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 4. Urban Sidebar — "Conquer the City" (Stage 3) ──────────────────────────
// Slides in from the right; .urban-text-stagger children cascade in from below.

export function UrbanSidebar() {
  return (
    <div className="urban-sidebar absolute inset-0 z-[35] isolate flex items-center justify-start px-6 sm:px-12 md:px-24 max-md:items-start max-md:pt-[min(14vh,104px)] pointer-events-none opacity-0">
      <div className="max-w-xl pointer-events-auto text-left">
        <div className="relative rounded-2xl border border-white/[0.12] bg-black/80 px-6 py-8 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-md md:px-10 md:py-10">
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-black/90 via-black/70 to-transparent"
            aria-hidden
          />
          <div className="relative flex flex-col items-start">
            <div className="urban-text-stagger mb-2">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#FF6B00]">
                CITY AGILITY
              </span>
            </div>
            <h2 className="urban-text-stagger mb-6 text-5xl font-black uppercase leading-[0.88] tracking-tighter text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.9)] sm:text-7xl md:mb-8 md:text-8xl">
              CONQUER
              <br />
              THE CITY
            </h2>
            <p className="urban-text-stagger mb-8 max-w-lg text-[12px] leading-relaxed text-white/70 md:mb-12 md:text-[13px]">
              Conquer the city with the ETX – agile, swift, and compact. Easily
              maneuver through crowded streets, enjoying quick acceleration and
              nimble handling. Experience the thrill of swift acceleration and
              responsive handling, leaving traffic behind. ETX: your ticket to
              urban liberation.
            </p>
            <div className="urban-text-stagger">
              <button
                type="button"
                className="border border-white/25 px-8 py-3 text-[10px] uppercase tracking-[0.4em] transition-colors duration-500 hover:bg-white hover:text-black md:px-10 md:py-4"
              >
                Explore Maneuverability
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. Daylight Sidebar — "Freedom Defined" (Stage 5) ────────────────────────
// Cream (#F9F8F3) flood is behind this; text uses dark charcoal for contrast.

export function DaylightSidebar() {
  return (
    <div className="daylight-sidebar absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden px-5 sm:px-10 md:px-32 pointer-events-none opacity-0">
      <div className="text-center max-w-4xl pointer-events-auto">
        <div className="daylight-text-stagger mb-6">
          <span className="text-[12px] font-bold tracking-[0.5em] uppercase text-[#FF6B00]">
            BEYOND LIMITS
          </span>
        </div>
        {/* Charcoal text reads cleanly on the #F9F8F3 cream flood */}
        <h2 className="daylight-text-stagger text-[12vw] font-black uppercase tracking-tighter leading-[0.8] text-[#1A1A1A] mb-12">
          FREEDOM
          <br />
          DEFINED
        </h2>
        <p className="daylight-text-stagger text-[16px] leading-relaxed text-[#1A1A1A]/65 max-w-2xl mx-auto mb-16">
          Where the road meets the horizon. The ETX is more than a vehicle;
          it&apos;s your passport to an unrestricted urban existence. Experience
          the world in high definition.
        </p>
        <div className="daylight-text-stagger">
          <button className="px-16 py-6 bg-[#1A1A1A] text-white text-[12px] tracking-[0.6em] uppercase hover:bg-[#FF6B00] transition-colors duration-500 cursor-pointer">
            Start Your Journey
          </button>
        </div>
      </div>
    </div>
  );
}
