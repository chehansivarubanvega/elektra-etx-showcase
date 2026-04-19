'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {PressArticle} from '@/lib/press/articles';

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280' viewBox='0 0 280 280'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E")`;

type PressIndexProps = {
  articles: PressArticle[];
};

function PressWord({variant}: {variant: 'solid' | 'outline' | 'ghost'}) {
  if (variant === 'ghost') {
    return <span className="text-[#1A1A1A]/[0.14]">Press</span>;
  }
  if (variant === 'outline') {
    return (
      <span
        className="text-transparent"
        style={{
          WebkitTextStroke: '1.25px rgba(26, 26, 26, 0.38)',
        }}
      >
        Press
      </span>
    );
  }
  return <span className="text-[#1A1A1A]">Press</span>;
}

function PressHeroMegatype() {
  const slash = <span className="mx-[0.08em] shrink-0 text-[#1A1A1A]/18 md:mx-[0.1em]">/</span>;

  const row1: Array<'solid' | 'outline' | 'ghost' | 'slash'> = [
    'solid',
    'slash',
    'outline',
    'slash',
    'ghost',
    'slash',
    'solid',
    'slash',
    'outline',
  ];
  const row2: Array<'solid' | 'outline' | 'ghost' | 'slash'> = [
    'ghost',
    'slash',
    'solid',
    'slash',
    'outline',
    'slash',
    'ghost',
  ];

  const renderRow = (spec: Array<'solid' | 'outline' | 'ghost' | 'slash'>, keyPrefix: string) => (
    <div className="flex flex-nowrap items-baseline justify-center whitespace-nowrap">
      {spec.map((token, i) =>
        token === 'slash' ? (
          <React.Fragment key={`${keyPrefix}-s-${i}`}>{slash}</React.Fragment>
        ) : (
          <PressWord key={`${keyPrefix}-w-${i}`} variant={token} />
        ),
      )}
    </div>
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-start gap-1 overflow-hidden pt-[min(2vh,16px)] md:gap-2 md:pt-[min(3vh,22px)]"
    >
      <div
        className="-translate-x-[4%] text-[clamp(2.75rem,14.5vw,11.5rem)] font-black uppercase leading-[0.78] tracking-[-0.045em] [font-family:var(--font-press-display),ui-sans-serif] md:-translate-x-[2%]"
        style={{width: 'max(120%, 110vw)'}}
      >
        {renderRow(row1, 'r1')}
      </div>
      <div
        className="translate-x-[6%] text-[clamp(2.5rem,12vw,9.5rem)] font-black uppercase leading-[0.78] tracking-[-0.045em] [font-family:var(--font-press-display),ui-sans-serif] md:translate-x-[4%]"
        style={{width: 'max(120%, 110vw)'}}
      >
        {renderRow(row2, 'r2')}
      </div>
    </div>
  );
}

export function PressIndex({articles}: PressIndexProps) {
  const total = String(articles.length).padStart(2, '0');

  return (
    <main className="bg-[#FEFEFE] text-[#1A1A1A]">
      <section className="relative overflow-hidden bg-[#FEFEFE] pb-14 pt-2 md:pb-20 md:pt-4">
        <div className="relative mx-auto min-h-[min(82vh,880px)] max-w-[1800px] px-4 md:min-h-[min(85vh,940px)] md:px-8">
          <PressHeroMegatype />

          <div className="relative z-10 flex min-h-[min(74vh,800px)] flex-col items-center justify-start pt-[min(7vh,52px)] md:min-h-[min(78vh,840px)] md:pt-[min(9vh,68px)]">
            {/* Pull sketch up into megatype so lines + type share one plane (multiply shows type through “paper”) */}
            <div className="relative isolate z-10 w-full max-w-[min(94vw,960px)] -mt-[min(11vh,92px)] px-1 md:-mt-[min(15vh,128px)] md:max-w-[min(90vw,1000px)] md:px-2">
              {/* Soft bloom — anchored to overlap band between type and drawing */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[42%] z-[1] aspect-[6/5] w-[min(125%,1080px)] max-w-none -translate-x-1/2 -translate-y-1/2 md:top-[44%]"
                style={{
                  background:
                    'radial-gradient(ellipse 72% 64% at 50% 42%, rgba(252,252,252,0.94) 0%, rgba(254,254,254,0.45) 48%, rgba(254,254,254,0) 76%)',
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[48%] z-[1] h-[min(100vw,920px)] w-[min(145vw,1500px)] -translate-x-1/2 -translate-y-1/2 opacity-70 md:top-[50%]"
                style={{
                  background:
                    'radial-gradient(ellipse 58% 52% at 50% 44%, rgba(254,254,254,0.28) 0%, rgba(254,254,254,0) 68%)',
                }}
              />

              <div
                className="relative z-[2]"
                style={{
                  WebkitMaskImage:
                    'radial-gradient(ellipse 108% 100% at 50% 42%, rgba(0,0,0,0.92) 0%, #000 28%, #000 62%, rgba(0,0,0,0.5) 78%, transparent 100%)',
                  maskImage:
                    'radial-gradient(ellipse 108% 100% at 50% 42%, rgba(0,0,0,0.92) 0%, #000 28%, #000 62%, rgba(0,0,0,0.5) 78%, transparent 100%)',
                }}
              >
                <Image
                  src="/images/press_hero.png"
                  alt="Technical line drawing of the ETX dashboard and cockpit"
                  width={1200}
                  height={900}
                  priority
                  className="relative mx-auto h-auto w-full object-contain [mix-blend-mode:multiply]"
                  style={{
                    opacity: 0.88,
                    filter:
                      'brightness(1.06) contrast(0.96) grayscale(1) drop-shadow(0 -12px 48px rgba(254,254,254,0.55)) drop-shadow(0 4px 36px rgba(254,254,254,0.75)) drop-shadow(0 28px 64px rgba(26,26,26,0.04))',
                  }}
                  sizes="(min-width: 1024px) 1000px, 94vw"
                />
              </div>

              {/* Light edge feather only — keeps corners soft without washing the overlap with type */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[-6%] z-[3] mix-blend-normal"
                style={{
                  background:
                    'radial-gradient(ellipse 92% 88% at 50% 48%, transparent 42%, rgba(254,254,254,0.22) 74%, rgba(254,254,254,0.55) 90%, #FEFEFE 100%)',
                }}
              />
            </div>

            <div className="relative z-20 mx-auto mt-6 max-w-lg px-2 text-center md:mt-8 md:max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-[#FF5722]">Press Hub</p>
              <p className="mt-4 text-[13px] leading-relaxed text-[#1A1A1A]/55 md:text-[15px] md:leading-relaxed">
                Awards, alliances, and the engineering stories behind Colombo&apos;s electric three-wheeler.
              </p>
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
