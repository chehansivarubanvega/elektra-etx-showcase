import type { Metadata } from "next";
import { Cormorant_Garamond, Inter_Tight } from "next/font/google";
import React from "react";

/** Massive condensed display for the ABOUT mega-word + brutalist headlines. */
const aboutDisplay = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
  variable: "--font-about-display",
});

/** Editorial serif used for the narrative pull-quote / body. */
const aboutSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["italic", "normal"],
  variable: "--font-about-serif",
});

export const metadata: Metadata = {
  title: "ABOUT // ELEKTRATEQ",
  description:
    "Where sustainable mobility meets innovation. Born in Colombo, engineered for the next decade — Elektrateq is a venture of Vega Innovations.",
};

export default function AboutLayout(
  props: Readonly<{ children: React.ReactNode }>,
) {
  const { children } = props;
  return (
    <div
      className={`${aboutDisplay.variable} ${aboutSerif.variable} relative min-h-[100dvh] bg-[#000000] text-white antialiased selection:bg-[#FF5722] selection:text-white`}
    >
      {children}
    </div>
  );
}
