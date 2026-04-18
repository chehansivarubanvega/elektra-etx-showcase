'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, Cpu, Radio, MapPin } from 'lucide-react';

const ACCENT = '#FF6B00';

const Footer = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setTime(new Intl.DateTimeFormat('en-GB', options).format(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const scrollToTop = () => {
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const linkBase =
    'group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/75 transition-colors hover:text-white';

  const modules = [
    {
      id: '01',
      icon: Cpu,
      title: 'Sitemap',
      items: [
        { label: 'Home', href: '#' },
        { label: 'About ETX', href: '#' },
        { label: 'Technology', href: '#' },
        { label: 'Contact', href: 'mailto:info@elektrateq.com' },
      ],
    },
    {
      id: '02',
      icon: Radio,
      title: 'Channels',
      items: [
        { label: 'LinkedIn', href: '#' },
        { label: 'Instagram', href: '#' },
        { label: 'X / Twitter', href: '#' },
        { label: 'Facebook', href: '#' },
      ],
    },
    {
      id: '03',
      icon: MapPin,
      title: 'Node',
      items: [
        { label: 'Trace Expert City', href: '#', muted: true },
        { label: 'Tripoli Market', href: '#', muted: true },
        { label: 'Maradana, LK', href: '#', muted: true },
        { label: '+94 76 464 3619', href: 'tel:+94764643619' },
      ],
    },
  ] as const;

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      data-snap-stage="footer"
      className="relative w-full min-w-0 max-w-full overflow-hidden border-t border-white/[0.08] bg-[#030303] text-white"
    >
      {/* Tech grid + vignette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,107,0,0.12),transparent_55%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* System strip */}
      <div className="relative z-10 border-b border-white/[0.08] bg-black/40 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45 sm:px-6 sm:text-[10px]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
                style={{ backgroundColor: ACCENT }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
            </span>
            <span>SYS.FOOTER // ONLINE</span>
          </span>
          <span className="hidden sm:inline">ELEKTRATEQ_INTERFACE v1.0</span>
          <span className="text-white/30">CRC OK</span>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-16">
        <div
          data-snap-anchor="footer-0"
          className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10"
        >
          {/* Data modules */}
          <div className="relative lg:col-span-7">
            <div className="pointer-events-none absolute -left-px -top-px h-4 w-4 border-l border-t border-white/25" />
            <div className="pointer-events-none absolute -right-px -top-px h-4 w-4 border-r border-t border-white/25" />
            <div className="pointer-events-none absolute -bottom-px -left-px h-4 w-4 border-b border-l border-white/25" />
            <div className="pointer-events-none absolute -bottom-px -right-px h-4 w-4 border-b border-r border-white/25" />

            <div className="rounded-sm border border-white/[0.1] bg-black/50 p-6 backdrop-blur-md sm:p-8">
              <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
                {'// ROUTING_TABLE'}
              </p>
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
                {modules.map((mod) => (
                  <div key={mod.id} className="min-w-0">
                    <div className="mb-5 flex items-center gap-3 border-b border-white/[0.08] pb-4">
                      <mod.icon className="h-3.5 w-3.5 shrink-0 opacity-60" style={{ color: ACCENT }} strokeWidth={1.5} />
                      <div>
                        <span className="font-mono text-[9px] text-white/35">{mod.id}</span>
                        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/90">
                          {mod.title}
                        </h3>
                      </div>
                    </div>
                    <ul className="space-y-3.5">
                      {mod.items.map((item) => (
                        <li key={item.label}>
                          <a
                            href={item.href}
                            className={`${linkBase} ${'muted' in item && item.muted ? 'text-white/45 hover:text-white/80' : ''}`}
                          >
                            <span className="text-white/25 transition-colors group-hover:text-[#FF6B00]">›</span>
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Uplink / contact */}
          <div className="relative flex flex-col lg:col-span-5">
            <div
              className="flex flex-1 flex-col rounded-sm border p-6 sm:p-8"
              style={{
                borderColor: 'rgba(255, 107, 0, 0.28)',
                background: 'linear-gradient(165deg, rgba(255,107,0,0.1) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 100%)',
              }}
            >
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
                {'// SECURE_UPLINK'}
              </p>
              <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Contact</h2>
              <a
                href="mailto:info@elektrateq.com"
                className="group mb-6 break-all font-mono text-xl font-semibold leading-snug tracking-tight text-white underline decoration-white/20 decoration-1 underline-offset-4 transition-colors hover:decoration-[#FF6B00] sm:text-2xl md:text-3xl"
              >
                info@elektrateq.com
              </a>
              <p className="mb-8 max-w-sm font-mono text-[10px] leading-relaxed text-white/50">
                Encrypted mail preferred. Response window: 24–48h (SL business days). Include project code in subject
                line.
              </p>
              <div className="mt-auto border-t border-white/10 pt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                STATUS: ACCEPTING_PARTNERSHIPS
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry */}
        <div className="mt-10 grid grid-cols-1 divide-y divide-white/[0.08] rounded-sm border border-white/[0.1] bg-black/40 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50 sm:mt-12 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
            <span className="text-[9px] text-white/35">Origin</span>
            <span className="text-white/80">Maradana · Sri Lanka</span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
            <span className="text-[9px] text-white/35">Local_time (Asia/Colombo)</span>
            <span className="tabular-nums text-[#FF6B00]">{time || '—'}</span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
            <span className="text-[9px] text-white/35">Fleet_ops</span>
            <span className="text-white/80">Scaling urban mobility</span>
          </div>
        </div>

        {/* Mega wordmark */}
        <div
          data-snap-anchor="footer-1"
          className="relative mt-14 min-w-0 border-t border-white/[0.08] pt-10 sm:mt-16 sm:pt-12"
        >
          <div className="flex min-w-0 flex-col items-stretch gap-6 overflow-x-clip sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-full min-w-0 select-none text-[clamp(2.75rem,14vw,10rem)] font-black leading-[0.85] tracking-[-0.04em]">
              <span className="bg-gradient-to-b from-white via-white to-white/35 bg-clip-text text-transparent">
                ELEKTRA
              </span>
              <span className="bg-gradient-to-b from-white/90 via-white/50 to-white/25 bg-clip-text text-transparent">
                TEQ
              </span>
            </h2>

            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={scrollToTop}
              aria-label="Back to top"
              className="group relative flex h-14 w-14 shrink-0 items-center justify-center self-end border border-white/20 bg-white/[0.03] font-mono text-[9px] uppercase tracking-widest text-white/70 transition-colors hover:border-[#FF6B00]/60 hover:bg-[#FF6B00]/10 hover:text-white sm:self-auto"
            >
              <span className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-white/40 transition-colors group-hover:border-[#FF6B00]" />
              <span className="pointer-events-none absolute -right-px -top-px h-2 w-2 border-r border-t border-white/40 transition-colors group-hover:border-[#FF6B00]" />
              <span className="pointer-events-none absolute -bottom-px -left-px h-2 w-2 border-b border-l border-white/40 transition-colors group-hover:border-[#FF6B00]" />
              <span className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-white/40 transition-colors group-hover:border-[#FF6B00]" />
              <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
            </motion.button>
          </div>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">© {new Date().getFullYear()} ElektraTeq · All systems nominal</p>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
