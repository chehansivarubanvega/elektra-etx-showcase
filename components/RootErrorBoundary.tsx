"use client";

import React, {Component, type ErrorInfo, type ReactNode} from "react";

type Props = {children: ReactNode};
type State = {hasError: boolean};

/**
 * Last-resort catch for unhandled render errors (often WebGL or GSAP on mobile
 * Safari). Avoids a blank “Application error” for the full site.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = {hasError: false};

  static getDerivedStateFromError(): State {
    return {hasError: true};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[RootErrorBoundary]", error.message, errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black px-6 text-center text-white">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
            Something went wrong
          </p>
          <p className="mb-6 max-w-sm text-sm text-white/60">
            Try reloading the page. If this keeps happening, open the site on a
            stable connection and update your browser.
          </p>
          <button
            type="button"
            onClick={() => globalThis.location.reload()}
            className="rounded-full border border-white/25 bg-white/10 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00]"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
