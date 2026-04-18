'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);
}

/**
 * Section-snap scroll controller.
 *
 * Turns each wheel tick / touch swipe / arrow-key press into one animated jump
 * between predefined stages. Existing GSAP ScrollTriggers (hero pin) and
 * motion `useScroll` timelines (DesignEngineering, CargoSketchSection) keep
 * scrubbing naturally because we are just animating `window.scrollY` from
 * the current stage's scroll position to the next.
 *
 * Stages are discovered from `data-snap-stage` attributes on sections so the
 * controller stays decoupled from the rest of the page.
 */

type Stage = {
  id: string;
  getY: () => number;
  duration: number;
};

/** Hero pin sub-stages as fractions of the pin's scroll range. */
const HERO_SUBSTAGES: { id: string; p: number; duration: number }[] = [
  { id: 'hero', p: 0, duration: 0.9 },
  { id: 'metrics', p: 0.22, duration: 1.25 },
  { id: 'urban', p: 0.46, duration: 1.3 },
  { id: 'charging', p: 0.68, duration: 1.3 },
  { id: 'daylight', p: 0.92, duration: 1.3 },
];

/** Fractions of each section's useScroll progress where we want to land. */
const DESIGN_POINTS = [0.06, 0.5, 0.9];
const CARGO_POINTS = [0.08, 0.35, 0.6, 0.9];

const ANIM_COOLDOWN_MS = 160;
const WHEEL_THRESHOLD = 6;
const TOUCH_DIST_THRESHOLD = 42;
const TOUCH_VELOCITY_THRESHOLD = 0.3;

export default function SnapController() {
  const stagesRef = useRef<Stage[]>([]);
  const currentRef = useRef(0);
  const animatingRef = useRef(false);
  const lastInputRef = useRef(0);
  const disabledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion =
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) return;

    try {
      disabledRef.current =
        window.sessionStorage.getItem('etx-snap-disabled') === '1';
    } catch {
      disabledRef.current = false;
    }
    if (disabledRef.current) {
      document.documentElement.classList.add('snap-disabled');
    }

    const findHeroTrigger = (heroEl: HTMLElement) =>
      ScrollTrigger.getAll().find(
        (t) => t.trigger === heroEl || t.pin === heroEl,
      );

    const buildStages = () => {
      const stages: Stage[] = [];

      const heroEl = document.querySelector<HTMLElement>(
        '[data-snap-stage="hero"]',
      );
      if (heroEl) {
        const trigger = findHeroTrigger(heroEl);
        for (const s of HERO_SUBSTAGES) {
          stages.push({
            id: s.id,
            getY: () => {
              const t = trigger ?? findHeroTrigger(heroEl);
              const start = t?.start ?? 0;
              const end = t?.end ?? window.innerHeight * 5;
              return start + s.p * (end - start);
            },
            duration: s.duration,
          });
        }
      }

      const addPinnedSectionStages = (
        selector: string,
        points: number[],
        idPrefix: string,
        duration: number,
      ) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return;
        points.forEach((p, i) => {
          stages.push({
            id: `${idPrefix}-${i}`,
            getY: () => {
              const rect = el.getBoundingClientRect();
              const top = rect.top + window.scrollY;
              const range = Math.max(0, el.offsetHeight - window.innerHeight);
              return top + p * range;
            },
            duration,
          });
        });
      };

      addPinnedSectionStages(
        '[data-snap-stage="design"]',
        DESIGN_POINTS,
        'design',
        1.2,
      );
      addPinnedSectionStages(
        '[data-snap-stage="cargo"]',
        CARGO_POINTS,
        'cargo',
        1.2,
      );

      const studioEl = document.querySelector<HTMLElement>(
        '[data-snap-stage="studio"]',
      );
      if (studioEl) {
        stages.push({
          id: 'studio',
          getY: () =>
            studioEl.getBoundingClientRect().top + window.scrollY,
          duration: 1.0,
        });
      }

      const footerEl = document.querySelector<HTMLElement>(
        '[data-snap-stage="footer"]',
      );
      if (footerEl) {
        stages.push({
          id: 'footer',
          getY: () => {
            const top =
              footerEl.getBoundingClientRect().top + window.scrollY;
            const maxScroll = Math.max(
              0,
              document.documentElement.scrollHeight - window.innerHeight,
            );
            return Math.min(top, maxScroll);
          },
          duration: 1.0,
        });
      }

      stagesRef.current = stages;
      const y = window.scrollY;
      let closest = 0;
      let minD = Infinity;
      stages.forEach((s, i) => {
        const d = Math.abs(s.getY() - y);
        if (d < minD) {
          minD = d;
          closest = i;
        }
      });
      currentRef.current = closest;
    };

    // Stages depend on ScrollTrigger positions; give them a tick to settle.
    const initTimer = window.setTimeout(buildStages, 50);

    const onRefresh = () => buildStages();
    ScrollTrigger.addEventListener('refreshInit', onRefresh);
    ScrollTrigger.addEventListener('refresh', onRefresh);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildStages, 120);
    };
    window.addEventListener('resize', onResize);

    const goTo = (index: number) => {
      const stages = stagesRef.current;
      if (!stages.length) return;
      const target = Math.max(0, Math.min(stages.length - 1, index));
      if (target === currentRef.current && !animatingRef.current) return;
      const stage = stages[target];
      if (!stage) return;
      animatingRef.current = true;
      currentRef.current = target;
      gsap.to(window, {
        scrollTo: { y: stage.getY(), autoKill: false },
        duration: stage.duration,
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: () => {
          animatingRef.current = false;
          lastInputRef.current = performance.now();
        },
      });
    };

    const goToStageById = (id: string) => {
      const idx = stagesRef.current.findIndex((s) => s.id === id);
      if (idx >= 0) goTo(idx);
    };

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      // Let users drag / orbit the 3D studio without snapping the page.
      const studio = document.querySelector('[data-snap-stage="studio"]');
      if (studio && studio.contains(target)) {
        if (target.closest('canvas')) return true;
      }
      // Also ignore inputs inside form fields / editable surfaces.
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], [data-snap-ignore]',
        )
      ) {
        return true;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (disabledRef.current) return;
      if (isInteractiveTarget(e.target)) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      e.preventDefault();
      const now = performance.now();
      if (animatingRef.current) return;
      if (now - lastInputRef.current < ANIM_COOLDOWN_MS) return;
      lastInputRef.current = now;
      goTo(currentRef.current + (e.deltaY > 0 ? 1 : -1));
    };

    let touchStartY = 0;
    let touchStartT = 0;
    let touchActive = false;

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current) return;
      if (isInteractiveTarget(e.target)) {
        touchActive = false;
        return;
      }
      touchActive = true;
      touchStartY = e.touches[0].clientY;
      touchStartT = performance.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (disabledRef.current) return;
      if (!touchActive) return;
      // Stop iOS rubber-banding while our animation plays or before it starts.
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (disabledRef.current) return;
      if (!touchActive) return;
      touchActive = false;
      const endY = e.changedTouches[0].clientY;
      const dy = touchStartY - endY;
      const dt = Math.max(1, performance.now() - touchStartT);
      const velocity = Math.abs(dy) / dt;
      if (animatingRef.current) return;
      if (
        Math.abs(dy) < TOUCH_DIST_THRESHOLD &&
        velocity < TOUCH_VELOCITY_THRESHOLD
      ) {
        // Small swipe — settle at current stage to undo any drift.
        goTo(currentRef.current);
        return;
      }
      lastInputRef.current = performance.now();
      goTo(currentRef.current + (dy > 0 ? 1 : -1));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const next = !disabledRef.current;
        disabledRef.current = next;
        try {
          if (next)
            window.sessionStorage.setItem('etx-snap-disabled', '1');
          else window.sessionStorage.removeItem('etx-snap-disabled');
        } catch {
          /* ignore */
        }
        document.documentElement.classList.toggle('snap-disabled', next);
        return;
      }
      if (disabledRef.current) return;
      if (isInteractiveTarget(e.target)) return;
      if (animatingRef.current) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          goTo(currentRef.current + 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goTo(currentRef.current - 1);
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(stagesRef.current.length - 1);
          break;
      }
    };

    const onSnapToEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string; index?: number }>).detail;
      if (!detail) return;
      if (typeof detail.id === 'string') goToStageById(detail.id);
      else if (typeof detail.index === 'number') goTo(detail.index);
    };

    const prevOverscroll = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = 'none';

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('etx:snap-to', onSnapToEvent as EventListener);

    return () => {
      window.clearTimeout(initTimer);
      window.clearTimeout(resizeTimer);
      ScrollTrigger.removeEventListener('refreshInit', onRefresh);
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(
        'etx:snap-to',
        onSnapToEvent as EventListener,
      );
      document.documentElement.style.overscrollBehaviorY = prevOverscroll;
      document.documentElement.classList.remove('snap-disabled');
    };
  }, []);

  return null;
}
