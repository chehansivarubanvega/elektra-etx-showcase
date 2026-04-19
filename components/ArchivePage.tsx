"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";

const TAUPE = "#a09078";

/** Official YouTube CDN still — `hqdefault` exists for virtually every public video. */
function youtubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** ── HERO SCROLL SEQUENCE ────────────────────────────────────────────────
 *  Mirrors landonorris.com/off-track: as you scroll, the image stays
 *  full-aspect (object-contain), drifts toward the quote center while
 *  the source swaps through Gallery1–9 frames.
 *  (Repo currently lacks Gallery4.jpg — drop it in to complete the run.)
 */
const HERO_SEQUENCE = [
  "Gallery1.jpg",
  "Gallery2.jpg",
  "Gallery3.jpg",
  "Gallery5.jpg",
  "Gallery6.jpg",
  "Gallery7.jpg",
  "Gallery8.jpg",
  "Gallery9.jpg",
] as const;

/** Pre-warm decode for one hero frame (used on mount to kill crossfade flicker). */
function decodeHeroFrame(file: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new globalThis.Image();
    const finish = () => resolve();
    img.onload = () => {
      if (typeof img.decode === "function") {
        void img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = `/images/gallery/${file}`;
  });
}

/** Injects `<link rel="preload" as="image">` for each hero URL so the network
 *  layer competes with first paint; returns a disposer for StrictMode / unmount. */
function injectHeroImagePreloads(): () => void {
  const links: HTMLLinkElement[] = [];
  for (const file of HERO_SEQUENCE) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = `/images/gallery/${file}`;
    document.head.append(link);
    links.push(link);
  }
  return () => {
    for (const link of links) {
      link.remove();
    }
  };
}

/** ── PARTNERSHIPS · marquee wordmarks ───────────────────────────────────
 *  The page mirrors the Off-Track partnerships rail; we use clean editorial
 *  wordmarks (no logo files yet) running on a continuous horizontal track.
 */
const PARTNERS = [
  "PickMe",
  "USAID",
  "Swiss Embassy",
  "Govt. of Sri Lanka",
  "Hilton Colombo",
  "Vega Innovations",
  "Cargills",
  "Ministry of Power",
] as const;

/** ── PROJECT CHAPTERS ──────────────────────────────────────────────────
 *  Each chapter mimics Off-Track's "Padel / Photography / LEGO / Golf"
 *  beats: a kicker, a title, a serif signature line, an intro caption,
 *  and 3 location-tagged images that drift on parallax as you scroll.
 */
type ChapterImage = { file: string; tag: string; year: string };
type ProjectChapter = {
  key: string;
  kicker: string;
  title: string;
  accentTitle?: string;
  signature: string;
  caption: string;
  images: [ChapterImage, ChapterImage, ChapterImage];
};

const CHAPTERS: ProjectChapter[] = [
  {
    key: "patrol",
    kicker: "Chapter 02",
    title: "On",
    accentTitle: "Patrol",
    signature: "Colombo · 2024 → present",
    caption:
      "Before the city wakes, the ETX is already moving — coffee runs at first light, K9 patrols, ambulance shifts. The quietest workhorse in the fleet.",
    images: [
      { file: "coffee_patrol.jpg", tag: "Colombo", year: "2024" },
      { file: "ambulance.jpg", tag: "Maradana", year: "2024" },
      { file: "dog_star.jpg", tag: "Negombo", year: "2025" },
    ],
  },
  {
    key: "service",
    kicker: "Chapter 03",
    title: "In",
    accentTitle: "Service",
    signature: "Island-wide · 2024 → present",
    caption:
      "Cargo, rentals, last-mile commerce. The same chassis, re-tooled for the people who actually move the country forward.",
    images: [
      { file: "etx_cargo.jpg", tag: "Maradana", year: "2024" },
      { file: "etxc.jpg", tag: "Pettah", year: "2024" },
      { file: "tuktuk_rental.jpg", tag: "Galle", year: "2025" },
    ],
  },
  {
    key: "people",
    kicker: "Chapter 04",
    title: "Of The",
    accentTitle: "People",
    signature: "State & community · 2024 → present",
    caption:
      "Diplomats, ministries, neighbourhoods. From the Prime Minister\u2019s lawn to a Christmas drive with PickMe — the ETX shows up.",
    images: [
      { file: "priminister.jpg", tag: "Temple Trees", year: "2024" },
      { file: "US_aid.jpg", tag: "USAID Colombo", year: "2024" },
      { file: "swiss.jpg", tag: "Swiss Embassy", year: "2025" },
    ],
  },
];

/** ── FILMS · YouTube cards ─────────────────────────────────────────────
 *  Official Elektrateq embeds — thumbnails from `i.ytimg.com`. Click →
 *  `archive:open-video` → lightbox iframe. Swap `title` strings when you
 *  have the final cut names from YouTube.
 */
type Film = { id: string; title: string; meta: string };

const FILMS: Film[] = [
  { id: "X9dlmfFQSWw", title: "ElektraTeq · Archive 01", meta: "YouTube" },
  { id: "2R0B7Ui0cvI", title: "ElektraTeq · Archive 02", meta: "YouTube" },
  { id: "JP2mTK90eu8", title: "ElektraTeq · Archive 03", meta: "YouTube" },
  { id: "bsm_-9Ot-T0", title: "ElektraTeq · Archive 04", meta: "YouTube" },
  { id: "h7zJ3y6RHBg", title: "ElektraTeq · Archive 05", meta: "YouTube" },
  { id: "csespjFciUY", title: "ElektraTeq · Archive 06", meta: "YouTube" },
];

/** ── FIELD NOTES · margin frames ──────────────────────────────────────
 *  Loose archive stills (`general1–6.jpg`) — image only, no captions.
 */
const MARGIN_FRAME_FILES = [
  "general1.jpg",
  "general2.jpg",
  "general3.jpg",
  "general4.jpg",
  "general5.jpg",
  "general6.jpg",
] as const;

/** ── TYPOGRAPHY TOKENS ────────────────────────────────────────────────
 *  Aligned with the existing Press page so the Archive page reads as
 *  the same editorial system: Barlow Condensed `font-black uppercase`
 *  with tight negative tracking for display, mono micro-kickers at
 *  wide letter-spacing.
 */
const HERO_SLIDE_COUNT = HERO_SEQUENCE.length;

/** Display headline (matches PressIndex: font-black, leading-[0.78–0.85], tracking-[-0.045em]). */
const displayHead =
  "font-black uppercase leading-[0.85] tracking-[-0.045em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#0a0a0a]";

/**
 *  Multi-line quote line — fills the viewport like the Norris reference.
 *  Size is bounded by BOTH viewport width *and* viewport height via an
 *  inline style (Tailwind's arbitrary-value parser fails on a comma inside
 *  a nested `min()`, which silently dropped the height ceiling and let the
 *  text overflow `100dvh`, clipping the last line behind the sticky frame).
 *  Math: 6 lines × leading 0.88 × max font-size ~10dvh ≈ 53dvh — well under
 *  the ~85dvh content area inside the pane (after the safe-zone padding).
 */
const quoteLine =
  "font-black uppercase leading-[0.92] tracking-[-0.045em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#0a0a0a]";

/** Inline size — guaranteed to be parsed as raw CSS. */
const quoteLineStyle: React.CSSProperties = {
  fontSize: "clamp(1.5rem, min(9.5vw, 11dvh), 6rem)",
};

/** Tighter quote scale for handheld — fits 6 lines without horizontal scroll. */
const quoteLineStyleMobile: React.CSSProperties = {
  fontSize: "clamp(1.35rem, min(7.2vw, 7.2dvh), 2.85rem)",
};

/** Mono micro-kicker (matches Press hub: text-[10px] font-semibold uppercase tracking-[0.42em]). */
const microKicker =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.42em]";

function SerifAccent({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span
      className="font-[family-name:var(--font-archive-serif)] font-normal italic tracking-[-0.01em]"
      style={{ color: TAUPE }}
    >
      {children}
    </span>
  );
}

/**
 * Mobile-only vertical lead (landonorris.com/off-track handheld rhythm):
 * stacked display type, meta row, kicker + intro, full-bleed still, then
 * the feature quote — no sticky track, no scroll-driven image swap, no
 * horizontal movement (`md:hidden`).
 */
function ArchiveMobileLead() {
  return (
    <div className="bg-[#F9F8F3] pb-4 pt-[max(0.75rem,2dvh)]">
      <div className="mx-auto flex w-full max-w-[520px] flex-col px-5">
        <div className="flex items-center justify-between gap-3">
          <p className={`${microKicker} text-[#1a1a1a]`}>Elektra ETX</p>
          <p className={`${microKicker} text-black/45`}>Vol. 01</p>
        </div>

        <h1 className="mt-10 text-center">
          <span
            className={`${displayHead} block text-[clamp(2.75rem,14vw,4.25rem)] leading-[0.88]`}
          >
            The
          </span>
          <span className="mt-1 block text-[clamp(2.75rem,14vw,4.25rem)] font-black uppercase leading-[0.88] tracking-[-0.045em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#0a0a0a]">
            <SerifAccent>Archive</SerifAccent>
          </span>
        </h1>

        <div className="mt-8 flex items-center justify-between gap-2 border-b border-black/[0.08] pb-6">
          <p className="font-[family-name:var(--font-archive-serif)] text-sm text-[#1a1a1a]">
            ElektraTeq
          </p>
          <p className="font-[family-name:var(--font-archive-serif)] text-sm text-black/55">
            2024 →
          </p>
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.12] bg-black/[0.03]"
          >
            <span className="block h-3 w-3 rounded-full bg-gradient-to-br from-black/25 to-black/10" />
          </span>
        </div>

        <p className={`${microKicker} mt-8 text-black/45`}>
          Bringing the quiet revolution
        </p>
      </div>

      <div className="mt-10 w-full overflow-hidden sm:mx-auto sm:max-w-[520px]">
        <Image
          src={`/images/gallery/${HERO_SEQUENCE[0]}`}
          alt="Elektra ETX on the street"
          width={1600}
          height={2000}
          sizes="100vw"
          className="aspect-[4/5] max-h-[min(72dvh,520px)] w-full object-cover"
          priority
          decoding="async"
        />
      </div>

      <div className="mx-auto mt-14 w-full max-w-[520px] px-5 pb-16">
        <p className={`${microKicker} text-center text-black/40`}>The frame</p>
        <div className="mt-8 flex flex-col items-center text-center">
          <p className={quoteLine} style={quoteLineStyleMobile}>
            Since The First
          </p>
          <p className={quoteLine} style={quoteLineStyleMobile}>
            <SerifAccent>ETX</SerifAccent> Rolled Out,
          </p>
          <p className={quoteLine} style={quoteLineStyleMobile}>
            ElektraTeq Has Been
          </p>
          <p className={quoteLine} style={quoteLineStyleMobile}>
            <SerifAccent>All In</SerifAccent> —
          </p>
          <p className={quoteLine} style={quoteLineStyleMobile}>
            Bringing <SerifAccent>Electric Calm</SerifAccent>
          </p>
          <p className={quoteLine} style={quoteLineStyleMobile}>
            To Every Street.
          </p>
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            href="/"
            className={`${microKicker} inline-flex items-center justify-center rounded-full border border-black/[0.14] bg-black/[0.03] px-6 py-3 text-[#101010]`}
          >
            Back to ETX
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Off-Track style two-beat scroll track — TWO PHYSICAL PANES that slide.
 *
 *  - Inside a single sticky 100dvh viewport, a 200vh stage holds two
 *    full-screen panes stacked vertically: HERO on top, QUOTE below.
 *  - The stage translates from y: 0 → -100vh as the user scrolls,
 *    physically sliding the hero up off-screen and the quote up into view.
 *  - The image floats over both panes, anchored upper-right in the hero
 *    and gliding down + left into the centre of the quote (dual-slot bitmap
 *    ping-pong with an instant opacity swap — no CSS transition on change).
 */
function HeroAndQuoteScrollTrack() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  /** When false, scroll-driven slot swaps are skipped so we never paint an undecoded frame. */
  const [heroFramesReady, setHeroFramesReady] = useState(false);
  const heroFramesReadyRef = useRef(false);

  /**
   * Two slots, **instant swap** (no opacity transition, no rAF deferral).
   * CSS crossfades + delayed transforms were reading as flicker against the
   * scroll-linked `motion.div` transform; hard-switching the bitmap keeps
   * the frame locked to scroll progress.
   */
  const topSlotRef = useRef<"a" | "b">("a");
  const lastIdxRef = useRef(0);
  const [slotA, setSlotA] = useState({ idx: 0, opacity: 1, z: 2 });
  const [slotB, setSlotB] = useState({ idx: 0, opacity: 0, z: 1 });

  /**
   * Preload + decode every `HERO_SEQUENCE` still before enabling swaps:
   * 1. `<link rel="preload" as="image">` — high-priority fetch with the document.
   * 2. `decodeHeroFrame` — bitmap decode so the visible `<img>` never waits on decode.
   */
  useEffect(() => {
    const removePreloads = injectHeroImagePreloads();
    let cancelled = false;
    void Promise.all(HERO_SEQUENCE.map(decodeHeroFrame)).then(() => {
      if (cancelled) return;
      heroFramesReadyRef.current = true;
      setHeroFramesReady(true);
    });
    return () => {
      cancelled = true;
      removePreloads();
    };
  }, []);

  /**
   * `offset: ['start start', 'end end']` makes progress=1 the exact moment
   * the section's bottom reaches the viewport's bottom — which is the same
   * moment the inner sticky pane releases. Combined with a `200dvh` section
   * height (one viewport for hero + one for the slide-up to quote) this
   * eliminates the spillover where the partnerships marquee was visible
   * underneath the quote pane while the stage was still mid-transition.
   */
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  /** After preload, align A/B slots to wherever the user already scrolled (e.g. fast refresh). */
  useEffect(() => {
    if (!heroFramesReady) return;
    const v = scrollYProgress.get();
    const idx = Math.min(
      HERO_SLIDE_COUNT - 1,
      Math.max(0, Math.floor(v * HERO_SLIDE_COUNT + Number.EPSILON)),
    );
    lastIdxRef.current = idx;
    setSlideIndex(idx);
    topSlotRef.current = "a";
    setSlotA({ idx, opacity: 1, z: 2 });
    setSlotB({ idx, opacity: 0, z: 1 });
  }, [heroFramesReady, scrollYProgress]);

  /**
   * 1:1 scroll-driven transforms (no springs).
   * Springs on scroll input always trail the wheel and feel like lag — using
   * raw `useTransform` keeps the stage and the image locked to the scrollbar
   * for a tight, immediate feel that matches landonorris.com/off-track.
   *
   * NOTE: stage translation MUST use the same unit as the pane height
   * (`100dvh`). Mixing `vh` and `dvh` over-translates on mobile (where the
   * URL bar makes `100vh > 100dvh`), which pushes the quote pane's top
   * above the viewport and clips the first lines.
   */
  const stageY = useTransform(scrollYProgress, [0, 1], ["0dvh", "-100dvh"]);
  const imgX = useTransform(scrollYProgress, [0, 1], ["26vw", "0vw"]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["-14dvh", "6dvh"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.18, 0.92]);

  const hintOpacity = useTransform(
    scrollYProgress,
    [0, 0.6, 0.95],
    [0.7, 0.85, 1],
  );
  const hintY = useTransform(scrollYProgress, [0, 1], [12, 0]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(
      HERO_SLIDE_COUNT - 1,
      Math.max(0, Math.floor(v * HERO_SLIDE_COUNT + Number.EPSILON)),
    );
    if (!heroFramesReadyRef.current) {
      return;
    }
    setSlideIndex((cur) => (cur === idx ? cur : idx));
    if (idx === lastIdxRef.current) return;

    lastIdxRef.current = idx;

    const inactive = topSlotRef.current === "a" ? "b" : "a";
    if (inactive === "b") {
      setSlotB({ idx, opacity: 1, z: 3 });
      setSlotA((s) => ({ ...s, opacity: 0, z: 1 }));
      topSlotRef.current = "b";
    } else {
      setSlotA({ idx, opacity: 1, z: 3 });
      setSlotB((s) => ({ ...s, opacity: 0, z: 1 }));
      topSlotRef.current = "a";
    }
  });

  return (
    <>
      <div className="md:hidden">
        <ArchiveMobileLead />
      </div>

      <section
        ref={trackRef}
        aria-label="Archive hero and feature quote"
        className="relative hidden w-full bg-[#F9F8F3] md:block"
        style={{ height: "200dvh" }}
      >
        <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-[#F9F8F3]">
          {/* Ribbon — fixed inside sticky frame */}
          <div className="absolute left-0 right-0 top-0 z-40 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 pt-[max(0.5rem,1.4vh)] md:px-10">
            <p className={`${microKicker} text-[#1a1a1a]`}>Elektra ETX</p>
            <p className={`${microKicker} hidden text-black/45 sm:block`}>
              Sri Lanka · Since 2024
            </p>
            <p className={`${microKicker} text-black/45`}>Volume 01</p>
          </div>

          {/* SLIDING STAGE — two physical panes stacked, translate Y */}
          <motion.div
            style={{ y: stageY }}
            className="absolute inset-x-0 top-0 z-10 flex flex-col will-change-transform"
          >
            {/* ── PANE 1: HERO ── */}
            <div className="relative flex h-[100dvh] w-full flex-col items-stretch justify-center overflow-hidden bg-[#F9F8F3] px-5 py-[max(64px,8dvh)] md:px-10">
              <div className="mx-auto flex w-full max-w-[1400px] flex-col">
                <h1
                  className={`${displayHead} w-full text-center text-[clamp(4.5rem,20vw,18rem)]`}
                >
                  The <SerifAccent>Archive</SerifAccent>
                </h1>
                <div className="mt-10 flex w-full flex-col items-start gap-3 text-left md:mt-14">
                  <div className="flex w-full items-baseline gap-x-10 gap-y-2">
                    <p className="font-[family-name:var(--font-archive-serif)] text-base text-[#1a1a1a] md:text-lg">
                      Elektra ETX
                    </p>
                    <p className="font-[family-name:var(--font-archive-serif)] text-base text-black/55 md:text-lg">
                      2024 →
                    </p>
                  </div>
                  <p className={`${microKicker} mt-3 text-black/45`}>
                    Bringing the quiet revolution
                  </p>
                </div>
              </div>
            </div>

            {/* ── PANE 2: QUOTE ── massive Norris-style wall, fills the screen.
              The pane is a strict 100dvh box; padding reserves room for the
              fixed top ribbon + bottom scroll hint, and the inner stack uses
              `min-h-0` so flex justify-center can never push lines past the
              pane bounds. */}
            <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#F9F8F3] px-3 py-[max(56px,7dvh)] md:px-6">
              <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-col items-center justify-center text-center">
                <p className={quoteLine} style={quoteLineStyle}>
                  Since The First
                </p>
                <p className={quoteLine} style={quoteLineStyle}>
                  <SerifAccent>ETX</SerifAccent> Rolled Out,
                </p>
                <p className={quoteLine} style={quoteLineStyle}>
                  ElektraTeq Has Been
                </p>
                <p className={quoteLine} style={quoteLineStyle}>
                  <SerifAccent>All In</SerifAccent> —
                </p>
                <p className={quoteLine} style={quoteLineStyle}>
                  Bringing <SerifAccent>Electric Calm</SerifAccent>
                </p>
                <p className={quoteLine} style={quoteLineStyle}>
                  To Every Street.
                </p>
              </div>
            </div>
          </motion.div>

          {/* TRAVELING IMAGE — floats over both panes, fixed in sticky viewport,
            position is driven by overall scroll progress so it physically
            migrates from hero anchor to quote centre. */}
          <motion.div
            style={{ x: imgX, y: imgY, scale: imgScale }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center will-change-transform"
          >
            {/*
            Exactly two layers (A/B), instant visibility swap only — no
            `transition-*` on these imgs (avoids fighting the parent motion
            transform and removes crossfade flicker).
          */}
            <div className="relative isolate h-[min(50vh,500px)] w-[min(50vw,500px)] overflow-hidden rounded-none bg-transparent">
              <img
                id="archive-hero-slot-a"
                src={`/images/gallery/${HERO_SEQUENCE[slotA.idx]}`}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full select-none border-0 object-cover outline-none [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
                style={{
                  opacity: slotA.opacity,
                  zIndex: slotA.z,
                }}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                draggable={false}
              />
              <img
                id="archive-hero-slot-b"
                src={`/images/gallery/${HERO_SEQUENCE[slotB.idx]}`}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full select-none border-0 object-cover outline-none [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
                style={{
                  opacity: slotB.opacity,
                  zIndex: slotB.z,
                }}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                draggable={false}
              />
            </div>
          </motion.div>

          {/* Footer hint — fixed inside sticky frame */}
          <motion.div
            style={{ opacity: hintOpacity, y: hintY }}
            className="absolute bottom-0 left-0 right-0 z-30 mx-auto mb-6 flex w-full max-w-[1400px] flex-col items-center gap-4 px-5 md:flex-row md:justify-between md:px-10"
          ></motion.div>
        </div>
      </section>
    </>
  );
}

/** ── PARTNERSHIPS · horizontal marquee ────────────────────────────────
 *  Off-Track has a thumb-driven horizontal rail of brand wordmarks.
 *  We render an infinite, GPU-cheap auto-marquee using two duplicated
 *  rails so the loop is seamless. Hover pauses the motion.
 */
function PartnershipsMarquee() {
  const rail = [...PARTNERS, ...PARTNERS];
  return (
    <section
      aria-label="Partnerships"
      className="relative w-full border-y border-black/[0.08] bg-[#f3f1eb]"
    >
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-5 pt-12 md:flex-row md:items-end md:justify-between md:gap-6 md:px-10 md:pt-16">
        <div>
          <p className={`${microKicker} text-black/45`}>Chapter 01 · Allies</p>
          <h3 className="mt-3 text-[clamp(1.85rem,4.4vw,3.25rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#101010]">
            The <SerifAccent>Partnerships</SerifAccent>
          </h3>
        </div>
        <p className="max-w-md font-[family-name:var(--font-archive-serif)] text-base text-black/55 md:max-w-xs md:text-right md:text-base">
          The brands and institutions moving the ETX from shed to street.
        </p>
      </div>

      {/* Mobile: wrapped wordmarks — zero horizontal overflow */}
      <div className="px-5 py-10 md:hidden">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-4">
          {PARTNERS.map((name) => (
            <span
              key={name}
              className="text-[clamp(1.15rem,4.2vw,1.65rem)] font-black uppercase tracking-[-0.03em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#0e0e0e]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Desktop: infinite marquee */}
      <div className="group relative hidden w-full overflow-hidden py-12 md:block md:py-16">
        <motion.div
          className="flex w-max items-center gap-14 will-change-transform group-hover:[animation-play-state:paused] md:gap-24"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 42, ease: "linear" }}
        >
          {rail.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="flex shrink-0 items-center gap-14 whitespace-nowrap text-[clamp(1.6rem,4.4vw,3.4rem)] font-black uppercase tracking-[-0.035em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#0e0e0e] md:gap-24"
            >
              {name}
              <span
                aria-hidden
                className="text-[1em] leading-none text-black/20"
              >
                ·
              </span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/** ── MANIFESTO · pinned horizontal scroll ─────────────────────────────
 *  Award-grade horizontal storytelling beat: a single statement broken
 *  into eight typographic / image plates that read sideways. Vertical
 *  scroll drives a 1:1 horizontal track translation on a sticky 100dvh
 *  stage, with a top beat counter, side rail, and bottom progress meter.
 *
 *  The total scroll height is computed from the measured track width so
 *  scroll → translate is exactly 1px:1px regardless of breakpoint, and
 *  the horizontal motion is GPU-driven via a single transform on the
 *  track (no per-panel scroll listeners).
 */

/**
 * Measures `trackRef.scrollWidth - viewportWidth` on mount + on resize so
 * every pinned-horizontal section can drive a perfect 1:1 vertical-scroll
 * → horizontal-translate ratio without hard-coding `vw` math.
 */
function useMeasuredHorizontalTravel(
  trackRef: React.RefObject<HTMLDivElement | null>,
) {
  const [travel, setTravel] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const w = track.scrollWidth;
      const v = globalThis.innerWidth || 0;
      setTravel(Math.max(0, w - v));
    };
    measure();
    globalThis.addEventListener("resize", measure);
    return () => globalThis.removeEventListener("resize", measure);
  }, [trackRef]);
  return travel;
}

/** ── THE SERIES · pinned horizontal scroll across all 3 chapters ──────
 *  All three project chapters (On Patrol / In Service / Of The People)
 *  read sideways inside one pinned 100dvh stage. Vertical scroll drives
 *  a single GPU transform on a horizontal track of "stops":
 *
 *    [CH02 title] → [02·01] → [02·02] → [02·03]
 *    → [CH03 title] → [03·01] → [03·02] → [03·03]
 *    → [CH04 title] → [04·01] → [04·02] → [04·03]
 *
 *  Travel and outer height are derived from the *measured* track width
 *  so the scroll-to-translate ratio is exactly 1px:1px on every device.
 */
type ChapterStop =
  | { kind: "title"; chapterIndex: number; chapter: ProjectChapter }
  | {
      kind: "plate";
      chapterIndex: number;
      plateIndex: number;
      chapter: ProjectChapter;
      image: ChapterImage;
    };

function buildChapterStops(): ChapterStop[] {
  const stops: ChapterStop[] = [];
  CHAPTERS.forEach((chapter, ci) => {
    stops.push({ kind: "title", chapterIndex: ci, chapter });
    chapter.images.forEach((image, ii) => {
      stops.push({
        kind: "plate",
        chapterIndex: ci,
        plateIndex: ii,
        chapter,
        image,
      });
    });
  });
  return stops;
}

const CHAPTER_STOPS = buildChapterStops();

function chapterStopLabel(stop: ChapterStop): string {
  if (stop.kind === "title") {
    const accent = stop.chapter.accentTitle
      ? ` ${stop.chapter.accentTitle}`
      : "";
    return `${stop.chapter.title}${accent}`;
  }
  return `${stop.image.tag} · ${stop.image.year}`;
}

/**
 * Per-plate visual variant — drives where the figure sits inside the
 * 100dvh stop and how big it is. Combined across 3 plates per chapter
 * this produces the asymmetric, magazine-like rhythm of the reference
 * (small portrait pinned high → large centred anchor → small portrait
 * pinned low), with captions floating *above* the image in tiny mono.
 */
type PlateVariant = "small-top" | "large-center" | "small-bottom";

const PLATE_VARIANTS: PlateVariant[] = [
  "small-top",
  "large-center",
  "small-bottom",
];

function plateLayout(variant: PlateVariant) {
  switch (variant) {
    case "small-top":
      return {
        wrapper:
          "relative flex h-full w-[64vw] shrink-0 items-start justify-center px-6 pt-[max(96px,12dvh)] md:w-[22vw] md:px-6 md:pt-[max(96px,11dvh)]",
        aspect: "aspect-[3/4]",
      };
    case "large-center":
      return {
        wrapper:
          "relative flex h-full w-[82vw] shrink-0 items-center justify-center px-6 md:w-[40vw] md:px-8",
        aspect: "aspect-[4/5]",
      };
    case "small-bottom":
      return {
        wrapper:
          "relative flex h-full w-[64vw] shrink-0 items-end justify-center px-6 pb-[max(96px,14dvh)] md:w-[22vw] md:px-6 md:pb-[max(96px,12dvh)]",
        aspect: "aspect-[3/4]",
      };
  }
}

function ChapterTitleStop({ chapter }: Readonly<{ chapter: ProjectChapter }>) {
  const dateRange =
    chapter.signature.split("·")[1]?.trim().toUpperCase() ?? "2024 — PRESENT";
  return (
    <article
      className="relative flex h-full w-[78vw] shrink-0 items-center justify-center px-6 md:w-[26vw] md:px-6"
      aria-label={
        chapter.title + (chapter.accentTitle ? ` ${chapter.accentTitle}` : "")
      }
    >
      <div className="relative flex w-full flex-col items-center text-center">
        <p className={`${microKicker} text-black/55`}>{chapter.kicker}</p>

        {/* Editorial display title — stacked, serif-led, mirrors
            "MASTERING / THE GREEN" from the reference. */}
        <h3
          className="mt-6 font-[family-name:var(--font-archive-serif)] font-semibold uppercase leading-[0.92] tracking-[-0.015em] text-[#0a0a0a]"
          style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.6rem)" }}
        >
          <span className="block">{chapter.title}</span>
          {chapter.accentTitle ? (
            <span className="block italic">{chapter.accentTitle}</span>
          ) : null}
        </h3>

        <p className={`${microKicker} mt-5 text-black/45`}>{dateRange}</p>

        <p className="mt-8 max-w-[28ch] font-[family-name:var(--font-archive-serif)] text-sm leading-relaxed text-black/65 md:text-base">
          {chapter.caption}
        </p>
      </div>
    </article>
  );
}

function ChapterPlateStop({
  chapter,
  image,
  plateIndex,
}: Readonly<{
  chapter: ProjectChapter;
  image: ChapterImage;
  plateIndex: number;
}>) {
  const variant = PLATE_VARIANTS[plateIndex % PLATE_VARIANTS.length];
  const { wrapper, aspect } = plateLayout(variant);
  const labelSize = variant === "large-center" ? "md" : "sm";

  return (
    <article className={wrapper} aria-label={`${image.tag} ${image.year}`}>
      <figure className="relative w-full">
        {/* Caption ABOVE the image — tiny mono "AUSTRALIA 2024" tag from
            the reference. Hugs the figure for that scrapbook label feel. */}
        <p
          className={`${microKicker} ${labelSize === "md" ? "mb-4" : "mb-3"} text-black/55`}
        >
          {image.tag.toUpperCase()} {image.year}
        </p>

        <div
          className={`relative ${aspect} w-full overflow-hidden bg-black/[0.04]`}
        >
          <Image
            src={`/images/gallery/${image.file}`}
            alt={`${image.tag} ${image.year}`}
            fill
            sizes={
              variant === "large-center"
                ? "(max-width: 768px) 82vw, 40vw"
                : "(max-width: 768px) 64vw, 22vw"
            }
            className="object-cover"
            loading="lazy"
          />
        </div>

        {chapter.title || chapter.accentTitle ? (
          <figcaption
            className="mt-3 font-[family-name:var(--font-archive-serif)] text-xs italic text-black/45 md:text-sm"
            style={{ color: TAUPE }}
          >
            {chapter.title}
            {chapter.accentTitle ? ` ${chapter.accentTitle}` : ""}
          </figcaption>
        ) : null}
      </figure>
    </article>
  );
}

/** Mobile: chapters as a vertical magazine stack — no pinned horizontal track. */
function ChaptersMobileVertical() {
  return (
    <section aria-label="The Series" className="bg-[#F1ECDF]">
      <header className="border-b border-black/[0.08] px-5 py-10">
        <p className={`${microKicker} text-black/50`}>The Series · Vol. 01</p>
        <h2 className="mt-4 text-[clamp(1.85rem,7.5vw,2.65rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#101010]">
          The <SerifAccent>Series</SerifAccent>
        </h2>
      </header>

      {CHAPTERS.map((chapter) => (
        <article
          key={chapter.key}
          className="border-b border-black/[0.06] px-5 py-12 last:border-b-0"
          aria-label={
            chapter.title +
            (chapter.accentTitle ? ` ${chapter.accentTitle}` : "")
          }
        >
          <p className={`${microKicker} text-black/45`}>{chapter.kicker}</p>
          <h3
            className="mt-4 font-[family-name:var(--font-archive-serif)] font-semibold uppercase leading-[0.92] tracking-[-0.02em] text-[#0a0a0a]"
            style={{ fontSize: "clamp(1.6rem,6.5vw,2.15rem)" }}
          >
            <span className="block">{chapter.title}</span>
            {chapter.accentTitle ? (
              <span className="block italic">{chapter.accentTitle}</span>
            ) : null}
          </h3>
          <p className={`${microKicker} mt-3 text-black/40`}>
            {chapter.signature}
          </p>
          <p className="mt-4 max-w-prose font-[family-name:var(--font-archive-serif)] text-base leading-relaxed text-black/70">
            {chapter.caption}
          </p>

          <div className="mt-10 flex flex-col gap-14">
            {chapter.images.map((img, ii) => (
              <figure
                key={`${chapter.key}-${img.file}-${ii}`}
                className={`flex min-w-0 max-w-md flex-col ${ii % 2 === 0 ? "mr-auto" : "ml-auto"}`}
              >
                <p
                  className={`${microKicker} mb-2 text-black/50 ${ii % 2 === 0 ? "text-left" : "text-right"}`}
                >
                  {img.tag.toUpperCase()} {img.year}
                </p>
                {/*
                  Avoid `fill` + `aspect-square` inside flex on iOS — the positioned
                  box can compute 0×0. Explicit intrinsic width/height keeps layout
                  stable; `aspect-square` + `object-cover` clips like the desktop plates.
                */}
                <Image
                  src={`/images/gallery/${img.file}`}
                  alt={`${img.tag} ${img.year}`}
                  width={1600}
                  height={1600}
                  sizes="(max-width: 768px) 92vw, 448px"
                  className="aspect-square w-full bg-black/[0.04] object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function ChaptersHorizontalScroll() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const travel = useMeasuredHorizontalTravel(trackRef);
  const [activeStop, setActiveStop] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const trackX = useTransform(scrollYProgress, [0, 1], [0, -travel]);
  const fillWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(
      CHAPTER_STOPS.length - 1,
      Math.max(0, Math.floor(v * CHAPTER_STOPS.length + Number.EPSILON)),
    );
    setActiveStop((cur) => (cur === idx ? cur : idx));
  });

  const currentStop = CHAPTER_STOPS[activeStop];
  const activeChapterIndex = currentStop.chapterIndex;
  const activeLabel = chapterStopLabel(currentStop);

  return (
    <>
      <div className="md:hidden">
        <ChaptersMobileVertical />
      </div>

      <section
        ref={sectionRef}
        aria-label="The Series — desktop"
        className="relative hidden w-full bg-[#F1ECDF] md:block"
        style={{ height: `calc(100dvh + ${travel}px)` }}
      >
        <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">
          {/* hairline top + bottom edges anchor the chapter as its own world */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-black/[0.08]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-px bg-black/[0.08]"
          />

          {/* TOP RIBBON · brand mark + live chapter counter */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-5 pt-[max(0.9rem,1.6dvh)] md:px-10">
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[#0a0a0a]" />
              <p className={`${microKicker} text-black/65`}>
                The Series · Vol. 01
              </p>
            </div>
            <p className={`${microKicker} text-black/40`}>
              Chapter{" "}
              <span className="text-[#0a0a0a]">
                {String(activeChapterIndex + 2).padStart(2, "0")}
              </span>{" "}
              <span className="text-black/30">/</span>{" "}
              {String(CHAPTERS.length + 1).padStart(2, "0")}
            </p>
          </div>

          {/* LEFT SIDE-RAIL · vertical rotated label */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 z-30 origin-left -translate-y-1/2 -rotate-90 md:left-4"
          >
            <p className={`${microKicker} whitespace-nowrap text-black/40`}>
              ↓ scroll · drives →
            </p>
          </div>

          {/* TRACK · single GPU transform across all 12 stops */}
          <motion.div
            ref={trackRef}
            style={{ x: trackX }}
            className="absolute inset-y-0 left-0 z-10 flex h-full items-center will-change-transform"
          >
            {CHAPTER_STOPS.map((stop) =>
              stop.kind === "title" ? (
                <ChapterTitleStop
                  key={`title-${stop.chapter.key}`}
                  chapter={stop.chapter}
                />
              ) : (
                <ChapterPlateStop
                  key={`plate-${stop.chapter.key}-${stop.image.file}`}
                  chapter={stop.chapter}
                  image={stop.image}
                  plateIndex={stop.plateIndex}
                />
              ),
            )}
          </motion.div>

          {/* BOTTOM BAR · live label + thin progress meter */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-5 pb-5 md:px-10 md:pb-7">
            <div className="flex items-center justify-between">
              <p
                className={`${microKicker} max-w-[60%] truncate text-black/60`}
              >
                {activeLabel}
              </p>
              <p className={`${microKicker} hidden text-black/40 md:block`}>
                Stop{" "}
                <span className="text-[#0a0a0a]">
                  {String(activeStop + 1).padStart(2, "0")}
                </span>{" "}
                <span className="text-black/30">/</span>{" "}
                {String(CHAPTER_STOPS.length).padStart(2, "0")}
              </p>
            </div>
            <div className="relative h-px w-full bg-black/[0.08]">
              <motion.div
                style={{ width: fillWidth }}
                className="absolute left-0 top-0 h-px bg-[#0a0a0a]"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** ── FILMS · YouTube cards (click → lightbox) ─────────────────────────
 *  Each card uses the official `i.ytimg.com` still for that video id,
 *  a play affordance, and opens <VideoLightbox /> via `archive:open-video`.
 */
function FilmsGrid() {
  const open = useCallback((film: Film) => {
    globalThis.dispatchEvent(
      new CustomEvent("archive:open-video", {
        detail: { id: film.id, title: film.title },
      }),
    );
  }, []);

  return (
    <section
      aria-label="Films"
      className="relative mx-auto max-w-[1500px] px-5 py-16 md:px-10 md:py-32"
    >
      <div className="mb-10 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <p className={`${microKicker} text-black/45`}>Chapter 05 · Cinema</p>
          <h3 className="mt-3 text-center text-[clamp(2rem,9vw,4.5rem)] font-black uppercase leading-[0.86] tracking-[-0.045em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#101010] md:mt-4 md:text-left">
            <span className="block md:inline">The </span>
            <span className="block md:inline">
              <SerifAccent>Films</SerifAccent>
            </span>
          </h3>
        </div>
        <p className="text-center font-[family-name:var(--font-archive-serif)] text-sm text-black/55 md:max-w-xs md:text-right md:text-base">
          Tap a still to roll the film — full-screen, ad-free.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        {FILMS.map((film) => (
          <button
            key={film.id}
            type="button"
            onClick={() => open(film)}
            className="group relative block w-full cursor-pointer text-left"
            aria-label={`Play ${film.title}`}
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-none border-0 bg-black/[0.04] shadow-none transition-shadow duration-500 md:rounded-[10px] md:border md:border-black/[0.1] md:shadow-[0_28px_80px_rgba(0,0,0,0.14)] md:group-hover:shadow-[0_40px_120px_rgba(0,0,0,0.22)]">
              <Image
                src={youtubeThumbnailUrl(film.id)}
                alt={film.title}
                fill
                sizes="(max-width: 768px) 92vw, 46vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent transition-opacity duration-500 group-hover:from-black/75" />

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:border-white/70 md:h-24 md:w-24">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-7 w-7 translate-x-[2px] fill-white md:h-8 md:w-8"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>

              <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-white/30 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-white backdrop-blur-md">
                {film.meta}
              </div>

              <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
                <p className="max-w-[20ch] text-[clamp(1.25rem,2.4vw,1.85rem)] font-black uppercase leading-[1] tracking-[-0.025em] [font-family:var(--font-archive-display),ui-sans-serif]">
                  {film.title}
                </p>
                <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.28em] text-white/75">
                  {film.meta}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/** ── FIELD NOTES · contact-sheet grid ─────────────────────────────────
 *  Closing beat before the footer — six archive stills, image only.
 */
function MarginsGrid() {
  return (
    <section
      aria-label="Field Notes"
      className="relative mx-auto max-w-[1500px] px-5 py-16 md:px-10 md:py-28"
    >
      <div className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="text-center md:text-left">
          <p className={`${microKicker} text-black/45`}>
            Chapter 06 · Field Notes
          </p>
          <h3 className="mt-4 text-[clamp(2rem,8vw,4.5rem)] font-black uppercase leading-[0.86] tracking-[-0.045em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#101010] md:mt-4">
            <span className="block md:inline">From The </span>
            <span className="block md:inline">
              <SerifAccent>Margins</SerifAccent>
            </span>
          </h3>
        </div>
        <p
          className="max-w-md text-center font-[family-name:var(--font-archive-serif)] text-base italic md:text-right md:text-lg"
          style={{ color: TAUPE }}
        >
          Frames that never made the cut — but kept the story honest.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-6 md:gap-4">
        {MARGIN_FRAME_FILES.map((file) => (
          <div
            key={file}
            className="group w-full min-w-0 overflow-hidden bg-black/[0.04]"
          >
            <Image
              src={`/images/gallery/${file}`}
              alt=""
              width={800}
              height={800}
              sizes="(max-width: 768px) 46vw, 16vw"
              className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** ── YOUTUBE LIGHTBOX ─────────────────────────────────────────────────── */
function VideoLightbox({
  open,
  videoId,
  title,
  onClose,
}: Readonly<{
  open: boolean;
  videoId: string | null;
  title: string;
  onClose: () => void;
}>) {
  return (
    <AnimatePresence>
      {open && videoId ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Cinema playback"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xl md:p-10"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl overflow-hidden rounded-[24px] border border-black/[0.12] bg-black shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <p className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
                {title}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/20 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.28em] text-white/80 transition-colors hover:border-white/45 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                title={title}
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** ── PAGE ─────────────────────────────────────────────────────────────── */
export function ArchivePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);

  const [videoOpen, setVideoOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title: string;
  } | null>(null);

  /** GSAP black-to-cream wipe on mount. */
  useGSAP(() => {
    const el = wipeRef.current;
    if (!el) return;
    gsap.set(el, { yPercent: 0, pointerEvents: "auto" });
    gsap.to(el, {
      yPercent: -100,
      duration: 1.15,
      ease: "power3.inOut",
      delay: 0.06,
      onComplete: () => {
        gsap.set(el, { pointerEvents: "none", autoAlpha: 0 });
      },
    });
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<{ id: string; title: string }>;
      if (!ce.detail?.id) return;
      setActiveVideo({ id: ce.detail.id, title: ce.detail.title });
      setVideoOpen(true);
    };
    globalThis.addEventListener("archive:open-video", onOpen as EventListener);
    return () =>
      globalThis.removeEventListener(
        "archive:open-video",
        onOpen as EventListener,
      );
  }, []);

  return (
    <div
      ref={pageRef}
      className="relative min-h-[100dvh] overflow-x-clip bg-[#F9F8F3]"
    >
      <div
        ref={wipeRef}
        className="pointer-events-auto fixed inset-0 z-[300] bg-black will-change-transform"
        aria-hidden
      />

      <VideoLightbox
        open={videoOpen}
        videoId={activeVideo?.id ?? null}
        title={activeVideo?.title ?? ""}
        onClose={() => {
          setVideoOpen(false);
          setActiveVideo(null);
        }}
      />

      {/*
        Section flow:
          1. Hero + tagline quote (sticky scroll-track w/ travelling frame)
          2. Partnerships marquee — horizontal break in vertical rhythm
          3. The Series — pinned horizontal scroll across all 3 chapters
          4. Films grid — YouTube cards open the lightbox
          5. Field Notes — contact-sheet of margin frames
      */}
      <HeroAndQuoteScrollTrack />
      <PartnershipsMarquee />
      <ChaptersHorizontalScroll />
      <FilmsGrid />
      <MarginsGrid />

      <footer className="relative z-20 mx-auto max-w-[1500px] border-t border-black/[0.08] px-5 pb-16 pt-12 md:px-10 md:pb-20 md:pt-14">
        <p className="max-w-3xl text-center text-[clamp(1.65rem,5.5vw,3.25rem)] font-black uppercase leading-[0.95] tracking-[-0.04em] [font-family:var(--font-archive-display),ui-sans-serif] text-[#101010] md:text-left">
          It Doesn&apos;t Matter Where You Start —{" "}
          <SerifAccent>It&apos;s How You Move Forward.</SerifAccent>
        </p>
        <p
          className={`${microKicker} mt-6 text-center text-black/45 md:text-left`}
        >
          ElektraTeq · The Archive · Vol. 01
        </p>
      </footer>
    </div>
  );
}

export default ArchivePage;
