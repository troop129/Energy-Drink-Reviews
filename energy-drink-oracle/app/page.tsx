import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import Image from 'next/image';
import { Review } from '@/lib/types';
import StarburstBadge from '@/components/StarburstBadge';

function getRatingColor(rating: number) {
  if (rating >= 9) return '#00fbfb';
  if (rating >= 8) return '#eaea00';
  if (rating >= 7) return '#eaea00';
  if (rating >= 6) return '#ffd7f5';
  return '#ba1a1a';
}

function getRatingTextColor(rating: number) {
  if (rating >= 6) return '#1b1b1b';
  return '#ffffff';
}

function getBrandColor(brand: string) {
  const colors: Record<string, string> = {
    'Red Bull': '#00fbfb',
    'Monster': '#00a651',
    'Ghost': '#a900a9',
    'Alani Nu': '#fe00fe',
    'Celsius': '#ff6600',
    'Bloom': '#ff69b4',
    'Bucked Up': '#eaea00',
    'Rockstar': '#ffd700',
    'Liquid Death': '#303030',
    'Yerba Madre': '#2d6a4f',
  };
  return colors[brand] || '#e2e2e2';
}

export default async function HomePage() {
  const reviewsPath = path.join(process.cwd(), 'public', 'data', 'reviews.json');
  const reviews: Review[] = JSON.parse(await fs.readFile(reviewsPath, 'utf-8'));

  const topDrinks = [...reviews].sort((a, b) => b.rating - a.rating).slice(0, 10);

  // Brand stats
  const brandMap: Record<string, number[]> = {};
  reviews.forEach(r => {
    if (!brandMap[r.brand]) brandMap[r.brand] = [];
    brandMap[r.brand].push(r.rating);
  });
  const brandStats = Object.entries(brandMap)
    .map(([brand, ratings]) => ({
      brand,
      avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      count: ratings.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const avgRating = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="relative">
      {/* ===== HERO ===== */}
      <section className="relative z-10 container mx-auto px-6 py-20 md:py-28 flex flex-col items-center justify-center text-center">
        <div className="bg-[#00fbfb] comic-border comic-shadow-lg p-8 md:p-14 -rotate-1 relative max-w-3xl w-full">
          {/* Starburst */}
          <div className="absolute -top-8 -right-8 z-10">
            <StarburstBadge value="38" subLabel="DRINKS!" size="lg" rotation={15} />
          </div>
          <div className="absolute -bottom-6 -left-6 z-10">
            <StarburstBadge value={`${avgRating}/10`} subLabel="AVG" color="#fe00fe" textColor="#fff" size="md" rotation={-12} />
          </div>

          <h1 className="font-bangers text-5xl md:text-7xl text-[#1b1b1b] -rotate-2 mb-4 tracking-wider leading-tight">
            Abid&apos;s Energy Drink Reviews
          </h1>
          <p className="font-vietnam text-lg md:text-xl text-[#3a4a49] max-w-xl mx-auto mb-8 bg-white p-4 comic-border comic-shadow-sm">
            38 energy drinks. All tried, all rated, all brutally honest.
            Now with a <strong>machine learning model</strong> that predicts what I&apos;d think before I even crack one open.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/database"
              className="font-bangers text-2xl px-8 py-4 bg-[#a900a9] text-white comic-border comic-btn inline-flex items-center gap-2 tracking-wider"
            >
              ⚡ BROWSE ALL REVIEWS
            </Link>
            <Link
              href="/oracle"
              className="font-bangers text-2xl px-8 py-4 bg-[#eaea00] text-black comic-border comic-btn inline-flex items-center gap-2 tracking-wider"
            >
              🔮 CONSULT THE ORACLE
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SHOWCASE CAROUSEL ===== */}
      <section className="relative z-10 py-16 overflow-hidden">
        <div className="container mx-auto px-6">
          <h2 className="font-bangers text-4xl md:text-5xl mb-10 text-center -rotate-1 tracking-wider">
            <span className="bg-[#e8e8e8] px-4 py-2 comic-border comic-shadow inline-block">
              THE SHOWCASE OF CHAMPIONS
            </span>
          </h2>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-12 snap-x snap-mandatory hide-scrollbar px-8">
          {topDrinks.map((drink) => (
            <Link
              key={drink.id}
              href={`/database?highlight=${drink.id}`}
              className="snap-center shrink-0 w-64 md:w-72 relative group flex flex-col"
            >
              {/* Speech bubble — appears on hover */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-56 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 z-20 pointer-events-none"
                style={{ bottom: 'calc(100% - 8px)', top: 'auto' }}>
                <div className="speech-bubble p-3 text-center">
                  <p className="font-vietnam text-sm font-bold text-black line-clamp-3">
                    &ldquo;{drink.review_text}&rdquo;
                  </p>
                </div>
              </div>

              {/* Card */}
              <div className="h-80 w-full comic-border comic-shadow relative overflow-hidden flex items-center justify-center mb-3 group-hover:-translate-y-3 transition-transform duration-300 bg-[#e2e2e2]">
                <Image
                  src={`/images/reviews/${drink.image_filename}`}
                  alt={drink.official_name}
                  fill
                  className="object-cover"
                  sizes="288px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <h3 className="absolute bottom-3 left-3 right-3 font-bangers text-2xl text-white -rotate-2 leading-tight drop-shadow-lg">
                  {drink.official_name}
                </h3>
                {/* Rating badge */}
                <div className="absolute top-3 right-3">
                  <StarburstBadge
                    value={drink.rating.toFixed(1)}
                    color={getRatingColor(drink.rating)}
                    textColor={getRatingTextColor(drink.rating)}
                    size="sm"
                    rotation={10}
                  />
                </div>
              </div>

              {/* Brand tag */}
              <div className="font-bangers text-sm tracking-widest px-3 py-1 comic-border inline-block self-start"
                style={{ background: getBrandColor(drink.brand) }}>
                {drink.brand}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== BRAND BREAKDOWN STRIP ===== */}
      <section className="relative z-10 container mx-auto px-6 py-12">
        <h2 className="font-bangers text-3xl md:text-4xl mb-8 -rotate-1 tracking-wider inline-block bg-[#fe00fe] text-white px-4 py-2 comic-border comic-shadow">
          BRAND POWER RANKINGS
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {brandStats.map(({ brand, avg, count }) => (
            <div key={brand}
              className="halftone-bg comic-border comic-shadow p-4 flex flex-col items-center text-center relative group hover:-translate-y-1 hover:translate-x-1 transition-transform">
              <div className="font-bangers text-lg tracking-wider mb-2 leading-tight">{brand}</div>
              <div className="font-bangers text-3xl text-[#006a6a] mb-1">{avg.toFixed(1)}</div>
              <div className="font-vietnam text-xs text-[#6a7a7a]">{count} drink{count !== 1 ? 's' : ''}</div>
              {avg >= 8 && (
                <div className="absolute -top-3 -right-3 w-8 h-8 starburst bg-[#eaea00] comic-border flex items-center justify-center">
                  <span className="font-bangers text-xs">★</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA STRIP ===== */}
      <section className="relative z-10 bg-[#1b1b1b] py-14 px-6 mt-8">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-bangers text-4xl md:text-5xl text-[#eaea00] tracking-wider mb-2">
              WOULD ABID LIKE IT?
            </h2>
            <p className="font-vietnam text-[#b9cac9] text-lg">
              Pick any drink profile — tried or untried. The Ridge Regression model will predict the rating.
            </p>
          </div>
          <Link
            href="/oracle"
            className="font-bangers text-2xl px-10 py-5 bg-[#fe00fe] text-white comic-border comic-btn whitespace-nowrap tracking-wider flex-shrink-0"
          >
            PREDICT NOW →
          </Link>
        </div>
      </section>
    </div>
  );
}
