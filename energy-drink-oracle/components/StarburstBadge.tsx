interface StarburstBadgeProps {
  value: string | number;
  subLabel?: string;
  color?: string;
  textColor?: string;
  rotation?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  // Reduced font sizes relative to viewBox so text fits comfortably in the star's inner circle
  sm: { outer: 64, valueFontSize: 16, subFontSize: 10 },
  md: { outer: 90, valueFontSize: 18, subFontSize: 11 },
  lg: { outer: 115, valueFontSize: 20, subFontSize: 12 },
};

// 10-point star polygon — outerR=47, innerR=22, centered at (50,50)
function starPoints(outerR = 47, innerR = 22, cx = 50, cy = 50): string {
  const pts: string[] = [];
  const numPts = 10;
  for (let i = 0; i < numPts; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const STAR_POINTS = starPoints();
const SHADOW_POINTS = starPoints(47, 22, 52, 52);

export default function StarburstBadge({
  value,
  subLabel,
  color = '#eaea00',
  textColor = '#1b1b1b',
  rotation = 12,
  size = 'md',
  className = '',
}: StarburstBadgeProps) {
  const s = sizes[size];
  const valStr = String(value);

  // Shrink font further for long strings like "7.5/10" (6 chars) or "10.0" (4 chars)
  let fontSize = s.valueFontSize;
  if (valStr.length >= 6) fontSize = Math.round(s.valueFontSize * 0.72);
  else if (valStr.length >= 4) fontSize = Math.round(s.valueFontSize * 0.85);

  // vertical centering: if subLabel present, nudge value up
  const valueY = subLabel ? 44 : 52;
  const subY = 60;

  return (
    <div
      className={`flex-shrink-0 ${className}`}
      style={{
        width: s.outer,
        height: s.outer,
        transform: `rotate(${rotation}deg)`,
        display: 'inline-block',
        filter: 'drop-shadow(3px 3px 0px #1b1b1b)',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={s.outer}
        height={s.outer}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Offset shadow */}
        <polygon points={SHADOW_POINTS} fill="#1b1b1b" opacity={0.2} />
        {/* Star body */}
        <polygon
          points={STAR_POINTS}
          fill={color}
          stroke="#1b1b1b"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Value — counter-rotated so text is always upright */}
        <text
          x="50"
          y={valueY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textColor}
          fontFamily="Bangers, cursive"
          fontSize={fontSize}
          letterSpacing="0.5"
          style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: '50px 50px' }}
        >
          {valStr}
        </text>
        {subLabel && (
          <text
            x="50"
            y={subY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textColor}
            fontFamily="Bangers, cursive"
            fontSize={s.subFontSize}
            letterSpacing="0.5"
            style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: '50px 50px' }}
          >
            {subLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
