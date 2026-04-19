'use client';

import React, {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {motion, useScroll, useMotionValueEvent, AnimatePresence} from 'motion/react';
import {Menu, X} from 'lucide-react';
import {usePressTransition} from '@/components/press/PressTransitionProvider';

const MOBILE_MAX = 767;

/** Home: pinned hero is long — use ~2 viewports. Press: normal document — past first hero fold (~1 viewport). */
function heroPastThresholdPx(isShortDocument: boolean): number {
  if (typeof globalThis.window === 'undefined') {
    return isShortDocument ? 560 : 960;
  }
  const vh = globalThis.window.innerHeight;
  if (isShortDocument) {
    return Math.round(Math.max(vh * 1.05, 560));
  }
  return Math.max(vh * 2, 960);
}

export const Navbar = () => {
  const pathname = usePathname();
  const isPressRoute = pathname?.startsWith('/press') ?? false;
  const isArchiveRoute = pathname?.startsWith('/archive') ?? false;
  const isAboutRoute = pathname?.startsWith('/about') ?? false;
  const isLightSurface = isPressRoute || isArchiveRoute;
  const {navigateToPress, navigateToAbout} = usePressTransition();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const {scrollY} = useScroll();

  /** Mobile: hide main bar + show floating hamburger after leaving the hero fold (home or press). */
  const effectivePastHero = pastHero && isMobile;
  const shortDocumentRoute = isPressRoute || isArchiveRoute;

  useEffect(() => {
    const onResize = () => {
      const mobile = globalThis.window.innerWidth <= MOBILE_MAX;
      setIsMobile(mobile);
      if (!mobile) {
        setPastHero(false);
      } else {
        setPastHero(scrollY.get() > heroPastThresholdPx(shortDocumentRoute));
      }
    };
    onResize();
    globalThis.window.addEventListener('resize', onResize, {passive: true});
    return () => globalThis.window.removeEventListener('resize', onResize);
  }, [scrollY, shortDocumentRoute]);

  useEffect(() => {
    if (!effectivePastHero) setMenuOpen(false);
  }, [effectivePastHero]);

  useEffect(() => {
    const y = scrollY.get();
    setIsScrolled(y > 50);
    if (typeof globalThis.window !== 'undefined' && globalThis.window.innerWidth <= MOBILE_MAX) {
      setPastHero(y > heroPastThresholdPx(shortDocumentRoute));
    }
  }, [scrollY, shortDocumentRoute]);

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
      setPastHero(latest > heroPastThresholdPx(shortDocumentRoute));
    } else {
      setPastHero(false);
    }
  });

  const onPressNav = (e: React.MouseEvent) => {
    navigateToPress(e);
  };

  const onAboutNav = (e: React.MouseEvent) => {
    navigateToAbout(e);
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
      scrolled: isLightSurface
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
    [isLightSurface],
  );

  const logoColor = isLightSurface ? 'text-[#1A1A1A]' : 'text-white';
  const navMuted = isLightSurface ? 'text-[#1A1A1A]/55' : 'text-white/60';
  const navHover = 'hover:text-[#FF5722]';
  const pressActive = pathname === '/press';
  const archiveActive = pathname === '/archive';
  const aboutActive = pathname === '/about';
  const preorderActive = pathname === '/preorder';
  const pressLinkColor = isLightSurface
    ? pressActive
      ? 'text-[#FF5722]'
      : `text-[#1A1A1A]/55 ${navHover}`
    : `${navMuted} ${navHover}`;
  const archiveLinkColor = isLightSurface
    ? archiveActive
      ? 'text-[#FF5722]'
      : `text-[#1A1A1A]/55 ${navHover}`
    : `${navMuted} ${navHover}`;
  const aboutLinkColor = isLightSurface
    ? `text-[#1A1A1A]/55 ${navHover}`
    : aboutActive
      ? 'text-[#FF6B00]'
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
        } ${isLightSurface && isScrolled ? 'ring-1 ring-[#1A1A1A]/[0.08]' : ''}`}
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
          className={`pointer-events-auto hidden items-center gap-10 md:flex ${isScrolled ? 'ml-12' : ''}`}
        >
          <Link
            href="/about"
            onClick={!isAboutRoute ? onAboutNav : undefined}
            className={`navbar-item text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${aboutLinkColor}`}
          >
            About
          </Link>
          <Link
            href="/press"
            onClick={!isPressRoute && !isArchiveRoute ? onPressNav : undefined}
            className={`navbar-item text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${pressLinkColor}`}
          >
            Press
          </Link>
          <Link
            href="/archive"
            className={`navbar-item text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${archiveLinkColor}`}
          >
            Archive
          </Link>
        </nav>

        <div className={`pointer-events-auto flex items-center gap-4 ${isScrolled ? 'ml-12' : ''}`}>
          {/* Preorder CTA — promoted as a brand-orange pill so it reads as the
              page's primary conversion action across every surface (light /
              dark / scrolled). */}
          <Link
            href="/preorder"
            aria-current={preorderActive ? 'page' : undefined}
            className={`navbar-item hidden rounded-full border px-5 py-2 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-300 md:inline-flex ${
              preorderActive
                ? 'border-[#FF5722] bg-[#FF5722] text-black'
                : 'border-[#FF5722]/70 text-[#FF5722] hover:bg-[#FF5722] hover:text-black'
            }`}
          >
            Preorder
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`rounded-full border px-6 py-2 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-300 md:hidden ${
              isLightSurface
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
              isLightSurface
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
              isLightSurface ? 'bg-[#FEFEFE]/96' : 'bg-black/96'
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
                    isLightSurface
                      ? 'border-[#1A1A1A]/15 text-[#1A1A1A] hover:border-[#1A1A1A]/35'
                      : 'border-white/15 text-white hover:border-white/40'
                  }`}
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1">
                <Link
                  href="/about"
                  onClick={(e) => {
                    if (!isAboutRoute) {
                      onAboutNav(e);
                    }
                    setMenuOpen(false);
                  }}
                  className={`navbar-item border-b py-4 text-lg font-bold uppercase tracking-[0.2em] transition-colors hover:text-[#FF5722] ${
                    isLightSurface
                      ? 'border-[#1A1A1A]/[0.08] text-[#1A1A1A]/90'
                      : aboutActive
                        ? 'border-white/[0.08] text-[#FF6B00]'
                        : 'border-white/[0.08] text-white/90'
                  }`}
                >
                  About
                </Link>
                <Link
                  href="/press"
                  onClick={(e) => {
                    if (!isPressRoute && !isArchiveRoute) {
                      onPressNav(e);
                    }
                    setMenuOpen(false);
                  }}
                  className={`navbar-item border-b py-4 text-lg font-bold uppercase tracking-[0.2em] transition-colors hover:text-[#FF5722] ${
                    isLightSurface
                      ? pressActive
                        ? 'border-[#1A1A1A]/[0.08] text-[#FF5722]'
                        : 'border-[#1A1A1A]/[0.08] text-[#1A1A1A]/90'
                      : 'border-white/[0.08] text-white/90'
                  }`}
                >
                  Press
                </Link>
                <Link
                  href="/archive"
                  onClick={() => setMenuOpen(false)}
                  className={`navbar-item border-b py-4 text-lg font-bold uppercase tracking-[0.2em] transition-colors hover:text-[#FF5722] ${
                    isLightSurface
                      ? archiveActive
                        ? 'border-[#1A1A1A]/[0.08] text-[#FF5722]'
                        : 'border-[#1A1A1A]/[0.08] text-[#1A1A1A]/90'
                      : 'border-white/[0.08] text-white/90'
                  }`}
                >
                  Archive
                </Link>
                <Link
                  href="/preorder"
                  onClick={() => setMenuOpen(false)}
                  aria-current={preorderActive ? 'page' : undefined}
                  className="navbar-item mt-6 inline-flex items-center justify-center rounded-full border border-[#FF5722] bg-[#FF5722] py-4 text-lg font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-[#FF5722]/90"
                >
                  Preorder
                </Link>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
