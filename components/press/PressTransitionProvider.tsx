'use client';

import React, {createContext, useCallback, useContext, useLayoutEffect, useRef} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import gsap from 'gsap';

type PressTransitionContextValue = {
  navigateToPress: (e: React.MouseEvent) => void;
  navigateToAbout: (e: React.MouseEvent) => void;
  navigateToContact: (e: React.MouseEvent) => void;
};

const PressTransitionContext = createContext<PressTransitionContextValue | null>(null);

export function usePressTransition(): PressTransitionContextValue {
  const ctx = useContext(PressTransitionContext);
  if (!ctx) {
    throw new Error('usePressTransition must be used within PressTransitionProvider');
  }
  return ctx;
}

type PendingReveal = {x: number; y: number; r: number};

/** Single circular clip-path reveal — used for both /press (light) and /about (dark). */
function runOpeningReveal(el: HTMLDivElement, x: number, y: number, r: number, onDone: () => void) {
  gsap.killTweensOf(el);
  gsap.set(el, {opacity: 1, pointerEvents: 'auto'});
  gsap.fromTo(
    el,
    {clipPath: `circle(0px at ${x}px ${y}px)`},
    {
      clipPath: `circle(${r}px at ${x}px ${y}px)`,
      duration: 0.9,
      ease: 'power3.inOut',
      onComplete: onDone,
    },
  );
}

/** Black "Slide-up" panel — used for dark → dark route transitions
 *  (eg. /about → /contact). Reads as a velocity slide rather than a wipe. */
function runOpeningSlideUp(el: HTMLDivElement, onDone: () => void) {
  gsap.killTweensOf(el);
  gsap.set(el, {opacity: 1, pointerEvents: 'auto', yPercent: 100});
  gsap.to(el, {
    yPercent: 0,
    duration: 0.7,
    ease: 'power3.inOut',
    onComplete: onDone,
  });
}

function runClosingSlideUp(el: HTMLDivElement) {
  gsap.killTweensOf(el);
  gsap.fromTo(
    el,
    {yPercent: 0, opacity: 1, pointerEvents: 'auto'},
    {
      yPercent: -100,
      duration: 0.75,
      ease: 'power3.inOut',
      onComplete: () => {
        gsap.set(el, {pointerEvents: 'none', opacity: 0, clearProps: 'transform'});
      },
    },
  );
}

function runClosingReveal(el: HTMLDivElement, x: number, y: number, r: number) {
  gsap.killTweensOf(el);
  gsap.fromTo(
    el,
    {clipPath: `circle(${r}px at ${x}px ${y}px)`, opacity: 1, pointerEvents: 'auto'},
    {
      clipPath: `circle(0px at ${x}px ${y}px)`,
      duration: 0.85,
      ease: 'power3.inOut',
      onComplete: () => {
        gsap.set(el, {pointerEvents: 'none', opacity: 0, clearProps: 'clipPath'});
      },
    },
  );
}

function computeReveal(e: React.MouseEvent): PendingReveal {
  const x = e.clientX;
  const y = e.clientY;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = Math.ceil(Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) + 48);
  return {x, y, r};
}

export function PressTransitionProvider({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const pathname = usePathname();

  const pressOverlayRef = useRef<HTMLDivElement>(null);
  const aboutOverlayRef = useRef<HTMLDivElement>(null);
  const contactOverlayRef = useRef<HTMLDivElement>(null);

  const pressPendingRef = useRef<PendingReveal | null>(null);
  const aboutPendingRef = useRef<PendingReveal | null>(null);
  /** Boolean — slide-up doesn't need geometry, just a "play closing" flag. */
  const contactPendingRef = useRef<boolean>(false);

  const prevPathRef = useRef<string | null>(null);

  const navigateToPress = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const el = pressOverlayRef.current;
      if (!el || typeof window === 'undefined') {
        router.push('/press');
        return;
      }
      const reveal = computeReveal(e);
      pressPendingRef.current = reveal;
      runOpeningReveal(el, reveal.x, reveal.y, reveal.r, () => router.push('/press'));
    },
    [router],
  );

  const navigateToAbout = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const el = aboutOverlayRef.current;
      if (!el || typeof window === 'undefined') {
        router.push('/about');
        return;
      }
      const reveal = computeReveal(e);
      aboutPendingRef.current = reveal;
      runOpeningReveal(el, reveal.x, reveal.y, reveal.r, () => router.push('/about'));
    },
    [router],
  );

  const navigateToContact = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const el = contactOverlayRef.current;
      if (!el || typeof window === 'undefined') {
        router.push('/contact');
        return;
      }
      contactPendingRef.current = true;
      runOpeningSlideUp(el, () => router.push('/contact'));
    },
    [router],
  );

  useLayoutEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    const pressEl = pressOverlayRef.current;
    const aboutEl = aboutOverlayRef.current;
    const contactEl = contactOverlayRef.current;
    if (!pressEl || !aboutEl || !contactEl) return;

    /** Reset overlays if we are not currently on their target route. */
    if (!pathname.startsWith('/press')) {
      gsap.killTweensOf(pressEl);
      gsap.set(pressEl, {pointerEvents: 'none', opacity: 0, clearProps: 'clipPath'});
      pressPendingRef.current = null;
    }
    if (!pathname.startsWith('/about')) {
      gsap.killTweensOf(aboutEl);
      gsap.set(aboutEl, {pointerEvents: 'none', opacity: 0, clearProps: 'clipPath'});
      aboutPendingRef.current = null;
    }
    if (!pathname.startsWith('/contact')) {
      gsap.killTweensOf(contactEl);
      gsap.set(contactEl, {pointerEvents: 'none', opacity: 0, clearProps: 'transform'});
      contactPendingRef.current = false;
    }

    /** Play the inverse (closing) reveal once arrived, only on first entry. */
    if (pathname.startsWith('/press') && !(prev && prev.startsWith('/press'))) {
      const pending = pressPendingRef.current;
      if (pending) {
        runClosingReveal(pressEl, pending.x, pending.y, pending.r);
        pressPendingRef.current = null;
      }
    }

    if (pathname.startsWith('/about') && !(prev && prev.startsWith('/about'))) {
      const pending = aboutPendingRef.current;
      if (pending) {
        runClosingReveal(aboutEl, pending.x, pending.y, pending.r);
        aboutPendingRef.current = null;
      }
    }

    if (pathname.startsWith('/contact') && !(prev && prev.startsWith('/contact'))) {
      if (contactPendingRef.current) {
        runClosingSlideUp(contactEl);
        contactPendingRef.current = false;
      }
    }
  }, [pathname]);

  const value = React.useMemo(
    () => ({navigateToPress, navigateToAbout, navigateToContact}),
    [navigateToPress, navigateToAbout, navigateToContact],
  );

  return (
    <PressTransitionContext.Provider value={value}>
      {children}
      <div
        ref={pressOverlayRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] bg-[#FEFEFE] opacity-0"
      />
      <div
        ref={aboutOverlayRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] bg-[#000000] opacity-0"
      />
      <div
        ref={contactOverlayRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] bg-[#000000] opacity-0"
        style={{transform: 'translateY(100%)'}}
      />
    </PressTransitionContext.Provider>
  );
}
