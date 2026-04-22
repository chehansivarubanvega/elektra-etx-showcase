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
  state: EBState & { error?: string } = { hasError: false };
  
  static getDerivedStateFromError(error: Error): EBState & { error?: string } {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CanvasErrorBoundary] 3D error caught:", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`flex flex-col items-center justify-center bg-black gap-4 p-8 text-center ${this.props.className ?? "h-full w-full"}`}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            3D view unavailable
          </p>
          {this.state.error && (
            <p className="font-mono text-[9px] text-white/20 max-w-xs break-words">
              Error: {this.state.error}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
