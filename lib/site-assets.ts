/** Single source of truth for shared static assets (3D + hero scroll). */
export const ETX_EXTERIOR_GLB =
  "/models/etx-exterior-panels/etx.gltf";

export const HERO_SCROLL_BG_IMAGES = [
  "/images/sigiriya.png",
  "/images/city.jpg",
] as const;

const DESIGN_SEQUENCE_FRAMES = 40;
const CARGO_SEQUENCE_FRAMES = 19;
/** First N frames get `fetchPriority: high` so the start of each scrub reads instantly. */
const DESIGN_PRIORITY_LEAD = 12;
const CARGO_PRIORITY_LEAD = 8;

let homeSequenceWarmupStarted = false;

/**
 * Decode hero background images into the browser cache (non-blocking for the
 * loader — first paint is the 3D canvas; these layers fade in later on scroll).
 */
export function preloadHeroBackgroundImages(): Promise<void> {
  const loads = HERO_SCROLL_BG_IMAGES.map(
    (src) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        const done = () => resolve();
        img.onload = done;
        img.onerror = done;
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
          "high";
        img.src = src;
      }),
  );
  return Promise.all(loads).then(() => undefined);
}

/**
 * Warm the canvas image sequences below the hero so scroll scrubbing does not
 * wait on first intersection. Idempotent. Call after the hero GLB is ready
 * (see `elektra-hero-ready` event) so downloads do not starve the 3D model.
 */
export function scheduleHomeScrollSequencesWarmup(): void {
  if (typeof window === "undefined" || homeSequenceWarmupStarted) return;
  homeSequenceWarmupStarted = true;

  const pump = () => {
    for (let i = 1; i <= DESIGN_SEQUENCE_FRAMES; i++) {
      const img = new Image();
      img.decoding = "async";
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
        i <= DESIGN_PRIORITY_LEAD ? "high" : "low";
      img.src = `/design_collection/${i}.webp`;
    }
    for (let i = 1; i <= CARGO_SEQUENCE_FRAMES; i++) {
      const img = new Image();
      img.decoding = "async";
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
        i <= CARGO_PRIORITY_LEAD ? "high" : "low";
      img.src = `/cargo_collection/${i}.webp`;
    }
  };

  // Run right after the current stack so the hero loader has finished without
  // waiting on requestIdleCallback (which was delaying the first frames).
  queueMicrotask(pump);
}
