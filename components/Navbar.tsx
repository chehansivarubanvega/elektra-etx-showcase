'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <motion.header
      initial="expanded"
      animate={isScrolled ? 'scrolled' : 'expanded'}
      variants={{
        expanded: { width: '100%', top: 0, paddingLeft: '48px', paddingRight: '48px', paddingTop: '32px', paddingBottom: '32px', borderRadius: '0px', backgroundColor: 'transparent' },
        scrolled: { width: 'auto', top: 24, paddingLeft: '24px', paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', borderRadius: '9999px', backgroundColor: '#111111CC' }
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-[50%] -translate-x-[50%] z-[100] flex items-center justify-between pointer-events-none backdrop-blur-sm"
    >
      {/* Brand */}
      <div className="pointer-events-auto flex items-center">
        <span className="text-white font-[900] text-[20px] tracking-[-0.02em] uppercase select-none transition-all">
          {isScrolled ? 'ETX' : 'ELEKTRATEQ'}
        </span>
      </div>
      
      {/* Navigation */}
      <nav className={`hidden md:flex gap-12 pointer-events-auto items-center ${isScrolled ? 'ml-12' : ''}`}>
        {['AERO', 'POWER', 'BUILD'].map((item) => (
          <Link 
            key={item}
            href="#" 
            className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/60 hover:text-[#FF5722] transition-colors duration-300"
          >
            {item}
          </Link>
        ))}
      </nav>

      {/* Actions */}
      <div className={`flex items-center gap-6 pointer-events-auto ${isScrolled ? 'ml-12' : ''}`}>
        <button className="hidden md:block text-[10px] font-bold tracking-[0.3em] uppercase text-white hover:text-[#FF5722] transition-colors">
          {isScrolled ? '' : 'Get in touch'}
        </button>
        <button className="px-6 py-2 border border-white/20 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase text-white hover:bg-white hover:text-black transition-all duration-300">
          Menu
        </button>
      </div>
    </motion.header>
  );
};
