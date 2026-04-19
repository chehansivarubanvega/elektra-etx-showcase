import type {Metadata} from "next";
import {Inter_Tight, JetBrains_Mono} from "next/font/google";
import React from "react";

/** Same brutalist display family the rest of the dark routes use. */
const contactDisplay = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
  variable: "--font-contact-display",
});

/** Mono used for the HUD labels, coordinates, form chrome. */
const contactMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-contact-mono",
});

export const metadata: Metadata = {
  title: "CONTACT // ELEKTRATEQ",
  description:
    "Open a channel with Elektrateq — Trace Expert City, Maradana, Sri Lanka. Press, partnerships, fleet inquiries, and engineering collaboration.",
};

export default function ContactLayout(props: Readonly<{children: React.ReactNode}>) {
  const {children} = props;
  return (
    <div
      className={`${contactDisplay.variable} ${contactMono.variable} relative min-h-[100dvh] bg-[#000000] text-white antialiased selection:bg-[#FF5722] selection:text-white`}
    >
      {children}
    </div>
  );
}
