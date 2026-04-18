'use client';

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, Html, useProgress } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { Loader2 } from 'lucide-react';
import { VehicleModel } from './VehicleScene';

const CanvasLoader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
        <p className="text-[#FF6B00] font-mono text-[10px] tracking-[0.4em] uppercase">
          {progress.toFixed(0)}%
        </p>
      </div>
    </Html>
  );
};

const InteractiveStudio = () => {
  const [interacted, setInteracted] = useState(false);
  const [showHelper, setShowHelper] = useState(true);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!interacted) return;
    const timeout = setTimeout(() => setShowHelper(false), 3000);
    return () => clearTimeout(timeout);
  }, [interacted]);

  const handleReset = () => {
    if (!controlsRef.current) return;
    controlsRef.current.autoRotate = false;

    gsap.to(controlsRef.current.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: 'power3.inOut',
    });

    gsap.to(controlsRef.current.object.position, {
      x: 8,
      y: 4,
      z: 8,
      duration: 1.5,
      ease: 'power3.inOut',
      onUpdate: () => controlsRef.current?.update(),
      onComplete: () => {
        setInteracted(false);
        setShowHelper(true);
      },
    });
  };

  const handleInteractionStart = () => {
    setInteracted(true);
  };

  return (
    <section
      ref={sectionRef}
      className="relative h-[100vh] w-full min-w-0 max-w-full overflow-x-clip bg-[#000000] flex items-center justify-center p-4 md:p-8"
      id="interactive-studio"
    >
      <div
        className="relative w-full h-full rounded-[40px] overflow-hidden"
        style={{ background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 80%)' }}
      >
        {inView && (
          <Canvas
            shadows={false}
            dpr={[1, 1.5]}
            frameloop="always"
            gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, depth: true, alpha: true }}
            camera={{ position: [8, 4, 8], fov: 35 }}
            performance={{ min: 0.5 }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <Suspense fallback={<CanvasLoader />}>
              <ambientLight intensity={1.2} />
              <directionalLight position={[8, 10, 6]} intensity={1.4} />
              <directionalLight position={[-6, 4, -4]} intensity={0.5} color={0x99bbff} />

              <VehicleModel position={[0, 1.5, 0]} rotation={[0, Math.PI, 0]} />

              <ContactShadows
                position={[0, 0, 0]}
                opacity={0.45}
                blur={2.5}
                far={1.5}
                resolution={256}
                color="#000000"
              />

              <OrbitControls
                ref={controlsRef}
                enablePan={false}
                enableZoom={false}
                enableDamping
                dampingFactor={0.05}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={0}
                autoRotate={!interacted}
                autoRotateSpeed={0.5}
                onStart={handleInteractionStart}
              />
            </Suspense>
          </Canvas>
        )}

        <div className="absolute inset-0 pointer-events-none p-6 md:p-12 border-[1px] border-white/5 rounded-[40px] m-1">
          <div className="absolute top-6 left-8 md:top-10 md:left-12 flex gap-3 items-center">
            <div className="w-2 h-2 bg-[#FF6B00]" />
            <span className="text-[#FF6B00] font-sans font-bold text-[10px] md:text-[11px] tracking-[0.3em] uppercase">
              360° Interactive View
            </span>
          </div>

          <div
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 transition-opacity duration-1000 ${showHelper ? 'opacity-50' : 'opacity-0'}`}
          >
            <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M2 12c0-5.5 4.5-10 10-10 2.8 0 5.4 1.1 7.3 3.1" />
                <path d="M15 5h4v-4" />
                <path d="M22 12c0 5.5-4.5 10-10 10-2.8 0-5.4-1.1-7.3-3.1" />
                <path d="M9 19H5v4" />
              </svg>
            </div>
            <span className="text-white font-sans text-[10px] tracking-[0.2em] uppercase">Drag to Rotate</span>
          </div>

          <div className="absolute bottom-6 right-8 md:bottom-10 md:right-12 pointer-events-auto">
            <button
              type="button"
              onClick={handleReset}
              className="text-white font-mono text-[9px] md:text-[10px] tracking-[0.3em] uppercase hover:text-[#FF6B00] transition-colors border border-white/20 hover:border-[#FF6B00] px-6 py-3 rounded-full bg-black/30 backdrop-blur-sm cursor-pointer"
            >
              Reset View
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveStudio;
