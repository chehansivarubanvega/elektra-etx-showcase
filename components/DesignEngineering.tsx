"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "motion/react";
import type { MotionValue } from "motion/react";

const TOTAL_FRAMES = 40;
const LAST_FRAME = TOTAL_FRAMES - 1;

type DesignStage = {
  id: string;
  tag: string;
  label: string;
  title: string;
  content: string;
  specs: string[];
};

const DesignEngineering = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedCountRef = useRef<number>(0);
  const priorityGateRef = useRef(false);
  
  const [imagesReady, setImagesReady] = useState(false);
  const [shouldPreload, setShouldPreload] = useState(false);
  const [activeStage, setActiveStage] = useState(0);

  // Core Scroll Logic
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 32,
    mass: 0.22,
    restDelta: 0.0001,
  });

  // Frame Mapping Logic
  const currentFrame = useTransform(smoothProgress, [0, 1], [0, LAST_FRAME]);

  // Sync active stage for HUD markers
  useMotionValueEvent(smoothProgress, "change", (v) => {
    const stage = Math.min(2, Math.floor(v * 3));
    if (stage !== activeStage) setActiveStage(stage);
  });

  useEffect(() => {
    if (!containerRef.current) return;
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
      { rootMargin: "0px 0px 1000px 0px" }
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

    const onResolved = () => {
      if (cancelled) return;
      loadedCountRef.current += 1;
      if (loadedCountRef.current >= TOTAL_FRAMES && !priorityGateRef.current) {
        priorityGateRef.current = true;
        setImagesReady(true);
      }
    };

    framePaths.forEach((path, index) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = onResolved;
      img.onerror = onResolved;
      img.src = path;
      arr[index] = img;
    });

    return () => { cancelled = true; };
  }, [shouldPreload]);

  useEffect(() => {
    if (!imagesReady || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let animationId = 0;
    let canvasW = 0;
    let canvasH = 0;
    let lastDrawnIndex = -1;

    const applySize = (w: number, h: number) => {
      const dpr = Math.min(globalThis.window?.devicePixelRatio ?? 1, 1.5);
      canvasW = w;
      canvasH = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawnIndex = -1;
    };

    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (Math.abs(w - canvasW) > 5 || Math.abs(h - canvasH) > 5) {
        applySize(w, h);
      }
    };

    const drawFrame = (frameIndex: number) => {
      const img = imagesRef.current[frameIndex];
      if (!img || !img.complete) return;
      
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = canvasW / canvasH;
      let drawW, drawH, offX, offY;

      if (imgRatio > canvasRatio) {
        drawW = canvasW;
        drawH = canvasW / imgRatio;
        offX = 0;
        offY = (canvasH - drawH) / 2;
      } else {
        drawH = canvasH;
        drawW = canvasH * imgRatio;
        offX = (canvasW - drawW) / 2;
        offY = 0;
      }

      context.clearRect(0, 0, canvasW, canvasH);
      context.drawImage(img, offX, offY, drawW, drawH);
    };

    const render = () => {
      const frameIdx = Math.round(currentFrame.get());
      if (frameIdx !== lastDrawnIndex) {
        drawFrame(frameIdx);
        lastDrawnIndex = frameIdx;
      }
      animationId = requestAnimationFrame(render);
    };

    sync();
    window.addEventListener('resize', sync);
    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', sync);
      cancelAnimationFrame(animationId);
    };
  }, [imagesReady, currentFrame]);

  const stages = [
    {
      id: "exterior",
      tag: "01",
      label: "EXTERIOR",
      title: "STRUCTURAL PURITY",
      content: "The ETX exterior is a masterclass in functional elegance. Every curve is calculated for aerodynamic efficiency, resulting in a drag coefficient that redefines the segment.",
      specs: ["Aero Efficiency: 0.22 Cd", "Structure: Carbon Reinforcement", "Finish: Liquid Chrome"]
    },
    {
      id: "interior",
      tag: "02",
      label: "CABIN",
      title: "DIGITAL COCOON",
      content: "Experience an interior designed around the human axis. Ultra-premium materials meet seamless digital integration, creating a space for both focus and relaxation.",
      specs: ["Materials: Vegan Silk", "Interface: Neural Link V2", "Capacity: 1400L Cargo"]
    },
    {
      id: "powertrain",
      tag: "03",
      label: "POWERTRAIN",
      title: "KINETIC MASTERY",
      content: "The powertrain leverages high-torque density motors and advanced thermal management to deliver sustained performance across any terrain.",
      specs: ["System Power: 680 kW", "Response: < 0.01s", "Cells: Solid State Gen IV"]
    }
  ];

  return (
    <section
      ref={containerRef}
      id="design-engineering"
      data-snap-stage="design"
      data-snap-native-scroll-mobile="true"
      className="relative w-full bg-[#030303] text-white"
      style={{ height: "300svh" }}
    >
      <div className="sticky top-0 flex h-[100svh] w-full flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Contained Technical Viewer */}
        <div className="relative flex h-[50vh] w-full items-center justify-center p-6 md:h-screen md:w-[45%] border-b md:border-b-0 md:border-r border-white/5">
          
          {/* Subtle Ambient Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative w-full max-w-[440px] md:max-w-[90%] aspect-[4/3] flex flex-col">
            
            {/* Viewer HUD Frame */}
            <div className="absolute -left-4 -top-4 h-8 w-8 border-l border-t border-[#FF6B00]/40" />
            <div className="absolute -right-4 -top-4 h-8 w-8 border-r border-t border-[#FF6B00]/40" />
            <div className="absolute -bottom-4 -left-4 h-8 w-8 border-b border-l border-[#FF6B00]/40" />
            <div className="absolute -bottom-4 -right-4 h-8 w-8 border-b border-r border-[#FF6B00]/40" />

            {/* Canvas Container */}
            <div className="relative flex-1 overflow-hidden bg-black/60 rounded-[2px] border border-white/10 ring-1 ring-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              
              {/* Corner Info HUD */}
              <div className="absolute left-4 top-4 z-10 font-mono text-[9px] uppercase tracking-[0.2em] text-[#FF6B00] flex items-center gap-2">
                <div className="h-1 w-1 bg-[#FF6B00] animate-pulse" />
                <span>SYS_INIT: OK</span>
              </div>
              
              <div className="absolute right-4 top-4 z-10 font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
                FRAME_{Math.round(currentFrame.get()).toString().padStart(2, '0')}
              </div>

              <canvas
                ref={canvasRef}
                className="h-full w-full object-contain"
                style={{ filter: "brightness(1.1) contrast(1.05)" }}
              />

              {!imagesReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  <div className="h-5 w-5 border border-white/20 border-t-[#FF6B00] animate-spin" />
                </div>
              )}
            </div>

            {/* Bottom Status bar for Viewer */}
            <div className="mt-5 flex items-end justify-between px-1">
               <div className="flex flex-col gap-1">
                 <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/20">Active_Protocol</span>
                 <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#FF6B00]">ETX-STUDY_{stages[activeStage].label}</span>
               </div>
               <div className="flex flex-col gap-1 items-end">
                 <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/20">Render_Engine</span>
                 <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/60">HYDRA_01v</span>
               </div>
            </div>
          </div>
        </div>

        {/* Right Side: Clear Narrative Column */}
        <div className="relative flex-1 md:h-screen bg-[#030303]">
          
          {/* Vertical Decoration */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5 hidden md:block" />
          
          <div className="h-full w-full relative">
            {stages.map((stage, i) => (
              <StageBlock 
                key={stage.id} 
                stage={stage} 
                index={i} 
                progress={smoothProgress} 
              />
            ))}
          </div>

          {/* HUD Badge */}
          <div className="absolute top-12 right-12 pointer-events-none hidden md:block">
            <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/10">Project_Nova</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const StageBlock = ({
  stage,
  index,
  progress,
}: {
  stage: DesignStage;
  index: number;
  progress: MotionValue<number>;
}) => {
  const start = index / 3;
  const end = (index + 1) / 3;
  
  const opacity = useTransform(progress, 
    [start - 0.08, start + 0.04, end - 0.04, end + 0.08], 
    [0, 1, 1, 0]
  );
  
  const x = useTransform(progress, 
    [start - 0.08, start + 0.04, end - 0.04, end + 0.08], 
    [20, 0, 0, -20]
  );

  return (
    <motion.article
      data-snap-anchor={`design-${index}`}
      style={{ opacity, x }}
      className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 lg:px-24"
    >
      <div className="max-w-xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="font-mono text-[12px] font-bold text-[#FF6B00]">{stage.tag}</span>
            <div className="h-8 w-px bg-[#FF6B00]/30 mt-1" />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/40">
            {stage.label}
          </span>
        </div>

        <h2 className="mb-8 text-[clamp(2.5rem,6vw,4rem)] font-black uppercase leading-tight tracking-tighter text-white">
          {stage.title}
        </h2>

        <p className="mb-10 text-neutral-400 text-[16px] leading-relaxed md:text-[18px] max-w-lg font-light">
          {stage.content}
        </p>

        <div className="flex flex-col gap-4 border-t border-white/5 pt-10">
          {stage.specs.map((spec: string, idx: number) => (
            <div key={idx} className="flex items-center group">
              <div className="h-px w-0 group-hover:w-4 transition-all duration-300 bg-[#FF6B00] mr-0 group-hover:mr-3" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50 group-hover:text-white transition-colors">
                {spec}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  );
};

export default DesignEngineering;
