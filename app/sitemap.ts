import type {MetadataRoute} from 'next';
import {getSiteUrlString} from '@/lib/site';
import {getArticleSlugs} from '@/lib/press/articles';

const STATIC = ['', '/about', '/archive', '/contact', '/preorder', '/press'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrlString();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC.map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));

  for (const slug of getArticleSlugs()) {
    entries.push({
      url: `${base}/press/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }

  return entries;
}
