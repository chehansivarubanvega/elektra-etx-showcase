'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useSpring } from 'motion/react';

const TOTAL_FRAMES_P1 = 30;
const TOTAL_FRAMES_P2 = 60;
const TOTAL_FRAMES = TOTAL_FRAMES_P1 + TOTAL_FRAMES_P2;

const DesignEngineering = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Track scroll progress of the entire section natively
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth out the scroll progress *only* for the canvas frames to keep "buttery" interpolation
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 300,
    damping: 40,
    restDelta: 0.001
  });

  // Preload images
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    const framePaths: string[] = [];
    // Path 1
    for (let i = 1; i <= TOTAL_FRAMES_P1; i++) {
      framePaths.push(`/design1/ezgif-frame-${String(i).padStart(3, '0')}.png`);
    }
    // Path 2
    for (let i = 1; i <= TOTAL_FRAMES_P2; i++) {
      framePaths.push(`/design2/ezgif-frame-${String(i).padStart(3, '0')}.png`);
    }

    framePaths.forEach((path, index) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) {
          setImagesLoaded(true);
        }
      };
      loadedImages[index] = img;
    });

    setImages(loadedImages);
  }, []);

  // Canvas render logic
  useEffect(() => {
    if (!imagesLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationId: number;

    const render = () => {
      const progress = smoothProgress.get();
      // Ensure we stay within bounds [0, 1]
      const clampedProgress = Math.max(0, Math.min(0.999, progress));
      const frameIndex = Math.floor(clampedProgress * TOTAL_FRAMES);
      
      const img = images[frameIndex];
      if (img && img.complete) {
        // Adjust for devicePixelRatio
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        context.scale(dpr, dpr);

        context.clearRect(0, 0, rect.width, rect.height);

        // Draw image centered and scaled to contain
        const imgRatio = img.width / img.height;
        const canvasRatio = rect.width / rect.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > canvasRatio) {
          drawWidth = rect.width;
          drawHeight = rect.width / imgRatio;
          offsetX = 0;
          offsetY = (rect.height - drawHeight) / 2;
        } else {
          drawWidth = rect.height * imgRatio;
          drawHeight = rect.height;
          offsetX = (rect.width - drawWidth) / 2;
          offsetY = 0;
        }

        context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      }
      animationId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [imagesLoaded, images, smoothProgress]);

  return (
    <section 
      ref={containerRef} 
      className="relative w-full bg-[#000000] text-white flex flex-col md:flex-row items-stretch border-t border-white/10"
      id="design-engineering"
    >
      {/* LEFT SIDE: STICKY CANVAS — higher z-index on mobile so scrolling copy does not paint over the sequence */}
      <div className="sticky top-0 z-30 flex h-[50vh] max-h-[560px] min-h-[300px] w-full shrink-0 items-center justify-center border-b border-white/10 bg-black p-4 sm:h-[48vh] sm:min-h-[320px] sm:p-6 md:z-0 md:h-screen md:max-h-none md:min-h-0 md:w-1/2 md:border-b-0 md:border-r md:p-10 lg:p-16 xl:p-20">
        {/* High-Tech HUD Blueprint Frame */}
        <div className="group relative flex h-full min-h-[240px] w-full max-h-full items-center justify-center md:max-h-[70vh]">
          {/* Corner Accents */}
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
          
          {!imagesLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border border-white/20 border-t-[#FF6B00] animate-spin" />
                <p className="text-[#FF6B00] font-mono text-[10px] tracking-[0.4em] uppercase opacity-80">Initializing Core...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: NATURALLY SCROLLING CONTENT MODULES */}
      <div className="relative z-0 flex min-w-0 w-full flex-col bg-black md:w-1/2 md:bg-transparent">
        {/* Shared: fluid display size, balance lines, no mid-word breaks from break-words */}
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
            className="flex min-h-[min(100dvh,920px)] w-full flex-col justify-center px-5 py-14 sm:px-8 sm:py-16 md:min-h-screen md:px-10 md:py-20 lg:px-14 lg:py-24 xl:px-20"
          >
            <article className="w-full max-w-[min(100%,36rem)] lg:max-w-[min(100%,40rem)]">
              <div className="mb-4 flex items-center gap-3 md:mb-6">
                <div className="h-2 w-2 shrink-0 bg-[#FF6B00]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#FF6B00] sm:text-[10px] sm:tracking-[0.4em]">
                  {block.stage}
                </span>
              </div>
              <h2 className="mb-5 text-[clamp(1.875rem,calc(0.75rem+5.5vw),3.75rem)] font-black uppercase leading-[1.02] tracking-[-0.02em] text-white text-balance antialiased [hyphens:none] md:mb-8 md:text-[clamp(2.125rem,calc(0.5rem+4.2vw),4.25rem)] md:leading-[1.05]">
                {block.title}
              </h2>
              <p className="mb-6 max-w-prose text-[13px] font-normal leading-[1.7] text-white/72 antialiased sm:text-[14px] md:mb-8 md:text-[15px] md:leading-[1.75]">
                {block.body}
              </p>
              <div className="h-px w-12 bg-white/25" aria-hidden />
            </article>
          </div>
        ))}

      </div>
    </section>
  );
};

export default DesignEngineering;
