import type {Metadata} from 'next';
import {ETXExperience} from '@/components/home/ETXExperience';
import {getCanonicalUrl} from '@/lib/site';

/**
 * Home is a **Server Component** shell: the route runs on the server, streams
 * metadata, and streams HTML around a single `ETXExperience` island (GSAP + R3F).
 * Title/description/OG default from `app/layout.tsx`.
 */
export const metadata: Metadata = {
  alternates: {canonical: getCanonicalUrl('/')},
};

export default function Home() {
  return <ETXExperience />;
}
