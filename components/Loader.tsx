'use client';

import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

const funnyPhrases = [
  "Waking up the engine hamsters...",
  "Charging the flux capacitor...",
  "Polishing the cyber-paint...",
  "Downloading more horsepower...",
  "Bargaining with your GPU...",
  "Attaching digital wheels...",
  "Checking blinker fluid levels...",
  "Calibrating the aerodynamic swoosh...",
  "Warming up the pixels...",
  "Almost ready to conquer the city...",
];

export const Loader = () => {
  const { progress } = useProgress();
  const [textIndex, setTextIndex] = useState(0);
  const [mounted, setMounted] = useState(true);

  // Cycle through funny text phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % funnyPhrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Handle locking scroll and unmounting
  useEffect(() => {
    if (progress >= 100) {
      // Unlock scroll immediately when done
      document.body.style.overflow = '';
      
      // Wait for the fade-out CSS transition before removing from DOM
      const t = setTimeout(() => setMounted(false), 1000); 
      return () => clearTimeout(t);
    } else {
      // Lock scroll and force absolute top while loading
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    }
  }, [progress]);

  // If fully faded out and unmounted, render nothing
  if (!mounted) return null;

  return (
    <div 
      className={`fixed inset-0 z-[10000] bg-[#000000] flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${
        progress >= 100 ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <div className="w-[340px] flex flex-col items-center text-center">
        {/* Bouncing Loader Icon */}
        <div className="text-[#FF6B00] text-7xl mb-8 animate-bounce">
          ⚡
        </div>
        
        {/* Rotating Funny Text */}
        <div className="h-8 mb-6 flex items-center justify-center">
          <p className="text-white font-mono text-[11px] tracking-[0.2em] uppercase animate-pulse">
            {funnyPhrases[textIndex]}
          </p>
        </div>
        
        {/* Progress Bar Container */}
        <div className="w-full bg-white/10 h-[2px] rounded-full overflow-hidden mb-4 relative flex items-center">
          {/* Progress Bar Fill */}
          <div 
            className="absolute top-0 left-0 h-full bg-[#FF6B00] transition-all duration-300 ease-out shadow-[0_0_15px_rgba(255,107,0,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Percentage */}
        <div className="text-white/40 font-mono text-[10px] tracking-[0.3em]">
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  );
};
