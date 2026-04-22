import type {Metadata} from 'next';
import {ContactPageClient} from '@/components/contact/ContactPageClient';
import {getCanonicalUrl} from '@/lib/site';

export const metadata: Metadata = {
  alternates: {canonical: getCanonicalUrl('/contact')},
};

export default function ContactPage() {
  return <ContactPageClient />;
}
