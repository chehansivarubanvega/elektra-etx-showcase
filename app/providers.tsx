'use client';

import React from 'react';
import {PressTransitionProvider} from '@/components/press/PressTransitionProvider';

export function Providers({children}: {children: React.ReactNode}) {
  return <PressTransitionProvider>{children}</PressTransitionProvider>;
}
