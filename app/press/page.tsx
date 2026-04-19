import React from 'react';
import {PressIndex} from '@/components/press/PressIndex';
import {getAllArticles} from '@/lib/press/articles';

export default function PressPage() {
  const articles = getAllArticles();
  return <PressIndex articles={articles} />;
}
