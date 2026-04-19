import pressData from '@/data/press-articles.json';

export type PressSketch = {
  src: string;
  alt: string;
  caption: string;
};

export type PressArticle = {
  slug: string;
  title: string;
  summary: string;
  thumbnail: string;
  date: string;
  source: string;
  kicker: string;
  paragraphs: string[];
  sketches: PressSketch[];
};

const articles = pressData.articles as PressArticle[];

export function getAllArticles(): PressArticle[] {
  return articles;
}

export function getArticleBySlug(slug: string): PressArticle | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticleSlugs(): string[] {
  return articles.map((a) => a.slug);
}

export function getOtherArticles(currentSlug: string): PressArticle[] {
  return articles.filter((a) => a.slug !== currentSlug);
}

export function getNextArticles(currentSlug: string, limit = 6): PressArticle[] {
  const idx = articles.findIndex((a) => a.slug === currentSlug);
  if (idx === -1) return articles.slice(0, limit);
  const rotated = [...articles.slice(idx + 1), ...articles.slice(0, idx)];
  return rotated.slice(0, limit);
}
