'use client';

import React, {useCallback, useRef, useState} from 'react';
import Link from 'next/link';

/**
 * Client-only: pointer-driven offset for the “Back to Press” control.
 * The rest of the article is server-rendered.
 */
export function MagneticBackLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [t, setT] = useState({x: 0, y: 0});

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setT({
      x: (e.clientX - cx) * 0.22,
      y: (e.clientY - cy) * 0.22,
    });
  }, []);

  const onLeave = useCallback(() => setT({x: 0, y: 0}), []);

  return (
    <Link
      ref={ref}
      href="/press"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{transform: `translate3d(${t.x}px, ${t.y}px, 0)`}}
      className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#1A1A1A]/55 transition-colors hover:text-[#FF5722]"
    >
      <span className="text-[#FF5722]" aria-hidden>
        ←
      </span>
      Back to Press
    </Link>
  );
}
