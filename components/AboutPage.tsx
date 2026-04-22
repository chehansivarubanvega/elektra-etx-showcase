"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React, { useEffect, useRef, useState } from "react";
import { ETXHeroScene, type PointerSample } from "./ETXHeroScene";

if (typeof globalThis.window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const FONT_DISPLAY = "var(--font-about-display)";
const FONT_SERIF = "var(--font-about-serif)";

const ACCENT = "#FF5722";
const ACCENT_DARK = "#FF6B00";

export const AboutPage = () => {
  /** Pointer sample shared with the 3D scene — written by mousemove, read in useFrame. */
  const pointerRef = useRef<PointerSample>({ nx: 0, ny: 0, active: false });

  /** Custom cursor DOM node — driven imperatively for sub-frame smoothness. */
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef({ x: -200, y: -200, tx: -200, ty: -200 });
  const rafRef = useRef<number | null>(null);

  const sceneWrapRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const aboutWordRef = useRef<HTMLDivElement>(null);
  const narrativeRef = useRef<HTMLElement>(null);

  const [overCanvas, setOverCanvas] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  /** Touch / coarse-pointer detection — hides the custom cursor on mobile. */
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    const mq = globalThis.window.matchMedia("(pointer: coarse)");
    const update = () => setCoarsePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /** Single global mousemove → updates pointer sample + cursor target position. */
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    const onMove = (e: MouseEvent) => {
      const w = globalThis.window.innerWidth;
      const h = globalThis.window.innerHeight;
      pointerRef.current.nx = (e.clientX / w) * 2 - 1;
      pointerRef.current.ny = -((e.clientY / h) * 2 - 1);
      cursorPosRef.current.tx = e.clientX;
      cursorPosRef.current.ty = e.clientY;
    };
    globalThis.window.addEventListener("pointermove", onMove, {
      passive: true,
    });
    return () => globalThis.window.removeEventListener("pointermove", onMove);
  }, []);

  /** rAF lerp on the cursor — gives the dot/disc its trailing inertia. */
  useEffect(() => {
    if (coarsePointer) return;
    const tick = () => {
      const c = cursorPosRef.current;
      c.x += (c.tx - c.x) * 0.22;
      c.y += (c.ty - c.y) * 0.22;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) translate(-50%, -50%)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [coarsePointer]);

  /** Scroll choreography — model fades + drifts as narrative enters; reveal lines fade-up. */
  useGSAP(
    () => {
      ScrollTrigger.config({ ignoreMobileResize: true });

      /** Hero → Narrative scene transition (model scales/translates out of frame). */
      if (
        sceneWrapRef.current &&
        narrativeRef.current &&
        heroSectionRef.current
      ) {
        gsap.to(sceneWrapRef.current, {
          scale: 0.55,
          xPercent: 18,
          yPercent: -8,
          autoAlpha: 0,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: heroSectionRef.current,
            start: "bottom 90%",
            end: "bottom 25%",
            scrub: 0.8,
          },
        });

        gsap.to(aboutWordRef.current, {
          autoAlpha: 0,
          yPercent: -20,
          letterSpacing: "-0.02em",
          ease: "power2.in",
          scrollTrigger: {
            trigger: heroSectionRef.current,
            start: "bottom 95%",
            end: "bottom 40%",
            scrub: 0.8,
          },
        });
      }

      /** Reveal-on-scroll for each editorial line / block. */
      gsap.utils.toArray<HTMLElement>(".reveal-line").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 36, autoAlpha: 0, filter: "blur(6px)" },
          {
            y: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 86%",
              once: true,
            },
          },
        );
      });

      /** Pull-quote ribbon — slow, premium drift across the editorial spread. */
      const ribbon = document.querySelector<HTMLElement>(".about-ribbon");
      if (ribbon) {
        gsap.to(ribbon, {
          xPercent: -8,
          ease: "none",
          scrollTrigger: {
            trigger: ribbon,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    },
    { scope: heroSectionRef },
  );

  return (
    <main className="relative isolate w-full min-w-0 max-w-full overflow-x-clip bg-[#000000] text-white">
      {/* Global film-grain — fixed, mix-blend, non-interactive. */}
      <GlobalGrain />

      {/* Custom "ROTATE" cursor — only visible on fine pointers when over the canvas. */}
      {!coarsePointer && (
        <div
          ref={cursorRef}
          aria-hidden="true"
          className={`pointer-events-none fixed left-0 top-0 z-[9999] flex h-[112px] w-[112px] select-none items-center justify-center rounded-full border border-white/[0.08] bg-[#141414]/85 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-md transition-opacity duration-300 ease-out ${
            overCanvas ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: "translate3d(-200px, -200px, 0)" }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-white/45">
              ↺
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.34em] text-white">
              Rotate
            </span>
          </div>
        </div>
      )}

      {/* ─── HERO ───────────────────────────────────────────────────────── */}
      <section
        ref={heroSectionRef}
        className="relative isolate flex h-[100svh] min-h-[640px] w-full items-center justify-center overflow-hidden bg-[#000000]"
      >
        {/* Top HUD strip */}
        <div className="pointer-events-none absolute left-0 right-0 top-[120px] z-30 mx-auto flex max-w-7xl items-start justify-between px-6 sm:px-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
            {"// chapter_00 · about_elektrateq"}
          </div>
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.32em] text-white/40 md:block">
            COL · 06°56′N 79°50′E
          </div>
        </div>

        {/* Massive ABOUT word.
            Mobile: pinned to the top half so the model (which sits in the
            bottom half on small screens) doesn't completely cover it.
            Desktop: original behavior — centered behind the model. */}
        <div
          ref={aboutWordRef}
          className="pointer-events-none absolute inset-x-0 top-[150px] z-10 flex justify-center md:inset-0 md:top-0 md:items-center"
        >
          <h1
            className="select-none text-[clamp(4.5rem,22vw,28rem)] font-black uppercase leading-[0.82] tracking-[-0.06em] text-white md:text-[clamp(8rem,32vw,28rem)]"
            style={{
              fontFamily: FONT_DISPLAY,
              fontVariationSettings: '"wght" 900',
              textShadow: "0 0 80px rgba(255,255,255,0.04)",
            }}
          >
            ABOUT
          </h1>
        </div>

        {/* 3D scene — sits over the word, picks up the cursor.
            Mobile: confined to the bottom ~55% of the hero so the model
            renders smaller in pixels and leaves the ABOUT wordmark room
            to breathe up top. Desktop keeps full-bleed. */}
        <div
          ref={sceneWrapRef}
          onPointerEnter={() => setOverCanvas(true)}
          onPointerLeave={() => setOverCanvas(false)}
          onPointerDown={() => {
            // Burst tracking flag: ensures rotation amp engages even without move.
            pointerRef.current.active = true;
          }}
          className="absolute inset-x-0 bottom-0 z-20 h-[58%] w-full md:inset-0 md:h-full"
          style={{ cursor: coarsePointer ? "auto" : "none" }}
        >
          {/* Drives the amplitude flag in PointerSample whenever overCanvas changes. */}
          <SceneActivityBridge active={overCanvas} pointerRef={pointerRef} />
          <ETXHeroScene pointerRef={pointerRef} />
        </div>

        {/* Bottom hint */}
        <div className="pointer-events-none absolute bottom-10 left-0 right-0 z-30 flex flex-col items-center gap-3 text-white/40">
          <span className="font-mono text-[9px] uppercase tracking-[0.5em]">
            Move the cursor · Scroll to read
          </span>
          <span className="block h-[44px] w-px bg-gradient-to-b from-white/40 to-transparent" />
        </div>

        {/* Subtle vignette to lift the model off pure black */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_70%_55%_at_50%_55%,rgba(255,107,0,0.06),transparent_60%)]"
        />
      </section>

      {/* ─── NARRATIVE ─────────────────────────────────────────────────── */}
      <section
        ref={narrativeRef}
        className="relative z-10 w-full bg-[#050505] px-6 pb-32 pt-28 sm:px-10 md:pt-36 lg:px-16"
      >
        {/* Editorial grid */}
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-y-16 lg:gap-x-12">
          {/* Section eyebrow */}
          <div className="reveal-line col-span-12 flex items-center gap-3 lg:col-span-12">
            <span
              className="h-[1px] w-12"
              style={{ backgroundColor: ACCENT }}
            />
            <span
              className="font-mono text-[10px] uppercase tracking-[0.42em]"
              style={{ color: ACCENT }}
            >
              {"// 01 · Manifesto"}
            </span>
          </div>

          {/* Headline */}
          <h2
            className="reveal-line col-span-12 max-w-[20ch] text-balance text-[clamp(2.25rem,6.4vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.025em] text-white lg:col-span-9"
            style={{ fontFamily: FONT_DISPLAY }}
          >
            Welcome to{" "}
            <span
              className="italic font-normal text-white/95"
              style={{ fontFamily: FONT_SERIF }}
            >
              Elektrateq
            </span>
            , where sustainable mobility meets innovation.
          </h2>

          {/* Right-rail meta */}
          <aside className="reveal-line col-span-12 flex flex-col gap-6 border-t border-white/[0.06] pt-6 lg:col-span-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <MetaRow label="HQ" value="Trace Expert City · Colombo" />
            <MetaRow label="Parent" value="Vega Innovations" />
            <MetaRow label="Flagship" value="ETX · Electric Three-Wheeler" />
            <MetaRow label="Region" value="South Asia" />
          </aside>

          {/* Body — first paragraph */}
          <div className="reveal-line col-span-12 lg:col-span-7 lg:col-start-1">
            <p
              className="text-[clamp(1.25rem,1.9vw,1.6rem)] font-normal leading-[1.5] text-white/85"
              style={{ fontFamily: FONT_SERIF }}
            >
              Born in Colombo, Sri Lanka, Elektrateq is a venture of{" "}
              <VegaLink>Vega Innovations</VegaLink> — the{" "}
              <span
                className="rounded-[2px] px-1 font-medium"
                style={{
                  color: ACCENT,
                  backgroundColor: "rgba(255,87,34,0.06)",
                }}
              >
                pioneering force
              </span>{" "}
              behind the Vega EVX, the{" "}
              <span
                className="rounded-[2px] px-1 font-medium text-white"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                first ever electric super car in South Asia
              </span>
              . We exist at the intersection of clean energy, world-class
              engineering, and emerging-market urbanism.
            </p>
          </div>

          {/* Pull-quote ribbon */}
          <div className="about-ribbon col-span-12 -mx-6 overflow-hidden py-6 sm:-mx-10 lg:-mx-16">
            <div
              className="reveal-line whitespace-nowrap text-[clamp(3rem,11vw,9rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] text-white/[0.04]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              ENGINEERED · IN · COLOMBO &nbsp;·&nbsp; ENGINEERED · IN · COLOMBO
            </div>
          </div>

          {/* Body — second paragraph (mission) */}
          <div className="reveal-line col-span-12 lg:col-span-7 lg:col-start-1">
            <p
              className="text-[clamp(1.15rem,1.7vw,1.45rem)] leading-[1.55] text-white/75"
              style={{ fontFamily: FONT_SERIF }}
            >
              Our mission is simple: build electric vehicles that solve real
              problems on real roads. The ETX, our flagship three-wheeler, was
              engineered to replace one of the most ubiquitous and polluting
              forms of transport in the region with something cleaner, smarter,
              and built to be loved.
            </p>
          </div>

          {/* Body — third paragraph (craft) */}
          <div className="reveal-line col-span-12 lg:col-span-6 lg:col-start-1">
            <p className="text-[clamp(0.95rem,1.05vw,1.05rem)] leading-[1.7] text-white/65">
              We design, prototype, and assemble in-house — fusing studio-grade
              industrial design with battery, drivetrain, and software systems
              built by Sri Lankan engineers. Every panel, every weld, every line
              of firmware is a stake in a more breathable future.
            </p>
          </div>

          {/* Closing line */}
          <div className="reveal-line col-span-12 mt-4 lg:col-span-9">
            <p
              className="italic text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.35] text-white"
              style={{ fontFamily: FONT_SERIF }}
            >
              Mobility for the next decade. Quiet, capable, and unmistakably
              ours.
            </p>
          </div>

          {/* Signature row */}
          <div className="reveal-line col-span-12 mt-8 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-8 sm:grid-cols-4">
            <SignatureCell title="DESIGN" value="In-house" />
            <SignatureCell title="ENGINEERING" value="Sri Lankan" />
            <SignatureCell title="ASSEMBLY" value="Colombo" />
            <SignatureCell title="HORIZON" value="Next decade" />
          </div>
        </div>
      </section>
    </main>
  );
};

/* ─────────────────────────────────────────────────────────────────────── */

/** Bridges the React `overCanvas` flag into the per-frame pointer sample
 *  so the 3D scene knows to widen rotation amplitude when in the canvas. */
const SceneActivityBridge = ({
  active,
  pointerRef,
}: {
  active: boolean;
  pointerRef: React.MutableRefObject<PointerSample>;
}) => {
  useEffect(() => {
    pointerRef.current.active = active;
  }, [active, pointerRef]);
  return null;
};

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-white/35">
      {label}
    </span>
    <span className="text-[13px] leading-snug text-white/85">{value}</span>
  </div>
);

const SignatureCell = ({ title, value }: { title: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-white/35">
      {title}
    </span>
    <span
      className="text-[15px] font-semibold tracking-tight text-white"
      style={{ fontFamily: FONT_DISPLAY }}
    >
      {value}
    </span>
  </div>
);

/** High-end hover card — "Vega Innovations" link reveals a credentials panel. */
const VegaLink = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="group relative inline-block align-baseline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <a
        href="https://www.vega-innovations.com"
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-[1] font-medium text-white transition-colors duration-300"
      >
        {children}
        <span
          aria-hidden="true"
          className="absolute -bottom-[2px] left-0 h-[1px] w-full origin-left scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-110"
          style={{ backgroundColor: ACCENT }}
        />
      </a>
      <span
        aria-hidden={!open}
        className={`pointer-events-none absolute left-1/2 top-full z-30 mt-3 w-[280px] -translate-x-1/2 origin-top rounded-md border border-white/[0.08] bg-[#0A0A0A]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <span className="block">
          <span
            className="mb-2 block font-mono text-[9px] uppercase tracking-[0.32em]"
            style={{ color: ACCENT_DARK }}
          >
            {"// parent_company"}
          </span>
          <span
            className="block text-[18px] font-semibold leading-tight tracking-tight text-white"
            style={{ fontFamily: FONT_DISPLAY }}
          >
            Vega Innovations
          </span>
          <span className="mt-2 block text-[11px] leading-relaxed text-white/65">
            Sri Lanka&apos;s flagship cleantech R&amp;D house. Architects of the
            Vega EVX — the first electric super car designed and built in South
            Asia.
          </span>
          <span className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/45">
            <span
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ backgroundColor: ACCENT }}
            />
            Trace Expert City · Colombo
          </span>
        </span>
      </span>
    </span>
  );
};

/** Fixed full-screen SVG noise — gives the page a subtle "film stock" tone. */
const GlobalGrain = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-[9998] mix-blend-overlay opacity-[0.13]"
    style={{
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      backgroundSize: "240px 240px",
    }}
  />
);

export default AboutPage;
