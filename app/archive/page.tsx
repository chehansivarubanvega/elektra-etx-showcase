import type {Metadata} from 'next';
import {ArchivePageClient} from '@/components/archive/ArchivePageClient';
import {getCanonicalUrl} from '@/lib/site';

export const metadata: Metadata = {
  alternates: {canonical: getCanonicalUrl('/archive')},
};

export default function ArchivePage() {
  return <ArchivePageClient />;
}
