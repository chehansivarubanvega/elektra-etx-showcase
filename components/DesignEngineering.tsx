"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const TOTAL_FRAMES = 40;
const LAST_FRAME = TOTAL_FRAMES - 1;
const PRIORITY_LEAD = 8;
/** 0-based index for `33.webp` when the powertrain headline reaches the viewport. */
const POWERTRAIN_FRAME_INDEX = 32;
/** Viewport Y (px from top) where we treat the headline as “on screen” for sync with frame 33. */
const POWERTRAIN_ANCHOR_Y_FRAC = 0.44;
/** Extra scroll height so each frame gets a wider progress band (vh added in the copy column). */
const SCROLL_PAD_VH = 72;

/** Map section scroll progress so frame `POWERTRAIN_FRAME_INDEX` lines up with `pAlign`. */
const remappedExactFrame = (p: number, pAlign: number) => {
  const clampedP = Math.min(1, Math.max(0, p));
  const a = Math.min(0.98, Math.max(0.02, pAlign));
  if (clampedP <= a) {
    return (clampedP / a) * POWERTRAIN_FRAME_INDEX;
  }
  const span = 1 - a;
  return (
    POWERTRAIN_FRAME_INDEX +
    ((clampedP - a) / span) * (LAST_FRAME - POWERTRAIN_FRAME_INDEX)
  );
};

const DesignEngineering = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const powertrainHeadlineRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedCountRef = useRef<number>(0);
  const priorityGateRef = useRef(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [shouldPreload, setShouldPreload] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const mobileProgressWidth = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "100%"],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldPreload(true);
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
      { rootMargin: "600px 0px" },
    );
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldPreload) return;

    let cancelled = false;

    const framePaths: string[] = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      framePaths.push(`/design_collection/${i}.webp`);
    }

    const arr = new Array<HTMLImageElement>(framePaths.length);
    imagesRef.current = arr;
    loadedCountRef.current = 0;
    priorityGateRef.current = false;

    const onResolved = () => {
      if (cancelled) return;
      loadedCountRef.current += 1;
      // Wait until every slot has finished (load or error) so scrubbing never skips frames
      // because draw() failed while scrollYProgress had already moved on.
      if (loadedCountRef.current >= TOTAL_FRAMES && !priorityGateRef.current) {
        priorityGateRef.current = true;
        setImagesReady(true);
      }
    };

    framePaths.forEach((path, index) => {
      const img = new Image();
      img.decoding = "async";
      if (index < PRIORITY_LEAD) {
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
          "high";
      } else {
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
          "low";
      }
      img.onload = onResolved;
      img.onerror = onResolved;
      img.src = path;
      arr[index] = img;
    });

    return () => {
      cancelled = true;
    };
  }, [shouldPreload]);

  useEffect(() => {
    if (!imagesReady || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    context.imageSmoothingEnabled = true;
    const ctx2d = context as CanvasRenderingContext2D & {
      imageSmoothingQuality?: string;
    };
    ctx2d.imageSmoothingQuality = "high";

    let animationId = 0;
    let canvasW = 0;
    let canvasH = 0;
    let dpr = 1;
    let lastDrawnIndex = -1;

    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      const nextDpr = Math.min(globalThis.window?.devicePixelRatio ?? 1, 1.5);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (w === canvasW && h === canvasH && nextDpr === dpr) return false;
      canvasW = w;
      canvasH = h;
      dpr = nextDpr;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawnIndex = -1;
      return true;
    };

    const layoutForImage = (img: HTMLImageElement, w: number, h: number) => {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = w / h;
      const narrow =
        typeof globalThis.window !== "undefined" &&
        globalThis.window.innerWidth < 768;
      let drawW: number;
      let drawH: number;
      let offX: number;
      let offY: number;
      if (imgRatio > canvasRatio) {
        drawW = w;
        drawH = w / imgRatio;
        offX = 0;
        // Mobile: anchor wide frames toward the bottom of the viewport (less empty space under the vehicle).
        offY = narrow ? h - drawH - h * 0.03 : (h - drawH) / 2;
      } else {
        drawW = h * imgRatio;
        drawH = h;
        offX = (w - drawW) / 2;
        offY = 0;
      }
      return { drawW, drawH, offX, offY };
    };

    const drawFrame = (frameIndex: number) => {
      const img = imagesRef.current[frameIndex];
      if (!img || !img.complete || img.naturalWidth === 0) return false;
      const w = canvasW;
      const h = canvasH;
      const { drawW, drawH, offX, offY } = layoutForImage(img, w, h);
      context.clearRect(0, 0, w, h);
      context.drawImage(img, offX, offY, drawW, drawH);
      return true;
    };

    const computePowertrainAlignProgress = () => {
      const section = containerRef.current;
      const headline = powertrainHeadlineRef.current;
      if (!section || !headline) return 0.68;
      const vh = globalThis.window.innerHeight;
      const sh = section.offsetHeight;
      const alignY = vh * POWERTRAIN_ANCHOR_Y_FRAC;
      const L =
        headline.getBoundingClientRect().top -
        section.getBoundingClientRect().top;
      const denom = vh - sh;
      if (Math.abs(denom) < 2) return 0.68;
      const raw = (alignY - L) / denom;
      if (!Number.isFinite(raw)) return 0.68;
      return Math.min(0.97, Math.max(0.03, raw));
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => sync())
        : null;
    resizeObserver?.observe(canvas);
    sync();

    const render = () => {
      const p = Math.min(1, Math.max(0, scrollYProgress.get()));
      const pAlign = computePowertrainAlignProgress();
      const targetExact = remappedExactFrame(p, pAlign);
      const frameIndex = Math.min(
        LAST_FRAME,
        Math.max(0, Math.round(targetExact)),
      );
      if (frameIndex !== lastDrawnIndex) {
        if (drawFrame(frameIndex)) lastDrawnIndex = frameIndex;
      }
      animationId = globalThis.window.requestAnimationFrame(render);
    };

    animationId = globalThis.window.requestAnimationFrame(render);

    return () => {
      globalThis.window.cancelAnimationFrame(animationId);
      resizeObserver?.disconnect();
    };
  }, [imagesReady, scrollYProgress]);

  const storyBlocks = [
    {
      stage: "STAGE 01. EXTERIOR",
      title: (
        <>
          <span className="block">A NEW</span>
          <span className="block">SILHOUETTE</span>
        </>
      ),
      body: "ETX sets a new style standard in urban mobility. Its unique design boldly stands out on city streets, symbolizing electric confidence. Crafted with elegance, every detail exudes dynamism, from sleek lines to captivating DRLs. Beyond looks, ETX represents sustainable elegance, redefining urban driving.",
    },
    {
      stage: "STAGE 02. INTERIOR",
      title: (
        <>
          <span className="block md:inline">STYLE MEETS </span>
          <span className="block md:inline">PRACTICALITY</span>
        </>
      ),
      body: "Glide through the city with ease, indulging in luxurious interiors crafted for passenger satisfaction. Enjoy ergonomic design, connectivity, and safety features for a superior driving experience. Redefine urban travel with ETX's blend of style and convenience.",
    },
    {
      stage: "STAGE 03. POWERTRAIN",
      title: (
        <>
          <span className="block lg:inline">INNOVATION </span>
          <span className="block lg:inline">IN MOTION</span>
        </>
      ),
      body: "Introducing the cutting-edge Powertrain of ETX, designed by experts for outstanding performance. Built to endure diverse terrains, and rigorously tested, ETX ensures reliability without compromising power.",
    },
  ] as const;

  return (
    <section
      ref={containerRef}
      className="relative flex w-full min-w-0 max-w-full flex-col items-stretch overflow-x-clip border-t border-white/10 bg-[#030303] text-white md:flex-row md:bg-[#000000]"
      id="design-engineering"
    >
      {/* —— Mobile: compact rail (desktop: hidden) —— */}
      <div className="relative border-b border-white/[0.06] bg-gradient-to-b from-black to-[#080808] px-4 pb-5 pt-8 md:hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden
        />
        <div className="relative">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.42em] text-[#FF6B00]">
            Design & engineering
          </p>
          <h2 className="mt-2 max-w-[20ch] text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-white">
            Every angle, intentional.
          </h2>
          <p className="mt-3 max-w-[34ch] text-[13px] leading-relaxed text-white/50">
            Scroll to move through the story—exterior, cabin, and what drives the ETX.
          </p>
        </div>
      </div>

      <div className="sticky top-0 z-30 flex min-h-0 w-full shrink-0 flex-col items-stretch border-b border-white/10 bg-[#030303] md:z-0 md:h-screen md:max-h-none md:min-h-0 md:w-1/2 md:border-b-0 md:border-r md:bg-black">
        {/* Mobile: shorter viewport + full width — less “floating box” dead space */}
        <div className="flex min-h-[min(40dvh,360px)] max-h-[min(48dvh,440px)] flex-1 flex-col justify-end px-3 pb-1 pt-3 md:max-h-none md:min-h-0 md:flex-none md:justify-center md:p-10 lg:p-16 xl:p-20">
          <div className="group relative mx-auto flex h-full min-h-[200px] w-full max-w-none flex-1 items-stretch md:max-h-[70vh] md:max-w-none md:items-center md:justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF6B00]/12 via-transparent to-blue-500/5 p-px md:hidden">
              <div className="h-full w-full rounded-[0.98rem] bg-[#070707]" />
            </div>
            <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505] shadow-[0_16px_48px_rgba(0,0,0,0.5)] md:rounded-none md:border-0 md:bg-transparent md:shadow-none">
              <div
                className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#FF6B00]/45 to-transparent md:hidden"
                aria-hidden
              />
              <div className="absolute top-0 left-0 hidden h-8 w-8 border-t border-l border-white/30 md:block" />
              <div className="absolute top-0 right-0 hidden h-8 w-8 border-t border-r border-white/30 md:block" />
              <div className="absolute bottom-0 left-0 hidden h-8 w-8 border-b border-l border-white/30 md:block" />
              <div className="absolute bottom-0 right-0 hidden h-8 w-8 border-b border-r border-white/30 md:block" />

              <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/50 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.2em] text-[#FF6B00]/95 backdrop-blur-sm md:left-4 md:top-4 md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-[9px] md:tracking-[0.2em]">
                <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B00] opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF6B00] md:h-2 md:w-2" />
                </span>
                Live
              </div>

              <div className="relative z-20 flex min-h-0 flex-1 flex-col justify-end px-1.5 pb-1.5 pt-8 md:flex-none md:justify-center md:p-0 md:pt-0">
                <canvas
                  ref={canvasRef}
                  className="block max-h-full min-h-0 w-full min-w-0 flex-1"
                />
              </div>

              <div className="absolute bottom-2 right-3 z-10 hidden font-mono text-[9px] uppercase tracking-[0.3em] text-white/30 md:bottom-4 md:right-4 md:block">
                ETX_DATA_V.01
              </div>

              {!imagesReady && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 md:bg-black">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-9 w-9 rounded-full border border-white/15 border-t-[#FF6B00] animate-spin" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#FF6B00]/90">
                      Loading…
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-2 border-t border-white/[0.05] bg-black/30 px-3 py-2.5 md:hidden"
          aria-label="Progress through this section"
        >
          <div className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FF6B00] to-amber-400/90"
              style={{ width: mobileProgressWidth }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-0 flex min-w-0 w-full flex-col bg-[#030303] md:w-1/2 md:bg-transparent">
        {storyBlocks.map((block, blockIndex) => (
          <div
            key={block.stage}
            className={`flex w-full flex-col px-4 pb-10 pt-6 sm:px-5 md:min-h-[min(115dvh,1100px)] md:justify-center md:px-10 md:py-20 md:pb-20 md:pt-0 lg:px-14 lg:py-24 xl:px-20 ${
              blockIndex === 2
                ? "min-h-[min(88dvh,840px)] md:min-h-[min(115dvh,1100px)]"
                : "min-h-[min(72dvh,680px)]"
            } justify-start md:justify-center`}
          >
            <article className="relative w-full max-w-[min(100%,36rem)] border-l-2 border-[#FF6B00]/70 pl-4 sm:pl-5 md:max-w-[min(100%,40rem)] md:border-0 md:pl-0 lg:max-w-[min(100%,40rem)]">
              <div
                className="pointer-events-none absolute bottom-0 right-0 select-none font-black leading-none text-white/[0.04] md:hidden"
                style={{ fontSize: "clamp(3.5rem, 22vw, 5.5rem)" }}
                aria-hidden
              >
                {String(blockIndex + 1).padStart(2, "0")}
              </div>

              <div className="relative mb-3 md:mb-6">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.32em] text-[#FF6B00] sm:text-[10px] sm:tracking-[0.36em]">
                  {block.stage}
                </span>
              </div>
              <h2
                ref={
                  block.stage === "STAGE 03. POWERTRAIN"
                    ? powertrainHeadlineRef
                    : undefined
                }
                className="relative mb-4 text-[clamp(1.75rem,calc(0.55rem+5.8vw),3.25rem)] font-black uppercase leading-[1.02] tracking-[-0.03em] text-balance text-white antialiased [hyphens:none] md:mb-8 md:text-[clamp(2.125rem,calc(0.5rem+4.2vw),4.25rem)] md:leading-[1.05]"
              >
                {block.title}
              </h2>
              <p className="relative mb-0 max-w-prose text-[13px] font-normal leading-[1.72] text-white/68 antialiased sm:text-[14px] md:mb-8 md:text-[15px] md:leading-[1.75]">
                {block.body}
              </p>
              <div className="relative mt-5 hidden items-center gap-2 md:flex" aria-hidden>
                <div className="h-px w-12 bg-gradient-to-r from-[#FF6B00]/80 to-white/20" />
              </div>
            </article>
          </div>
        ))}
        <div
          className="pointer-events-none w-full shrink-0 bg-transparent"
          style={{ minHeight: `${SCROLL_PAD_VH}vh` }}
          aria-hidden
        />
      </div>
    </section>
  );
};

export default DesignEngineering;
