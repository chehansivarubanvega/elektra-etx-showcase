import type {Metadata} from "next";
import React from "react";

export const metadata: Metadata = {
  title: "PREORDER // ELEKTRA ETX",
  description:
    "Secure your legacy. Configure your ETX in the digital twin and reserve a fleet allocation.",
};

export default function PreorderLayout(props: Readonly<{children: React.ReactNode}>) {
  const {children} = props;
  return (
    <div className="relative min-h-[100dvh] bg-[#000000] text-white antialiased">
      {children}
    </div>
  );
}
