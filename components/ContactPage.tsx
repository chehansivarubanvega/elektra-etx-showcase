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
   * Pointer tracking — single global listener, normalized for the scene.
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    const onMove = (e: MouseEvent) => {
      const w = globalThis.window.innerWidth;
      const h = globalThis.window.innerHeight;
      pointerRef.current.nx = (e.clientX / w) * 2 - 1;
      pointerRef.current.ny = -((e.clientY / h) * 2 - 1);
    };
    globalThis.window.addEventListener("pointermove", onMove, {passive: true});
    return () => globalThis.window.removeEventListener("pointermove", onMove);
  }, []);

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
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
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
  }, []);

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
            On desktop: fixed full-height column (50vw).
            On mobile: hero-style canvas at the top (~58vh).
        ============================================================ */}
        <section
          aria-label="Technical twin"
          onPointerEnter={() => {
            setOverCanvas(true);
            pointerRef.current.active = true;
          }}
          onPointerLeave={() => {
            setOverCanvas(false);
            pointerRef.current.active = false;
          }}
          className="relative h-[58vh] min-h-[420px] w-full overflow-hidden border-b border-white/[0.06] bg-[#050505] lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-1/2 lg:border-b-0 lg:border-r"
        >
          {/* Subtle radial vignette + brand wash so the canvas reads as
              a "studio" detail shot rather than just a floating model. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_60%_55%_at_55%_55%,rgba(255,87,34,0.10),transparent_60%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,#000_0%,transparent_18%,transparent_82%,#000_100%)]"
          />

          <ContactScene pointerRef={pointerRef} handleRef={sceneHandleRef} />

          {/* HUD overlay — Lat/Long + chapter label */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="flex h-full flex-col justify-between p-5 sm:p-7">
              {/* Top bar */}
              <div className="flex items-start justify-between text-white/55">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.32em]">
                  <span className="inline-block h-2 w-2 rounded-full" style={{backgroundColor: ACCENT}} />
                  <span>{"// chapter_05 · contact"}</span>
                </div>
                <div className="hidden font-mono text-[9px] uppercase tracking-[0.32em] sm:block">
                  CAM · MACRO_REAR_QUARTER
                </div>
              </div>

              {/* Bottom HUD: coordinates */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {HUD_COORDS.map((c) => (
                  <HudCoord key={c.label} label={c.label} lat={c.lat} lon={c.lon} />
                ))}
              </div>
            </div>
          </div>

          {/* Tiny, persistent crosshair tick — subtle "instrument" detail */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="h-[14px] w-px bg-white/15" />
            <div className="absolute left-1/2 top-1/2 h-px w-[14px] -translate-x-1/2 -translate-y-1/2 bg-white/15" />
          </div>

          {/* Cursor hint — only on fine pointers, fades when not over the canvas */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.4em] transition-opacity duration-300 ${
              overCanvas ? "text-[#FF5722] opacity-100" : "text-white/40 opacity-90"
            }`}
            style={{fontFamily: FONT_MONO}}
          >
            ↕ MOVE CURSOR · MODULATE EMISSION
          </div>
        </section>

        {/* ============================================================
            RIGHT — INQUIRY SYSTEM
        ============================================================ */}
        <section
          aria-label="Inquiry system"
          className="relative z-10 ml-auto w-full bg-[#000000] px-6 pb-28 pt-16 sm:px-10 lg:w-1/2 lg:px-12 lg:pb-32 lg:pt-32"
        >
          {/* Eyebrow */}
          <div className="contact-node mb-8 flex items-center gap-3">
            <span className="h-px w-10" style={{backgroundColor: ACCENT}} />
            <span
              className="font-mono text-[10px] uppercase tracking-[0.42em]"
              style={{color: ACCENT, fontFamily: FONT_MONO}}
            >
              {"// 05 · transmission"}
            </span>
          </div>

          {/* Massive outlined headline */}
          <h1
            ref={headerRef}
            aria-label="Get in touch"
            className="select-none text-balance text-[clamp(3.25rem,11vw,9rem)] font-black uppercase leading-[0.85] tracking-[-0.045em]"
            style={{
              fontFamily: FONT_DISPLAY,
              WebkitTextStroke: "1.4px rgba(255,255,255,0.85)",
              color: "transparent",
            }}
          >
            <span className="block">Get In</span>
            <span
              className="block"
              style={{
                WebkitTextStroke: `1.4px ${ACCENT}`,
                color: "transparent",
              }}
            >
              Touch.
            </span>
          </h1>

          <div ref={nodesRef} className="mt-16 flex flex-col gap-12 sm:gap-14">
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
                className="group inline-flex items-baseline gap-3 transition-colors hover:text-[#FF5722]"
              >
                <span
                  className="text-[clamp(2rem,4.6vw,3.6rem)] font-bold leading-[0.95] tracking-[-0.025em] text-white transition-colors group-hover:text-[#FF5722]"
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
              <p className="mt-3 max-w-md font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Mon — Fri · 09:00 → 18:00 (Asia/Colombo)
              </p>
            </ContactNode>

            {/* ─── EMAIL — magnetic + copy ──────────────────────────── */}
            <ContactNode index="03" title="Email">
              <div className="relative inline-flex items-center gap-3">
                <a
                  ref={emailWrapRef}
                  href="mailto:info@elektrateq.com"
                  onClick={(e) => {
                    e.preventDefault();
                    onCopyEmail();
                  }}
                  className="group relative inline-flex items-baseline gap-3 will-change-transform"
                  aria-label="Copy email address to clipboard"
                >
                  <span
                    className="text-[clamp(1.5rem,3vw,2.4rem)] font-semibold leading-[1] tracking-[-0.02em] text-white transition-colors group-hover:text-[#FF5722]"
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

                {/* Tooltip — appears above the email on hover, swaps copy on success. */}
                <span
                  aria-hidden={!copied}
                  className={`pointer-events-none absolute -top-9 left-0 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#0a0a0a]/90 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-white/85 backdrop-blur-md transition-all duration-300 ${
                    copied ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0"
                  }`}
                  style={{fontFamily: FONT_MONO}}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{backgroundColor: copied ? "#3ddc84" : ACCENT}}
                  />
                  {copied ? "Copied to Clipboard" : "Click to Copy"}
                </span>
              </div>
              <p className="mt-3 max-w-md font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
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

                <div className="mt-12 flex flex-wrap items-center gap-6">
                  <button
                    type="submit"
                    disabled={submitting || form.email.trim().length === 0}
                    className={`group relative inline-flex items-center gap-3 overflow-hidden border px-7 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.32em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
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

const HudCoord = ({label, lat, lon}: {label: string; lat: string; lon: string}) => (
  <div
    className="rounded-sm border border-white/[0.08] bg-black/55 px-3 py-2 backdrop-blur-md"
    style={{fontFamily: FONT_MONO}}
  >
    <div className="flex items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.32em] text-white/45">
      <span className="inline-block h-1 w-1" style={{backgroundColor: ACCENT}} />
      {label}
    </div>
    <div className="mt-1 flex items-center gap-3 font-mono text-[10px] tabular-nums text-white/85">
      <span>{lat}</span>
      <span className="text-white/30">·</span>
      <span>{lon}</span>
    </div>
  </div>
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
