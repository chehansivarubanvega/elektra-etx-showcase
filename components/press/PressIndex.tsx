'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {PressArticle} from '@/lib/press/articles';

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280' viewBox='0 0 280 280'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E")`;

type PressIndexProps = {
  articles: PressArticle[];
};

export function PressIndex({articles}: PressIndexProps) {
  const total = String(articles.length).padStart(2, '0');

  return (
    <main className="bg-[#FEFEFE] text-[#1A1A1A]">
      <section className="relative mx-auto max-w-[1600px] px-5 pb-16 pt-2 md:px-10 md:pb-24 md:pt-4">
        <div className="relative grid min-h-[min(72vh,720px)] grid-cols-1 items-end gap-10 md:grid-cols-12 md:items-center">
          <div className="relative z-10 md:col-span-6 md:col-start-1 md:row-start-1">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.45em] text-[#FF5722]">Press Hub</p>
            <h1
              className="relative w-[min(50vw,520px)] max-w-full text-[clamp(4.5rem,14vw,11rem)] font-bold uppercase leading-[0.82] tracking-[-0.04em] [font-family:var(--font-press-display),ui-sans-serif]"
              style={{color: '#1A1A1A'}}
            >
              Press
            </h1>
            <p className="mt-8 max-w-md text-[13px] leading-relaxed text-[#1A1A1A]/55 md:text-[14px]">
              Awards, alliances, and the engineering stories behind Colombo&apos;s electric three-wheeler.
            </p>
          </div>

          <div className="relative z-[1] flex justify-center md:col-span-7 md:col-start-5 md:row-start-1 md:justify-end">
            <div className="relative w-full max-w-[720px] translate-y-4 md:-translate-y-6 md:translate-x-4">
              <Image
                src="/images/press_hero.png"
                alt="Technical line drawing of the ETX dashboard and cockpit"
                width={1200}
                height={900}
                priority
                className="h-auto w-full object-contain mix-blend-multiply opacity-[0.92] contrast-[1.05]"
                sizes="(min-width: 768px) 55vw, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#1A1A1A]/[0.06] px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16 max-w-4xl md:mb-24">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#1A1A1A]/40">The arrangement</p>
            <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-bold uppercase leading-[0.95] tracking-[-0.02em] [font-family:var(--font-press-display),ui-sans-serif]">
              ETX: The future of Colombo&apos;s streets
            </h2>
          </div>

          <div className="flex flex-col gap-20 md:gap-28">
            {articles.map((article, index) => {
              const n = String(index + 1).padStart(2, '0');
              return (
                <article key={article.slug} className="group relative">
                  <div
                    className="pointer-events-none absolute -inset-4 rounded-[20px] opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:-inset-6"
                    style={{backgroundImage: GRAIN_BG, backgroundSize: '280px 280px'}}
                    aria-hidden
                  />
                  <div className="relative grid grid-cols-1 items-start gap-10 md:grid-cols-12 md:gap-6 lg:gap-10">
                    <div className="md:col-span-2 lg:col-span-2">
                      <div className="md:sticky md:top-32">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#1A1A1A]/35">Press Hub</p>
                        <p className="mt-3 text-[clamp(2.5rem,6vw,4rem)] font-bold leading-none tracking-[-0.04em] [font-family:var(--font-press-display),ui-sans-serif] text-[#1A1A1A]/12 transition-colors duration-500 group-hover:text-[#1A1A1A]/22">
                          {n}
                          <span className="mx-1 text-[#1A1A1A]/20">/</span>
                          {total}
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-5 lg:col-span-5">
                      <Link href={`/press/${article.slug}`} className="block overflow-hidden rounded-2xl">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#1A1A1A]/[0.04] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]">
                          <Image
                            src={article.thumbnail}
                            alt={article.title}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1024px) 42vw, (min-width: 768px) 45vw, 100vw"
                          />
                        </div>
                      </Link>
                    </div>

                    <div className="flex flex-col justify-start gap-4 md:col-span-5 lg:col-span-5 md:pt-1">
                      <Link href={`/press/${article.slug}`} className="group/link block">
                        <h3 className="text-[clamp(1.35rem,2.4vw,1.85rem)] font-bold uppercase leading-[1.05] tracking-[-0.02em] [font-family:var(--font-press-display),ui-sans-serif] transition-colors duration-300 group-hover/link:text-[#FF5722]">
                          {article.title}
                        </h3>
                      </Link>
                      <p className="line-clamp-2 max-w-xl text-[14px] leading-relaxed text-[#1A1A1A]/50 md:text-[15px]">
                        {article.summary}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1A1A1A]/35">
                        <span>{article.source}</span>
                        <span className="h-px w-8 bg-[#1A1A1A]/15" aria-hidden />
                        <time dateTime={article.date}>
                          {new Date(article.date).toLocaleDateString('en-LK', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
