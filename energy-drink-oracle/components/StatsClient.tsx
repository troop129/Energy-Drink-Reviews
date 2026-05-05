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
  // Dynamically calculate columns based on width. 
  let winCols = 4;
  if (width < 35) winCols = 1;
  else if (width < 60) winCols = 2;
  else if (width < 90) winCols = 3;

  const winRows = Math.max(1, Math.floor(height / 22));
  
  // Calculate window size with padding
  const totalPaddingX = border * 2 + (winCols + 1) * 2;
  const winW = Math.max(2, (width - totalPaddingX) / winCols);
  
  const totalPaddingY = 28 + border * 2 + (winRows + 1) * 2;
  const winH = Math.max(2, (height - totalPaddingY) / winRows);

  const windows: { wx: number; wy: number; lit: boolean; isTried: boolean }[] = [];
  let idx = 0;
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      windows.push({
        wx: x + border + 2 + c * (winW + 2),
        wy: y + border + 14 + r * (winH + 2),
        lit: idx < liked,
        isTried: idx < total,
      });
      idx++;
    }
  }

  return (
    <g>
      {/* Building body */}
      <rect x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} fill={fill} />
      
      {/* Comic Shading (side shadow) */}
      <rect x={x + width - 6} y={y + 8} width={4} height={height - 8} fill="#000" opacity={0.15} />

      {/* Roof line */}
      <rect x={x} y={y} width={width} height={8} fill="#1b1b1b" />
      <rect x={x + 4} y={y - 4} width={width - 8} height={4} fill="#1b1b1b" /> {/* Extra roof detail */}
      
      {/* Outer border */}
      <rect x={x} y={y} width={width} height={height} fill="none" stroke="#1b1b1b" strokeWidth={border} />
      
      {/* Windows: yellow=liked, dark=tried-not-liked, very-dark=extra-filler */}
      {windows.map((w, i) => (
        <rect
          key={i}
          x={w.wx} y={w.wy}
          width={Math.max(1, winW)} height={Math.max(1, winH)}
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
      <header className="mb-6 md:mb-10 bg-[#00fbfb] comic-border comic-shadow p-6 md:p-8 relative overflow-visible">
        <h1 className="font-bangers text-5xl md:text-7xl text-[#1b1b1b] md:-rotate-2 inline-block bg-white px-4 py-2 comic-border comic-shadow-sm tracking-wider">
          ABID&apos;S STATS LAB
        </h1>
        <div className="block">
          <p className="font-vietnam text-base md:text-lg text-[#3a4a49] mt-4 bg-white p-3 comic-border inline-block">
            Breaking down the data behind every sip. <strong>38 drinks reviewed.</strong>
          </p>
        </div>
      </header>

      {/* Quick Navigation - Mobile Only */}
      <div className="flex md:hidden overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar font-bangers tracking-wider">
        <a href="#cityscape" className="bg-white border-2 border-black px-3 py-1 whitespace-nowrap">Cityscape</a>
        <a href="#taste" className="bg-white border-2 border-black px-3 py-1 whitespace-nowrap">Taste</a>
        <a href="#scatter" className="bg-white border-2 border-black px-3 py-1 whitespace-nowrap">Scatter</a>
        <a href="#flavors" className="bg-white border-2 border-black px-3 py-1 whitespace-nowrap">Flavors</a>
        <a href="#comparisons" className="bg-white border-2 border-black px-3 py-1 whitespace-nowrap">Head-to-Head</a>
      </div>

      {/* ——— STAT CARDS ——— */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
        {[
          { label: 'BEST DRINK', val: topDrink.official_name.split(' ').slice(0, 2).join(' '), sub: `${topDrink.rating}/10`, bg: '#00fbfb' },
          { label: 'WORST DRINK', val: worstDrink.official_name.split(' ').slice(0, 2).join(' '), sub: `${worstDrink.rating}/10`, bg: '#ba1a1a', tc: '#fff' },
          { label: 'AVG RATING', val: overallAvg.toFixed(1), sub: 'across all 38', bg: '#eaea00' },
          { label: 'WOULD DRINK AGAIN', val: `${likedCount}`, sub: `${Math.round(likedCount/r.length*100)}% liked`, bg: '#b7e4c7' },
          { label: 'SUGAR-FREE', val: `${sugarFreeCount}`, sub: 'drinks tried', bg: '#ffd7f5' },
          { label: 'HIGH CAFFEINE', val: `${highCaffCount}`, sub: '150mg+ tried', bg: '#fe00fe', tc: '#fff' },
        ].map((s, i) => (
          <div key={i}
            className="comic-border comic-shadow p-3 md:p-4 relative flex flex-col items-center text-center justify-center min-h-[100px]"
            style={{ background: s.bg, color: s.tc || '#1b1b1b' }}>
            <div className="font-bangers text-[10px] md:text-xs tracking-widest mb-1 opacity-70 leading-tight uppercase">{s.label}</div>
            <div className="font-bangers text-xl md:text-2xl leading-tight mb-1">{s.val}</div>
            <div className="font-vietnam text-[10px] md:text-xs leading-tight opacity-90">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ——— COMIC CITYSCAPE ——— */}
        <section id="cityscape" className="md:col-span-8 bg-[#1b1b1b] comic-border comic-shadow p-4 md:p-6 relative overflow-hidden">
          {/* Night sky skyline effect */}
          <div className="absolute inset-0 opacity-30" style={{
            background: 'linear-gradient(to top, #002020 0%, #1b1b1b 100%)',
          }} />
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(#ffffff 0.6px, transparent 0.6px)',
            backgroundSize: '12px 12px',
          }} />
          
          <h2 className="font-bangers text-2xl md:text-3xl -rotate-1 inline-block bg-[#eaea00] px-3 py-1 comic-border mb-2 tracking-wider relative z-10">
            BRAND CITYSCAPE
          </h2>
          <p className="font-vietnam text-[10px] md:text-xs text-[#b9cac9] mb-4 relative z-10">
            Building height = drinks tried · Yellow windows = liked (7+) · Dark = meh
          </p>

          <div className="relative z-10 overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {/* On mobile, we force a wide scroll area so buildings are CHUNKY (min 800px) */}
            <div className="min-w-[850px] md:min-w-full">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart 
                  data={brandData} 
                  margin={{ top: 10, right: 20, left: -20, bottom: 75 }}
                  barCategoryGap="12%"
                >
                  <XAxis
                    dataKey="brand"
                    angle={-45}
                    textAnchor="end"
                    tick={{ fontFamily: 'Bangers', fontSize: 13, letterSpacing: 1, fill: '#eaea00' }}
                    interval={0}
                    axisLine={{ stroke: '#eaea00', strokeWidth: 2 }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tickFormatter={(v: any) => `${v}`}
                    tick={{ fontFamily: 'Bangers', fontSize: 11, fill: '#b9cac9' }}
                    axisLine={{ stroke: '#b9cac9' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CityTooltip />} cursor={{ fill: 'rgba(255,255,255,0.08)' }} />
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
            {/* Visual indicator for mobile scroll */}
            <div className="md:hidden flex justify-center gap-1 mt-[-10px] pb-2">
              <div className="w-12 h-1 bg-[#eaea00] opacity-30 rounded-full" />
              <div className="w-4 h-1 bg-[#eaea00] opacity-30 rounded-full" />
              <div className="w-2 h-1 bg-[#eaea00] opacity-30 rounded-full" />
            </div>
          </div>
        </section>

        {/* ——— RATING DISTRIBUTION ——— */}
        <aside className="md:col-span-4 bg-white comic-border comic-shadow p-6">
          <h2 className="font-bangers text-2xl -rotate-2 inline-block bg-[#fe00fe] text-white px-2 py-1 comic-border mb-4 tracking-wider">
            DISTRIBUTION
          </h2>
          <p className="font-vietnam text-xs text-[#6a7a7a] mb-4">How Abid&apos;s ratings cluster across all reviews.</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={histData} margin={{ top: 4, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="#e2e2e2" vertical={false} />
              <XAxis dataKey="range" tick={{ fontFamily: 'Bangers', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontFamily: 'Bangers', fontSize: 11 }} axisLine={false} tickLine={false} />
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
        <section id="taste" className="md:col-span-6 bg-white comic-border comic-shadow p-4 md:p-6">
          <h2 className="font-bangers text-2xl -rotate-1 inline-block bg-[#00fbfb] px-3 py-1 comic-border mb-2 tracking-wider">
            TASTE RADAR
          </h2>
          <p className="font-vietnam text-xs text-[#6a7a7a] mb-4">
            Cyan = Top-5 drinks · Grey = all 38
          </p>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                <PolarGrid stroke="#e2e2e2" />
                <PolarAngleAxis dataKey="metric" tick={{ fontFamily: 'Bangers', fontSize: 11, fill: '#1b1b1b' }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontFamily: 'Bangers', fontSize: 8 }} />
                <Radar name="All Drinks" dataKey="all" stroke="#6a7a7a" fill="#6a7a7a" fillOpacity={0.2} />
                <Radar name="Top 5 Rated" dataKey="top5" stroke="#006a6a" fill="#006a6a" fillOpacity={0.4} />
                <Legend wrapperStyle={{ fontFamily: 'Bangers', letterSpacing: 1, fontSize: 12, paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ——— REFRESHING VS RATING SCATTER ——— */}
        <aside id="scatter" className="md:col-span-6 bg-white comic-border comic-shadow p-6">
          <h2 className="font-bangers text-2xl rotate-1 inline-block bg-[#eaea00] px-3 py-1 comic-border mb-2 tracking-wider">
            REFRESHING VS RATING
          </h2>
          <p className="font-vietnam text-xs text-[#6a7a7a] mb-4">Does feeling refreshed predict a higher rating?</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="0" stroke="#e2e2e2" />
              <XAxis dataKey="x" name="Refreshing" type="number" domain={[0.5, 5.5]}
                label={{ value: 'Refreshing', position: 'bottom', fontFamily: 'Bangers', fontSize: 12, dy: 10 }}
                tick={{ fontFamily: 'Bangers', fontSize: 11 }}
                axisLine={{ stroke: '#1b1b1b' }} />
              <YAxis dataKey="y" name="Rating" domain={[0, 10]}
                label={{ value: 'Rating', angle: -90, position: 'insideLeft', fontFamily: 'Bangers', fontSize: 12, dy: 30 }}
                tick={{ fontFamily: 'Bangers', fontSize: 11 }}
                axisLine={{ stroke: '#1b1b1b' }} />
              <Tooltip
                cursor={{ strokeDasharray: '4 4' }}
                contentStyle={{ fontFamily: 'Be Vietnam Pro', border: '4px solid #1b1b1b', borderRadius: '4px 8px 3px 10px', boxShadow: '6px 6px 0 #1b1b1b', fontSize: 11 }}
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
        <section id="flavors" className="md:col-span-12 bg-white comic-border comic-shadow p-4 md:p-6">
          <h2 className="font-bangers text-2xl -rotate-1 inline-block bg-[#ffd7f5] px-3 py-1 comic-border mb-4 tracking-wider">
            FLAVOR BREAKDOWN
          </h2>
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={flavData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80}
                    stroke="#1b1b1b" strokeWidth={2}
                  >
                    {flavData.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontFamily: 'Bangers', border: '4px solid #1b1b1b', borderRadius: '4px 8px 3px 10px', letterSpacing: 1 }} />
                  <Legend wrapperStyle={{ fontFamily: 'Bangers', letterSpacing: 1, fontSize: 11 }} layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Flavor breakdown table */}
            <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {flavData.map((f, i) => {
                const flavorReviews = r.filter(d => d.primary_flavor_category === f.name);
                const flavorAvg = avg(flavorReviews.map(d => d.rating));
                const flavorLiked = flavorReviews.filter(d => d.rating >= LIKED_THRESHOLD).length;
                return (
                  <div key={f.name} className="comic-border p-3 flex flex-col gap-1"
                    style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] + '22', borderColor: BRAND_COLORS[i % BRAND_COLORS.length] }}>
                    <div className="font-bangers text-base tracking-wider leading-tight">{f.name}</div>
                    <div className="font-vietnam text-[10px] md:text-xs">
                      <span className="font-bold">{f.value}</span> tried · avg <span className="font-bold">{flavorAvg.toFixed(1)}</span> · <span className="font-bold">{flavorLiked}</span> liked
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ——— COMPARISON STATS ——— */}
        <section id="comparisons" className="md:col-span-12 bg-white comic-border comic-shadow p-4 md:p-6 mt-2">
          <h2 className="font-bangers text-2xl md:text-3xl -rotate-1 inline-block bg-[#ba1a1a] text-white px-3 py-1 comic-border mb-6 tracking-wider">
            ⚡ HEAD-TO-HEAD
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
                    <div className="font-bangers text-base md:text-lg tracking-widest text-[#6a7a7a] mb-4">{label}</div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Left */}
                      <div className={`w-full sm:flex-1 p-4 comic-border text-center transition-all ${!tie && leftWins ? 'scale-105' : 'opacity-80'}`}
                        style={{ background: accentLeft }}>
                        <div className="font-bangers text-lg tracking-wider leading-tight mb-1">{leftLabel}</div>
                        <div className="font-bangers text-4xl leading-none">{leftAvg.toFixed(1)}</div>
                        <div className="font-vietnam text-[10px] mt-1 uppercase font-bold">{leftReviews.length} drinks · {leftLikedPct}% liked</div>
                        {!tie && leftWins && <div className="font-bangers text-sm mt-2 bg-[#1b1b1b] text-[#eaea00] px-2 inline-block">WINNER!</div>}
                      </div>
                      {/* VS badge */}
                      <div className="font-bangers text-3xl text-[#1b1b1b] flex-shrink-0 -rotate-6 my-2 sm:my-0">VS</div>
                      {/* Right */}
                      <div className={`w-full sm:flex-1 p-4 comic-border text-center transition-all ${!tie && !leftWins ? 'scale-105' : 'opacity-80'}`}
                        style={{ background: accentRight }}>
                        <div className="font-bangers text-lg tracking-wider leading-tight mb-1">{rightLabel}</div>
                        <div className="font-bangers text-4xl leading-none">{rightAvg.toFixed(1)}</div>
                        <div className="font-vietnam text-[10px] mt-1 uppercase font-bold">{rightReviews.length} drinks · {rightLikedPct}% liked</div>
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
                  {vsCard('HIGH CAFFEINE VS LOW', 'High Caff', highCaff, 'Low Caff', lowCaff, '#fe00fe', '#b7e4c7')}
                  {vsCard('SWEET VS NOT-SO-SWEET', 'Very Sweet', highSweet, 'Low Sugar', lowSweet, '#eaea00', '#e2e2e2')}
                  {vsCard('CARBONATED VS SMOOTH', 'Fizzy (4-5)', highCarb, 'Smooth (1-2)', lowCarb, '#00fbfb', '#ffd7f5')}
                  {vsCard('FRUITY VS CITRUS', 'Fruity', fruityDrinks, 'Citrus', citrusDrinks, '#b7e4c7', '#eaea00')}
                  {vsCard('SMOOTH VS ROUGH', 'Smooth (4-5)', smoothHigh, 'Rough (1-2)', smoothLow, '#ffd7f5', '#ba1a1a')}
                </>
              );
            })()}
          </div>
        </section>

      </div>
    </>
  );
}
