"use client";

import React, { Component } from "react";

type EBState = { hasError: boolean };

/**
 * Catches WebGL context-loss crashes (common on iOS Safari when the browser
 * reclaims GPU resources) and shows a silent fallback instead of killing the
 * entire page with an "Application Error" overlay.
 *
 * Wrap every R3F `<Canvas>` in this boundary so that losing a single WebGL
 * context doesn't take down the page.
 */
export class CanvasErrorBoundary extends Component<
  { children: React.ReactNode; className?: string },
  EBState
> {
  state: EBState = { hasError: false };

  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.warn("[CanvasErrorBoundary] 3D error caught:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`flex items-center justify-center bg-black ${this.props.className ?? "h-full w-full"}`}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            3D view unavailable
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
