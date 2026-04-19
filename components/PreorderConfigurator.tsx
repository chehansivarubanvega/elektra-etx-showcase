"use client";

/**
 * PreorderConfigurator — Brutalist HUD wrapped around the digital twin.
 *
 * Owns 100% of the wizard state and feeds it down to <ConfiguratorCanvas /> as
 * a plain `state` prop, which keeps the 3D scene a pure read-only consumer.
 *
 * UX architecture:
 *   - Stages: email → color → quantity → submit. The user can't advance until
 *     the prior stage validates; the camera follows the stage, so it literally
 *     guides them.
 *   - Hover focus overrides stage focus on the right-panel hot zones (color
 *     swatches, quantity dial) — letting users "preview" a beat without being
 *     locked out by gating.
 *   - Custom crosshair cursor activates when the pointer is inside the canvas
 *     and the user isn't already typing in a HUD field.
 *   - INITIATE PREORDER fires the launch sequence; the canvas calls back when
 *     light-speed completes so we can swap to the success state.
 */

import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {AnimatePresence, motion} from "motion/react";
import dynamic from "next/dynamic";
import type {
  ConfiguratorCanvasProps,
  ConfiguratorState,
  FocusTarget,
} from "./ConfiguratorCanvas";

/** WebGL canvas is client-only — defer to keep the SSR pass cheap and clean. */
const ConfiguratorCanvas = dynamic<ConfiguratorCanvasProps>(
  () => import("./ConfiguratorCanvas").then((m) => m.ConfiguratorCanvas),
  {ssr: false},
);

/* ------------------------------------------------------------------ */
/* Types + presets                                                     */
/* ------------------------------------------------------------------ */

type Stage = "email" | "color" | "quantity" | "submit";

const STAGE_ORDER: Stage[] = ["email", "color", "quantity", "submit"];

const STAGE_FOCUS: Record<Stage, FocusTarget> = {
  email: "email",
  color: "color",
  quantity: "quantity",
  submit: "submit",
};

const STAGE_LABELS: Record<Stage, string> = {
  email: "Identification",
  color: "Paint",
  quantity: "Fleet",
  submit: "Confirm",
};

type Swatch = {id: string; label: string; hex: string; metalness: number};

const SWATCHES: ReadonlyArray<Swatch> = [
  {id: "void", label: "VOID BLACK", hex: "#0a0a0a", metalness: 0.65},
  {id: "perf", label: "PERFORMANCE ORANGE", hex: "#FF5722", metalness: 0.45},
  {id: "snow", label: "SIGIRIYA SNOW", hex: "#f3f1ec", metalness: 0.35},
  {id: "monsoon", label: "MONSOON STEEL", hex: "#3b4a55", metalness: 0.7},
  {id: "lagoon", label: "LAGOON CHROME", hex: "#0fb6c2", metalness: 0.85},
];

const QUANTITY_OPTIONS = [1, 2, 3, 4, 5] as const;

const ORANGE = "#FF5722";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(form: {name: string; email: string; phone: string}) {
  return {
    name: form.name.trim().length >= 2,
    email: EMAIL_RE.test(form.email.trim()),
    phone: form.phone.replace(/\D/g, "").length >= 7,
  };
}

/* ------------------------------------------------------------------ */
/* Form input — visible filled box, brutalist hard corners, orange     */
/* glow on focus. Validation badge sits inside the field, top-right.   */
/* ------------------------------------------------------------------ */

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  errorMessage?: string;
  validState?: "idle" | "valid" | "invalid";
  onFocus?: () => void;
  onBlur?: () => void;
};

const Field = ({
  id,
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline = false,
  required = false,
  errorMessage,
  validState = "idle",
  onFocus,
  onBlur,
}: FieldProps) => {
  const [focused, setFocused] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
  };
  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
  };

  // Border / fill / shadow are the three signals the eye picks up first; we
  // tune all three off the same `state` so the field always reads as either
  // empty / focused / valid / invalid.
  let borderClass = "border-white/15";
  let bgClass = "bg-white/[0.04]";
  let ringStyle = "none";
  if (validState === "invalid") {
    borderClass = "border-[#ff5252]";
    ringStyle = "0 0 0 3px rgba(255,82,82,0.12)";
  } else if (focused) {
    borderClass = "border-[#FF5722]";
    bgClass = "bg-white/[0.08]";
    ringStyle = "0 0 0 3px rgba(255,87,34,0.18), 0 8px 28px rgba(255,87,34,0.18)";
  } else if (validState === "valid") {
    borderClass = "border-[#5dffa6]/45";
    bgClass = "bg-white/[0.05]";
  }

  const sharedClass = `w-full ${bgClass} border ${borderClass} px-4 py-3.5 text-[15px] leading-tight text-white placeholder:text-white/40 outline-none transition-[background,border-color,box-shadow] duration-200`;

  return (
    <div className="relative">
      <div className="mb-2 flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-[12px] font-semibold tracking-[0.04em] text-white"
        >
          {label}
          {required ? <span className="ml-1 text-[#FF5722]">*</span> : null}
        </label>
        {hint ? (
          <span className="text-[11px] text-white/45">{hint}</span>
        ) : null}
      </div>
      <div className="relative">
        {multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`${sharedClass} resize-none`}
            style={{boxShadow: ringStyle}}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={sharedClass}
            style={{boxShadow: ringStyle}}
            autoComplete="off"
            spellCheck={false}
          />
        )}
        {validState === "valid" ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5dffa6]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5l4 4 10-10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </div>
      {validState === "invalid" && errorMessage ? (
        <p className="mt-1.5 text-[12px] text-[#ff7a7a]">{errorMessage}</p>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Color swatches                                                      */
/* ------------------------------------------------------------------ */

type SwatchOrbsProps = {
  active: string;
  onPick: (s: Swatch) => void;
  onHover: (hovering: boolean) => void;
};

const SwatchOrbs = ({active, onPick, onHover}: SwatchOrbsProps) => (
  <div
    className="flex flex-wrap items-center gap-5"
    onMouseEnter={() => onHover(true)}
    onMouseLeave={() => onHover(false)}
  >
    {SWATCHES.map((s) => {
      const isActive = s.hex === active;
      return (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s)}
          className="group relative flex flex-col items-center gap-2"
          aria-label={s.label}
        >
          <span
            className="block h-12 w-12 rounded-full border transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${s.hex}ee, ${s.hex} 60%, #000 140%)`,
              borderColor: isActive ? ORANGE : "rgba(255,255,255,0.2)",
              boxShadow: isActive
                ? `0 0 0 2px #000, 0 0 0 3px ${ORANGE}, 0 0 28px ${s.hex}90, 0 0 60px ${ORANGE}60`
                : `0 0 18px ${s.hex}55`,
            }}
          />
          <span
            className={`font-mono text-[9px] tracking-[0.22em] transition-colors ${
              isActive ? "text-white" : "text-white/40 group-hover:text-white/70"
            }`}
          >
            {s.label.split(" ")[0]}
          </span>
        </button>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/* Radial quantity dial                                                */
/* ------------------------------------------------------------------ */

type QuantityDialProps = {
  value: number;
  onChange: (v: number) => void;
  onHover: (hovering: boolean) => void;
};

const QuantityDial = ({value, onChange, onHover}: QuantityDialProps) => {
  const max = QUANTITY_OPTIONS.length;
  const angle = ((value - 1) / (max - 1)) * 270 - 135;
  return (
    <div
      className="relative flex flex-col items-center gap-6"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
            strokeDasharray="2 6"
          />
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke={ORANGE}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${(value / max) * (Math.PI * 2 * 86)} 999`}
            style={{
              filter: `drop-shadow(0 0 8px ${ORANGE})`,
              transition: "stroke-dasharray 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="absolute h-1 w-16 origin-left bg-white"
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              left: "50%",
              top: "50%",
              boxShadow: "0 0 12px rgba(255,255,255,0.85)",
              transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[10px] tracking-[0.32em] text-white/40">FLEET</span>
          <span className="text-5xl font-black tracking-tighter text-white tabular-nums">
            {value.toString().padStart(2, "0")}
          </span>
          <span className="font-mono text-[9px] tracking-[0.32em] text-white/40">
            UNIT{value === 1 ? "" : "S"}
          </span>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-1">
        {QUANTITY_OPTIONS.map((n) => {
          const isActive = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 border py-2 text-[10px] font-mono tracking-[0.3em] transition ${
                isActive
                  ? "border-[#FF5722] bg-[#FF5722]/15 text-white"
                  : "border-white/15 text-white/40 hover:border-white/40 hover:text-white/80"
              }`}
            >
              {String(n).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Custom crosshair cursor                                             */
/* ------------------------------------------------------------------ */

const Crosshair = ({active}: {active: boolean}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!ref.current) return;
      ref.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    };
    window.addEventListener("pointermove", onMove, {passive: true});
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed left-0 top-0 z-[120] mix-blend-difference transition-opacity duration-200 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" className="text-white">
        <circle cx="28" cy="28" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        <line x1="28" y1="0" x2="28" y2="14" stroke="currentColor" strokeWidth="1" />
        <line x1="28" y1="42" x2="28" y2="56" stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1="28" x2="14" y2="28" stroke="currentColor" strokeWidth="1" />
        <line x1="42" y1="28" x2="56" y2="28" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Mobile step card — a clearly-defined section with a numbered badge, */
/* status pill, and gating opacity so users always know where they're  */
/* up to without leaving the scroll flow.                              */
/* ------------------------------------------------------------------ */

type MobileStepCardProps = {
  step: string;
  title: string;
  status: "active" | "complete" | "locked";
  onActivate?: () => void;
  children: React.ReactNode;
};

const MobileStepCard = ({
  step,
  title,
  status,
  onActivate,
  children,
}: MobileStepCardProps) => {
  const locked = status === "locked";
  return (
    <section
      className={`relative border bg-black/85 p-4 transition-opacity duration-300 ${
        locked
          ? "pointer-events-none border-white/8 opacity-40"
          : "border-white/15 opacity-100"
      }`}
      onPointerDown={!locked ? onActivate : undefined}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[11px] font-bold ${
              status === "complete"
                ? "border-[#5dffa6] text-[#5dffa6]"
                : "border-[#FF5722] text-[#FF5722]"
            }`}
          >
            {step}
          </span>
          <h3 className="text-[15px] font-bold uppercase tracking-wide text-white">
            {title}
          </h3>
        </div>
        {status === "complete" ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5dffa6]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5l4 4 10-10"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Done
          </span>
        ) : locked ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
            Locked
          </span>
        ) : null}
      </header>
      <div>{children}</div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export const PreorderConfigurator = () => {
  /* form */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState(SWATCHES[1].hex);
  const [metalness, setMetalness] = useState(SWATCHES[1].metalness);
  const [quantity, setQuantity] = useState(1);

  /* wizard */
  const [stage, setStage] = useState<Stage>("email");
  const [hoverFocus, setHoverFocus] = useState<FocusTarget | null>(null);
  const [cursorOnCanvas, setCursorOnCanvas] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const valid = useMemo(
    () => validate({name, email, phone}),
    [name, email, phone],
  );

  /**
   * Auto-advance helper. Run from the field change handlers rather than
   * inside an effect — `react-hooks/set-state-in-effect` (and React's purity
   * rules) forbid synchronously calling setStage from a useEffect body.
   */
  const tryAdvanceFromIdentity = useCallback(
    (nextName: string, nextEmail: string, nextPhone: string) => {
      if (
        stage === "email" &&
        nextName.trim().length >= 2 &&
        EMAIL_RE.test(nextEmail.trim()) &&
        nextPhone.replace(/\D/g, "").length >= 7
      ) {
        setStage("color");
      }
    },
    [stage],
  );

  const handleNameChange = useCallback(
    (v: string) => {
      setName(v);
      tryAdvanceFromIdentity(v, email, phone);
    },
    [email, phone, tryAdvanceFromIdentity],
  );
  const handleEmailChange = useCallback(
    (v: string) => {
      setEmail(v);
      tryAdvanceFromIdentity(name, v, phone);
    },
    [name, phone, tryAdvanceFromIdentity],
  );
  const handlePhoneChange = useCallback(
    (v: string) => {
      setPhone(v);
      tryAdvanceFromIdentity(name, email, v);
    },
    [name, email, tryAdvanceFromIdentity],
  );

  const focus: FocusTarget = launching
    ? "launch"
    : hoverFocus ?? STAGE_FOCUS[stage];

  const canvasState: ConfiguratorState = useMemo(
    () => ({
      color,
      metalness,
      quantity,
      focus,
      launching,
    }),
    [color, metalness, quantity, focus, launching],
  );

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const isStageReached = useCallback(
    (target: Stage) => STAGE_ORDER.indexOf(target) <= stageIndex,
    [stageIndex],
  );

  /* manual stage advance — triggered by interactions, not just gates */
  const advance = useCallback((target: Stage) => {
    setStage((curr) => (STAGE_ORDER.indexOf(target) > STAGE_ORDER.indexOf(curr) ? target : curr));
  }, []);

  const onPickSwatch = (s: Swatch) => {
    setColor(s.hex);
    setMetalness(s.metalness);
    advance("quantity");
  };
  const onPickQuantity = (n: number) => {
    setQuantity(n);
    advance("submit");
  };

  const canLaunch =
    valid.name && valid.email && valid.phone && stage === "submit";

  const onLaunch = () => {
    if (!canLaunch || launching) return;
    setLaunching(true);
  };
  const onLaunchComplete = () => {
    setLaunched(true);
  };

  /* hide the system cursor any time we're showing the crosshair */
  useEffect(() => {
    if (cursorOnCanvas) {
      document.body.style.cursor = "none";
    } else {
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.cursor = "";
    };
  }, [cursorOnCanvas]);

  /* --------------------------------------------------------------- */
  /* render                                                           */
  /* --------------------------------------------------------------- */

  /* ---------------------------------------------------------------- */
  /* Section status helpers — drive the mobile stepper card chrome.    */
  /* ---------------------------------------------------------------- */

  const identStatus: "active" | "complete" =
    valid.name && valid.email && valid.phone ? "complete" : "active";
  const colorPicked = SWATCHES.some((s) => s.hex === color) && stage !== "email";
  const colorStatus: "active" | "complete" | "locked" = !isStageReached("color")
    ? "locked"
    : colorPicked && stageIndex >= STAGE_ORDER.indexOf("quantity")
      ? "complete"
      : "active";
  const fleetStatus: "active" | "complete" | "locked" = !isStageReached("quantity")
    ? "locked"
    : stage === "submit"
      ? "complete"
      : "active";

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-black text-white selection:bg-[#FF5722] selection:text-white md:overflow-hidden">
      {/* Background grid + corner brackets — desktop-only HUD chrome. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-[0.07] md:block"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-6 z-[5] hidden md:block">
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <span
            key={c}
            className="absolute h-5 w-5 border-white/30"
            style={{
              top: c.startsWith("t") ? 0 : "auto",
              bottom: c.startsWith("b") ? 0 : "auto",
              left: c.endsWith("l") ? 0 : "auto",
              right: c.endsWith("r") ? 0 : "auto",
              borderTopWidth: c.startsWith("t") ? 1 : 0,
              borderBottomWidth: c.startsWith("b") ? 1 : 0,
              borderLeftWidth: c.endsWith("l") ? 1 : 0,
              borderRightWidth: c.endsWith("r") ? 1 : 0,
            }}
          />
        ))}
      </div>

      {/* 3D Canvas — pinned to the top 48vh on mobile, fills the viewport on
          desktop. Single instance (don't double-mount the GLB). */}
      <div
        className="fixed inset-x-0 top-0 z-0 h-[48vh] md:absolute md:inset-0 md:h-auto"
        onMouseEnter={() => setCursorOnCanvas(true)}
        onMouseLeave={() => setCursorOnCanvas(false)}
      >
        <ConfiguratorCanvas
          state={canvasState}
          onLaunchComplete={onLaunchComplete}
          onCanvasPointer={setCursorOnCanvas}
        />
        {/* Soft fade at the bottom of the mobile canvas so it blends into the
            scroll content underneath. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-black md:hidden" />
      </div>

      {/* Crosshair — pointer-only flourish; useless on touch. */}
      <div className="hidden md:block">
        <Crosshair active={cursorOnCanvas && !launching} />
      </div>

      {/* Top HUD strip — desktop only. */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 hidden items-center justify-between px-8 py-6 font-mono text-[10px] tracking-[0.32em] text-white/55 uppercase md:flex">
        <span>{"// ETX // PREORDER PROTOCOL v1.0"}</span>
        <div className="hidden gap-4 md:flex">
          {STAGE_ORDER.map((s, i) => {
            const reached = isStageReached(s);
            return (
              <span
                key={s}
                className="flex items-center gap-2"
                style={{color: reached ? "#fff" : "rgba(255,255,255,0.3)"}}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: reached ? ORANGE : "rgba(255,255,255,0.25)",
                    boxShadow: reached ? `0 0 12px ${ORANGE}` : "none",
                  }}
                />
                {String(i + 1).padStart(2, "0")} {STAGE_LABELS[s]}
              </span>
            );
          })}
        </div>
        <span>{new Date().getUTCFullYear()}.04 / CMB</span>
      </div>

      {/* LEFT PANEL — Identification form, anchored in a clearly defined card. */}
      <section className="absolute left-0 top-0 z-20 hidden h-full w-full max-w-[520px] flex-col justify-end px-6 pb-44 pt-24 md:flex md:px-12">
        <div className="pointer-events-none absolute -left-2 top-1/2 hidden -translate-y-1/2 select-none md:block">
          <div
            className="origin-left -rotate-90 whitespace-nowrap text-[clamp(3.5rem,7vw,6.5rem)] font-black uppercase leading-none tracking-tighter"
            style={{
              WebkitTextStroke: "1px rgba(255,255,255,0.55)",
              color: "transparent",
            }}
          >
            SECURE YOUR LEGACY
          </div>
        </div>

        <motion.div
          initial={{opacity: 0, y: 18}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.7, ease: [0.16, 1, 0.3, 1]}}
          className="relative ml-0 w-full md:ml-28 md:max-w-[400px]"
        >
          {/* Header */}
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#FF5722]">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-[#FF5722]"
                style={{boxShadow: `0 0 10px ${ORANGE}`}}
              />
              Step 01 — Identification
            </div>
            <h2 className="text-[clamp(1.6rem,2.4vw,2.1rem)] font-black uppercase leading-[1] tracking-tight text-white">
              Reserve your ETX
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">
              Enter your contact details — we&rsquo;ll lock in your allocation
              once the configuration is committed.
            </p>
          </div>

          {/* Form card — solid backdrop so the inputs read as a real form, not
              ambient HUD chrome. */}
          <form
            className="relative border border-white/12 bg-black/55 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-md md:p-6"
            onSubmit={(e) => e.preventDefault()}
            onMouseEnter={() => setHoverFocus("email")}
            onMouseLeave={() => setHoverFocus(null)}
            noValidate
          >
            <div className="flex flex-col gap-5">
              <Field
                id="po-name"
                label="Full name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onFocus={() => {
                  setHoverFocus("email");
                  setNameTouched(true);
                }}
                onBlur={() => setNameTouched(true)}
                placeholder="Jane Perera"
                required
                hint="As it should appear on the order"
                errorMessage="Enter your full name."
                validState={
                  name.length === 0
                    ? "idle"
                    : valid.name
                      ? "valid"
                      : nameTouched
                        ? "invalid"
                        : "idle"
                }
              />
              <Field
                id="po-email"
                label="Email address"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onFocus={() => {
                  setHoverFocus("email");
                  setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@company.com"
                required
                hint="For order confirmation"
                errorMessage="Enter a valid email address."
                validState={
                  email.length === 0
                    ? "idle"
                    : valid.email
                      ? "valid"
                      : emailTouched
                        ? "invalid"
                        : "idle"
                }
              />
              <Field
                id="po-phone"
                label="Phone number"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onFocus={() => setPhoneTouched(true)}
                onBlur={() => setPhoneTouched(true)}
                placeholder="+94 77 123 4567"
                required
                hint="Used only for delivery"
                errorMessage="Enter at least 7 digits."
                validState={
                  phone.length === 0
                    ? "idle"
                    : valid.phone
                      ? "valid"
                      : phoneTouched
                        ? "invalid"
                        : "idle"
                }
              />
              <Field
                id="po-message"
                label="Notes for the team"
                value={message}
                onChange={setMessage}
                multiline
                placeholder="Delivery preferences, fleet identifiers, livery requests…"
                hint="Optional"
              />
            </div>

            {/* Inline gating helper so users always understand why the CTA
                isn't lighting up yet. */}
            <div className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4 text-[12px] text-white/55">
              {valid.name && valid.email && valid.phone ? (
                <>
                  <span className="text-[#5dffa6]">●</span>
                  <span>Contact verified — pick your color on the right.</span>
                </>
              ) : (
                <>
                  <span className="text-[#FF5722]">●</span>
                  <span>
                    Fill all three fields to unlock paint &amp; fleet selection.
                  </span>
                </>
              )}
            </div>
          </form>
        </motion.div>
      </section>

      {/* RIGHT PANEL — "The Selector" (desktop only) */}
      <section className="absolute right-0 top-0 z-20 hidden h-full w-full max-w-[420px] flex-col items-end justify-between px-8 pb-44 pt-24 md:flex md:px-12">
        <motion.div
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.7, ease: [0.16, 1, 0.3, 1]}}
          className="w-full text-right font-mono text-[10px] uppercase tracking-[0.4em] text-white/55"
        >
          {"// 02 — CONFIGURATION"}
        </motion.div>

        <div className="flex w-full flex-col gap-10">
          <div
            onMouseEnter={() => setHoverFocus("color")}
            onMouseLeave={() => setHoverFocus(null)}
          >
            <h3 className="mb-4 text-right text-[11px] font-medium uppercase tracking-[0.4em] text-white/60">
              Exterior · Paint
            </h3>
            <SwatchOrbs
              active={color}
              onPick={onPickSwatch}
              onHover={(h) => setHoverFocus(h ? "color" : null)}
            />
          </div>

          <div
            className={`transition-opacity duration-500 ${
              isStageReached("color") ? "opacity-100" : "opacity-25 pointer-events-none"
            }`}
          >
            <h3 className="mb-4 text-right text-[11px] font-medium uppercase tracking-[0.4em] text-white/60">
              Allocation · Fleet
            </h3>
            <QuantityDial
              value={quantity}
              onChange={onPickQuantity}
              onHover={(h) => setHoverFocus(h ? "quantity" : null)}
            />
          </div>

          <div className="text-right font-mono text-[10px] tracking-[0.32em] uppercase text-white/40">
            EST. ALLOCATION · {String(quantity).padStart(2, "0")} UNIT
            {quantity === 1 ? "" : "S"} · Q3 2027
          </div>
        </div>

        <div />
      </section>

      {/* BOTTOM — INITIATE PREORDER (desktop) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 hidden px-6 pb-6 md:block">
        <AnimatePresence mode="wait">
          {launched ? (
            <motion.div
              key="success"
              initial={{opacity: 0, y: 30}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              transition={{duration: 0.6, ease: [0.16, 1, 0.3, 1]}}
              className="flex w-full items-center justify-between border border-[#FF5722] bg-black px-8 py-6 font-mono text-[12px] uppercase tracking-[0.32em] text-white"
            >
              <span>
                {"// ALLOCATION SECURED · "}
                {color.toUpperCase()}
                {" · "}
                {quantity} UNIT{quantity === 1 ? "" : "S"}
              </span>
              <span className="text-[#FF5722]">CONFIRMATION → {email || "—"}</span>
            </motion.div>
          ) : (
            <motion.button
              key="cta"
              type="button"
              onClick={onLaunch}
              disabled={!canLaunch || launching}
              onMouseEnter={() => setHoverFocus("submit")}
              onMouseLeave={() => setHoverFocus(null)}
              initial={{opacity: 0, y: 30}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              transition={{duration: 0.6, ease: [0.16, 1, 0.3, 1]}}
              className="group relative flex w-full items-center justify-between overflow-hidden border border-white/15 px-8 py-7 text-left transition-all duration-500 hover:border-[#FF5722] disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,87,34,0.12) 0%, rgba(255,87,34,0) 60%)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-[#FF5722] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-disabled:translate-x-[-100%]"
              />
              <span className="relative z-10 flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-white/60 group-hover:text-black/60 transition-colors">
                  {"// 05 — COMMIT"}
                </span>
                <span className="text-[clamp(2rem,4vw,3.4rem)] font-black uppercase leading-[0.95] tracking-tighter text-white transition-colors group-hover:text-black">
                  {launching ? "ENGAGING LIGHT-SPEED…" : "INITIATE PREORDER"}
                </span>
              </span>
              <span className="relative z-10 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-white/60 group-hover:text-black/70 transition-colors md:block">
                {canLaunch ? "READY → ENTER" : "COMPLETE PRIOR STAGES"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================= */}
      {/* MOBILE LAYOUT                                                   */}
      {/* Stacked, scrollable, single-column. The 3D canvas is fixed at   */}
      {/* the top so the live preview is always visible while users fill  */}
      {/* the form below.                                                 */}
      {/* ============================================================= */}
      <div className="relative z-10 md:hidden">
        {/* Header sits just under the fixed canvas (pt = canvas height
            + breathing room). Smooth visual transition from the canvas
            fade above into solid black content below. */}
        <div className="px-5 pb-4" style={{paddingTop: "calc(48vh + 8px)"}}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#FF5722]">
                Preorder
              </div>
              <h1 className="mt-1 text-[26px] font-black uppercase leading-[0.95] tracking-tight text-white">
                Build your ETX
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-snug text-white/55">
                The preview above updates live as you configure.
              </p>
            </div>
            {/* Compact stage progress — segmented bars */}
            <div className="flex shrink-0 items-center gap-1">
              {STAGE_ORDER.map((s) => {
                const reached = isStageReached(s);
                return (
                  <span
                    key={s}
                    aria-label={`Stage ${STAGE_LABELS[s]} ${reached ? "reached" : "locked"}`}
                    className="h-1.5 w-5 transition-colors"
                    style={{
                      background: reached ? ORANGE : "rgba(255,255,255,0.14)",
                      boxShadow: reached ? `0 0 8px ${ORANGE}` : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Stacked steps. pb leaves room for the fixed CTA. */}
        <div className="flex flex-col gap-3.5 px-4 pb-36">
          {/* STEP 01 — Identification */}
          <MobileStepCard step="01" title="Your details" status={identStatus}>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => e.preventDefault()}
              noValidate
            >
              <Field
                id="m-po-name"
                label="Full name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onFocus={() => {
                  setHoverFocus("email");
                  setNameTouched(true);
                }}
                onBlur={() => {
                  setHoverFocus(null);
                  setNameTouched(true);
                }}
                placeholder="Jane Perera"
                required
                hint="On the order"
                errorMessage="Enter your full name."
                validState={
                  name.length === 0
                    ? "idle"
                    : valid.name
                      ? "valid"
                      : nameTouched
                        ? "invalid"
                        : "idle"
                }
              />
              <Field
                id="m-po-email"
                label="Email address"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onFocus={() => {
                  setHoverFocus("email");
                  setEmailTouched(true);
                }}
                onBlur={() => {
                  setHoverFocus(null);
                  setEmailTouched(true);
                }}
                placeholder="you@company.com"
                required
                hint="For confirmation"
                errorMessage="Enter a valid email address."
                validState={
                  email.length === 0
                    ? "idle"
                    : valid.email
                      ? "valid"
                      : emailTouched
                        ? "invalid"
                        : "idle"
                }
              />
              <Field
                id="m-po-phone"
                label="Phone number"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onFocus={() => setPhoneTouched(true)}
                onBlur={() => setPhoneTouched(true)}
                placeholder="+94 77 123 4567"
                required
                hint="For delivery"
                errorMessage="Enter at least 7 digits."
                validState={
                  phone.length === 0
                    ? "idle"
                    : valid.phone
                      ? "valid"
                      : phoneTouched
                        ? "invalid"
                        : "idle"
                }
              />
              <Field
                id="m-po-message"
                label="Notes"
                value={message}
                onChange={setMessage}
                multiline
                placeholder="Delivery preferences, fleet identifiers…"
                hint="Optional"
              />
            </form>
          </MobileStepCard>

          {/* STEP 02 — Color */}
          <MobileStepCard
            step="02"
            title="Pick your color"
            status={colorStatus}
            onActivate={() => isStageReached("color") && setHoverFocus("color")}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {SWATCHES.map((s) => {
                const isActive = s.hex === color;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPickSwatch(s)}
                    className="group flex flex-col items-center gap-2"
                    aria-label={s.label}
                    aria-pressed={isActive}
                  >
                    <span
                      className="block h-14 w-14 rounded-full border transition-transform duration-200 active:scale-95"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${s.hex}ee, ${s.hex} 60%, #000 140%)`,
                        borderColor: isActive ? ORANGE : "rgba(255,255,255,0.18)",
                        boxShadow: isActive
                          ? `0 0 0 2px #000, 0 0 0 3px ${ORANGE}, 0 0 22px ${s.hex}90`
                          : `0 0 14px ${s.hex}55`,
                      }}
                    />
                    <span
                      className={`text-center font-mono text-[9px] leading-tight tracking-[0.18em] ${
                        isActive ? "text-white" : "text-white/45"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </MobileStepCard>

          {/* STEP 03 — Quantity */}
          <MobileStepCard
            step="03"
            title="How many units?"
            status={fleetStatus}
            onActivate={() => isStageReached("quantity") && setHoverFocus("quantity")}
          >
            <div className="flex flex-col items-center gap-5">
              <QuantityDial
                value={quantity}
                onChange={onPickQuantity}
                onHover={() => undefined}
              />
              <p className="text-center font-mono text-[10px] tracking-[0.28em] uppercase text-white/45">
                Est. allocation · Q3 2027
              </p>
            </div>
          </MobileStepCard>

          {/* Order summary card — gives users a final sanity check before
              committing without scrolling all the way to the CTA. */}
          <div className="border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
              Order summary
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
              <dt className="text-white/55">Name</dt>
              <dd className="truncate text-right">{name.trim() || "—"}</dd>
              <dt className="text-white/55">Color</dt>
              <dd className="text-right">
                {SWATCHES.find((s) => s.hex === color)?.label ?? color}
              </dd>
              <dt className="text-white/55">Fleet</dt>
              <dd className="text-right">
                {String(quantity).padStart(2, "0")} unit{quantity === 1 ? "" : "s"}
              </dd>
              <dt className="text-white/55">Contact</dt>
              <dd className="truncate text-right">{email || "—"}</dd>
            </dl>
          </div>
        </div>

        {/* Sticky bottom CTA — always reachable, gives clear feedback
            about what's missing if the order isn't complete yet. */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/95 px-4 pt-3 backdrop-blur"
          style={{paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)"}}
        >
          {launched ? (
            <div className="flex flex-col items-stretch gap-1 border border-[#FF5722] bg-black px-4 py-3">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.2em]">
                <span>Allocation secured</span>
                <span className="text-[#FF5722]">→ Confirmed</span>
              </div>
              <div className="text-[12px] text-white/65">
                We&rsquo;ll email {email || "you"} with next steps.
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLaunch}
              disabled={!canLaunch || launching}
              className={`relative flex w-full items-center justify-between overflow-hidden px-5 py-4 text-left transition-colors ${
                canLaunch && !launching
                  ? "bg-[#FF5722] text-black"
                  : "border border-white/15 bg-white/[0.04] text-white/60"
              }`}
            >
              <span className="flex flex-col">
                <span className="font-mono text-[9px] tracking-[0.32em] uppercase opacity-70">
                  {launching ? "Launching" : canLaunch ? "Ready" : "Locked"}
                </span>
                <span className="text-[16px] font-black uppercase tracking-tight">
                  {launching
                    ? "Engaging…"
                    : canLaunch
                      ? "Initiate Preorder"
                      : !valid.name || !valid.email || !valid.phone
                        ? "Add your contact details"
                        : "Pick a color & fleet size"}
                </span>
              </span>
              <span aria-hidden className="text-[20px]">
                →
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Launch fade — sits above everything once we're at light-speed. */}
      <AnimatePresence>
        {launching ? (
          <motion.div
            key="fade"
            aria-hidden
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 1.4, ease: [0.7, 0, 0.3, 1], delay: 0.6}}
            className="pointer-events-none fixed inset-0 z-40 bg-black"
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
};

export default PreorderConfigurator;
