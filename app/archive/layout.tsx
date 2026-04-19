import type {Metadata} from 'next';
import {Barlow_Condensed, Cormorant_Garamond} from 'next/font/google';
import React from 'react';

const archiveSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['italic', 'normal'],
  variable: '--font-archive-serif',
});

/** Massive hero headline — condensed sans like Off-Track display type */
const archiveDisplay = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-archive-display',
});

export const metadata: Metadata = {
  title: 'THE ARCHIVE | ELEKTRA ETX',
  description:
    'An editorial gallery of the ETX in the world — partnerships, activations, and the craft behind Sri Lanka’s electric three-wheeler.',
};

export default function ArchiveLayout({children}: {children: React.ReactNode}) {
  return (
    <div
      className={`${archiveSerif.variable} ${archiveDisplay.variable} min-h-[100dvh] bg-[#F9F8F3] pt-[100px] text-[#141414] antialiased selection:bg-[#141414] selection:text-[#F9F8F3] md:pt-[112px]`}
    >
      {children}
    </div>
  );
}
