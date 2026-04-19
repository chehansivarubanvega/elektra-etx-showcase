"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

const TOTAL_FRAMES = 19;
const LAST_FRAME = TOTAL_FRAMES - 1;
const MOBILE_MQ = "(max-width: 767px)";
/** Single representative frame shown statically on mobile (no scrub). */
const MOBILE_STATIC_FRAME = "/cargo_collection/19.webp";

/**
 * Feature highlights — one list for mobile cards and desktop HUD tether cards.
 * `frame` drives when each appears; `anchor` / `labelSide` / `lineLength` are
 * desktop-only (percentages inside the canvas window).
 */
const FEATURE_HIGHLIGHTS = [
  {
    key: "trunk",
    frame: 5,
    title: "Room for big loads",
    description:
      "The back is sized for bulky cargo — large boxes, a big TV, or a full shop without squeezing.",
    anchor: { top: "44%", left: "76%" },
    labelSide: "right" as const,
    lineLength: 104,
  },
  {
    key: "cabin",
    frame: 10,
    title: "Comfort for every seat",
    description:
      "Passengers get a proper cabin: supportive seating and space so short hops and longer rides both feel easy.",
    // Dot high on the glassline; long tether keeps the card in the upper-left margin, off the sketch.
    anchor: { top: "22%", left: "44%" },
    labelSide: "left" as const,
    lineLength: 220,
  },
  {
    key: "mode",
    frame: 15,
    title: "One vehicle, many days",
    description:
      "Switch between errands, work, and family trips without feeling like you need a second car.",
    // Lower + slightly inboard so the card clears “Room for big loads” vertically.
    anchor: { top: "74%", left: "64%" },
    labelSide: "right" as const,
    lineLength: 124,
  },
] as const;

const HEADLINE_LINES = ["Got Cargo?", "No Problem!"];

const PARAGRAPH_LINES = [
  "Experience seamless travel with ETX —",
  "every cubic inch engineered to adapt,",
  "every posture sculpted to reassure.",
  "A harmonious blend of practicality",
  "and understated luxury.",
];

/** Shared sizing for the sequence window + the HUD tether overlay so anchors stay aligned. */
const CARGO_DISPLAY_SHELL_CLASS =
  "relative h-[min(46dvh,440px)] w-[min(92vw,420px)] min-h-[240px] min-w-[240px] max-w-[420px] max-h-[min(46dvh,440px)] md:h-[min(56vh,500px)] md:w-[min(52vw,700px)] md:max-h-none md:min-h-[260px] md:min-w-[260px]";

const CargoSketchSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [shouldPreload, setShouldPreload] = useState(false);
  const [frameLabel, setFrameLabel] = useState("01");
  /**
   * Mobile devices skip the entire scroll-scrubbed canvas pipeline. The
   * section becomes a normal, non-sticky stack of static content so vertical
   * scroll behaves like ordinary page scroll instead of driving an animation.
   */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof globalThis.matchMedia === "undefined") return;
    const mq = globalThis.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /**
   * Scroll progress (0 → 1) driven directly by Motion's `useScroll`. This is
   * more reliable than GSAP ScrollTrigger when sharing a page with other
   * pinned sections (the page hero uses GSAP pin for `+=1250%`, which was
   * interfering with ScrollTrigger position calculations here).
   */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  /**
   * Spring-smoothed progress — the "ink-drag" feel without frame-skipping on
   * low-end hardware. Feeds every visual transform in this section.
   */
  const smoothFrame = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 32,
    mass: 0.4,
  });

  // Ambient cues
  const gridOpacity = useTransform(smoothFrame, [0, 0.18], [0, 0.65]);
  const glowOpacity = useTransform(
    smoothFrame,
    [0, 0.2, 0.75, 1],
    [0.25, 0.85, 1, 0.9],
  );
  const windowRingOpacity = useTransform(smoothFrame, [0, 0.12], [0.15, 0.55]);

  // Headline outlined → solid orange cross-fade
  const headlineFillOpacity = useTransform(smoothFrame, [0.1, 0.75], [0, 1]);
  const headlineStrokeOpacity = useTransform(
    smoothFrame,
    [0.1, 0.75],
    [1, 0.12],
  );

  // Paragraph line reveal — five explicit transforms to respect rules-of-hooks
  const lineOpacity0 = useTransform(smoothFrame, [0.1, 0.22], [0, 1]);
  const lineOpacity1 = useTransform(smoothFrame, [0.19, 0.31], [0, 1]);
  const lineOpacity2 = useTransform(smoothFrame, [0.28, 0.4], [0, 1]);
  const lineOpacity3 = useTransform(smoothFrame, [0.37, 0.49], [0, 1]);
  const lineOpacity4 = useTransform(smoothFrame, [0.46, 0.58], [0, 1]);

  const lineY0 = useTransform(smoothFrame, [0.1, 0.22], [22, 0]);
  const lineY1 = useTransform(smoothFrame, [0.19, 0.31], [22, 0]);
  const lineY2 = useTransform(smoothFrame, [0.28, 0.4], [22, 0]);
  const lineY3 = useTransform(smoothFrame, [0.37, 0.49], [22, 0]);
  const lineY4 = useTransform(smoothFrame, [0.46, 0.58], [22, 0]);

  const lineBlur0 = useTransform(smoothFrame, [0.1, 0.22], ["6px", "0px"]);
  const lineBlur1 = useTransform(smoothFrame, [0.19, 0.31], ["6px", "0px"]);
  const lineBlur2 = useTransform(smoothFrame, [0.28, 0.4], ["6px", "0px"]);
  const lineBlur3 = useTransform(smoothFrame, [0.37, 0.49], ["6px", "0px"]);
  const lineBlur4 = useTransform(smoothFrame, [0.46, 0.58], ["6px", "0px"]);

  const lineOpacities = [
    lineOpacity0,
    lineOpacity1,
    lineOpacity2,
    lineOpacity3,
    lineOpacity4,
  ];
  const lineTranslates = [lineY0, lineY1, lineY2, lineY3, lineY4];
  const lineBlurs = [lineBlur0, lineBlur1, lineBlur2, lineBlur3, lineBlur4];

  // HUD badge — only re-render when the rounded frame index actually changes
  useMotionValueEvent(smoothFrame, "change", (v) => {
    const i = Math.min(LAST_FRAME, Math.max(0, Math.round(v * LAST_FRAME))) + 1;
    setFrameLabel(String(i).padStart(2, "0"));
  });

  /** Lazy preload the sequence only when the section nears the viewport. */
  useEffect(() => {
    if (isMobile) return;
    if (!sectionRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setShouldPreload(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldPreload(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, [isMobile]);

  /** Preload all 19 .webp frames. `ready` flips once every slot has resolved. */
  useEffect(() => {
    if (isMobile) return;
    if (!shouldPreload) return;
    let cancelled = false;

    const arr: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    imagesRef.current = arr;
    loadedRef.current = 0;

    const onResolved = () => {
      if (cancelled) return;
      loadedRef.current += 1;
      if (loadedRef.current >= TOTAL_FRAMES) setReady(true);
    };

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = "async";
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
        i < 6 ? "high" : "low";
      img.onload = onResolved;
      img.onerror = onResolved;
      img.src = `/cargo_collection/${i + 1}.webp`;
      arr[i] = img;
    }
    return () => {
      cancelled = true;
    };
  }, [isMobile, shouldPreload]);

  // Scroll-to-frame pipeline is established via `useScroll` + `useSpring` above.
  // The outer `<section>` supplies 300vh of scroll, the inner `sticky top-0
  // h-screen` stage handles the "pinned" visual. No GSAP pin here — that would
  // fight the page-level hero pin in `app/page.tsx`.

  /** Canvas sequence renderer driven by the spring-smoothed frame index. */
  useEffect(() => {
    if (isMobile) return;
    if (!ready || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    (
      ctx as CanvasRenderingContext2D & { imageSmoothingQuality?: string }
    ).imageSmoothingQuality = "high";

    let cW = 0;
    let cH = 0;
    let dpr = 1;
    let lastIdx = -1;

    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      const nextDpr = Math.min(globalThis.window?.devicePixelRatio ?? 1, 1.75);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (w === cW && h === cH && nextDpr === dpr) return;
      cW = w;
      cH = h;
      dpr = nextDpr;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastIdx = -1;
    };

    const draw = (idx: number) => {
      const img = imagesRef.current[idx];
      if (!img || !img.complete || img.naturalWidth === 0) return false;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = cW / cH;
      let drawW: number;
      let drawH: number;
      let offX: number;
      let offY: number;
      // Full “contain” fit — no scale-down margin (was 0.94) so frames aren’t cropped visually on mobile.
      if (imgRatio > canvasRatio) {
        drawW = cW;
        drawH = drawW / imgRatio;
        offX = 0;
        offY = (cH - drawH) / 2;
      } else {
        drawH = cH;
        drawW = drawH * imgRatio;
        offX = (cW - drawW) / 2;
        offY = 0;
      }
      ctx.clearRect(0, 0, cW, cH);
      ctx.drawImage(img, offX, offY, drawW, drawH);
      return true;
    };

    const ro =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => sync());
    ro?.observe(canvas);
    sync();
    draw(0);

    const unsub = smoothFrame.on("change", (v) => {
      const idx = Math.min(LAST_FRAME, Math.max(0, Math.round(v * LAST_FRAME)));
      if (idx !== lastIdx && draw(idx)) lastIdx = idx;
    });

    return () => {
      ro?.disconnect();
      unsub();
    };
  }, [isMobile, ready, smoothFrame]);

  if (isMobile) {
    return (
      <section
        ref={sectionRef}
        id="cargo-versatility"
        data-snap-stage="cargo"
        data-snap-native-scroll-mobile="true"
        className="relative w-full min-w-0 max-w-full overflow-x-clip bg-black text-white"
      >
        <MobileCargoStatic />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="cargo-versatility"
      data-snap-stage="cargo"
      data-snap-native-scroll-mobile="true"
      className="relative w-full min-w-0 max-w-full overflow-x-clip bg-black text-white"
      style={{ height: "300vh" }}
    >
      {/* The sticky stage = what the viewer actually sees during the scrub. */}
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* ─── Ambient background layers ─────────────────────────────────── */}

        {/* Soft radial orange wash */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ opacity: glowOpacity }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,107,0,0.18) 0%, rgba(255,107,0,0.04) 45%, rgba(0,0,0,0) 72%)",
              filter: "blur(48px)",
            }}
          />
        </motion.div>

        {/* Blueprint grid — fades in as the animation begins */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            opacity: gridOpacity,
            backgroundImage:
              "linear-gradient(rgba(255,107,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.08) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, rgba(0,0,0,0.4) 70%, transparent 92%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, rgba(0,0,0,0.4) 70%, transparent 92%)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            opacity: gridOpacity,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Film grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[4] opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.45 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            backgroundSize: "240px 240px",
          }}
        />

        {/* ─── HUD corner tags ────────────────────────────────────────────── */}

        {/* Top-right frame counter (visible on all sizes, compact on mobile) */}
        <div className="pointer-events-none absolute right-5 top-5 z-[22] flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.3em] text-white/40 sm:gap-3 sm:text-[9px] sm:tracking-[0.35em] md:right-14 md:top-14 md:text-[10px]">
          <span className="hidden sm:inline">Frame</span>
          <span className="text-[#FF6B00]/90">{frameLabel}</span>
          <span className="text-white/30">/</span>
          <span>{String(TOTAL_FRAMES).padStart(2, "0")}</span>
        </div>

        {/* Bottom tags — desktop only (mobile bottom is for content) */}
        <div className="pointer-events-none absolute bottom-8 left-8 z-[22] hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.4em] text-white/30 md:bottom-14 md:left-14 md:flex">
          <span className="h-px w-6 bg-white/20" />
          <span>ETX_PAYLOAD_V.01</span>
        </div>

        <div className="pointer-events-none absolute bottom-8 right-8 z-[22] hidden font-mono text-[9px] uppercase tracking-[0.4em] text-white/30 md:bottom-14 md:right-14 md:block">
          <span className="text-[#FF6B00]/70">●</span>
          <span className="ml-3">Versatility Rendered</span>
        </div>

        {/* ─── Desktop Hero Headline (top-left) ──────────────────────────── */}
        <div className="pointer-events-none absolute left-6 top-[14%] z-[24] hidden max-w-[46%] md:left-14 md:block lg:left-20">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 w-2 shrink-0 bg-[#FF6B00]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FF6B00]">
              Stage 04. Cargo Versatility
            </span>
          </div>
          <h2 className="relative font-black uppercase leading-[0.9] tracking-[-0.03em] text-[clamp(2.25rem,6.6vw,6rem)]">
            <span aria-hidden className="block opacity-0">
              {HEADLINE_LINES.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </span>

            <motion.span
              aria-hidden
              className="absolute inset-0 block"
              style={{
                opacity: headlineStrokeOpacity,
                color: "transparent",
                WebkitTextStroke: "1.25px rgba(255,255,255,0.9)",
              }}
            >
              {HEADLINE_LINES.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </motion.span>

            <motion.span
              aria-hidden
              className="absolute inset-0 block text-[#FF6B00]"
              style={{ opacity: headlineFillOpacity }}
            >
              {HEADLINE_LINES.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </motion.span>

            <span className="sr-only">Got cargo? No problem!</span>
          </h2>
          <div className="mt-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
            <span className="h-px w-8 bg-[#FF6B00]/70" />
            <span>Expand · Configure · Conquer</span>
          </div>
        </div>

        {/* ─── Canvas Display Window (no HUD) ─────────────────────────────
            Desktop: centered; z below copy/callouts so the frame does not clip headline or narrative.
            Mobile: below headline; same shell class as the tether overlay for aligned % anchors. */}
        <div className="pointer-events-none absolute inset-x-0 top-[22vh] z-[12] flex justify-center md:inset-0 md:top-0 md:items-center">
          <div className={CARGO_DISPLAY_SHELL_CLASS}>
            {/* Soft orange halo behind the sketch */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-[28px] md:-inset-8 md:rounded-[36px]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,107,0,0.22) 0%, rgba(255,107,0,0.06) 45%, rgba(0,0,0,0) 75%)",
                filter: "blur(24px)",
              }}
            />

            {/* Window body — inner padding on mobile so rounded corners don’t clip letterboxed frames */}
            <div
              className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[18px] md:rounded-[24px]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,107,0,0.05) 0%, rgba(0,0,0,0) 70%), #000",
                boxShadow:
                  "0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,107,0,0.14), inset 0 0 60px rgba(255,107,0,0.08)",
              }}
            >
              <div className="relative min-h-0 min-w-0 flex-1 p-2 md:absolute md:inset-0 md:p-0">
                <canvas
                  ref={canvasRef}
                  className="block h-full min-h-0 w-full min-w-0 md:absolute md:inset-0"
                />
              </div>

              {/* Inner grain scoped to the window */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                  backgroundSize: "180px 180px",
                }}
              />

              {/* Window mode tag (desktop only — mobile window is too small) */}
              <div className="pointer-events-none absolute left-4 top-4 z-10 hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/45 md:flex">
                <span className="h-1 w-1 bg-[#FF6B00]" />
                <span>Live.Render</span>
              </div>
              <div className="pointer-events-none absolute right-4 top-4 z-10 hidden font-mono text-[9px] uppercase tracking-[0.3em] text-white/45 md:block">
                <span>01:01</span>
              </div>

              {/* Not ready overlay (scoped to window) */}
              {ready ? null : (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 animate-spin border border-white/20 border-t-[#FF6B00]" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-[#FF6B00] opacity-80">
                      Loading Payload
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Animated ring around the window (desktop only) */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-2 hidden rounded-[28px] border md:block"
              style={{
                borderColor: "rgba(255,107,0,0.5)",
                opacity: windowRingOpacity,
              }}
            />

            {/* Corner ticks (desktop only) */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 hidden md:block"
            >
              <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-[#FF6B00]/80" />
              <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-[#FF6B00]/80" />
              <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-[#FF6B00]/80" />
              <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[#FF6B00]/80" />
            </div>
          </div>
        </div>

        {/* HUD tether cards — same shell geometry as the window; z above narrative, below headline */}
        <div className="pointer-events-none absolute inset-x-0 top-[22vh] z-[22] flex justify-center md:inset-0 md:top-0 md:items-center">
          <div className={`${CARGO_DISPLAY_SHELL_CLASS} pointer-events-none`}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 hidden md:block"
            >
              {FEATURE_HIGHLIGHTS.map((item) => (
                <Callout key={item.key} item={item} progress={smoothFrame} />
              ))}
            </div>
          </div>
        </div>

        {/* ─── Floating narrative paragraph (bottom-left gutter; avoids right-side HUD callouts) ─ */}
        <div className="pointer-events-none absolute bottom-[10%] left-6 z-[18] hidden w-[min(320px,28vw)] max-w-full md:left-14 md:block lg:left-20">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-[#FF6B00]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FF6B00]">
              Flexible · Fearless
            </span>
          </div>
          <div className="font-sans text-[14px] leading-[1.7] text-white/90 md:text-[15px] md:leading-[1.75]">
            {PARAGRAPH_LINES.map((line, i) => (
              <motion.p
                key={line}
                className="mb-1.5 last:mb-0 will-change-transform"
                style={{
                  opacity: lineOpacities[i],
                  y: lineTranslates[i],
                  filter: lineBlurs[i],
                }}
              >
                {line}
              </motion.p>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.35em] text-white/40">
            <span className="text-[#FF6B00]/80">→</span>
            <span>Load · Lounge · Launch</span>
          </div>
        </div>

      </div>
    </section>
  );
};

/**
 * Mobile-only static layout. No scroll-driven canvas, no animated reveals —
 * just a normal-flow stack of headline, a single representative sketch, the
 * three feature cards, and the closing paragraph. Section height is whatever
 * the content needs.
 */
const MobileCargoStatic = () => (
  <div className="relative px-5 pb-16 pt-12">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,107,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.05) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage:
          "radial-gradient(ellipse at center, black 30%, transparent 90%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 30%, transparent 90%)",
      }}
    />

    <header className="relative">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 w-1.5 shrink-0 bg-[#FF6B00]" />
        <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#FF6B00]">
          Stage 04 · Cargo
        </span>
      </div>
      <h2 className="font-black uppercase leading-[0.92] tracking-[-0.02em] text-[clamp(1.75rem,9.5vw,2.5rem)] text-[#FF6B00]">
        {HEADLINE_LINES.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </h2>
    </header>

    <figure className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505] shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,107,0,0.16) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MOBILE_STATIC_FRAME}
        alt="ETX cargo configuration sketch"
        loading="lazy"
        decoding="async"
        className="relative block h-auto w-full"
      />
    </figure>

    <ul className="relative mt-6 flex flex-col gap-2.5">
      {FEATURE_HIGHLIGHTS.map((item) => (
        <li
          key={item.key}
          className="rounded-xl border border-white/[0.1] bg-black/50 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="h-1 w-4 rounded-full bg-[#FF6B00]" aria-hidden />
            <h3 className="text-[12px] font-semibold leading-tight text-white">
              {item.title}
            </h3>
          </div>
          <p className="pl-6 text-[11px] leading-[1.5] text-white/65">
            {item.description}
          </p>
        </li>
      ))}
    </ul>

    <div className="relative mt-7">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px w-10 bg-[#FF6B00]" />
        <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#FF6B00]">
          Flexible · Fearless
        </span>
      </div>
      <p className="text-[13px] leading-[1.7] text-white/85">
        {PARAGRAPH_LINES.join(" ")}
      </p>
    </div>
  </div>
);

type FeatureHighlightItem = (typeof FEATURE_HIGHLIGHTS)[number];

/**
 * Desktop HUD — same plain-language copy as mobile, tethered to the sketch
 * with a thin orange line from an anchor point inside the canvas window.
 */
type CalloutProps = {
  item: FeatureHighlightItem;
  progress: ReturnType<typeof useSpring>;
};

const Callout = ({ item, progress }: CalloutProps) => {
  const threshold = item.frame / LAST_FRAME;
  const start = Math.max(0, threshold - 0.03);
  const end = Math.min(1, threshold + 0.01);

  const opacity = useTransform(progress, [start, end], [0, 1]);
  const lineScale = useTransform(progress, [start, end], [0, 1]);
  const dotScale = useTransform(progress, [start, end], [0.2, 1]);

  const isRight = item.labelSide === "right";

  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      style={{
        top: item.anchor.top,
        left: item.anchor.left,
        opacity,
      }}
    >
      <div
        className="relative flex items-center"
        style={{ flexDirection: isRight ? "row" : "row-reverse" }}
      >
        <motion.span
          className="relative block h-2 w-2 shrink-0"
          style={{ scale: dotScale }}
        >
          <span className="absolute inset-0 rounded-full bg-[#FF6B00]" />
          <span className="absolute inset-[-4px] rounded-full border border-[#FF6B00]/60" />
          <span className="absolute inset-[-10px] rounded-full border border-[#FF6B00]/15" />
        </motion.span>

        <motion.span
          className="block h-px shrink-0"
          style={{
            width: item.lineLength,
            transformOrigin: isRight ? "left center" : "right center",
            scaleX: lineScale,
            background: isRight
              ? "linear-gradient(to right, #FF6B00, rgba(255,107,0,0.25))"
              : "linear-gradient(to left, #FF6B00, rgba(255,107,0,0.25))",
          }}
        />

        <div
          className={`w-[min(280px,24vw)] shrink-0 rounded-xl border border-white/[0.12] bg-black/75 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md lg:w-[min(300px,22vw)] lg:px-3.5 lg:py-3 ${
            isRight ? "text-left" : "text-right"
          }`}
        >
          <div
            className={`mb-1 flex items-center gap-2 ${isRight ? "flex-row" : "flex-row-reverse"}`}
          >
            <span
              className="h-1 w-6 shrink-0 rounded-full bg-[#FF6B00]"
              aria-hidden
            />
            <h3 className="text-[12px] font-semibold leading-snug tracking-tight text-white lg:text-[13px]">
              {item.title}
            </h3>
          </div>
          <p
            className={`text-[11px] leading-[1.45] text-white/65 lg:text-[12px] lg:leading-[1.5] ${
              isRight ? "pl-8" : "pr-8"
            }`}
          >
            {item.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default CargoSketchSection;
