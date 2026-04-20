'use client';

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, Html, useProgress } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { Loader2 } from 'lucide-react';
import { VehicleModel } from './VehicleScene';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';

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

const MOBILE_MQ = '(max-width: 767px)';

/**
 * OrbitControls sets the canvas to `touch-action: none`, which blocks vertical page scroll
 * when the user drags on the model. After connect(), override to `pan-y` so vertical swipes
 * scroll the document while horizontal drags still rotate the camera.
 */
function CanvasVerticalTouchScroll({ active }: { active: boolean }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const apply = () => {
      if (active) {
        el.style.touchAction = 'pan-y';
      } else {
        el.style.removeProperty('touch-action');
      }
    };
    // Defer past OrbitControls' connect() effect so our value wins.
    const id = requestAnimationFrame(apply);
    return () => {
      cancelAnimationFrame(id);
      el.style.removeProperty('touch-action');
    };
  }, [active, gl]);

  return null;
}

/**
 * R3F `Canvas` `className` applies to an outer div; the actual `<canvas>` keeps
 * `pointer-events: auto` by default, so the model still steals touches. Toggle
 * the GL canvas hit target explicitly when mobile “scroll page” mode is on.
 */
function CanvasPointerHitTarget({ interactable }: { interactable: boolean }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    if (interactable) {
      el.style.removeProperty('pointer-events');
    } else {
      el.style.pointerEvents = 'none';
    }
    return () => {
      el.style.removeProperty('pointer-events');
    };
  }, [interactable, gl]);

  return null;
}

const InteractiveStudio = () => {
  const [interacted, setInteracted] = useState(false);
  const [showHelper, setShowHelper] = useState(true);
  const [inView, setInView] = useState(false);
  /** On coarse pointers (phones), orbit is off until the user opts in so the page can still scroll. */
  const [mobileOrbitOn, setMobileOrbitOn] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    if (typeof globalThis.matchMedia === 'undefined') return;
    const mq = globalThis.matchMedia(MOBILE_MQ);
    const sync = () => {
      const mobile = mq.matches;
      setIsMobileLayout(mobile);
      if (!mobile) {
        setMobileOrbitOn(true);
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

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
        if (globalThis.matchMedia(MOBILE_MQ).matches) setMobileOrbitOn(false);
      },
    });
  };

  const handleInteractionStart = () => {
    setInteracted(true);
  };

  const orbitEnabled = !isMobileLayout || mobileOrbitOn;
  /** Wrapper alone is not enough: the WebGL canvas defaults to `pointer-events: auto`,
   *  so touches still hit the canvas and OrbitControls (even when `enabled={false}`)
   *  can keep `touch-action: none` on the element — blocking vertical page scroll.
   *  When orbit is off on mobile, disable hit-testing on the canvas and unmount controls. */
  const canvasPointerClass =
    isMobileLayout && !mobileOrbitOn ? 'pointer-events-none' : '';

  return (
    <section
      ref={sectionRef}
      className="relative h-[100vh] w-full min-w-0 max-w-full overflow-x-clip bg-[#000000] flex items-center justify-center p-4 md:p-8"
      id="interactive-studio"
      data-snap-stage="studio"
    >
      <div
        className="relative w-full h-full rounded-[40px] overflow-hidden"
        style={{ background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 80%)' }}
      >
        {inView && (
          <div className={`absolute inset-0 ${canvasPointerClass}`}>
            <CanvasErrorBoundary>
              <Canvas
                shadows={false}
                dpr={[1, 1.5]}
                frameloop={orbitEnabled ? 'always' : 'demand'}
                gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, depth: true, alpha: true }}
                camera={{ position: [8, 4, 8], fov: 35 }}
                performance={{ min: 0.5 }}
                className={
                  orbitEnabled
                    ? 'h-full w-full min-h-0 cursor-grab active:cursor-grabbing'
                    : 'h-full w-full min-h-0'
                }
              >
                <CanvasPointerHitTarget interactable={orbitEnabled} />
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

                  {orbitEnabled ? (
                    <>
                      <OrbitControls
                        ref={controlsRef}
                        enabled
                        enablePan={false}
                        enableZoom={false}
                        enableDamping
                        dampingFactor={0.05}
                        maxPolarAngle={Math.PI / 2}
                        minPolarAngle={0}
                        // Mobile: never auto-rotate the camera. The user opts
                        // into 360° explicitly and should be the only thing
                        // moving the model from there. Desktop keeps the
                        // ambient idle spin until the first interaction.
                        autoRotate={!interacted && !isMobileLayout}
                        autoRotateSpeed={0.5}
                        onStart={handleInteractionStart}
                      />
                      <CanvasVerticalTouchScroll active />
                    </>
                  ) : null}
                </Suspense>
              </Canvas>
            </CanvasErrorBoundary>
          </div>
        )}

        {/* Mobile: one bottom sheet — tap / scroll / reset never stack on the same spot */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-20 md:hidden">
          <div className="pointer-events-auto rounded-2xl border border-white/[0.1] bg-black/85 px-4 py-3.5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md">
            {!mobileOrbitOn ? (
              <>
                <p className="mb-3 text-center text-[12px] leading-relaxed text-white/55">
                  Scroll the page freely. Enable 360° only when you want to rotate the model.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileOrbitOn(true)}
                  className="flex w-full touch-manipulation items-center justify-center rounded-xl border border-[#FF6B00]/50 bg-[#FF6B00]/15 py-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[#FF6B00] transition-transform active:scale-[0.99]"
                >
                  Tap for 360°
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 text-white/40">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-white/70"
                    >
                      <path d="M2 12h20M12 2v20" />
                    </svg>
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
                    Drag to rotate
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOrbitOn(false);
                      setInteracted(false);
                      setShowHelper(true);
                    }}
                    className="touch-manipulation rounded-xl border border-white/25 bg-white/[0.06] py-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/90 transition-colors active:bg-white/10"
                  >
                    Scroll page
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="touch-manipulation rounded-xl border border-white/25 bg-white/[0.06] py-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/90 transition-colors hover:border-[#FF6B00]/50 hover:text-[#FF6B00] active:bg-white/10"
                  >
                    Reset view
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 m-1 rounded-[40px] border border-white/5 p-6 md:p-12">
          <div className="absolute left-4 top-4 flex max-w-[calc(100%-4.5rem)] items-center gap-2.5 pr-2 md:left-12 md:top-10 md:max-w-none md:gap-3">
            <div className="h-2 w-2 shrink-0 bg-[#FF6B00]" />
            <span className="text-[9px] font-bold uppercase leading-tight tracking-[0.28em] text-[#FF6B00] md:text-[11px] md:tracking-[0.3em]">
              360° Interactive View
            </span>
          </div>

          <div
            className={`absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 transition-opacity duration-1000 md:flex md:flex-col ${showHelper && !isMobileLayout ? 'opacity-50' : 'opacity-0'}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white animate-pulse">
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
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-white">Drag to Rotate</span>
          </div>

          <div className="pointer-events-auto absolute bottom-6 right-8 hidden md:block md:bottom-10 md:right-12">
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer rounded-full border border-white/20 bg-black/30 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white backdrop-blur-sm transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00]"
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
