'use client';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Review, ModelWeights, UntriedDrink, PredictorInputs } from '@/lib/types';
import { predict, findSimilar, getVerdict } from '@/lib/predictor';
import StarburstBadge from '@/components/StarburstBadge';

interface Props {
  reviews: Review[];
  weights: ModelWeights;
  untriedDrinks: UntriedDrink[];
}

const SLIDER_FIELDS: { key: keyof PredictorInputs; label: string }[] = [
  { key: 'sweetness_level',           label: 'SWEETNESS' },
  { key: 'tartness_level',            label: 'TARTNESS' },
  { key: 'carbonation_level',         label: 'CARBONATION' },
  { key: 'artificial_sweetener_taste',label: 'ARTIFICIAL TASTE' },
  { key: 'smoothness',                label: 'SMOOTHNESS' },
  { key: 'refreshing_score',          label: 'REFRESHING' },
];

const DEFAULT_INPUTS: PredictorInputs = {
  sweetness_level: 3,
  tartness_level: 2,
  carbonation_level: 3,
  artificial_sweetener_taste: 2,
  smoothness: 3,
  refreshing_score: 3,
  sugar_free: true,
  primary_flavor_category: 'Fruit',
  brand: 'Red Bull',
};

export default function OracleClient({ reviews, weights, untriedDrinks }: Props) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedUntriedId, setSelectedUntriedId] = useState('');
  const [inputs, setInputs] = useState<PredictorInputs>(DEFAULT_INPUTS);
  const [result, setResult] = useState<{ rating: number; similar: Review[] } | null>(null);
  const [predicting, setPredicting] = useState(false);

  const handleUntriedSelect = (id: string) => {
    setSelectedUntriedId(id);
    setResult(null);
    if (!id) return;
    const drink = untriedDrinks.find(d => d.id === id);
    if (!drink) return;
    setInputs({
      sweetness_level: drink.sweetness_level,
      tartness_level: drink.tartness_level,
      carbonation_level: drink.carbonation_level,
      artificial_sweetener_taste: drink.artificial_sweetener_taste,
      smoothness: drink.smoothness,
      refreshing_score: drink.refreshing_score,
      sugar_free: drink.sugar_free,
      primary_flavor_category: drink.primary_flavor_category,
      brand: drink.brand,
    });
  };

  const handlePredict = useCallback(() => {
    setPredicting(true);
    setResult(null);
    setTimeout(() => {
      const rating = predict(inputs, weights);
      const similar = findSimilar(inputs, reviews, 3);
      setResult({ rating, similar });
      setPredicting(false);
    }, 600); // brief delay for dramatic effect
  }, [inputs, weights, reviews]);

  const verdict = result ? getVerdict(result.rating) : null;

  return (
    <>
      {/* Header */}
      <div className="text-center mb-12">
        <h1
          className="font-bangers text-7xl md:text-8xl tracking-wider -rotate-2 inline-block mb-4"
          style={{ color: '#fe00fe', WebkitTextStroke: '3px #1b1b1b', textShadow: '8px 8px 0px #1b1b1b' }}
        >
          THE ORACLE
        </h1>
        <div className="bg-[#00fbfb] comic-border comic-shadow p-4 max-w-xl mx-auto">
          <p className="font-vietnam text-lg font-bold text-black">
            Pick a drink you haven&apos;t tried — or dial in the taste profile manually.
            The Oracle will predict whether <strong className="text-[#006a6a]">Abid would love it</strong> or{' '}
            <strong className="text-[#ba1a1a]">leave it on the shelf</strong>.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ===== LEFT: INPUTS ===== */}
        <div className="bg-white comic-border comic-shadow p-6 flex flex-col gap-6">

          {/* Tabs */}
          <div className="flex gap-3">
            <button
              onClick={() => { setActiveTab('catalog'); setResult(null); }}
              className={`font-bangers text-xl px-4 py-2 comic-border flex-1 tracking-wider transition-all ${
                activeTab === 'catalog' ? 'bg-[#eaea00] text-black translate-x-1 translate-y-1 shadow-[4px_4px_0_0_#1b1b1b]' : 'bg-[#e2e2e2] comic-btn'
              }`}
            >
              UN-TRIED BREWS
            </button>
            <button
              onClick={() => { setActiveTab('custom'); setResult(null); }}
              className={`font-bangers text-xl px-4 py-2 comic-border flex-1 tracking-wider transition-all ${
                activeTab === 'custom' ? 'bg-[#fe00fe] text-white translate-x-1 translate-y-1 shadow-[4px_4px_0_0_#1b1b1b]' : 'bg-[#e2e2e2] comic-btn'
              }`}
            >
              CUSTOM BUILD
            </button>
          </div>

          {/* CATALOG TAB */}
          {activeTab === 'catalog' && (
            <div className="flex flex-col gap-4">
              <label className="font-bangers text-2xl tracking-wider text-[#1b1b1b]">SELECT UNKNOWN BREW</label>
              <select
                value={selectedUntriedId}
                onChange={e => handleUntriedSelect(e.target.value)}
                className="comic-border border-4 border-black bg-[#f9f9f9] px-4 py-3 font-vietnam text-base focus:outline-none focus:border-[#006a6a] cursor-pointer"
              >
                <option value="">Choose a mystery flavor...</option>
                {untriedDrinks.map(d => (
                  <option key={d.id} value={d.id}>{d.brand} — {d.name}</option>
                ))}
              </select>
              {selectedUntriedId && (() => {
                const d = untriedDrinks.find(u => u.id === selectedUntriedId);
                if (!d) return null;
                return (
                  <div className="bg-[#f3f3f3] comic-border p-4 text-sm font-vietnam">
                    <div className="font-bangers text-lg tracking-wider mb-2">{d.name}</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span>Caffeine: <strong>{d.caffeine_amount_mg}mg</strong></span>
                      <span>Sugar-free: <strong>{d.sugar_free ? 'Yes' : 'No'}</strong></span>
                      <span>Flavor: <strong>{d.official_flavor_notes}</strong></span>
                      <span>Category: <strong>{d.primary_flavor_category}</strong></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* CUSTOM TAB */}
          {activeTab === 'custom' && (
            <div className="flex flex-col gap-4">
              {/* Brand + Flavor selects */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bangers text-lg tracking-wider block mb-1">BRAND</label>
                  <select
                    value={inputs.brand}
                    onChange={e => setInputs(v => ({ ...v, brand: e.target.value }))}
                    className="w-full comic-border border-4 border-black bg-white px-3 py-2 font-vietnam text-sm focus:outline-none cursor-pointer"
                  >
                    {weights.brands.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="Unknown">Other / Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="font-bangers text-lg tracking-wider block mb-1">FLAVOR TYPE</label>
                  <select
                    value={inputs.primary_flavor_category}
                    onChange={e => setInputs(v => ({ ...v, primary_flavor_category: e.target.value }))}
                    className="w-full comic-border border-4 border-black bg-white px-3 py-2 font-vietnam text-sm focus:outline-none cursor-pointer"
                  >
                    {weights.flavor_categories.map(f => <option key={f} value={f}>{f}</option>)}
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Sugar free toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setInputs(v => ({ ...v, sugar_free: !v.sugar_free }))}
                  className={`font-bangers text-xl px-6 py-2 comic-border comic-btn tracking-wider ${inputs.sugar_free ? 'bg-[#00fbfb] text-black' : 'bg-[#e2e2e2] text-[#6a7a7a]'}`}
                >
                  {inputs.sugar_free ? '✓ SUGAR-FREE' : 'HAS SUGAR'}
                </button>
              </div>

              {/* Sliders */}
              {SLIDER_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bangers text-lg tracking-wider">{label}</label>
                    <span
                      className="font-bangers text-xl px-2 py-0.5 comic-border"
                      style={{ background: '#eaea00', minWidth: 32, textAlign: 'center' }}
                    >
                      {inputs[key as keyof typeof inputs] as number}
                    </span>
                  </div>
                  <input
                    type="range" min={1} max={5} step={1}
                    value={inputs[key as keyof typeof inputs] as number}
                    onChange={e => setInputs(v => ({ ...v, [key]: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between font-bangers text-xs text-[#6a7a7a]">
                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PREDICT BUTTON */}
          <button
            onClick={handlePredict}
            disabled={activeTab === 'catalog' && !selectedUntriedId}
            className="w-full font-bangers text-3xl py-5 bg-[#fe00fe] text-white comic-border comic-btn tracking-wider disabled:opacity-40 disabled:cursor-not-allowed -rotate-1"
          >
            {predicting ? 'CONSULTING...' : 'PREDICT!'}
          </button>
        </div>

        {/* ===== RIGHT: RESULTS ===== */}
        <div className="bg-[#f3f3f3] comic-border comic-shadow p-6 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">

          {/* Halftone dots decoration */}
          <div className="absolute inset-0 halftone-bg-yellow opacity-30 pointer-events-none" />

          {/* Default state */}
          {!result && !predicting && (
            <div className="text-center relative z-10">
              <div className="text-8xl mb-6 drop-shadow-[0_0_15px_rgba(254,0,254,0.5)]">🔮</div>
              <p className="font-bangers text-2xl text-[#6a7a7a] tracking-wider uppercase">Awaiting input data...</p>
              <p className="font-vietnam text-sm text-[#6a7a7a] mt-2">Configure your drink profile and hit PREDICT!</p>
            </div>
          )}

          {/* Loading */}
          {predicting && (
            <div className="text-center relative z-10">
              <div className="font-bangers text-4xl text-[#a900a9] tracking-wider animate-pulse">CONSULTING THE ORACLE...</div>
            </div>
          )}

          {/* Results */}
          {result && verdict && (
            <div className="text-center relative z-10 w-full bam-animate">
              {/* Big score display — clean card, no clipping starburst */}
              <div
                className="comic-border inline-flex flex-col items-center justify-center px-10 py-6 mb-4 -rotate-2"
                style={{
                  background: verdict.bg,
                  color: verdict.color,
                  boxShadow: '10px 10px 0px 0px #1b1b1b',
                  minWidth: 200,
                }}
              >
                <span className="font-bangers text-2xl tracking-widest leading-none opacity-80">
                  {verdict.exclaim}
                </span>
                <span className="font-bangers leading-none" style={{ fontSize: '4.5rem', lineHeight: 1 }}>
                  {result.rating.toFixed(1)}
                </span>
                <span className="font-bangers text-lg tracking-widest leading-none">
                  OUT OF 10
                </span>
              </div>

              <div
                className="font-bangers text-3xl tracking-wider comic-border px-4 py-2 inline-block mb-4 block"
                style={{ background: verdict.bg, color: verdict.color }}
              >
                {verdict.label} — {result.rating >= 7 ? 'Abid would drink this.' : result.rating >= 5 ? 'Maybe on a slow day.' : 'Hard pass.'}
              </div>

              {/* Similar drinks */}
              {result.similar.length > 0 && (
                <div className="mt-6 text-left">
                  <div className="font-bangers text-xl tracking-wider mb-3 text-[#1b1b1b]">CLOSEST TO DRINKS ABID HAS TRIED:</div>
                  <div className="flex flex-col gap-3">
                    {result.similar.map(s => (
                      <div key={s.id} className="bg-white comic-border comic-shadow-sm p-3 flex items-center gap-3">
                        <div className="relative w-12 h-12 shrink-0 comic-border overflow-hidden">
                          <Image src={`/images/reviews/${s.image_filename}`} alt={s.official_name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bangers text-base tracking-wider leading-tight truncate">{s.official_name}</div>
                          <div className="font-vietnam text-xs text-[#6a7a7a]">{s.brand} • Rated {s.rating}/10</div>
                        </div>
                        {/* Plain pill badge — no clip-path clipping */}
                        <div
                          className="font-bangers text-sm px-3 py-1 comic-border shrink-0"
                          style={{
                            background: s.rating >= 8 ? '#eaea00' : s.rating >= 6 ? '#ffd7f5' : '#ba1a1a',
                            color: s.rating < 5 ? '#fff' : '#1b1b1b',
                            boxShadow: '3px 3px 0 #1b1b1b',
                          }}
                        >
                          {s.rating.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
