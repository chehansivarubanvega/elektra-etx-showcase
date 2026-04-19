'use client';

import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {motion} from 'motion/react';
import {ArrowUp, Cpu, Radio, MapPin} from 'lucide-react';
import {cn} from '@/lib/utils';
import {usePressTransition} from '@/components/press/PressTransitionProvider';

const ACCENT_DARK = '#FF6B00';
const ACCENT_LIGHT = '#FF5722';

type FooterItem = {
  label: string;
  href: string;
  muted?: boolean;
};

const modules = [
  {
    id: '01',
    icon: Cpu,
    title: 'Sitemap',
    items: [
      {label: 'Home', href: '/'},
      {label: 'Press', href: '/press'},
      {label: 'About ETX', href: '#'},
      {label: 'Technology', href: '#'},
      {label: 'Contact', href: 'mailto:info@elektrateq.com'},
    ] as FooterItem[],
  },
  {
    id: '02',
    icon: Radio,
    title: 'Channels',
    items: [
      {label: 'LinkedIn', href: '#'},
      {label: 'Instagram', href: '#'},
      {label: 'X / Twitter', href: '#'},
      {label: 'Facebook', href: '#'},
    ] as FooterItem[],
  },
  {
    id: '03',
    icon: MapPin,
    title: 'Node',
    items: [
      {label: 'Trace Expert City', href: '#', muted: true},
      {label: 'Tripoli Market', href: '#', muted: true},
      {label: 'Maradana, LK', href: '#', muted: true},
      {label: '+94 76 464 3619', href: 'tel:+94764643619'},
    ] as FooterItem[],
  },
];

function isInternalHref(href: string) {
  return href.startsWith('/') && !href.startsWith('//');
}

const Footer = () => {
  const pathname = usePathname();
  const isLight = pathname?.startsWith('/press') ?? false;
  const {navigateToPress} = usePressTransition();
  const accent = isLight ? ACCENT_LIGHT : ACCENT_DARK;
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
    globalThis.scrollTo({top: 0, behavior: 'smooth'});
  };

  const snapFooter = !isLight;

  const linkBase = cn(
    'group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors',
    isLight ? 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]' : 'text-white/75 hover:text-white',
  );

  const renderItem = (item: FooterItem) => {
    const internal = isInternalHref(item.href);
    const mutedCls =
      item.muted &&
      (isLight ? 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/75' : 'text-white/45 hover:text-white/80');
    const chevron = isLight ? 'text-[#1A1A1A]/25 group-hover:text-[#FF5722]' : 'text-white/25 group-hover:text-[#FF6B00]';

    if (internal) {
      const pressFromDark = item.href === '/press' && !isLight;
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={pressFromDark ? (e) => navigateToPress(e) : undefined}
          className={cn(linkBase, mutedCls)}
        >
          <span className={cn('transition-colors', chevron)}>›</span>
          {item.label}
        </Link>
      );
    }

    return (
      <a key={item.label} href={item.href} className={cn(linkBase, mutedCls)}>
        <span className={cn('transition-colors', chevron)}>›</span>
        {item.label}
      </a>
    );
  };

  return (
    <motion.footer
      initial={{opacity: 0}}
      whileInView={{opacity: 1}}
      viewport={{once: true, margin: '-80px'}}
      transition={{duration: 0.6}}
      {...(snapFooter ? {'data-snap-stage': 'footer'} : {})}
      className={cn(
        'relative w-full min-w-0 max-w-full overflow-hidden border-t',
        isLight
          ? 'border-[#1A1A1A]/[0.08] bg-[#FEFEFE] text-[#1A1A1A]'
          : 'border-white/[0.08] bg-[#030303] text-white',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: isLight
            ? `
            linear-gradient(rgba(26,26,26,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,26,26,0.06) 1px, transparent 1px)
          `
            : `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          isLight
            ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,87,34,0.08),transparent_55%)]'
            : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,107,0,0.12),transparent_55%)]',
        )}
      />
      <div
        className={cn('pointer-events-none absolute inset-0', isLight ? 'opacity-[0.06]' : 'opacity-[0.04]')}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div
        className={cn(
          'relative z-10 border-b px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.2em] sm:px-6 sm:text-[10px]',
          isLight ? 'border-[#1A1A1A]/[0.08] bg-[#FEFEFE]/80 text-[#1A1A1A]/50' : 'border-white/[0.08] bg-black/40 text-white/45',
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
                style={{backgroundColor: accent}}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{backgroundColor: accent}} />
            </span>
            <span>SYS.FOOTER // ONLINE</span>
          </span>
          <span className={cn('hidden sm:inline', isLight ? 'text-[#1A1A1A]/40' : '')}>ELEKTRATEQ_INTERFACE v1.0</span>
          <span className={isLight ? 'text-[#1A1A1A]/35' : 'text-white/30'}>CRC OK</span>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-16">
        <div
          {...(snapFooter ? {'data-snap-anchor': 'footer-0'} : {})}
          className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10"
        >
          <div className="relative lg:col-span-7">
            <div
              className={cn(
                'pointer-events-none absolute -left-px -top-px h-4 w-4 border-l border-t',
                isLight ? 'border-[#1A1A1A]/20' : 'border-white/25',
              )}
            />
            <div
              className={cn(
                'pointer-events-none absolute -right-px -top-px h-4 w-4 border-r border-t',
                isLight ? 'border-[#1A1A1A]/20' : 'border-white/25',
              )}
            />
            <div
              className={cn(
                'pointer-events-none absolute -bottom-px -left-px h-4 w-4 border-b border-l',
                isLight ? 'border-[#1A1A1A]/20' : 'border-white/25',
              )}
            />
            <div
              className={cn(
                'pointer-events-none absolute -bottom-px -right-px h-4 w-4 border-b border-r',
                isLight ? 'border-[#1A1A1A]/20' : 'border-white/25',
              )}
            />

            <div
              className={cn(
                'rounded-sm border p-6 backdrop-blur-md sm:p-8',
                isLight ? 'border-[#1A1A1A]/[0.1] bg-[#FEFEFE]/70' : 'border-white/[0.1] bg-black/50',
              )}
            >
              <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.28em]" style={{color: accent}}>
                {'// ROUTING_TABLE'}
              </p>
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
                {modules.map((mod) => (
                  <div key={mod.id} className="min-w-0">
                    <div
                      className={cn(
                        'mb-5 flex items-center gap-3 border-b pb-4',
                        isLight ? 'border-[#1A1A1A]/[0.08]' : 'border-white/[0.08]',
                      )}
                    >
                      <mod.icon className="h-3.5 w-3.5 shrink-0 opacity-60" style={{color: accent}} strokeWidth={1.5} />
                      <div>
                        <span
                          className={cn('font-mono text-[9px]', isLight ? 'text-[#1A1A1A]/40' : 'text-white/35')}
                        >
                          {mod.id}
                        </span>
                        <h3
                          className={cn(
                            'font-mono text-[10px] font-semibold uppercase tracking-[0.22em]',
                            isLight ? 'text-[#1A1A1A]/90' : 'text-white/90',
                          )}
                        >
                          {mod.title}
                        </h3>
                      </div>
                    </div>
                    <ul className="space-y-3.5">{mod.items.map((item) => <li key={item.label}>{renderItem(item)}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex flex-col lg:col-span-5">
            <div
              className="flex flex-1 flex-col rounded-sm border p-6 sm:p-8"
              style={
                isLight
                  ? {
                      borderColor: 'rgba(255, 87, 34, 0.35)',
                      background:
                        'linear-gradient(165deg, rgba(255,87,34,0.08) 0%, rgba(254,254,254,0.92) 42%, rgba(245,245,245,0.98) 100%)',
                    }
                  : {
                      borderColor: 'rgba(255, 107, 0, 0.28)',
                      background:
                        'linear-gradient(165deg, rgba(255,107,0,0.1) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 100%)',
                    }
              }
            >
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em]" style={{color: accent}}>
                {'// SECURE_UPLINK'}
              </p>
              <h2
                className={cn(
                  'mb-2 font-mono text-[10px] uppercase tracking-[0.2em]',
                  isLight ? 'text-[#1A1A1A]/45' : 'text-white/40',
                )}
              >
                Contact
              </h2>
              <a
                href="mailto:info@elektrateq.com"
                className={cn(
                  'group mb-6 break-all font-mono text-xl font-semibold leading-snug tracking-tight underline decoration-1 underline-offset-4 transition-colors sm:text-2xl md:text-3xl',
                  isLight
                    ? 'text-[#1A1A1A] decoration-[#1A1A1A]/20 hover:decoration-[#FF5722]'
                    : 'text-white decoration-white/20 hover:decoration-[#FF6B00]',
                )}
              >
                info@elektrateq.com
              </a>
              <p
                className={cn(
                  'mb-8 max-w-sm font-mono text-[10px] leading-relaxed',
                  isLight ? 'text-[#1A1A1A]/50' : 'text-white/50',
                )}
              >
                Encrypted mail preferred. Response window: 24–48h (SL business days). Include project code in subject
                line.
              </p>
              <div
                className={cn(
                  'mt-auto border-t pt-6 font-mono text-[9px] uppercase tracking-[0.18em]',
                  isLight ? 'border-[#1A1A1A]/10 text-[#1A1A1A]/45' : 'border-white/10 text-white/35',
                )}
              >
                STATUS: ACCEPTING_PARTNERSHIPS
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'mt-10 grid grid-cols-1 divide-y rounded-sm border font-mono text-[10px] uppercase tracking-[0.16em] sm:mt-12 sm:grid-cols-3 sm:divide-x sm:divide-y-0',
            isLight
              ? 'divide-[#1A1A1A]/[0.08] border-[#1A1A1A]/[0.1] bg-[#FEFEFE]/60 text-[#1A1A1A]/55'
              : 'divide-white/[0.08] border-white/[0.1] bg-black/40 text-white/50',
          )}
        >
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
            <span className={cn('text-[9px]', isLight ? 'text-[#1A1A1A]/40' : 'text-white/35')}>Origin</span>
            <span className={isLight ? 'text-[#1A1A1A]/85' : 'text-white/80'}>Maradana · Sri Lanka</span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
            <span className={cn('text-[9px]', isLight ? 'text-[#1A1A1A]/40' : 'text-white/35')}>
              Local_time (Asia/Colombo)
            </span>
            <span className="tabular-nums" style={{color: accent}}>
              {time || '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
            <span className={cn('text-[9px]', isLight ? 'text-[#1A1A1A]/40' : 'text-white/35')}>Fleet_ops</span>
            <span className={isLight ? 'text-[#1A1A1A]/85' : 'text-white/80'}>Scaling urban mobility</span>
          </div>
        </div>

        <div
          {...(snapFooter ? {'data-snap-anchor': 'footer-1'} : {})}
          className={cn(
            'relative mt-14 min-w-0 border-t pt-10 sm:mt-16 sm:pt-12',
            isLight ? 'border-[#1A1A1A]/[0.08]' : 'border-white/[0.08]',
          )}
        >
          <div className="flex min-w-0 flex-col items-stretch gap-6 overflow-x-clip sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-full min-w-0 select-none text-[clamp(2.75rem,14vw,10rem)] font-black leading-[0.85] tracking-[-0.04em]">
              {isLight ? (
                <>
                  <span className="bg-gradient-to-b from-[#1A1A1A] via-[#1A1A1A] to-[#1A1A1A]/35 bg-clip-text text-transparent">
                    ELEKTRA
                  </span>
                  <span className="bg-gradient-to-b from-[#1A1A1A]/90 via-[#1A1A1A]/55 to-[#1A1A1A]/25 bg-clip-text text-transparent">
                    TEQ
                  </span>
                </>
              ) : (
                <>
                  <span className="bg-gradient-to-b from-white via-white to-white/35 bg-clip-text text-transparent">
                    ELEKTRA
                  </span>
                  <span className="bg-gradient-to-b from-white/90 via-white/50 to-white/25 bg-clip-text text-transparent">
                    TEQ
                  </span>
                </>
              )}
            </h2>

            <motion.button
              type="button"
              whileHover={{scale: 1.04}}
              whileTap={{scale: 0.97}}
              onClick={scrollToTop}
              aria-label="Back to top"
              className={cn(
                'group relative flex h-14 w-14 shrink-0 items-center justify-center self-end border font-mono text-[9px] uppercase tracking-widest transition-colors sm:self-auto',
                isLight
                  ? 'border-[#1A1A1A]/20 bg-[#1A1A1A]/[0.03] text-[#1A1A1A]/70 hover:border-[#FF5722]/55 hover:bg-[#FF5722]/10 hover:text-[#1A1A1A]'
                  : 'border-white/20 bg-white/[0.03] text-white/70 hover:border-[#FF6B00]/60 hover:bg-[#FF6B00]/10 hover:text-white',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t transition-colors',
                  isLight
                    ? 'border-[#1A1A1A]/35 group-hover:border-[#FF5722]'
                    : 'border-white/40 group-hover:border-[#FF6B00]',
                )}
              />
              <span
                className={cn(
                  'pointer-events-none absolute -right-px -top-px h-2 w-2 border-r border-t transition-colors',
                  isLight
                    ? 'border-[#1A1A1A]/35 group-hover:border-[#FF5722]'
                    : 'border-white/40 group-hover:border-[#FF6B00]',
                )}
              />
              <span
                className={cn(
                  'pointer-events-none absolute -bottom-px -left-px h-2 w-2 border-b border-l transition-colors',
                  isLight
                    ? 'border-[#1A1A1A]/35 group-hover:border-[#FF5722]'
                    : 'border-white/40 group-hover:border-[#FF6B00]',
                )}
              />
              <span
                className={cn(
                  'pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r transition-colors',
                  isLight
                    ? 'border-[#1A1A1A]/35 group-hover:border-[#FF5722]'
                    : 'border-white/40 group-hover:border-[#FF6B00]',
                )}
              />
              <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
            </motion.button>
          </div>
          <p
            className={cn(
              'mt-4 font-mono text-[9px] uppercase tracking-[0.35em]',
              isLight ? 'text-[#1A1A1A]/30' : 'text-white/25',
            )}
          >
            © {new Date().getFullYear()} ElektraTeq · All systems nominal
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
