import type {Metadata} from 'next';
import {AboutPageClient} from '@/components/about/AboutPageClient';
import {getCanonicalUrl} from '@/lib/site';

/** Server shell: metadata + static HTML pass-through; 3D/GSAP in `AboutPageClient`. */
export const metadata: Metadata = {
  alternates: {canonical: getCanonicalUrl('/about')},
};

export default function AboutPage() {
  return <AboutPageClient />;
}
