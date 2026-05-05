'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Review } from '@/lib/types';
import StarburstBadge from '@/components/StarburstBadge';

// Color maps
const BRAND_COLORS: Record<string, string> = {
  'Red Bull': '#00fbfb', 'Monster': '#b5ead7', 'Ghost': '#ffd7f5',
  'Alani Nu': '#fe00fe', 'Celsius': '#ffb347', 'Bloom': '#ffb6c1',
  'Bucked Up': '#eaea00', 'Rockstar': '#ffd700', 'Liquid Death': '#adb5bd',
  'Yerba Madre': '#b7e4c7',
};

function getRatingColor(r: number) {
  if (r >= 9) return '#00fbfb';
  if (r >= 8) return '#eaea00';
  if (r >= 6) return '#ffd7f5';
  if (r >= 5) return '#e2e2e2';
  return '#ba1a1a';
}
function getRatingTextColor(r: number) { return r < 5 ? '#ffffff' : '#1b1b1b'; }

interface Props { reviews: Review[]; }

const FLAVOR_CATEGORIES = ['All', 'Fruit', 'Berry', 'Tropical', 'Citrus', 'Candy', 'Dessert', 'Tea', 'Grape', 'Watermelon', 'Other'];
const SORT_OPTIONS = [
  { value: 'rating-desc', label: 'Rating ↓' },
  { value: 'rating-asc', label: 'Rating ↑' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'brand-asc', label: 'Brand' },
];

export default function DatabaseClient({ reviews }: Props) {
  const [search, setSearch] = useState('');
  const [sugarFreeOnly, setSugarFreeOnly] = useState(false);
  const [highCaffOnly, setHighCaffOnly] = useState(false);
  const [flavorFilter, setFlavorFilter] = useState('All');
  const [sort, setSort] = useState('rating-desc');
  const [selectedDrink, setSelectedDrink] = useState<Review | null>(null);

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.official_name.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.review_text?.toLowerCase().includes(q)
      );
    }
    if (sugarFreeOnly) list = list.filter(r => r.sugar_free);
    if (highCaffOnly) list = list.filter(r => r.caffeine_amount_mg >= 150);
    if (flavorFilter !== 'All') {
      list = list.filter(r =>
        r.primary_flavor_category?.toLowerCase().includes(flavorFilter.toLowerCase()) ||
        r.secondary_flavor_category?.toLowerCase().includes(flavorFilter.toLowerCase())
      );
    }
    list.sort((a, b) => {
      if (sort === 'rating-desc') return b.rating - a.rating;
      if (sort === 'rating-asc') return a.rating - b.rating;
      if (sort === 'name-asc') return a.official_name.localeCompare(b.official_name);
      if (sort === 'brand-asc') return a.brand.localeCompare(b.brand);
      return 0;
    });
    return list;
  }, [reviews, search, sugarFreeOnly, highCaffOnly, flavorFilter, sort]);

  return (
    <>
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 border-b-8 border-black pb-6">
        <div>
          <h1 className="font-bangers text-6xl md:text-7xl -rotate-2 inline-block bg-[#eaea00] px-4 py-2 comic-border comic-shadow mb-4 tracking-wider">
            DATABASE EXPLORER
          </h1>
          <p className="font-vietnam text-lg bg-white px-4 py-2 comic-border inline-block max-w-xl">
            Scanning the multiverse for volatile energy concoctions! <strong>{filtered.length}</strong> drinks found.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="SEARCH DATABASE..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full comic-border border-4 border-black px-4 py-3 font-bangers text-lg tracking-wider bg-white focus:outline-none focus:border-[#006a6a]"
          />
          <span className="absolute right-3 top-3 text-xl">🔍</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-3 items-center">
        <span className="font-bangers text-2xl text-[#a900a9] tracking-wide">FILTERS:</span>

        <button
          onClick={() => setSugarFreeOnly(v => !v)}
          className={`font-bangers text-lg px-4 py-2 comic-border comic-btn tracking-wider -rotate-1 ${sugarFreeOnly ? 'bg-[#00fbfb] text-black shadow-[4px_4px_0_0_#1b1b1b] translate-x-1 translate-y-1' : 'bg-[#00fbfb] text-black'}`}
        >
          {sugarFreeOnly ? '✓' : ''} ZAP! SUGAR-FREE
        </button>

        <button
          onClick={() => setHighCaffOnly(v => !v)}
          className={`font-bangers text-lg px-4 py-2 comic-border comic-btn tracking-wider rotate-1 ${highCaffOnly ? 'bg-[#fe00fe] text-white shadow-[4px_4px_0_0_#1b1b1b] translate-x-1 translate-y-1' : 'bg-[#fe00fe] text-white'}`}
        >
          {highCaffOnly ? '✓' : ''} POW! HIGH CAFFEINE (150mg+)
        </button>

        <select
          value={flavorFilter}
          onChange={e => setFlavorFilter(e.target.value)}
          className="font-bangers text-lg px-4 py-2 comic-border bg-[#eaea00] border-4 border-black tracking-wider -rotate-1 focus:outline-none cursor-pointer"
        >
          {FLAVOR_CATEGORIES.map(c => <option key={c} value={c}>BOOM! {c.toUpperCase()}</option>)}
        </select>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="font-bangers text-lg px-4 py-2 comic-border bg-white border-4 border-black tracking-wider focus:outline-none cursor-pointer ml-auto"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {filtered.map((drink) => (
          <div
            key={drink.id}
            className="break-inside-avoid halftone-bg comic-border comic-shadow relative group cursor-pointer hover:-translate-y-1 hover:translate-x-1 transition-transform"
            onClick={() => setSelectedDrink(drink)}
          >
            {/* Rating starburst */}
            <div className="absolute -top-4 -right-4 z-10">
              <StarburstBadge
                value={drink.rating.toFixed(1)}
                color={getRatingColor(drink.rating)}
                textColor={getRatingTextColor(drink.rating)}
                size="sm"
                rotation={drink.id % 2 === 0 ? 12 : -10}
              />
            </div>

            {/* Image */}
            <div className="relative w-full h-56 overflow-hidden comic-border m-0 grayscale group-hover:grayscale-0 transition-all duration-500">
              <Image
                src={`/images/reviews/${drink.image_filename}`}
                alt={drink.official_name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            <div className="p-4">
              {/* Name banner */}
              <h2
                className="font-bangers text-2xl -rotate-1 text-white px-3 py-1 inline-block mb-3 comic-border"
                style={{ background: BRAND_COLORS[drink.brand] || '#1b1b1b', color: BRAND_COLORS[drink.brand] ? '#1b1b1b' : '#fff' }}
              >
                {drink.official_name}
              </h2>

              {/* Speech bubble review */}
              <div className="speech-bubble p-3 mb-4">
                <p className="font-vietnam text-sm font-bold text-black line-clamp-3">
                  &ldquo;{drink.review_text}&rdquo;
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-2 py-1 bg-[#e8e8e8] comic-border font-bangers text-xs tracking-wider">
                  {drink.primary_flavor_category?.toUpperCase()}
                </span>
                {drink.sugar_free && (
                  <span className="px-2 py-1 bg-[#00fbfb] comic-border font-bangers text-xs tracking-wider">
                    SUGAR-FREE
                  </span>
                )}
                {drink.caffeine_amount_mg > 0 && (
                  <span className="px-2 py-1 bg-[#ffd7f5] comic-border font-bangers text-xs tracking-wider">
                    {drink.caffeine_amount_mg}MG CAFF
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-24">
          <div className="font-bangers text-5xl text-[#ba1a1a] mb-4 tracking-wider">NO DRINKS FOUND!</div>
          <p className="font-vietnam text-lg text-[#6a7a7a]">Try adjusting your filters, hero.</p>
        </div>
      )}

      {/* Modal */}
      {selectedDrink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          onClick={() => setSelectedDrink(null)}
        >
          <div
            className="bg-white comic-border comic-shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 slide-up relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDrink(null)}
              className="absolute top-4 right-4 font-bangers text-2xl bg-[#ba1a1a] text-white comic-border w-10 h-10 flex items-center justify-center comic-btn"
            >
              ✕
            </button>

            <div className="relative h-64 mb-6 comic-border overflow-hidden">
              <Image
                src={`/images/reviews/${selectedDrink.image_filename}`}
                alt={selectedDrink.official_name}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex items-start gap-4 mb-4">
              <StarburstBadge value={selectedDrink.rating.toFixed(1)} color={getRatingColor(selectedDrink.rating)} textColor={getRatingTextColor(selectedDrink.rating)} size="lg" />
              <div>
                <h2 className="font-bangers text-4xl tracking-wider leading-tight">{selectedDrink.official_name}</h2>
                <div className="font-bangers text-xl tracking-wider" style={{ color: '#006a6a' }}>{selectedDrink.brand}</div>
              </div>
            </div>

            <div className="speech-bubble p-4 mb-6">
              <p className="font-vietnam font-bold">&ldquo;{selectedDrink.review_text}&rdquo;</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Sweetness', val: selectedDrink.sweetness_level, max: 5 },
                { label: 'Tartness', val: selectedDrink.tartness_level, max: 5 },
                { label: 'Carbonation', val: selectedDrink.carbonation_level, max: 5 },
                { label: 'Smoothness', val: selectedDrink.smoothness, max: 5 },
                { label: 'Refreshing', val: selectedDrink.refreshing_score, max: 5 },
                { label: 'Artificial Taste', val: selectedDrink.artificial_sweetener_taste, max: 5 },
              ].map(({ label, val, max }) => (
                <div key={label} className="bg-[#f3f3f3] comic-border p-3">
                  <div className="font-bangers text-sm tracking-wider text-[#6a7a7a] mb-1">{label.toUpperCase()}</div>
                  <div className="flex gap-1">
                    {Array.from({ length: max }, (_, i) => (
                      <div key={i} className={`h-4 flex-1 comic-border ${i < val ? 'bg-[#006a6a]' : 'bg-[#e2e2e2]'}`} />
                    ))}
                  </div>
                  <div className="font-bangers text-lg mt-1">{val}/{max}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm font-vietnam">
              <div className="bg-[#f3f3f3] comic-border p-2">
                <strong>Official Flavor Notes:</strong><br />{selectedDrink.official_flavor_notes || '—'}
              </div>
              <div className="bg-[#f3f3f3] comic-border p-2">
                <strong>Caffeine:</strong> {selectedDrink.caffeine_amount_mg || '?'}mg<br />
                <strong>Sugar Free:</strong> {selectedDrink.sugar_free ? 'Yes ✓' : 'No'}
              </div>
              <div className="bg-[#f3f3f3] comic-border p-2 col-span-2">
                <strong>Your Taste Notes:</strong><br />{selectedDrink.user_taste_profile || '—'}
              </div>
              {selectedDrink.functional_ingredients && selectedDrink.functional_ingredients !== 'None' && (
                <div className="bg-[#ffd7f5] comic-border p-2 col-span-2">
                  <strong>Functional Ingredients:</strong><br />{selectedDrink.functional_ingredients}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
