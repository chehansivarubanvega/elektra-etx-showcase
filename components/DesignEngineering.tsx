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
      className="relative w-full bg-[#000000] text-white flex flex-col md:flex-row items-start border-t border-white/10"
      id="design-engineering"
    >
      {/* LEFT SIDE: STICKY CANVAS RENDER ENGINE */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-screen sticky top-0 flex items-center justify-center p-6 md:p-12 lg:p-24 border-b md:border-b-0 md:border-r border-white/10 z-0 bg-black">
        {/* High-Tech HUD Blueprint Frame */}
        <div className="relative w-full h-full max-h-[60vh] md:max-h-[70vh] flex items-center justify-center group">
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
            className="w-full h-full object-contain relative z-20"
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
      <div className="w-full md:w-1/2 flex flex-col z-10 bg-black/0 md:bg-transparent">
        
        {/* Block 1: Exterior */}
        <div className="min-h-screen w-full flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="w-2 h-2 bg-[#FF6B00]" />
              <span className="text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase text-[#FF6B00]">STAGE 01. EXTERIOR</span>
            </div>
            <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black mb-4 md:mb-8 tracking-tighter uppercase leading-[0.9] break-words">
              A NEW<br />SILHOUETTE
            </h2>
            <p className="text-[12px] md:text-[13px] text-white/50 leading-relaxed font-light mb-6 md:mb-8 max-w-sm">
              ETX sets a new style standard in urban mobility. Its unique design boldly stands out on city streets, symbolizing electric confidence. Crafted with elegance, every detail exudes dynamism, from sleek lines to captivating DRLs. Beyond looks, ETX represents sustainable elegance, redefining urban driving.
            </p>
            <div className="w-12 h-[1px] bg-white/20" />
          </div>
        </div>

        {/* Block 2: Interior */}
        <div className="min-h-screen w-full flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="w-2 h-2 bg-[#FF6B00]" />
              <span className="text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase text-[#FF6B00]">STAGE 02. INTERIOR</span>
            </div>
            <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black mb-4 md:mb-8 tracking-tighter uppercase leading-[0.9] break-words">
              STYLE MEETS<br />PRACTICALITY
            </h2>
            <p className="text-[12px] md:text-[13px] text-white/50 leading-relaxed font-light mb-6 md:mb-8 max-w-sm">
              Glide through the city with ease, indulging in luxurious interiors crafted for passenger satisfaction. Enjoy ergonomic design, connectivity, and safety features for a superior driving experience. Redefine urban travel with ETX&apos;s blend of style and convenience.
            </p>
            <div className="w-12 h-[1px] bg-white/20" />
          </div>
        </div>

        {/* Block 3: Powertrain */}
        <div className="min-h-screen w-full flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="w-2 h-2 bg-[#FF6B00]" />
              <span className="text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase text-[#FF6B00]">STAGE 03. POWERTRAIN</span>
            </div>
            <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black mb-4 md:mb-8 tracking-tighter uppercase leading-[0.9] break-words">
              INNOVATION<br />IN MOTION
            </h2>
            <p className="text-[12px] md:text-[13px] text-white/50 leading-relaxed font-light mb-6 md:mb-8 max-w-sm">
              Introducing the cutting-edge Powertrain of ETX, designed by experts for outstanding performance. Built to endure diverse terrains, and rigorously tested, ETX ensures reliability without compromising power.
            </p>
            <div className="w-12 h-[1px] bg-white/20" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default DesignEngineering;
