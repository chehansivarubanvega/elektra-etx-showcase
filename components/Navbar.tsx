'use client';

import React, {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {motion, useScroll, useMotionValueEvent, AnimatePresence} from 'motion/react';
import {Menu, X} from 'lucide-react';
import {usePressTransition} from '@/components/press/PressTransitionProvider';

const MOBILE_MAX = 767;

/** Home: pinned hero is long — use ~2 viewports. Press: normal document — past first hero fold (~1 viewport). */
function heroPastThresholdPx(isPress: boolean): number {
  if (typeof globalThis.window === 'undefined') {
    return isPress ? 560 : 960;
  }
  const vh = globalThis.window.innerHeight;
  if (isPress) {
    return Math.round(Math.max(vh * 1.05, 560));
  }
  return Math.max(vh * 2, 960);
}

export const Navbar = () => {
  const pathname = usePathname();
  const isPressRoute = pathname?.startsWith('/press') ?? false;
  const {navigateToPress} = usePressTransition();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const {scrollY} = useScroll();

  /** Mobile: hide main bar + show floating hamburger after leaving the hero fold (home or press). */
  const effectivePastHero = pastHero && isMobile;

  useEffect(() => {
    const onResize = () => {
      const mobile = globalThis.window.innerWidth <= MOBILE_MAX;
      setIsMobile(mobile);
      if (!mobile) {
        setPastHero(false);
      } else {
        setPastHero(scrollY.get() > heroPastThresholdPx(isPressRoute));
      }
    };
    onResize();
    globalThis.window.addEventListener('resize', onResize, {passive: true});
    return () => globalThis.window.removeEventListener('resize', onResize);
  }, [scrollY, isPressRoute]);

  useEffect(() => {
    if (!effectivePastHero) setMenuOpen(false);
  }, [effectivePastHero]);

  useEffect(() => {
    const y = scrollY.get();
    setIsScrolled(y > 50);
    if (typeof globalThis.window !== 'undefined' && globalThis.window.innerWidth <= MOBILE_MAX) {
      setPastHero(y > heroPastThresholdPx(isPressRoute));
    }
  }, [scrollY, isPressRoute]);

  useEffect(() => {
    if (!menuOpen || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen, isMobile]);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 50);
    if (typeof globalThis.window !== 'undefined' && globalThis.window.innerWidth <= MOBILE_MAX) {
      setPastHero(latest > heroPastThresholdPx(isPressRoute));
    } else {
      setPastHero(false);
    }
  });

  const navItems = ['AERO', 'POWER', 'BUILD'] as const;

  const onPressNav = (e: React.MouseEvent) => {
    navigateToPress(e);
  };

  const headerVariants = useMemo(
    () => ({
      expanded: {
        width: '100%',
        top: 0,
        paddingLeft: '48px',
        paddingRight: '48px',
        paddingTop: '32px',
        paddingBottom: '32px',
        borderRadius: '0px',
        backgroundColor: 'transparent',
      },
      scrolled: isPressRoute
        ? {
            width: 'auto',
            top: 24,
            paddingLeft: '24px',
            paddingRight: '24px',
            paddingTop: '12px',
            paddingBottom: '12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(254, 254, 254, 0.9)',
            boxShadow: '0 14px 44px rgba(0,0,0,0.07)',
          }
        : {
            width: 'auto',
            top: 24,
            paddingLeft: '24px',
            paddingRight: '24px',
            paddingTop: '12px',
            paddingBottom: '12px',
            borderRadius: '9999px',
            backgroundColor: '#111111CC',
          },
    }),
    [isPressRoute],
  );

  const logoColor = isPressRoute ? 'text-[#1A1A1A]' : 'text-white';
  const navMuted = isPressRoute ? 'text-[#1A1A1A]/55' : 'text-white/60';
  const navHover = 'hover:text-[#FF5722]';
  const pressActive = pathname === '/press';
  const pressLinkColor = isPressRoute
    ? pressActive
      ? 'text-[#FF5722]'
      : `text-[#1A1A1A]/55 ${navHover}`
    : `${navMuted} ${navHover}`;

  return (
    <>
      <motion.header
        initial="expanded"
        animate={isScrolled ? 'scrolled' : 'expanded'}
        variants={headerVariants}
        transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
        className={`fixed left-[50%] z-[100] box-border flex max-w-full -translate-x-[50%] items-center justify-between backdrop-blur-sm pointer-events-none max-md:px-5 max-md:pt-8 ${
          effectivePastHero ? 'max-md:hidden' : ''
        } ${isPressRoute && isScrolled ? 'ring-1 ring-[#1A1A1A]/[0.08]' : ''}`}
      >
        <div className="pointer-events-auto flex items-center">
          <Link
            href="/"
            className={`navbar-logo text-[20px] font-[900] uppercase tracking-[-0.02em] select-none transition-colors ${logoColor}`}
          >
            {isScrolled ? 'ETX' : 'ELEKTRATEQ'}
          </Link>
        </div>

        <nav
          className={`pointer-events-auto hidden items-center gap-12 md:flex ${isScrolled ? 'ml-12' : ''}`}
        >
          {navItems.map((item) => (
            <Link
              key={item}
              href="/"
              className={`navbar-item text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${navMuted} ${navHover}`}
            >
              {item}
            </Link>
          ))}
          <Link
            href="/press"
            onClick={isPressRoute ? undefined : onPressNav}
            className={`navbar-item text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${pressLinkColor}`}
          >
            Press
          </Link>
        </nav>

        <div className={`pointer-events-auto flex items-center gap-6 ${isScrolled ? 'ml-12' : ''}`}>
          <button
            type="button"
            className={`hidden text-[10px] font-bold uppercase tracking-[0.3em] transition-colors md:block ${
              isPressRoute ? 'text-[#1A1A1A] hover:text-[#FF5722]' : 'text-white hover:text-[#FF5722]'
            }`}
          >
            {isScrolled ? '' : 'Get in touch'}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`rounded-full border px-6 py-2 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-300 md:hidden ${
              isPressRoute
                ? 'border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FEFEFE]'
                : 'border-white/20 text-white hover:bg-white hover:text-black'
            }`}
          >
            Menu
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {effectivePastHero && (
          <motion.button
            key="hamburger"
            type="button"
            initial={{opacity: 0, scale: 0.9}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.9}}
            transition={{duration: 0.25}}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className={`fixed right-4 top-5 z-[101] flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md md:hidden ${
              isPressRoute
                ? 'border-[#1A1A1A]/20 bg-[#FEFEFE]/92 text-[#1A1A1A]'
                : 'border-white/20 bg-black/80 text-white'
            }`}
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && isMobile && (
          <motion.div
            key="overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.2}}
            className={`fixed inset-0 z-[102] backdrop-blur-md md:hidden ${
              isPressRoute ? 'bg-[#FEFEFE]/96' : 'bg-black/96'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{y: 16, opacity: 0}}
              animate={{y: 0, opacity: 1}}
              exit={{y: 12, opacity: 0}}
              transition={{duration: 0.25, ease: [0.22, 1, 0.36, 1]}}
              className="flex h-full flex-col px-6 pb-10 pt-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-10 flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className={`navbar-logo text-xl font-[900] uppercase tracking-[-0.02em] ${logoColor}`}
                >
                  ETX
                </Link>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                    isPressRoute
                      ? 'border-[#1A1A1A]/15 text-[#1A1A1A] hover:border-[#1A1A1A]/35'
                      : 'border-white/15 text-white hover:border-white/40'
                  }`}
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item}
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className={`navbar-item border-b py-4 text-lg font-bold uppercase tracking-[0.2em] transition-colors hover:text-[#FF5722] ${
                      isPressRoute
                        ? 'border-[#1A1A1A]/[0.08] text-[#1A1A1A]/90'
                        : 'border-white/[0.08] text-white/90'
                    }`}
                  >
                    {item}
                  </Link>
                ))}
                <Link
                  href="/press"
                  onClick={(e) => {
                    if (!isPressRoute) {
                      onPressNav(e);
                    }
                    setMenuOpen(false);
                  }}
                  className={`navbar-item border-b py-4 text-lg font-bold uppercase tracking-[0.2em] transition-colors hover:text-[#FF5722] ${
                    isPressRoute
                      ? pressActive
                        ? 'border-[#1A1A1A]/[0.08] text-[#FF5722]'
                        : 'border-[#1A1A1A]/[0.08] text-[#1A1A1A]/90'
                      : 'border-white/[0.08] text-white/90'
                  }`}
                >
                  Press
                </Link>
              </nav>

              <button
                type="button"
                className={`mt-4 w-full rounded-full border py-4 text-center text-[11px] font-bold uppercase tracking-[0.35em] transition-colors ${
                  isPressRoute
                    ? 'border-[#1A1A1A]/20 text-[#1A1A1A] hover:border-[#FF5722] hover:text-[#FF5722]'
                    : 'border-white/25 text-white hover:border-[#FF5722] hover:text-[#FF5722]'
                }`}
              >
                Get in touch
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {effectivePastHero && !menuOpen && !isPressRoute && (
        <div
          className="pointer-events-none fixed left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0"
          aria-hidden
        >
          <span className="navbar-logo">ETX</span>
          {navItems.map((item) => (
            <span key={item} className="navbar-item">
              {item}
            </span>
          ))}
          <span className="navbar-item">Press</span>
        </div>
      )}
    </>
  );
};
