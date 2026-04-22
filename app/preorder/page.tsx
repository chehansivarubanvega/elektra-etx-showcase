import type {Metadata} from 'next';
import {PreorderPageClient} from '@/components/preorder/PreorderPageClient';
import {getCanonicalUrl} from '@/lib/site';

export const metadata: Metadata = {
  alternates: {canonical: getCanonicalUrl('/preorder')},
};

export default function PreorderPage() {
  return <PreorderPageClient />;
}
