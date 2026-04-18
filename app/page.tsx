'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Navbar } from '@/components/Navbar';
import { VehicleScene } from '@/components/VehicleScene';
import { Loader } from '@/components/Loader';
import DesignEngineering from '@/components/DesignEngineering';
import CargoSketchSection from '@/components/CargoSketchSection';
import InteractiveStudio from '@/components/InteractiveStudio';
import Footer from '@/components/Footer';
import SnapController from '@/components/SnapController';

// Register ScrollTrigger
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollData = useRef({ hero: 0, metrics: 0, urban: 0, charging: 0, daylight: 0 });

  useGSAP(() => {
    if (!containerRef.current) return;

    ScrollTrigger.config({ ignoreMobileResize: true });
    gsap.ticker.lagSmoothing(500, 33);

    const mainTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=500%',
        scrub: 0.6,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        fastScrollEnd: true,
        preventOverlaps: true,
        // Single master update for 3D state - more performant than multiple tweens
        onUpdate: (self) => {
          const p = self.progress;
          // Map overall progress to 0-1 for each section (5 stages)
          // 0.0 - 0.2: Hero
          // 0.2 - 0.4: Metrics
          // 0.4 - 0.6: Urban
          // 0.6 - 0.8: Charging
          // 0.8 - 1.0: Daylight
          scrollData.current.hero = gsap.utils.clamp(0, 1, p * 5);
          scrollData.current.metrics = gsap.utils.clamp(0, 1, (p - 0.2) * 5);
          // SnapController pins "urban" at ~p=0.46 (see HERO_SUBSTAGES). A linear
          // (p-0.4)*5 map only yields ~0.3 there, so the 3D beat never reached its
          // settled pose. Ramp urban to 1 across [0.4, 0.46] and keep the wider
          // plateau through the rest of the urban scroll window.
          const urbanLinear = (p - 0.4) * 5;
          const urbanSnapRamp = (p - 0.4) / 0.06;
          scrollData.current.urban = gsap.utils.clamp(
            0,
            1,
            Math.max(urbanLinear, urbanSnapRamp),
          );
          scrollData.current.charging = gsap.utils.clamp(0, 1, (p - 0.6) * 5);
          scrollData.current.daylight = gsap.utils.clamp(0, 1, (p - 0.8) * 5);
        }
      },
    });

    // 1. Hero -> Metrics Transition
    mainTl.to('.hero-hud', { 
      autoAlpha: 0, 
      y: -30, 
      duration: 1, 
      ease: "power2.inOut" 
    });
    
    mainTl.to('.bg-text', { 
      autoAlpha: 0, 
      scale: 3, 
      force3D: true, 
      duration: 1.5, 
      ease: "power2.in" 
    }, "<");

    // 2. Metrics Section
    mainTl.fromTo('.metrics-sidebar', 
      { autoAlpha: 0, x: 50 },
      { autoAlpha: 1, x: 0, pointerEvents: 'auto', duration: 1.5 },
      ">"
    );
    mainTl.fromTo(
      '.metrics-bg',
      { autoAlpha: 0, scale: 1.08 },
      { autoAlpha: 0.55, scale: 1, duration: 1.5, ease: 'power2.out' },
      "<"
    );
    mainTl.fromTo('.metric-item', 
      { autoAlpha: 0, x: -30 },
      { autoAlpha: 1, x: 0, stagger: 0.1, duration: 0.8 },
      "<0.5"
    );

    // 3. Metrics -> Urban Transition
    mainTl.to('.metrics-sidebar', { autoAlpha: 0, x: -50, duration: 1 }, "+=1");
    mainTl.to('.metrics-bg', { autoAlpha: 0, scale: 1.04, duration: 1, ease: 'power2.inOut' }, "<");
    mainTl.fromTo(
      '.urban-bg-image',
      { autoAlpha: 0, scale: 1.16, yPercent: 8, filter: 'blur(14px) brightness(0.45) saturate(1.3)' },
      { autoAlpha: 0.78, scale: 1, yPercent: 0, filter: 'blur(0px) brightness(0.92) saturate(1.08)', duration: 1.8, ease: 'power4.out' },
      "<0.1"
    );
    mainTl.fromTo(
      '.urban-bg-overlay, .urban-bg-glow',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 1.4, ease: 'power2.out' },
      "<"
    );
    
    mainTl.fromTo('.urban-sidebar', 
      { autoAlpha: 0, x: 50 },
      { autoAlpha: 1, x: 0, pointerEvents: 'auto', duration: 1.5 },
      ">"
    );
    mainTl.fromTo('.urban-text-stagger', 
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, stagger: 0.1, duration: 1 },
      "<0.5"
    );

    // 4. Urban -> Charging Transition
    mainTl.to('.urban-sidebar', { autoAlpha: 0, x: 100, duration: 1 }, "+=1");
    mainTl.to('.urban-bg-image', { autoAlpha: 0, scale: 1.04, yPercent: -3, duration: 1, ease: 'power2.inOut' }, "<");
    mainTl.to('.urban-bg-overlay, .urban-bg-glow', { autoAlpha: 0, duration: 1, ease: 'power2.inOut' }, "<");
    
    // Hold an empty transition beat: only the 3D model drives across
    mainTl.to({}, { duration: 2.2 });

    // 5. Daylight / Freedom Section
    mainTl.to(containerRef.current, {
      backgroundColor: '#ffffff',
      duration: 1.5,
      ease: "power2.inOut"
    }, ">");

    mainTl.fromTo('.daylight-sidebar', 
      { autoAlpha: 0, y: 50 },
      { autoAlpha: 1, y: 0, pointerEvents: 'auto', duration: 1.5 },
      "<"
    );

    mainTl.fromTo('.daylight-text-stagger', 
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, stagger: 0.2, duration: 1, ease: "power2.out" },
      "<0.5"
    );

    mainTl.to('.navbar-logo, .navbar-item', { color: '#000000', duration: 0.5 }, "<");
    mainTl.to('.bg-text', { color: '#000000', autoAlpha: 0.05, duration: 1 }, "<");
    mainTl.to('.daylight-sidebar', { autoAlpha: 0, duration: 1 }, ">+=1.5");

  }, { scope: containerRef });

  const metrics = [
    { value: '150 km', label: 'RANGE', detail: 'Optimized for long-distance urban commuting.' },
    { value: '70 kmph', label: 'TOP SPEED', detail: 'Electronically capped for maximum safety.' },
    { value: '10 kW', label: 'PEAK POWER', detail: 'High-torque brushless DC motor.' },
    { value: '18°', label: 'GRADEABILITY', detail: 'Seamlessly tackle steep urban inclines.' },
  ];

  return (
    <main className="relative min-w-0 max-w-full overflow-x-clip bg-[#000000] text-white">
      <Loader />
      <Navbar />
      <SnapController />

      <div className="fixed inset-4 orange-frame grid-overlay pointer-events-none z-50 opacity-10" />

      <section
        ref={containerRef}
        data-snap-stage="hero"
        className="relative h-screen w-full min-w-0 max-w-full overflow-hidden bg-black"
      >
        <div
          className="metrics-bg absolute inset-0 z-0 opacity-0 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/sigiriya.png')" }}
        />
        <div className="metrics-bg absolute inset-0 z-0 opacity-0 pointer-events-none bg-gradient-to-b from-black/90 via-black/75 to-black/85" />
        <div
          className="urban-bg-image absolute inset-0 z-0 opacity-0 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/city.png')" }}
        />
        <div className="urban-bg-overlay absolute inset-0 z-0 opacity-0 pointer-events-none bg-gradient-to-b from-black/85 via-black/55 to-black/82" />
        <div className="urban-bg-glow absolute inset-0 z-0 opacity-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,107,0,0.16)_0%,rgba(0,0,0,0)_55%)]" />

        {/* Background "ETX" Text */}
        <div className="absolute inset-0 flex items-start justify-center overflow-hidden pt-[15vh] pointer-events-none z-0">
          <h1 className="bg-text max-w-full text-[clamp(5.5rem,36vw,26.25rem)] font-[900] tracking-[-0.05em] leading-[1] text-white/[0.15] select-none font-sans uppercase md:text-[420px]">
            ETX
          </h1>
        </div>

        {/* 3D Canvas */}
        <div className="absolute inset-0 z-10 w-full h-full">
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, depth: true, alpha: true }}
            camera={{ position: [0, 0, 15], fov: 30 }}
            shadows={false}
            performance={{ min: 0.5 }}
          >
            <ambientLight intensity={1.4} />
            <directionalLight position={[6, 10, 6]} intensity={1.6} />
            <directionalLight position={[-8, 6, -4]} intensity={0.55} color={0x99bbff} />
            <Suspense fallback={null}>
              <VehicleScene scrollData={scrollData} />
            </Suspense>
          </Canvas>
        </div>

        {/* HUD/Sidebars (Maintained) */}
        {/* ... existing hero-hud, metrics-sidebar, urban-sidebar ... */}
        
        {/* We'll re-render them to ensure correct imports and structure */}
        <div className="hero-hud absolute inset-0 z-20 pointer-events-none">
          <div className="absolute top-[96px] left-1/2 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-center gap-2 text-center md:contents">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 md:absolute md:top-[120px] md:left-[80px] md:w-auto md:max-w-none md:text-left">
              Driven by Innovation
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 md:absolute md:top-[120px] md:right-[80px] md:left-auto md:w-auto md:max-w-none md:text-right">
              Product of Sri Lanka
            </div>
          </div>
          <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-[12px] opacity-40">
            <span className="text-[9px] tracking-[0.4em] uppercase font-sans">Scroll to explore</span>
            <div className="w-[1px] h-[60px] bg-linear-to-b from-white to-transparent" />
          </div>
        </div>

        <div className="metrics-sidebar absolute inset-0 z-[35] isolate flex items-center px-6 sm:px-12 md:px-24 pointer-events-none opacity-0">
          <div className="max-w-xl pointer-events-auto">
            <div className="relative rounded-2xl border border-white/[0.12] bg-black/80 px-6 py-8 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-md md:px-10 md:py-10">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-black/90 via-black/70 to-transparent pointer-events-none" aria-hidden />
              <div className="relative">
                <div className="mb-10 md:mb-12">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 shrink-0 rounded-full bg-[#FF6B00]" />
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/85">TECHNICAL SPECIFICATIONS</span>
                  </div>
                  <h2 className="text-5xl font-bold uppercase tracking-tighter leading-[0.9] text-white italic [text-shadow:0_2px_24px_rgba(0,0,0,0.85)] md:text-7xl">
                    ELITE PERFORMANCE
                  </h2>
                </div>
                <div className="flex flex-col gap-8 md:gap-10">
                  {metrics.map((item, i) => (
                    <div key={i} className="metric-item">
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

        <div className="urban-sidebar absolute inset-0 z-[35] isolate flex items-center justify-start px-6 sm:px-12 md:px-24 max-md:items-start max-md:pt-[min(14vh,104px)] pointer-events-none opacity-0">
          <div className="max-w-xl pointer-events-auto text-left">
            <div className="relative rounded-2xl border border-white/[0.12] bg-black/80 px-6 py-8 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-md md:px-10 md:py-10">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-black/90 via-black/70 to-transparent" aria-hidden />
              <div className="relative flex flex-col items-start">
                <div className="urban-text-stagger mb-2">
                  <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#FF6B00]">CITY AGILITY</span>
                </div>
                <h2 className="urban-text-stagger mb-6 text-5xl font-black uppercase leading-[0.88] tracking-tighter text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.9)] sm:text-7xl md:mb-8 md:text-8xl">
                  CONQUER
                  <br />
                  THE CITY
                </h2>
                <p className="urban-text-stagger mb-8 max-w-lg text-[12px] leading-relaxed text-white/70 md:mb-12 md:text-[13px]">
                  Conquer the city with the ETX – agile, swift, and compact. Easily maneuver through crowded streets,
                  enjoying quick acceleration and nimble handling. Experience the thrill of swift acceleration and
                  responsive handling, leaving traffic behind. ETX: your ticket to urban liberation.
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

        {/* Daylight / Freedom Section */}
        <div className="daylight-sidebar absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden px-5 sm:px-10 md:px-32 pointer-events-none opacity-0">
          <div className="text-center max-w-4xl pointer-events-auto">
             <div className="daylight-text-stagger mb-6">
                <span className="text-[12px] font-bold tracking-[0.5em] uppercase text-[#FF6B00]">BEYOND LIMITS</span>
             </div>
             <h2 className="daylight-text-stagger text-[12vw] font-black uppercase tracking-tighter leading-[0.8] text-black mb-12">
                FREEDOM<br />DEFINED
             </h2>
             <p className="daylight-text-stagger text-[16px] leading-relaxed text-black/60 max-w-2xl mx-auto mb-16">
                Where the road meets the horizon. The ETX is more than a vehicle; it&apos;s your passport to an 
                unrestricted urban existence. Experience the world in high definition.
             </p>
             <div className="daylight-text-stagger">
                <button className="px-16 py-6 bg-black text-white text-[12px] tracking-[0.6em] uppercase hover:bg-[#FF6B00] transition-colors duration-500 cursor-pointer">
                   Start Your Journey
                </button>
             </div>
          </div>
        </div>

      </section>

      <DesignEngineering />
      <CargoSketchSection />
      <InteractiveStudio />
      <Footer />
    </main>
  );
}
