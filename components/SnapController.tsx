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
 * One wheel tick / swipe / arrow-key press advances one stage. The page
 * animates `window.scrollY` from the current stage's scroll position to the
 * next, so every existing GSAP ScrollTrigger / motion useScroll timeline
 * scrubs naturally through its transitions.
 *
 * Stage discovery:
 *   - `[data-snap-stage="hero"]`            pinned hero, 5 sub-stages driven by
 *                                           the pin's ScrollTrigger progress.
 *   - `[data-snap-stage="<id>"]` + inner
 *     `[data-snap-anchor]` elements         element-based: each anchor is a
 *                                           stage, centered (desktop) or
 *                                           placed below the section's sticky
 *                                           column (mobile).
 *   - `[data-snap-stage="<id>"]` without
 *     anchors                               fraction-based: uses SECTION_POINTS
 *                                           if registered, otherwise one stage
 *                                           at the section top.
 */

type Stage = {
  id: string;
  getY: () => number;
  duration: number;
};

const HERO_SUBSTAGES: { id: string; p: number; duration: number }[] = [
  { id: 'hero', p: 0, duration: 0.9 },
  { id: 'metrics', p: 0.22, duration: 1.25 },
  { id: 'urban', p: 0.51, duration: 1.3 },
  { id: 'charging', p: 0.68, duration: 1.3 },
  { id: 'daylight', p: 0.89, duration: 1.3 },
];

/** Fractions of cargo section's useScroll progress (cargo renders as a
 *  full-viewport sticky stage, so fractions are fine here). */
const CARGO_POINTS = [0.08, 0.32, 0.6, 0.87];

const MOBILE_MQ = '(max-width: 767px)';
const ANIM_COOLDOWN_MS = 160;
const WHEEL_THRESHOLD = 6;
const TOUCH_DIST_THRESHOLD = 42;
const TOUCH_VELOCITY_THRESHOLD = 0.3;
/** Gap between bottom of sticky column and anchor top on mobile. */
const MOBILE_STICKY_GAP_PX = 8;

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

    const maxScrollY = () =>
      Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );

    const findHeroTrigger = (heroEl: HTMLElement) =>
      ScrollTrigger.getAll().find(
        (t) => t.trigger === heroEl || t.pin === heroEl,
      );

    const isMobileViewport = () =>
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia(MOBILE_MQ).matches;

    const resolveAnchorY = (
      anchor: HTMLElement,
      stickyEl: HTMLElement | null,
    ) => {
      const rect = anchor.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const vh = window.innerHeight;
      if (isMobileViewport() && stickyEl) {
        const stickyRect = stickyEl.getBoundingClientRect();
        const stickyH = stickyRect.height;
        // Anchor's top edge just below the sticky column.
        return Math.max(
          0,
          Math.min(
            maxScrollY(),
            absoluteTop - stickyH - MOBILE_STICKY_GAP_PX,
          ),
        );
      }
      // Desktop / wide viewport: center the anchor block in the viewport.
      const centered = absoluteTop + rect.height / 2 - vh / 2;
      return Math.max(0, Math.min(maxScrollY(), centered));
    };

    const buildStages = () => {
      const stages: Stage[] = [];

      // Hero sub-stages via the pin's ScrollTrigger.
      const heroEl = document.querySelector<HTMLElement>(
        '[data-snap-stage="hero"]',
      );
      if (heroEl) {
        for (const s of HERO_SUBSTAGES) {
          stages.push({
            id: s.id,
            getY: () => {
              const trigger = findHeroTrigger(heroEl);
              const start = trigger?.start ?? 0;
              const end = trigger?.end ?? window.innerHeight * 5;
              return Math.max(
                0,
                Math.min(maxScrollY(), start + s.p * (end - start)),
              );
            },
            duration: s.duration,
          });
        }
      }

      // Design: element-based anchors (sticky column on mobile needs
      // precise positioning so story-block titles aren't clipped).
      const designSection = document.querySelector<HTMLElement>(
        '[data-snap-stage="design"]',
      );
      if (designSection) {
        const stickyEl =
          designSection.querySelector<HTMLElement>('[data-snap-sticky]');
        const anchors = Array.from(
          designSection.querySelectorAll<HTMLElement>(
            '[data-snap-anchor^="design-"]',
          ),
        );
        anchors.forEach((anchor, i) => {
          stages.push({
            id: `design-${i}`,
            getY: () => resolveAnchorY(anchor, stickyEl),
            duration: 1.15,
          });
        });
      }

      // Cargo: fraction-based (the section is one sticky h-screen stage,
      // content lives in overlays that already position themselves).
      const cargoEl = document.querySelector<HTMLElement>(
        '[data-snap-stage="cargo"]',
      );
      if (cargoEl) {
        CARGO_POINTS.forEach((p, i) => {
          stages.push({
            id: `cargo-${i}`,
            getY: () => {
              const rect = cargoEl.getBoundingClientRect();
              const top = rect.top + window.scrollY;
              const range = Math.max(
                0,
                cargoEl.offsetHeight - window.innerHeight,
              );
              return Math.max(
                0,
                Math.min(maxScrollY(), top + p * range),
              );
            },
            duration: 1.15,
          });
        });
      }

      const studioEl = document.querySelector<HTMLElement>(
        '[data-snap-stage="studio"]',
      );
      if (studioEl) {
        stages.push({
          id: 'studio',
          getY: () => {
            const top =
              studioEl.getBoundingClientRect().top + window.scrollY;
            return Math.max(0, Math.min(maxScrollY(), top));
          },
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
            return Math.max(0, Math.min(maxScrollY(), top));
          },
          duration: 1.0,
        });
      }

      stagesRef.current = stages;

      // Keep currentRef pointing at the closest stage to where the user is.
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

    const initTimer = window.setTimeout(buildStages, 60);

    const onRefresh = () => buildStages();
    ScrollTrigger.addEventListener('refreshInit', onRefresh);
    ScrollTrigger.addEventListener('refresh', onRefresh);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildStages, 120);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

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
      const studio = document.querySelector('[data-snap-stage="studio"]');
      if (studio && studio.contains(target) && target.closest('canvas')) {
        return true;
      }
      return !!target.closest(
        'input, textarea, select, [contenteditable="true"], [data-snap-ignore]',
      );
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
      window.removeEventListener('orientationchange', onResize);
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
