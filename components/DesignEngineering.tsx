'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScroll } from 'motion/react';

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
  return POWERTRAIN_FRAME_INDEX + ((clampedP - a) / span) * (LAST_FRAME - POWERTRAIN_FRAME_INDEX);
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
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
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
      { rootMargin: '600px 0px' },
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
      img.decoding = 'async';
      if (index < PRIORITY_LEAD) {
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
      } else {
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
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
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    context.imageSmoothingEnabled = true;
    const ctx2d = context as CanvasRenderingContext2D & { imageSmoothingQuality?: string };
    ctx2d.imageSmoothingQuality = 'high';

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
      let drawW: number;
      let drawH: number;
      let offX: number;
      let offY: number;
      if (imgRatio > canvasRatio) {
        drawW = w;
        drawH = w / imgRatio;
        offX = 0;
        offY = (h - drawH) / 2;
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
      const L = headline.getBoundingClientRect().top - section.getBoundingClientRect().top;
      const denom = vh - sh;
      if (Math.abs(denom) < 2) return 0.68;
      const raw = (alignY - L) / denom;
      if (!Number.isFinite(raw)) return 0.68;
      return Math.min(0.97, Math.max(0.03, raw));
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => sync()) : null;
    resizeObserver?.observe(canvas);
    sync();

    const render = () => {
      const p = Math.min(1, Math.max(0, scrollYProgress.get()));
      const pAlign = computePowertrainAlignProgress();
      const targetExact = remappedExactFrame(p, pAlign);
      const frameIndex = Math.min(LAST_FRAME, Math.max(0, Math.round(targetExact)));
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

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-[#000000] text-white flex flex-col md:flex-row items-stretch border-t border-white/10"
      id="design-engineering"
    >
      <div className="sticky top-0 z-30 flex h-[50vh] max-h-[560px] min-h-[300px] w-full shrink-0 items-center justify-center border-b border-white/10 bg-black p-4 sm:h-[48vh] sm:min-h-[320px] sm:p-6 md:z-0 md:h-screen md:max-h-none md:min-h-0 md:w-1/2 md:border-b-0 md:border-r md:p-10 lg:p-16 xl:p-20">
        <div className="group relative flex h-full min-h-[240px] w-full max-h-full items-center justify-center md:max-h-[70vh]">
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/30" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/30" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/30" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/30" />

          <div className="absolute top-4 left-4 flex gap-2 items-center text-[#FF6B00] font-mono text-[9px] tracking-[0.2em] uppercase opacity-80 z-10">
            <div className="w-1.5 h-1.5 bg-[#FF6B00]" /> ENG.SYS // RENDER
          </div>
          <div className="absolute bottom-4 right-4 text-white/30 font-mono text-[9px] tracking-[0.3em] uppercase z-10">
            ETX_DATA_V.01
          </div>

          <canvas
            ref={canvasRef}
            className="relative z-20 block h-full min-h-[200px] w-full max-h-full object-contain"
          />

          {!imagesReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border border-white/20 border-t-[#FF6B00] animate-spin" />
                <p className="text-[#FF6B00] font-mono text-[10px] tracking-[0.4em] uppercase opacity-80">
                  Initializing Core...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-0 flex min-w-0 w-full flex-col bg-black md:w-1/2 md:bg-transparent">
        {(
          [
            {
              stage: 'STAGE 01. EXTERIOR',
              title: (
                <>
                  <span className="block">A NEW</span>
                  <span className="block">SILHOUETTE</span>
                </>
              ),
              body:
                'ETX sets a new style standard in urban mobility. Its unique design boldly stands out on city streets, symbolizing electric confidence. Crafted with elegance, every detail exudes dynamism, from sleek lines to captivating DRLs. Beyond looks, ETX represents sustainable elegance, redefining urban driving.',
            },
            {
              stage: 'STAGE 02. INTERIOR',
              title: (
                <>
                  <span className="block md:inline">STYLE MEETS </span>
                  <span className="block md:inline">PRACTICALITY</span>
                </>
              ),
              body:
                "Glide through the city with ease, indulging in luxurious interiors crafted for passenger satisfaction. Enjoy ergonomic design, connectivity, and safety features for a superior driving experience. Redefine urban travel with ETX's blend of style and convenience.",
            },
            {
              stage: 'STAGE 03. POWERTRAIN',
              title: (
                <>
                  <span className="block lg:inline">INNOVATION </span>
                  <span className="block lg:inline">IN MOTION</span>
                </>
              ),
              body:
                'Introducing the cutting-edge Powertrain of ETX, designed by experts for outstanding performance. Built to endure diverse terrains, and rigorously tested, ETX ensures reliability without compromising power.',
            },
          ] as const
        ).map((block) => (
          <div
            key={block.stage}
            className="flex min-h-[min(100dvh,920px)] w-full flex-col justify-center px-5 py-14 sm:px-8 sm:py-16 md:min-h-[min(115dvh,1100px)] md:px-10 md:py-20 lg:px-14 lg:py-24 xl:px-20"
          >
            <article className="w-full max-w-[min(100%,36rem)] lg:max-w-[min(100%,40rem)]">
              <div className="mb-4 flex items-center gap-3 md:mb-6">
                <div className="h-2 w-2 shrink-0 bg-[#FF6B00]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#FF6B00] sm:text-[10px] sm:tracking-[0.4em]">
                  {block.stage}
                </span>
              </div>
              <h2
                ref={block.stage === 'STAGE 03. POWERTRAIN' ? powertrainHeadlineRef : undefined}
                className="mb-5 text-[clamp(1.875rem,calc(0.75rem+5.5vw),3.75rem)] font-black uppercase leading-[1.02] tracking-[-0.02em] text-white text-balance antialiased [hyphens:none] md:mb-8 md:text-[clamp(2.125rem,calc(0.5rem+4.2vw),4.25rem)] md:leading-[1.05]"
              >
                {block.title}
              </h2>
              <p className="mb-6 max-w-prose text-[13px] font-normal leading-[1.7] text-white/72 antialiased sm:text-[14px] md:mb-8 md:text-[15px] md:leading-[1.75]">
                {block.body}
              </p>
              <div className="h-px w-12 bg-white/25" aria-hidden />
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
