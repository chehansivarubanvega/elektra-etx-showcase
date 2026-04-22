import type {Metadata} from 'next';
import {PressIndex} from '@/components/press/PressIndex';
import {getAllArticles} from '@/lib/press/articles';
import {getCanonicalUrl} from '@/lib/site';

export const metadata: Metadata = {
  alternates: {canonical: getCanonicalUrl('/press')},
};

export default function PressPage() {
  const articles = getAllArticles();
  return <PressIndex articles={articles} />;
}
