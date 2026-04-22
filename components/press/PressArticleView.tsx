import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {formatArticleDateLong, type PressArticle} from '@/lib/press/articles';
import {MagneticBackLink} from './MagneticBackLink';

type PressArticleViewProps = {
  article: PressArticle;
  nextArticles: PressArticle[];
};

function interleaveBody(article: PressArticle): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const {paragraphs, sketches} = article;
  const sketchAfter = [1, 3];
  let sketchI = 0;

  paragraphs.forEach((text, i) => {
    nodes.push(
      <p
        key={`p-${i}`}
        className="text-[17px] leading-[1.75] text-[#1A1A1A]/80 md:text-[18px]"
      >
        {text}
      </p>,
    );
    if (sketchAfter.includes(i) && sketches[sketchI]) {
      const sk = sketches[sketchI];
      sketchI += 1;
      nodes.push(
        <figure
          key={`sk-${i}-${sk.src}`}
          className="relative left-1/2 my-20 w-screen max-w-[min(100vw,1240px)] -translate-x-1/2"
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#1A1A1A]/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
            <Image
              src={sk.src}
              alt={sk.alt}
              fill
              className="object-cover grayscale contrast-[1.08]"
              sizes="(min-width: 1280px) 1240px, 100vw"
            />
            <div
              className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.14]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
          <figcaption className="mt-4 px-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#1A1A1A]/45">
            {sk.caption}
          </figcaption>
        </figure>,
      );
    }
  });

  return nodes;
}

/**
 * **Server Component** — article copy, media, and “Continue reading” are in the
 * initial HTML. Only `MagneticBackLink` is a small client island.
 */
export function PressArticleView({article, nextArticles}: PressArticleViewProps) {
  const dateLabel = formatArticleDateLong(article.date);

  return (
    <article className="bg-[#FEFEFE] pb-24 pt-8 md:pb-32 md:pt-10">
      <div className="mx-auto max-w-3xl px-5 md:px-6">
        <MagneticBackLink />

        <header className="mt-14 border-b border-[#1A1A1A]/[0.06] pb-14">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.32em] text-[#FF5722]">
            <time dateTime={article.date}>{dateLabel}</time>
            <span className="text-[#1A1A1A]/20" aria-hidden>
              ·
            </span>
            <span>{article.source}</span>
            <span className="text-[#1A1A1A]/20" aria-hidden>
              ·
            </span>
            <span>{article.kicker}</span>
          </div>
          <h1 className="text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold uppercase leading-[0.98] tracking-[-0.03em] [font-family:var(--font-press-display),ui-sans-serif]">
            {article.title}
          </h1>
        </header>

        <div className="mt-14 flex flex-col gap-10">{interleaveBody(article)}</div>
      </div>

      <footer className="mx-auto mt-28 max-w-[1600px] border-t border-[#1A1A1A]/[0.06] px-5 pt-16 md:px-10 md:pt-20">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#1A1A1A]/40">Next</p>
            <h2 className="mt-2 text-2xl font-bold uppercase tracking-[-0.02em] [font-family:var(--font-press-display),ui-sans-serif] md:text-3xl">
              Continue reading
            </h2>
          </div>
          <Link
            href="/press"
            className="hidden text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF5722] transition-opacity hover:opacity-80 md:inline"
          >
            View all
          </Link>
        </div>

        <div className="-mx-5 flex gap-5 overflow-x-auto px-5 pb-4 md:-mx-10 md:gap-6 md:px-10 md:pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nextArticles.map((item) => (
            <Link
              key={item.slug}
              href={`/press/${item.slug}`}
              className="group shrink-0"
              style={{width: 'min(72vw, 320px)'}}
            >
              <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-2xl bg-[#1A1A1A]/[0.05]">
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                  sizes="320px"
                />
              </div>
              <p className="line-clamp-2 text-[13px] font-bold uppercase leading-snug tracking-[-0.01em] [font-family:var(--font-press-display),ui-sans-serif] transition-colors group-hover:text-[#FF5722]">
                {item.title}
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1A1A1A]/35">
                {item.source}
              </p>
            </Link>
          ))}
        </div>
      </footer>
    </article>
  );
}
