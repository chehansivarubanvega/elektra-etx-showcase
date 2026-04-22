import React from 'react';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {PressArticleView} from '@/components/press/PressArticleView';
import {getArticleBySlug, getArticleSlugs, getNextArticles} from '@/lib/press/articles';
import {getCanonicalUrl} from '@/lib/site';

type PageProps = {
  params: Promise<{slug: string}>;
};

export async function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({slug}));
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {slug} = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    return {title: 'Press | ELEKTRA ETX'};
  }
  return {
    title: `${article.title} | Press`,
    description: article.summary,
    alternates: {canonical: getCanonicalUrl(`/press/${slug}`)},
    openGraph: {
      title: article.title,
      description: article.summary,
      images: [{url: article.thumbnail, width: 1024, height: 1024}],
    },
  };
}

export default async function PressArticlePage({params}: PageProps) {
  const {slug} = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    notFound();
  }
  const nextArticles = getNextArticles(slug, 6);
  return <PressArticleView article={article} nextArticles={nextArticles} />;
}
