import React from 'react';
import {Barlow_Condensed} from 'next/font/google';

const pressDisplay = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-press-display',
});

export default function PressLayout({children}: {children: React.ReactNode}) {
  return (
    <div
      className={`${pressDisplay.variable} min-h-[100dvh] bg-[#FEFEFE] pt-[100px] text-[#1A1A1A] antialiased md:pt-[112px]`}
    >
      {children}
    </div>
  );
}
