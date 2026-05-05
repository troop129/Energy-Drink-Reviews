'use client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ScatterChart, Scatter, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Legend, ResponsiveContainer
} from 'recharts';
import { Review } from '@/lib/types';
import { ReactElement } from 'react';

const BRAND_COLORS = ['#006a6a', '#a900a9', '#626200', '#ba1a1a', '#3a4a49', '#00fbfb', '#626200', '#fe00fe'];
const LIKED_THRESHOLD = 7; // "liked" = rated 7 or above

interface Props { reviews: Review[]; }

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ——— Comic Building Bar Shape ———
// Building height = drinks tried (normalized). Windows = total tried; lit windows = liked.
interface BuildingProps {
  x?: number; y?: number; width?: number; height?: number;
  fill?: string; index?: number;
  liked?: number; total?: number; avgRating?: number;
}

function ComicBuilding(props: BuildingProps): ReactElement {
  const { x = 0, y = 0, width = 0, height = 0, fill = '#006a6a', liked = 0, total = 1 } = props;
  if (height <= 0 || width <= 0) return <g />;

  const border = 2;
  const winCols = 4;
  const winRows = Math.max(1, Math.floor(height / 20));
  const winW = Math.max(4, (width - border * 2 - winCols * 4) / winCols);
  const winH = Math.max(4, (height - 24 - border * 2 - winRows * 4) / winRows);

  const windows: { wx: number; wy: number; lit: boolean; isTried: boolean }[] = [];
  let idx = 0;
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      windows.push({
        wx: x + border + c * (winW + 4) + 2,
        wy: y + border + 8 + r * (winH + 4) + 4,
        lit: idx < liked,
        isTried: idx < total,
      });
      idx++;
    }
  }

  return (
    <g>
      {/* Building body */}
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={fill} />
      {/* Roof line */}
      <rect x={x} y={y} width={width} height={8} fill="#1b1b1b" />
      {/* Outer border */}
      <rect x={x} y={y} width={width} height={height} fill="none" stroke="#1b1b1b" strokeWidth={border} />
      {/* Windows: yellow=liked, dark=tried-not-liked, very-dark=extra-filler */}
      {windows.map((w, i) => (
        <rect
          key={i}
          x={w.wx} y={w.wy}
          width={Math.max(2, winW)} height={Math.max(2, winH)}
          fill={w.lit ? '#eaea00' : '#1b1b1b'}
          opacity={w.lit ? 1 : w.isTried ? 0.22 : 0.05}
          stroke="#1b1b1b" strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

// Custom tooltip for the cityscape
interface CityTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { brand: string; liked: number; total: number; likedPct: number; avgRating: string } }>;
}
function CityTooltip({ active, payload }: CityTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#eaea00', border: '4px solid #1b1b1b',
      borderRadius: '4px 8px 3px 10px', boxShadow: '6px 6px 0 #1b1b1b',
      padding: '10px 14px', fontFamily: 'Bangers', letterSpacing: 1,
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{d.brand}</div>
      <div style={{ fontSize: 15 }}><strong>{d.total}</strong> drinks tried</div>
      <div style={{ fontSize: 15 }}><strong>{d.liked}</strong> liked ({d.likedPct}%)</div>
      <div style={{ fontSize: 13, marginTop: 2 }}>Avg rating: <strong>{d.avgRating} / 10</strong></div>
    </div>
  );
}


export default function StatsClient({ reviews: r }: Props) {
  // ——— Brand breakdown: count, liked, avg
  const brandMap: Record<string, number[]> = {};
  r.forEach(d => { (brandMap[d.brand] = brandMap[d.brand] || []).push(d.rating); });
  const rawBrandData = Object.entries(brandMap).map(([brand, ratings]) => {
    const liked = ratings.filter(v => v >= LIKED_THRESHOLD).length;
    const total = ratings.length;
    return { brand, liked, total, likedPct: Math.round((liked / total) * 100), avgRating: avg(ratings).toFixed(1) };
  });
  const maxTotal = Math.max(...rawBrandData.map(b => b.total));
  const MIN_HEIGHT_PCT = 25; // every brand gets at least 25% chart height
  const brandData = rawBrandData
    .map(b => ({
      ...b,
      // heightVal: normalize total to 0–100 range, floor at MIN_HEIGHT_PCT
      heightVal: Math.round(MIN_HEIGHT_PCT + ((b.total / maxTotal) * (100 - MIN_HEIGHT_PCT))),
    }))
    .sort((a, b) => b.total - a.total);

  // ——— Scatter: refreshing_score vs rating
  const scatterData = r.map(d => ({ x: d.refreshing_score, y: d.rating, name: d.official_name }));

  // ——— Radar taste profile
  const radarKeys = ['sweetness_level', 'tartness_level', 'carbonation_level', 'smoothness', 'refreshing_score', 'artificial_sweetener_taste'];
  const radarLabels: Record<string, string> = {
    sweetness_level: 'Sweetness', tartness_level: 'Tartness', carbonation_level: 'Carb.',
    smoothness: 'Smoothness', refreshing_score: 'Refreshing', artificial_sweetener_taste: 'Artificial'
  };
  const top5 = [...r].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const radarData = radarKeys.map(k => ({
    metric: radarLabels[k],
    all: parseFloat(avg(r.map(d => (d as unknown as Record<string, number>)[k])).toFixed(2)),
    top5: parseFloat(avg(top5.map(d => (d as unknown as Record<string, number>)[k])).toFixed(2)),
  }));

  // ——— Flavor pie
  const flavMap: Record<string, number> = {};
  r.forEach(d => { flavMap[d.primary_flavor_category] = (flavMap[d.primary_flavor_category] || 0) + 1; });
  const flavData = Object.entries(flavMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // ——— Rating distribution histogram
  const bins = [
    { range: '1–3', min: 0, max: 3.9 },
    { range: '4–5', min: 4, max: 5.9 },
    { range: '6–6.9', min: 6, max: 6.9 },
    { range: '7–7.9', min: 7, max: 7.9 },
    { range: '8–8.9', min: 8, max: 8.9 },
    { range: '9–10', min: 9, max: 10 },
  ];
  const histData = bins.map(b => ({
    range: b.range,
    count: r.filter(d => d.rating >= b.min && d.rating <= b.max).length,
  }));

  // ——— Summary stats
  const topDrink = r.reduce((a, b) => a.rating > b.rating ? a : b);
  const worstDrink = r.reduce((a, b) => a.rating < b.rating ? a : b);
  const overallAvg = avg(r.map(d => d.rating));
  const likedCount = r.filter(d => d.rating >= LIKED_THRESHOLD).length;
  const sugarFreeCount = r.filter(d => d.sugar_free).length;
  const highCaffCount = r.filter(d => d.caffeine_amount_mg >= 150).length;

  return (
    <>
      {/* Header */}
      <header className="mb-10 bg-[#00fbfb] comic-border comic-shadow p-8 relative overflow-visible">
        <h1 className="font-bangers text-6xl md:text-7xl text-[#1b1b1b] -rotate-2 inline-block bg-white px-4 py-2 comic-border comic-shadow-sm tracking-wider">
          ABID&apos;S STATS LAB
        </h1>
        <p className="font-vietnam text-lg text-[#3a4a49] mt-4 bg-white p-3 comic-border inline-block">
          Breaking down the data behind every sip. <strong>38 drinks reviewed.</strong>
        </p>
      </header>

      {/* ——— STAT CARDS ——— */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {[
          { label: 'BEST DRINK', val: topDrink.official_name.split(' ').slice(0, 3).join(' '), sub: `${topDrink.rating}/10`, bg: '#00fbfb' },
          { label: 'WORST DRINK', val: worstDrink.official_name.split(' ').slice(0, 3).join(' '), sub: `${worstDrink.rating}/10`, bg: '#ba1a1a', tc: '#fff' },
          { label: 'AVG RATING', val: overallAvg.toFixed(1), sub: 'across all 38', bg: '#eaea00' },
          { label: 'WOULD DRINK AGAIN', val: `${likedCount}`, sub: `rated 7+ (${Math.round(likedCount/r.length*100)}%)`, bg: '#b7e4c7' },
          { label: 'SUGAR-FREE', val: `${sugarFreeCount}`, sub: 'drinks tried', bg: '#ffd7f5' },
          { label: 'HIGH CAFFEINE', val: `${highCaffCount}`, sub: '150mg+ tried', bg: '#fe00fe', tc: '#fff' },
        ].map((s, i) => (
          <div key={i}
            className="comic-border comic-shadow p-4 relative flex flex-col items-center text-center"
            style={{ background: s.bg, color: s.tc || '#1b1b1b' }}>
            <div className="font-bangers text-xs tracking-widest mb-1 opacity-70 leading-tight">{s.label}</div>
            <div className="font-bangers text-2xl leading-tight mb-1">{s.val}</div>
            <div className="font-vietnam text-xs leading-tight">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ——— COMIC CITYSCAPE ——— */}
        <section className="md:col-span-8 bg-[#1b1b1b] comic-border comic-shadow p-6 relative overflow-hidden">
          {/* Night sky halftone bg */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(#ffffff 0.6px, transparent 0.6px)',
            backgroundSize: '10px 10px',
          }} />
          <h2 className="font-bangers text-3xl -rotate-1 inline-block bg-[#eaea00] px-3 py-1 comic-border mb-2 tracking-wider relative z-10">
            BRAND CITYSCAPE
          </h2>
          <p className="font-vietnam text-xs text-[#b9cac9] mb-4 relative z-10">
            Building height = drinks tried · Yellow windows = liked (7+) · Dark windows = tried but meh
          </p>
          <div className="relative z-10">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={brandData} margin={{ top: 10, right: 20, left: 0, bottom: 65 }}>
                <XAxis
                  dataKey="brand"
                  angle={-38}
                  textAnchor="end"
                  tick={{ fontFamily: 'Bangers', fontSize: 12, letterSpacing: 1, fill: '#eaea00' }}
                  interval={0}
                  axisLine={{ stroke: '#eaea00' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v: any) => `${v}`}
                  tick={{ fontFamily: 'Bangers', fontSize: 12, fill: '#b9cac9' }}
                  axisLine={{ stroke: '#b9cac9' }}
                  tickLine={false}
                  label={{ value: 'drinks tried →', angle: -90, position: 'insideLeft', fill: '#b9cac9', fontFamily: 'Bangers', fontSize: 12, dy: 45 }}
                />
                <Tooltip content={<CityTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar
                  dataKey="heightVal"
                  shape={(shapeProps: BuildingProps) => {
                    const entry = brandData[shapeProps.index ?? 0];
                    return (
                      <ComicBuilding
                        {...shapeProps}
                        fill={BRAND_COLORS[(shapeProps.index ?? 0) % BRAND_COLORS.length]}
                        liked={entry?.liked ?? 0}
                        total={entry?.total ?? 1}
                        avgRating={Number(entry?.avgRating ?? 0)}
                      />
                    );
                  }}
                >
                  {brandData.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ——— RATING DISTRIBUTION ——— */}
        <aside className="md:col-span-4 bg-white comic-border comic-shadow p-6">
          <h2 className="font-bangers text-2xl -rotate-2 inline-block bg-[#fe00fe] text-white px-2 py-1 comic-border mb-4 tracking-wider">
            RATING DISTRIBUTION
          </h2>
          <p className="font-vietnam text-xs text-[#6a7a7a] mb-4">How Abid&apos;s ratings cluster across all 38 drinks.</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={histData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="#e2e2e2" vertical={false} />
              <XAxis dataKey="range" tick={{ fontFamily: 'Bangers', fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontFamily: 'Bangers', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontFamily: 'Bangers', border: '4px solid #1b1b1b', borderRadius: '4px 8px 3px 10px', boxShadow: '6px 6px 0 #1b1b1b', letterSpacing: 1 }}
                formatter={(v: any) => [`${v} drink${v !== 1 ? 's' : ''}`, 'Count']}
              />
              <Bar dataKey="count" stroke="#1b1b1b" strokeWidth={2} radius={0}>
                {histData.map((d, i) => (
                  <Cell key={i} fill={d.range === '9–10' ? '#00fbfb' : d.range === '8–8.9' ? '#eaea00' : d.range === '1–3' ? '#ba1a1a' : '#e2e2e2'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </aside>

        {/* ——— TASTE RADAR ——— */}
        <section className="md:col-span-6 bg-white comic-border comic-shadow p-6">
          <h2 className="font-bangers text-2xl -rotate-1 inline-block bg-[#00fbfb] px-3 py-1 comic-border mb-2 tracking-wider">
            TASTE PROFILE RADAR
          </h2>
          <p className="font-vietnam text-xs text-[#6a7a7a] mb-4">
            Cyan = Abid&apos;s top-5 rated drinks · Grey = all 38 drinks
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e2e2" />
              <PolarAngleAxis dataKey="metric" tick={{ fontFamily: 'Bangers', fontSize: 12, fill: '#1b1b1b' }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontFamily: 'Bangers', fontSize: 9 }} />
              <Radar name="All Drinks" dataKey="all" stroke="#6a7a7a" fill="#6a7a7a" fillOpacity={0.2} />
              <Radar name="Top 5 Rated" dataKey="top5" stroke="#006a6a" fill="#006a6a" fillOpacity={0.4} />
              <Legend wrapperStyle={{ fontFamily: 'Bangers', letterSpacing: 1, fontSize: 13 }} />
            </RadarChart>
          </ResponsiveContainer>
        </section>

        {/* ——— REFRESHING VS RATING SCATTER ——— */}
        <aside className="md:col-span-6 bg-white comic-border comic-shadow p-6">
          <h2 className="font-bangers text-2xl rotate-1 inline-block bg-[#eaea00] px-3 py-1 comic-border mb-2 tracking-wider">
            REFRESHING SCORE VS RATING
          </h2>
          <p className="font-vietnam text-xs text-[#6a7a7a] mb-4">Does feeling refreshed predict a higher rating? (spoiler: yes)</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="0" stroke="#e2e2e2" />
              <XAxis dataKey="x" name="Refreshing" type="number" domain={[0.5, 5.5]}
                label={{ value: 'Refreshing Score', position: 'bottom', fontFamily: 'Bangers', fontSize: 13, dy: 10 }}
                tick={{ fontFamily: 'Bangers', fontSize: 12 }}
                axisLine={{ stroke: '#1b1b1b' }} />
              <YAxis dataKey="y" name="Rating" domain={[0, 10]}
                label={{ value: 'Abid\'s Rating', angle: -90, position: 'insideLeft', fontFamily: 'Bangers', fontSize: 13, dy: 55 }}
                tick={{ fontFamily: 'Bangers', fontSize: 12 }}
                axisLine={{ stroke: '#1b1b1b' }} />
              <Tooltip
                cursor={{ strokeDasharray: '4 4' }}
                contentStyle={{ fontFamily: 'Be Vietnam Pro', border: '4px solid #1b1b1b', borderRadius: '4px 8px 3px 10px', boxShadow: '6px 6px 0 #1b1b1b', fontSize: 12 }}
                formatter={(_: any, name: any, props: any) => {
                  if (name === 'y') return [`${props.payload?.y}/10`, 'Rating'];
                  if (name === 'x') return [props.payload?.x, 'Refreshing'];
                  return [props.payload?.name, 'Drink'];
                }}
              />
              <Scatter data={scatterData} fill="#a900a9" stroke="#1b1b1b" strokeWidth={2} />
            </ScatterChart>
          </ResponsiveContainer>
        </aside>

        {/* ——— FLAVOR PIE ——— */}
        <section className="md:col-span-12 bg-white comic-border comic-shadow p-6">
          <h2 className="font-bangers text-2xl -rotate-1 inline-block bg-[#ffd7f5] px-3 py-1 comic-border mb-4 tracking-wider">
            FLAVOR BREAKDOWN — WHAT HAS ABID ACTUALLY TRIED?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={flavData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={110}
                  stroke="#1b1b1b" strokeWidth={2}
                >
                  {flavData.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'Bangers', border: '4px solid #1b1b1b', borderRadius: '4px 8px 3px 10px', letterSpacing: 1 }} />
                <Legend wrapperStyle={{ fontFamily: 'Bangers', letterSpacing: 1, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Flavor breakdown table */}
            <div className="grid grid-cols-2 gap-2">
              {flavData.map((f, i) => {
                const flavorReviews = r.filter(d => d.primary_flavor_category === f.name);
                const flavorAvg = avg(flavorReviews.map(d => d.rating));
                const flavorLiked = flavorReviews.filter(d => d.rating >= LIKED_THRESHOLD).length;
                return (
                  <div key={f.name} className="comic-border p-3 flex flex-col gap-1"
                    style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] + '22', borderColor: BRAND_COLORS[i % BRAND_COLORS.length] }}>
                    <div className="font-bangers text-base tracking-wider leading-tight">{f.name}</div>
                    <div className="font-vietnam text-xs">
                      <span className="font-bold">{f.value}</span> tried · avg <span className="font-bold">{flavorAvg.toFixed(1)}</span> · <span className="font-bold">{flavorLiked}</span> liked
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ——— COMPARISON STATS ——— */}
        <section className="md:col-span-12 bg-white comic-border comic-shadow p-6 mt-2">
          <h2 className="font-bangers text-3xl -rotate-1 inline-block bg-[#ba1a1a] text-white px-3 py-1 comic-border mb-6 tracking-wider">
            ⚡ HEAD-TO-HEAD COMPARISONS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VS helper */}
            {(() => {
              function vsCard(
                label: string,
                leftLabel: string, leftReviews: typeof r,
                rightLabel: string, rightReviews: typeof r,
                accentLeft: string, accentRight: string,
              ) {
                const leftAvg = avg(leftReviews.map(d => d.rating));
                const rightAvg = avg(rightReviews.map(d => d.rating));
                const leftLiked = leftReviews.filter(d => d.rating >= LIKED_THRESHOLD).length;
                const rightLiked = rightReviews.filter(d => d.rating >= LIKED_THRESHOLD).length;
                const leftLikedPct = leftReviews.length ? Math.round((leftLiked / leftReviews.length) * 100) : 0;
                const rightLikedPct = rightReviews.length ? Math.round((rightLiked / rightReviews.length) * 100) : 0;
                const leftWins = leftAvg > rightAvg;
                const tie = Math.abs(leftAvg - rightAvg) < 0.05;
                return (
                  <div className="comic-border p-4 bg-[#f9f9f9]">
                    <div className="font-bangers text-lg tracking-widest text-[#6a7a7a] mb-3">{label}</div>
                    <div className="flex items-center gap-3">
                      {/* Left */}
                      <div className={`flex-1 p-4 comic-border text-center transition-all ${!tie && leftWins ? 'scale-105' : 'opacity-80'}`}
                        style={{ background: accentLeft }}>
                        <div className="font-bangers text-xl tracking-wider leading-tight mb-1">{leftLabel}</div>
                        <div className="font-bangers text-4xl leading-none">{leftAvg.toFixed(1)}</div>
                        <div className="font-vietnam text-xs mt-1">{leftReviews.length} drinks · {leftLikedPct}% liked</div>
                        {!tie && leftWins && <div className="font-bangers text-sm mt-2 bg-[#1b1b1b] text-[#eaea00] px-2 inline-block">WINNER!</div>}
                      </div>
                      {/* VS badge */}
                      <div className="font-bangers text-3xl text-[#1b1b1b] flex-shrink-0 -rotate-6">VS</div>
                      {/* Right */}
                      <div className={`flex-1 p-4 comic-border text-center transition-all ${!tie && !leftWins ? 'scale-105' : 'opacity-80'}`}
                        style={{ background: accentRight }}>
                        <div className="font-bangers text-xl tracking-wider leading-tight mb-1">{rightLabel}</div>
                        <div className="font-bangers text-4xl leading-none">{rightAvg.toFixed(1)}</div>
                        <div className="font-vietnam text-xs mt-1">{rightReviews.length} drinks · {rightLikedPct}% liked</div>
                        {!tie && !leftWins && <div className="font-bangers text-sm mt-2 bg-[#1b1b1b] text-[#eaea00] px-2 inline-block">WINNER!</div>}
                      </div>
                    </div>
                    {tie && <div className="font-bangers text-center text-lg text-[#6a7a7a] mt-2">IT&apos;S A TIE!</div>}
                  </div>
                );
              }

              const sugarFree = r.filter(d => d.sugar_free);
              const notSugarFree = r.filter(d => !d.sugar_free);
              const highCaff = r.filter(d => d.caffeine_amount_mg >= 150);
              const lowCaff = r.filter(d => d.caffeine_amount_mg > 0 && d.caffeine_amount_mg < 150);
              const highCarb = r.filter(d => d.carbonation_level >= 4);
              const lowCarb = r.filter(d => d.carbonation_level <= 2);
              const highSweet = r.filter(d => d.sweetness_level >= 4);
              const lowSweet = r.filter(d => d.sweetness_level <= 2);
              const fruityDrinks = r.filter(d => ['Fruit', 'Berry', 'Tropical', 'Watermelon'].some(f => d.primary_flavor_category?.includes(f)));
              const citrusDrinks = r.filter(d => ['Citrus', 'Lemon', 'Lime'].some(f => d.primary_flavor_category?.includes(f)));
              const smoothHigh = r.filter(d => d.smoothness >= 4);
              const smoothLow = r.filter(d => d.smoothness <= 2);

              return (
                <>
                  {vsCard('SUGAR-FREE VS REGULAR', 'Sugar-Free', sugarFree, 'Regular', notSugarFree, '#00fbfb', '#ffd7f5')}
                  {vsCard('HIGH CAFFEINE VS LOW', 'High Caff (150mg+)', highCaff, 'Low Caff (<150mg)', lowCaff, '#fe00fe', '#b7e4c7')}
                  {vsCard('SWEET VS NOT-SO-SWEET', 'Very Sweet', highSweet, 'Low Sugar', lowSweet, '#eaea00', '#e2e2e2')}
                  {vsCard('HIGHLY CARBONATED VS SMOOTH', 'Fizzy (4-5)', highCarb, 'Smooth (1-2)', lowCarb, '#00fbfb', '#ffd7f5')}
                  {vsCard('FRUIT/BERRY/TROPICAL VS CITRUS', 'Fruity', fruityDrinks, 'Citrus', citrusDrinks, '#b7e4c7', '#eaea00')}
                  {vsCard('SMOOTH TEXTURE VS ROUGH', 'Super Smooth (4-5)', smoothHigh, 'Rough/Harsh (1-2)', smoothLow, '#ffd7f5', '#ba1a1a')}
                </>
              );
            })()}
          </div>
        </section>

      </div>
    </>
  );
}
