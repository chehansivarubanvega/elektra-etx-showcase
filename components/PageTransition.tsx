'use client';

import React from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {usePathname} from 'next/navigation';

const ease = [0.22, 1, 0.36, 1] as const;

export function PageTransition({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="min-w-0"
        initial={{opacity: 0, y: 10}}
        animate={{opacity: 1, y: 0}}
        exit={{opacity: 0, y: -8}}
        transition={{duration: 0.28, ease}}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
