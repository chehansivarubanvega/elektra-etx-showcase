"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useGSAP} from "@gsap/react";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {ContactScene, type ContactPointerSample, type ContactSceneHandle} from "./ContactScene";

if (typeof globalThis.window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const FONT_DISPLAY = "var(--font-contact-display)";
const FONT_MONO = "var(--font-contact-mono)";

const ACCENT = "#FF5722";

/* ──────────────────────────────────────────────────────────────────────────
 * Coordinates rendered as HUD overlays on top of the 3D twin.
 * ──────────────────────────────────────────────────────────────────────── */
const HUD_COORDS = [
  {label: "COL · HQ", lat: "06°56′05″N", lon: "79°50′37″E"},
  {label: "MARADANA · OFFICE", lat: "06°55′47″N", lon: "79°51′58″E"},
];

type FormState = {name: string; organization: string; email: string; subject: string};

const INITIAL_FORM: FormState = {name: "", organization: "", email: "", subject: ""};

export const ContactPage = () => {
  /* ─── Pointer plumbing ───────────────────────────────────────────────── */
  const pointerRef = useRef<ContactPointerSample>({nx: 0, ny: 0, active: false});
  const sceneHandleRef = useRef<ContactSceneHandle>(null);

  const [overCanvas, setOverCanvas] = useState(false);

  /** Coarse pointer / mobile flag — toggles layout, scene framing, and which
   *  interaction (hover vs drag) drives the model. */
  const [isMobile, setIsMobile] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    const mqMobile = globalThis.window.matchMedia("(max-width: 1023px)");
    const mqCoarse = globalThis.window.matchMedia("(pointer: coarse)");
    const update = () => {
      setIsMobile(mqMobile.matches);
      setCoarsePointer(mqCoarse.matches);
    };
    update();
    mqMobile.addEventListener("change", update);
    mqCoarse.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqCoarse.removeEventListener("change", update);
    };
  }, []);

  /* ─── Form state ─────────────────────────────────────────────────────── */
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /** Progress bar tween — driven imperatively so React doesn't reflow on each char. */
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);

  /** Compute the % of "filled" inputs (0–1). */
  const formFill = useMemo(() => {
    const fields = [form.name, form.organization, form.email, form.subject];
    const filled = fields.filter((v) => v.trim().length > 0).length;
    return filled / fields.length;
  }, [form]);

  /* ─── Email magnetic + copy state ────────────────────────────────────── */
  const [copied, setCopied] = useState(false);
  const emailWrapRef = useRef<HTMLAnchorElement>(null);

  /* ─── Refs the GSAP timeline reveals against ─────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);

  /* ─────────────────────────────────────────────────────────────────────
   * Pointer tracking — fine pointers (mouse/trackpad) drive the model with
   * a single global hover listener; coarse pointers (touch) get a drag-only
   * model on the canvas section so finger swipes rotate the vehicle without
   * blocking page scroll outside the canvas.
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    if (coarsePointer) return;
    const onMove = (e: MouseEvent) => {
      const w = globalThis.window.innerWidth;
      const h = globalThis.window.innerHeight;
      pointerRef.current.nx = (e.clientX / w) * 2 - 1;
      pointerRef.current.ny = -((e.clientY / h) * 2 - 1);
    };
    globalThis.window.addEventListener("pointermove", onMove, {passive: true});
    return () => globalThis.window.removeEventListener("pointermove", onMove);
  }, [coarsePointer]);

  /** Touch-drag interaction — registered against the canvas section ref so the
   *  rest of the page scrolls normally on touch devices. Builds nx/ny from the
   *  drag delta relative to the section bounds and sets `active` while held. */
  const canvasSectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    if (!coarsePointer) return;
    const el = canvasSectionRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      pointerRef.current.active = true;
      setOverCanvas(true);
      const rect = el.getBoundingClientRect();
      pointerRef.current.nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointerRef.current.active) return;
      const rect = el.getBoundingClientRect();
      pointerRef.current.nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onPointerEnd = () => {
      pointerRef.current.active = false;
      setOverCanvas(false);
    };

    el.addEventListener("pointerdown", onPointerDown, {passive: true});
    globalThis.window.addEventListener("pointermove", onPointerMove, {passive: true});
    globalThis.window.addEventListener("pointerup", onPointerEnd, {passive: true});
    globalThis.window.addEventListener("pointercancel", onPointerEnd, {passive: true});

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      globalThis.window.removeEventListener("pointermove", onPointerMove);
      globalThis.window.removeEventListener("pointerup", onPointerEnd);
      globalThis.window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [coarsePointer]);

  /* ─────────────────────────────────────────────────────────────────────
   * Page entrance — GSAP "slide-up" reveal driven from layout-effect.
   * Mirrors the cinematic feel of the rest of the dark-themed routes.
   * ─────────────────────────────────────────────────────────────────── */
  useGSAP(
    () => {
      // Slide-up entrance for the entire right column (header + nodes).
      const tl = gsap.timeline({defaults: {ease: "power3.out"}});
      tl.from(rootRef.current, {y: 40, autoAlpha: 0, duration: 0.7})
        .from(
          headerRef.current,
          {y: 60, autoAlpha: 0, duration: 0.95, ease: "power4.out"},
          "-=0.45",
        );

      // ScrollTrigger reveal for each contact "node" — 0.1s stagger as spec'd.
      const nodes = gsap.utils.toArray<HTMLElement>(".contact-node");
      gsap.from(nodes, {
        y: 36,
        autoAlpha: 0,
        filter: "blur(8px)",
        duration: 0.95,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: nodesRef.current,
          start: "top 82%",
          once: true,
        },
      });
    },
    {scope: rootRef},
  );

  /* ─────────────────────────────────────────────────────────────────────
   * Form value handler — mirrors state + animates the "transmitting" bar.
   * ─────────────────────────────────────────────────────────────────── */
  const onFieldChange = useCallback(
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setForm((prev) => ({...prev, [key]: val}));
    },
    [],
  );

  /** Drive the progress bar imperatively — silky regardless of typing cadence. */
  useEffect(() => {
    const el = progressBarRef.current;
    if (!el) return;
    progressTweenRef.current?.kill();
    progressTweenRef.current = gsap.to(el, {
      width: `${Math.round(formFill * 100)}%`,
      duration: 0.55,
      ease: "power3.out",
    });
  }, [formFill]);

  /* ─────────────────────────────────────────────────────────────────────
   * Submit — fires the Three.js "Pulse", flashes a confirmation, resets.
   * ─────────────────────────────────────────────────────────────────── */
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      sceneHandleRef.current?.pulse();

      // Visual fake-send — keeps the demo deterministic without a backend.
      globalThis.window.setTimeout(() => {
        setSubmitting(false);
        setSubmitted(true);
        setForm(INITIAL_FORM);
        globalThis.window.setTimeout(() => setSubmitted(false), 3200);
      }, 1100);
    },
    [submitting],
  );

  /* ─────────────────────────────────────────────────────────────────────
   * Magnetic email — moves toward cursor when in proximity, then snaps back.
   * Skipped on coarse pointers — without a hover state the effect would jitter
   * the element during page scroll on touch devices.
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (coarsePointer) return;
    const el = emailWrapRef.current;
    if (!el || typeof globalThis.window === "undefined") return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const RADIUS = 110;
      if (dist < RADIUS) {
        const pull = (1 - dist / RADIUS) * 0.34;
        gsap.to(el, {x: dx * pull, y: dy * pull, duration: 0.4, ease: "power3.out"});
      } else {
        gsap.to(el, {x: 0, y: 0, duration: 0.6, ease: "power3.out"});
      }
    };
    globalThis.window.addEventListener("pointermove", onMove);
    return () => {
      globalThis.window.removeEventListener("pointermove", onMove);
      gsap.killTweensOf(el);
    };
  }, [coarsePointer]);

  const onCopyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText("info@elektrateq.com");
      setCopied(true);
      globalThis.window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Silently ignore — the mailto: anchor still works as fallback.
    }
  }, []);

  return (
    <main
      className="relative isolate w-full min-w-0 max-w-full overflow-x-clip bg-[#000000] text-white"
      style={{fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif"}}
    >
      <GlobalGrain />
      <BackgroundGrid />

      {/* ─── SPLIT LAYOUT ─────────────────────────────────────────────── */}
      <div
        ref={rootRef}
        className="relative z-10 flex min-h-[100dvh] w-full flex-col lg:flex-row"
      >
        {/* ============================================================
            LEFT — TECHNICAL TWIN (3D macro view)
            On desktop (lg+): fixed full-height column (50vw).
            On mobile/tablet: stacks at top as a 70vh hero with a corner-
            ticked viewport frame, swipe-to-rotate, and a more compact HUD.
        ============================================================ */}
        <section
          aria-label="Technical twin"
          ref={canvasSectionRef}
          onPointerEnter={
            coarsePointer
              ? undefined
              : () => {
                  setOverCanvas(true);
                  pointerRef.current.active = true;
                }
          }
          onPointerLeave={
            coarsePointer
              ? undefined
              : () => {
                  setOverCanvas(false);
                  pointerRef.current.active = false;
                }
          }
          className="relative h-[70vh] min-h-[440px] w-full overflow-hidden border-b border-white/[0.06] bg-[#050505] lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-1/2 lg:border-b-0 lg:border-r"
          style={
            coarsePointer
              ? {touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none"}
              : undefined
          }
        >
          {/* Brand wash + edge-fade so the canvas reads as a "studio" detail
              shot rather than just a floating model on flat black. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_55%,rgba(255,87,34,0.14),transparent_60%)] lg:bg-[radial-gradient(ellipse_60%_55%_at_55%_55%,rgba(255,87,34,0.10),transparent_60%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,#000_0%,transparent_18%,transparent_82%,#000_100%)]"
          />

          <ContactScene
            pointerRef={pointerRef}
            handleRef={sceneHandleRef}
            framing={isMobile ? "mobile" : "desktop"}
          />

          {/* Mobile-only "viewport" corner ticks — frames the canvas as a
              technical instrument and visually anchors the model in space. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 z-10 lg:hidden"
          >
            <CornerTicks />
          </div>

          {/* HUD overlay — Lat/Long + chapter label */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="flex h-full flex-col justify-between p-4 sm:p-7">
              {/* Top bar */}
              <div className="flex items-start justify-between gap-3 text-white/55">
                <div
                  className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.32em]"
                  style={{fontFamily: FONT_MONO}}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{backgroundColor: ACCENT}} />
                  <span>{"// chapter_05 · contact"}</span>
                </div>
                <div
                  className="hidden font-mono text-[9px] uppercase tracking-[0.32em] sm:block"
                  style={{fontFamily: FONT_MONO}}
                >
                  CAM · MACRO_REAR_QUARTER
                </div>
              </div>

              {/* Bottom HUD: coordinates.
                  Mobile: stacked compact, single column at viewport bottom.
                  Desktop: 2-up grid with full label/value pairs. */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-2">
                {HUD_COORDS.map((c) => (
                  <HudCoord
                    key={c.label}
                    label={c.label}
                    lat={c.lat}
                    lon={c.lon}
                    compact={isMobile}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Center crosshair — desktop only (clutters the small portrait frame) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          >
            <div className="h-[14px] w-px bg-white/15" />
            <div className="absolute left-1/2 top-1/2 h-px w-[14px] -translate-x-1/2 -translate-y-1/2 bg-white/15" />
          </div>

          {/* Interaction hint — copy switches per input mode (cursor vs touch).
              Sits above the bottom HUD on mobile so it never collides with it. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-[88px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/[0.08] bg-black/55 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.32em] backdrop-blur-md transition-opacity duration-300 sm:tracking-[0.4em] lg:bottom-6 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none ${
              overCanvas ? "text-[#FF5722] opacity-100" : "text-white/55 opacity-95"
            }`}
            style={{fontFamily: FONT_MONO}}
          >
            {coarsePointer
              ? "↻ DRAG TO ROTATE · TAP TO PULSE"
              : "↕ MOVE CURSOR · MODULATE EMISSION"}
          </div>

          {/* Mobile scroll affordance — small indicator that more content is
              below the canvas. Fades after the user scrolls a bit. */}
          {isMobile && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 lg:hidden"
            >
              <span
                className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/40"
                style={{fontFamily: FONT_MONO}}
              >
                Scroll
              </span>
              <span className="block h-[18px] w-px bg-gradient-to-b from-white/45 to-transparent" />
            </div>
          )}
        </section>

        {/* ============================================================
            RIGHT — INQUIRY SYSTEM
        ============================================================ */}
        <section
          aria-label="Inquiry system"
          className="relative z-10 ml-auto w-full bg-[#000000] px-5 pb-24 pt-12 sm:px-10 sm:pt-16 lg:w-1/2 lg:px-12 lg:pb-32 lg:pt-32"
        >
          {/* Eyebrow */}
          <div className="contact-node mb-6 flex items-center gap-3 sm:mb-8">
            <span className="h-px w-8 sm:w-10" style={{backgroundColor: ACCENT}} />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.36em] sm:text-[10px] sm:tracking-[0.42em]"
              style={{color: ACCENT, fontFamily: FONT_MONO}}
            >
              {"// 05 · transmission"}
            </span>
          </div>

          {/* Massive outlined headline.
              Mobile clamp goes wider in vw so the type fills the narrow column;
              the `lg:` clamp keeps the desktop scale unchanged. */}
          <h1
            ref={headerRef}
            aria-label="Get in touch"
            className="select-none text-balance text-[clamp(2.75rem,16vw,5.25rem)] font-black uppercase leading-[0.86] tracking-[-0.04em] sm:text-[clamp(3.25rem,11vw,9rem)] sm:leading-[0.85] sm:tracking-[-0.045em]"
            style={{
              fontFamily: FONT_DISPLAY,
              WebkitTextStroke: "1.2px rgba(255,255,255,0.85)",
              color: "transparent",
            }}
          >
            <span className="block">Get In</span>
            <span
              className="block"
              style={{
                WebkitTextStroke: `1.2px ${ACCENT}`,
                color: "transparent",
              }}
            >
              Touch.
            </span>
          </h1>

          <div ref={nodesRef} className="mt-10 flex flex-col gap-10 sm:mt-16 sm:gap-14">
            {/* ─── HEADQUARTERS ─────────────────────────────────────── */}
            <ContactNode index="01" title="Headquarters">
              <p className="text-[clamp(1.05rem,1.45vw,1.3rem)] leading-[1.5] text-white/85">
                Trace Expert City, Tripoli Market,
                <br />
                Maradana, Sri Lanka.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                <span>06°55′47″N</span>
                <span>79°51′58″E</span>
                <span style={{color: ACCENT}}>· UTC +05:30</span>
              </div>
            </ContactNode>

            {/* ─── DIRECT LINES ─────────────────────────────────────── */}
            <ContactNode index="02" title="Direct Lines">
              <a
                href="tel:+94114222504"
                className="group inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 transition-colors hover:text-[#FF5722]"
              >
                <span
                  className="text-[clamp(1.6rem,8vw,2.4rem)] font-bold leading-[0.95] tracking-[-0.025em] text-white transition-colors group-hover:text-[#FF5722] sm:text-[clamp(2rem,4.6vw,3.6rem)]"
                  style={{fontFamily: FONT_DISPLAY}}
                >
                  +94 11 422 2504
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35 transition-colors group-hover:text-[#FF5722]/80"
                  style={{fontFamily: FONT_MONO}}
                >
                  ↗
                </span>
              </a>
              <p
                className="mt-3 max-w-md font-mono text-[9px] uppercase tracking-[0.26em] text-white/40 sm:text-[10px] sm:tracking-[0.28em]"
                style={{fontFamily: FONT_MONO}}
              >
                Mon — Fri · 09:00 → 18:00 (Asia/Colombo)
              </p>
            </ContactNode>

            {/* ─── EMAIL — magnetic + copy ──────────────────────────── */}
            <ContactNode index="03" title="Email">
              <div className="group relative inline-flex max-w-full items-center gap-3">
                <a
                  ref={emailWrapRef}
                  href="mailto:info@elektrateq.com"
                  onClick={(e) => {
                    e.preventDefault();
                    onCopyEmail();
                  }}
                  className="relative inline-flex max-w-full items-baseline gap-3 will-change-transform"
                  aria-label="Copy email address to clipboard"
                >
                  <span
                    className="block max-w-full break-all text-[clamp(1.15rem,5.6vw,1.7rem)] font-semibold leading-[1.1] tracking-[-0.015em] text-white transition-colors group-hover:text-[#FF5722] sm:break-normal sm:text-[clamp(1.5rem,3vw,2.4rem)] sm:leading-[1] sm:tracking-[-0.02em]"
                    style={{fontFamily: FONT_DISPLAY}}
                  >
                    info@elektrateq.com
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-0 right-0 h-px origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                    style={{backgroundColor: ACCENT}}
                  />
                </a>

                {/* Tooltip — appears above the email on hover/focus or after a copy.
                    On coarse pointers (no hover) we only show it after copying. */}
                <span
                  aria-hidden={!copied}
                  className={`pointer-events-none absolute -top-8 left-0 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#0a0a0a]/90 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.26em] text-white/85 backdrop-blur-md transition-all duration-300 sm:-top-9 sm:px-3 sm:py-1.5 sm:tracking-[0.28em] ${
                    copied
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0"
                  }`}
                  style={{fontFamily: FONT_MONO}}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{backgroundColor: copied ? "#3ddc84" : ACCENT}}
                  />
                  {copied ? "Copied to Clipboard" : "Tap to Copy"}
                </span>
              </div>
              <p
                className="mt-3 max-w-md font-mono text-[9px] uppercase tracking-[0.26em] text-white/40 sm:text-[10px] sm:tracking-[0.28em]"
                style={{fontFamily: FONT_MONO}}
              >
                Encrypted mail preferred · Response window 24–48h
              </p>
            </ContactNode>

            {/* ─── SIGNAL FORM ──────────────────────────────────────── */}
            <ContactNode index="04" title="Send Signal">
              <form
                onSubmit={onSubmit}
                className="relative mt-2 w-full max-w-xl"
                aria-busy={submitting}
              >
                {/* Data-Transmitting progress bar */}
                <div
                  aria-hidden="true"
                  className="relative mb-10 h-px w-full overflow-hidden bg-white/[0.08]"
                >
                  <div
                    ref={progressBarRef}
                    className="absolute left-0 top-0 h-full"
                    style={{
                      width: "0%",
                      backgroundColor: ACCENT,
                      boxShadow: "0 0 12px rgba(255,87,34,0.7)",
                    }}
                  />
                  <div
                    className="absolute -top-5 left-0 right-0 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.32em] text-white/40"
                    style={{fontFamily: FONT_MONO}}
                  >
                    <span style={{color: formFill > 0 ? ACCENT : undefined}}>
                      {submitting
                        ? "// transmitting…"
                        : formFill > 0
                          ? "// data_transmitting"
                          : "// awaiting_input"}
                    </span>
                    <span className="tabular-nums">
                      {String(Math.round(formFill * 100)).padStart(3, "0")}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-7">
                  <SignalInput
                    label="Name"
                    name="name"
                    autoComplete="name"
                    value={form.name}
                    onChange={onFieldChange("name")}
                    disabled={submitting}
                  />
                  <SignalInput
                    label="Organization"
                    name="organization"
                    autoComplete="organization"
                    value={form.organization}
                    onChange={onFieldChange("organization")}
                    disabled={submitting}
                  />
                  <SignalInput
                    label="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={onFieldChange("email")}
                    disabled={submitting}
                    required
                  />
                  <SignalInput
                    label="Subject"
                    name="subject"
                    autoComplete="off"
                    value={form.subject}
                    onChange={onFieldChange("subject")}
                    disabled={submitting}
                  />
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-4 sm:mt-12 sm:gap-6">
                  <button
                    type="submit"
                    disabled={submitting || form.email.trim().length === 0}
                    className={`group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden border px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.32em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:justify-start sm:px-7 ${
                      submitting
                        ? "border-[#FF5722] bg-[#FF5722] text-black"
                        : "border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722] hover:text-black"
                    }`}
                    style={{fontFamily: FONT_MONO}}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-block h-2 w-2 rounded-full ${
                        submitting ? "bg-black" : "bg-[#FF5722]"
                      } ${submitting ? "animate-ping" : ""}`}
                    />
                    {submitting ? "Transmitting…" : "Send Signal"}
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </button>

                  {/* Submit confirmation — appears briefly post-pulse */}
                  <span
                    aria-live="polite"
                    className={`font-mono text-[10px] uppercase tracking-[0.32em] transition-all duration-300 ${
                      submitted ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                    }`}
                    style={{color: ACCENT, fontFamily: FONT_MONO}}
                  >
                    {"// signal_received · channel_clear"}
                  </span>
                </div>
              </form>
            </ContactNode>
          </div>

          {/* Closing meta — keeps the column visually anchored on tall viewports */}
          <div className="contact-node mt-20 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-8 sm:grid-cols-4">
            <MetaCell title="Origin" value="Maradana · LK" />
            <MetaCell title="Latency" value="≤ 48h" />
            <MetaCell title="Status" value="Accepting" accent />
            <MetaCell title="Region" value="South Asia" />
          </div>
        </section>
      </div>
    </main>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
 * Sub-components
 * ──────────────────────────────────────────────────────────────────────── */

const ContactNode = ({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="contact-node grid grid-cols-12 gap-4 sm:gap-6">
    <div className="col-span-12 flex items-center gap-3 sm:col-span-3">
      <span
        className="font-mono text-[10px] tabular-nums uppercase tracking-[0.32em] text-white/35"
        style={{fontFamily: FONT_MONO}}
      >
        {index}
      </span>
      <span className="h-px w-6 bg-white/15" />
      <span
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-white/65"
        style={{fontFamily: FONT_MONO}}
      >
        {title}
      </span>
    </div>
    <div className="col-span-12 sm:col-span-9">{children}</div>
  </div>
);

const MetaCell = ({title, value, accent}: {title: string; value: string; accent?: boolean}) => (
  <div className="flex flex-col gap-1">
    <span
      className="font-mono text-[9px] uppercase tracking-[0.32em] text-white/35"
      style={{fontFamily: FONT_MONO}}
    >
      {title}
    </span>
    <span
      className="text-[14px] font-semibold tracking-tight"
      style={{
        color: accent ? ACCENT : "rgba(255,255,255,0.92)",
        fontFamily: FONT_DISPLAY,
      }}
    >
      {value}
    </span>
  </div>
);

const HudCoord = ({
  label,
  lat,
  lon,
  compact = false,
}: {
  label: string;
  lat: string;
  lon: string;
  /** Mobile/portrait variant — shorter label, single coordinate value, smaller. */
  compact?: boolean;
}) => (
  <div
    className="rounded-sm border border-white/[0.08] bg-black/55 px-2.5 py-1.5 backdrop-blur-md sm:px-3 sm:py-2"
    style={{fontFamily: FONT_MONO}}
  >
    <div className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.28em] text-white/45 sm:text-[8.5px] sm:tracking-[0.32em]">
      <span className="inline-block h-1 w-1" style={{backgroundColor: ACCENT}} />
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[9px] tabular-nums text-white/85 sm:text-[10px] sm:gap-x-3">
      <span>{lat}</span>
      {!compact && <span className="text-white/30">·</span>}
      <span className={compact ? "text-white/65" : ""}>{lon}</span>
    </div>
  </div>
);

/** Four corner ticks — gives the mobile canvas an "instrument viewport" feel
 *  matching the rest of the brand language (mirrors the Footer corner brackets). */
const CornerTicks = () => (
  <>
    <span className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l border-t border-white/30" />
    <span className="pointer-events-none absolute -right-px -top-px h-3 w-3 border-r border-t border-white/30" />
    <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-white/30" />
    <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-white/30" />
  </>
);

/**
 * Single-horizontal-line input — minimalist "signal" field.
 * Floating label tucks under the line on focus / when filled.
 */
const SignalInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  disabled,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}) => {
  const filled = value.trim().length > 0;
  return (
    <label className="group relative block">
      <span
        className={`pointer-events-none absolute left-0 origin-left font-mono uppercase tracking-[0.3em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          filled
            ? "top-0 text-[9px] text-[#FF5722]"
            : "top-4 text-[11px] text-white/40 group-focus-within:top-0 group-focus-within:text-[9px] group-focus-within:text-[#FF5722]"
        }`}
        style={{fontFamily: FONT_MONO}}
      >
        {label}
        {required ? <span className="ml-1 opacity-70">*</span> : null}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        className="block w-full border-0 border-b border-white/[0.18] bg-transparent pb-2 pt-5 text-[15px] font-medium tracking-tight text-white outline-none transition-colors duration-300 focus:border-[#FF5722]"
      />
      {/* Animated underline accent that grows from the left on focus / fill */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 left-0 h-px origin-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          filled ? "scale-x-100" : "scale-x-0 group-focus-within:scale-x-100"
        }`}
        style={{width: "100%", backgroundColor: ACCENT}}
      />
    </label>
  );
};

/** 3-column ambient grid — matches the sitewide overlay rhythm. */
const BackgroundGrid = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-[1] opacity-40"
    style={{
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
      `,
      // 3-column horizontal × 3-row vertical rhythm.
      backgroundSize: "calc(100% / 3) calc(100% / 3)",
    }}
  />
);

/** Fixed full-screen SVG noise — matches the AboutPage film-stock tone. */
const GlobalGrain = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-[9998] mix-blend-overlay opacity-[0.13]"
    style={{
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      backgroundSize: "240px 240px",
    }}
  />
);

export default ContactPage;
