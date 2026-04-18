'use client'

import React, { useRef } from 'react';
import Image from 'next/image';

export const ChargingSection = () => {
  return (
    <div className="charging-sidebar absolute inset-0 z-30 flex flex-col md:flex-row items-center justify-between px-8 md:px-24 pointer-events-none opacity-0">
      {/* Metrics Stack (Left - Stacked on Mobile) */}
      <div className="flex w-full max-w-full flex-col items-center justify-center gap-8 pt-24 max-md:px-2 md:flex-col md:items-start md:gap-16 md:pt-0 md:w-auto">
        <div className="metric-charging-item scale-75 md:scale-100 origin-center md:origin-left">
          <div className="flex items-baseline gap-2 md:gap-4">
            <span className="text-4xl md:text-6xl font-bold font-sans">6</span>
            <span className="text-xs md:text-sm font-bold tracking-[0.2em] opacity-40 uppercase">HRS</span>
          </div>
          <div className="hidden md:block text-[10px] tracking-[0.3em] font-medium opacity-60 uppercase mt-2 max-w-[200px]">USING HOME CHARGER FOR FULL CHARGE</div>
        </div>

        <div className="metric-charging-item scale-75 md:scale-100 origin-center md:origin-left">
          <div className="flex items-baseline gap-2 md:gap-4">
            <span className="text-4xl md:text-6xl font-bold font-sans">5</span>
            <span className="text-xs md:text-sm font-bold tracking-[0.2em] opacity-40 uppercase">HRS</span>
          </div>
          <div className="hidden md:block text-[10px] tracking-[0.3em] font-medium opacity-60 uppercase mt-2 max-w-[200px]">USING AC COMMERCIAL CHARGER FOR FULL CHARGE</div>
        </div>

        {/* The Standout */}
        <div className="metric-charging-fast scale-75 md:scale-100 origin-center md:origin-left">
          <div className="flex items-baseline gap-4 md:gap-6">
            <span className="text-6xl md:text-[120px] font-black font-sans leading-none text-[#FF5722]">1</span>
            <span className="text-lg md:text-2xl font-black tracking-[0.1em] text-[#FF5722] uppercase">HRS</span>
          </div>
          <div className="hidden md:block text-[12px] tracking-[0.4em] font-bold text-[#FF5722] uppercase mt-2">USING FAST CHARGER FOR FULL CHARGE</div>
        </div>
      </div>

      {/* Narrative Block (Right - Order switched for mobile) */}
      <div className="max-w-lg text-center md:text-right flex flex-col items-center md:items-end justify-center h-full z-10 p-4">
        <div className="narrative-charging-stagger">
          <span className="text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase text-[#FF6B00]">URBAN ENERGY</span>
        </div>
        <h2 className="narrative-charging-stagger text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-white my-4 md:my-8">
          POWERING<br />PROGRESS
        </h2>
        <p className="narrative-charging-stagger text-xs md:text-[15px] leading-relaxed text-white/50 mb-6 md:mb-12 max-w-sm">
          Recharge with confidence through ETX’s effortless charging system.
        </p>
        <div className="narrative-charging-stagger">
          <button className="px-8 py-3 md:px-12 md:py-5 border border-white/20 text-[9px] md:text-[10px] tracking-[0.3em] md:tracking-[0.5em] uppercase hover:bg-white hover:text-black transition-all duration-500 cursor-pointer pointer-events-auto">
            Locate Stations
          </button>
        </div>
      </div>

      {/* Central Technical Asset (Absolute center background - Resized on Mobile) */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,87,34,0.08)_0%,transparent_60%)]" />
        <div className="charging-image-container relative w-[60vw] h-[60vw] md:w-[85vh] md:h-[85vh]">
             <Image 
                src="/images/chargingPort1-1024x1024.png" 
                alt="Charging Port Technical Detail" 
                fill
                priority
                className="object-contain"
                referrerPolicy="no-referrer"
             />
        </div>
      </div>
    </div>
  );
};
