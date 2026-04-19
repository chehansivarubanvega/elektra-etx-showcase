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
 *
 * Mobile native scroll (no snap hijack, no substages for that section):
 *   - `[data-snap-native-scroll-mobile="true"]` on a section — at max-width
 *     767px the viewport overlapping that section uses native scrolling only;
 *     design/cargo substages are omitted from the stage list.
 */

type Stage = {
  id: string;
  getY: () => number;
  duration: number;
};

const HERO_SUBSTAGES: { id: string; p: number; duration: number }[] = [
  { id: 'hero', p: 0, duration: 0.9 },
  { id: 'metrics', p: 0.22, duration: 1.25 },
  // Urban "Conquer the City" — landing position must sit *after* the
  // `.urban-sidebar` fade-in AND the `.urban-text-stagger` reveal complete
  // in the master timeline (≈ t=10.3s of an ~18s pinned timeline → p≈0.57)
  // and *before* the sidebar starts exiting (t=11.3s → p≈0.63). We aim for
  // the middle of that window so the headline, paragraph, and CTA are all
  // fully visible when the auto-snap settles. (Was 0.51, which parked the
  // user mid-fade with only the first stagger element on screen.)
  { id: 'urban', p: 0.6, duration: 1.25 },
  // urban → charging covers a long 3D-only beat (no UI tweens during the
  // 2.2s "hold"). Stretch the snap a touch so the model has time to glide
  // across instead of getting whipped, and so the scrub buffer doesn't have
  // to play catch-up at the end.
  { id: 'charging', p: 0.68, duration: 1.55 },
  { id: 'daylight', p: 0.89, duration: 1.4 },
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

    /** Sections marked for fully native scroll on mobile (design, cargo). */
    const isNativeMobileScrollZone = () => {
      if (!isMobileViewport()) return false;
      const els = document.querySelectorAll<HTMLElement>(
        '[data-snap-native-scroll-mobile="true"]',
      );
      const scrollTop = window.scrollY;
      const scrollBottom = scrollTop + window.innerHeight;
      for (const el of els) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const bottom = top + el.offsetHeight;
        if (scrollBottom > top + 2 && scrollTop < bottom - 2) return true;
      }
      return false;
    };

    const resolveAnchorY = (
      anchor: HTMLElement,
      stickyEl: HTMLElement | null,
    ) => {
      const rect = anchor.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const vh = window.innerHeight;
      const clamp = (y: number) =>
        Math.max(0, Math.min(maxScrollY(), y));

      if (isMobileViewport() && stickyEl) {
        const stickyH = stickyEl.getBoundingClientRect().height;
        return clamp(absoluteTop - stickyH - MOBILE_STICKY_GAP_PX);
      }

      // If the anchor is taller than the viewport (common for stacked
      // footer grids on mobile), centering would hide its top. Prefer
      // aligning the top with a small breathing offset so the user
      // starts reading from the beginning; they can snap forward to
      // see the rest.
      if (rect.height > vh) {
        const topOffset = Math.max(24, Math.round(vh * 0.08));
        return clamp(absoluteTop - topOffset);
      }

      // Default: center the anchor block in the viewport.
      return clamp(absoluteTop + rect.height / 2 - vh / 2);
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

      // Design: element-based anchors (desktop). Mobile uses native scroll.
      const designSection = document.querySelector<HTMLElement>(
        '[data-snap-stage="design"]',
      );
      if (designSection && !isMobileViewport()) {
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

      // Cargo: fraction-based on desktop. Mobile uses native scroll.
      const cargoEl = document.querySelector<HTMLElement>(
        '[data-snap-stage="cargo"]',
      );
      if (cargoEl && !isMobileViewport()) {
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
        const footerAnchors = Array.from(
          footerEl.querySelectorAll<HTMLElement>(
            '[data-snap-anchor^="footer-"]',
          ),
        );
        if (footerAnchors.length > 0) {
          // Element-based: each inner section gets its own stop so the
          // user can actually scroll through the tall footer (routing
          // table -> mega wordmark) instead of being stuck at its top.
          footerAnchors.forEach((anchor, i) => {
            stages.push({
              id: `footer-${i}`,
              getY: () => resolveAnchorY(anchor, null),
              duration: 1.1,
            });
          });
        } else {
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

    /** Find the stage whose target `scrollY` is closest to the current
     *  page scroll position. Used e.g. to settle small touch drifts. */
    const closestStageIndex = () => {
      const stages = stagesRef.current;
      if (!stages.length) return 0;
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
      return closest;
    };

    /** First stage whose target `scrollY` lies meaningfully below the
     *  user's current position. This is what a downward gesture should
     *  target after the user has scrolled up natively — we never want
     *  to skip an intermediate stage they haven't seen yet. */
    const nextStageBelow = () => {
      const stages = stagesRef.current;
      if (!stages.length) return -1;
      const y = window.scrollY;
      const GAP = 24;
      for (let i = 0; i < stages.length; i++) {
        if (stages[i].getY() > y + GAP) return i;
      }
      return stages.length - 1;
    };

    const goTo = (index: number) => {
      const stages = stagesRef.current;
      if (!stages.length) return;
      const target = Math.max(0, Math.min(stages.length - 1, index));
      const stage = stages[target];
      if (!stage) return;
      const targetY = stage.getY();
      // Compare to the *actual* scroll position rather than the (possibly
      // stale) stored index. After a native upward scroll, currentRef
      // can equal `target` while the user is far away — we still need to
      // animate them down to the stage.
      if (
        !animatingRef.current &&
        Math.abs(window.scrollY - targetY) < 4
      ) {
        currentRef.current = target;
        return;
      }
      animatingRef.current = true;
      currentRef.current = target;
      gsap.to(window, {
        // autoKill: true lets a user cancel the snap by scrolling / wheeling
        // during the animation (e.g. to immediately scroll up natively).
        scrollTo: { y: targetY, autoKill: true },
        duration: stage.duration,
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: () => {
          animatingRef.current = false;
          lastInputRef.current = performance.now();
        },
        onInterrupt: () => {
          animatingRef.current = false;
          lastInputRef.current = performance.now();
        },
      });
    };

    const goToStageById = (id: string) => {
      const idx = stagesRef.current.findIndex((s) => s.id === id);
      if (idx >= 0) goTo(idx);
    };

    /** Snap to the next stage below the user's current scroll position. */
    const snapDown = () => {
      const target = nextStageBelow();
      if (target < 0) return;
      goTo(target);
    };

    /**
     * Whether a gesture on `target` should be ignored by snap.
     *
     * - `touch`: ignore touches inside the 3D studio canvas so users can
     *   rotate the model with their finger.
     * - `wheel` / `key`: never ignore because of the canvas (the studio 3D
     *   has `enableZoom={false}`, so the wheel has no job there), which
     *   means desktop users can scroll off the studio into the footer.
     * - Always ignore inputs inside editable form fields or anything
     *   explicitly opted out with `data-snap-ignore`.
     */
    const isInteractiveTarget = (
      target: EventTarget | null,
      kind: 'wheel' | 'touch' | 'key',
    ) => {
      if (!(target instanceof Element)) return false;
      if (kind === 'touch') {
        const studio = document.querySelector('[data-snap-stage="studio"]');
        if (studio && studio.contains(target) && target.closest('canvas')) {
          return true;
        }
      }
      return !!target.closest(
        'input, textarea, select, [contenteditable="true"], [data-snap-ignore]',
      );
    };

    // Only downward gestures are hijacked. Upward scrolls are fully
    // native so the user can freely review any section or step back out
    // of a pinned area without fighting the snap animation.

    /** True if a snap animation is *actually* running. `animatingRef`
     *  is sometimes left stale on mobile when the GSAP tween's
     *  autoKill cancels it without firing onInterrupt — this cross-
     *  checks against GSAP itself so a stale flag can't permanently
     *  block future gestures. */
    const isSnapping = () => {
      if (!animatingRef.current) return false;
      if (gsap.isTweening(window)) return true;
      // Flag is stale: tween already ended. Reset and report no animation.
      animatingRef.current = false;
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (disabledRef.current) return;
      if (isNativeMobileScrollZone()) return;
      if (isInteractiveTarget(e.target, 'wheel')) return;
      // Upward wheel: do nothing — native scroll handles it. Also kill
      // any in-flight downward snap so it doesn't fight the user.
      if (e.deltaY <= 0) {
        if (isSnapping()) {
          gsap.killTweensOf(window, 'scrollTo');
          animatingRef.current = false;
        }
        return;
      }
      if (e.deltaY < WHEEL_THRESHOLD) return;
      e.preventDefault();
      const now = performance.now();
      if (isSnapping()) return;
      if (now - lastInputRef.current < ANIM_COOLDOWN_MS) return;
      lastInputRef.current = now;
      snapDown();
    };

    let touchStartY = 0;
    let touchStartT = 0;
    let touchActive = false;
    /** null until we've decided the gesture's direction. */
    let touchIntent: 'down' | 'up' | null = null;
    const TOUCH_DECISION_PX = 6;

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current) return;
      if (isNativeMobileScrollZone()) {
        touchActive = false;
        touchIntent = null;
        return;
      }
      if (isInteractiveTarget(e.target, 'touch')) {
        touchActive = false;
        return;
      }
      // A new touch always supersedes any in-flight snap. Kill the tween
      // so it can't fight or stall the user. This also clears any stale
      // animatingRef left over from an autoKill that didn't fire
      // onInterrupt (a known mobile edge case).
      if (gsap.isTweening(window)) {
        gsap.killTweensOf(window, 'scrollTo');
      }
      animatingRef.current = false;
      touchActive = true;
      touchIntent = null;
      touchStartY = e.touches[0].clientY;
      touchStartT = performance.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (disabledRef.current) return;
      if (!touchActive) return;
      if (isNativeMobileScrollZone()) {
        touchActive = false;
        touchIntent = null;
        return;
      }
      const currentY = e.touches[0].clientY;
      const dy = touchStartY - currentY;
      if (touchIntent === null) {
        if (Math.abs(dy) < TOUCH_DECISION_PX) return;
        // Finger moves up (dy > 0) = content moves up = scrolling DOWN.
        // Finger moves down (dy < 0) = scrolling UP.
        touchIntent = dy > 0 ? 'down' : 'up';
      }
      // Only hijack the gesture when the user is scrolling DOWN.
      // Upward swipes stay 100% native.
      if (touchIntent === 'down' && e.cancelable) e.preventDefault();
    };

    const finishTouch = (intent: 'down' | 'up' | null, endY?: number) => {
      touchActive = false;
      touchIntent = null;
      // Upward swipe: we never intercepted it — nothing to do.
      if (intent !== 'down' || endY === undefined) return;
      if (isSnapping()) return;
      const dy = touchStartY - endY;
      const dt = Math.max(1, performance.now() - touchStartT);
      const velocity = Math.abs(dy) / dt;
      // Small/slow swipes: settle at the closest stage so the page
      // doesn't end up mid-stage from the little bit of touch drift.
      if (
        dy < TOUCH_DIST_THRESHOLD &&
        velocity < TOUCH_VELOCITY_THRESHOLD
      ) {
        goTo(closestStageIndex());
        return;
      }
      lastInputRef.current = performance.now();
      snapDown();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (disabledRef.current) return;
      if (!touchActive) return;
      finishTouch(touchIntent, e.changedTouches[0]?.clientY);
    };

    const onTouchCancel = () => {
      // iOS may cancel a touch when the system takes over (e.g. native
      // scroll, refresh gesture, alert). Reset state so the next gesture
      // starts cleanly.
      if (!touchActive) return;
      touchActive = false;
      touchIntent = null;
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
      if (isNativeMobileScrollZone()) return;
      if (isInteractiveTarget(e.target, 'key')) return;
      if (isSnapping()) return;
      // Only downward keys snap. ArrowUp / PageUp / Home stay native so
      // the user can review upward content at their own pace.
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          snapDown();
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
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });
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
      window.removeEventListener('touchcancel', onTouchCancel);
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
