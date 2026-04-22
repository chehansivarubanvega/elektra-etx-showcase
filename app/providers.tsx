"use client";

import React from "react";
import {PressTransitionProvider} from "@/components/press/PressTransitionProvider";
import {WebGLBudgetProvider} from "@/components/WebGLBudgetContext";
import {RootErrorBoundary} from "@/components/RootErrorBoundary";

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <RootErrorBoundary>
      <WebGLBudgetProvider>
        <PressTransitionProvider>{children}</PressTransitionProvider>
      </WebGLBudgetProvider>
    </RootErrorBoundary>
  );
}
