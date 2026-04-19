'use client';

import React, {createContext, useCallback, useContext, useLayoutEffect, useRef} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import gsap from 'gsap';

type PressTransitionContextValue = {
  navigateToPress: (e: React.MouseEvent) => void;
};

const PressTransitionContext = createContext<PressTransitionContextValue | null>(null);

export function usePressTransition(): PressTransitionContextValue {
  const ctx = useContext(PressTransitionContext);
  if (!ctx) {
    throw new Error('usePressTransition must be used within PressTransitionProvider');
  }
  return ctx;
}

export function PressTransitionProvider({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{x: number; y: number; r: number} | null>(null);
  const prevPathRef = useRef<string | null>(null);

  const navigateToPress = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      const el = overlayRef.current;
      if (!el || typeof window === 'undefined') {
        router.push('/press');
        return;
      }
      const x = e.clientX;
      const y = e.clientY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const r = Math.ceil(Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) + 48);
      pendingRef.current = {x, y, r};
      gsap.killTweensOf(el);
      gsap.set(el, {opacity: 1, pointerEvents: 'auto'});
      gsap.fromTo(
        el,
        {clipPath: `circle(0px at ${x}px ${y}px)`},
        {
          clipPath: `circle(${r}px at ${x}px ${y}px)`,
          duration: 0.9,
          ease: 'power3.inOut',
          onComplete: () => {
            router.push('/press');
          },
        },
      );
    },
    [router],
  );

  useLayoutEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    const el = overlayRef.current;
    if (!el) return;

    if (!pathname.startsWith('/press')) {
      gsap.killTweensOf(el);
      gsap.set(el, {pointerEvents: 'none', opacity: 0, clearProps: 'clipPath'});
      pendingRef.current = null;
      return;
    }

    if (prev && prev.startsWith('/press')) {
      return;
    }

    const pending = pendingRef.current;
    if (!pending) {
      return;
    }

    const {x, y, r} = pending;
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
          pendingRef.current = null;
        },
      },
    );
  }, [pathname]);

  const value = React.useMemo(() => ({navigateToPress}), [navigateToPress]);

  return (
    <PressTransitionContext.Provider value={value}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[200] bg-[#FEFEFE] opacity-0"
      />
    </PressTransitionContext.Provider>
  );
}
