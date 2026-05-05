interface StarburstBadgeProps {
  value: string | number;
  subLabel?: string;
  color?: string;
  textColor?: string;
  rotation?: number;
  size?: 'sm' | 'md' | 'lg';
}

// The starburst clip-path keeps ~60% of width/height usable in center.
// Font sizes are calibrated to stay well inside that zone.
const sizes = {
  sm: { outer: 56, font: '13px', sub: '9px' },
  md: { outer: 76, font: '18px', sub: '10px' },
  lg: { outer: 100, font: '22px', sub: '11px' },
};

export default function StarburstBadge({
  value,
  subLabel,
  color = '#eaea00',
  textColor = '#1b1b1b',
  rotation = 12,
  size = 'md',
}: StarburstBadgeProps) {
  const s = sizes[size];
  // Inner content is counter-rotated so text stays upright
  const innerStyle = { transform: `rotate(${-rotation}deg)` };
  return (
    <div
      className="starburst flex-shrink-0"
      style={{
        width: s.outer,
        height: s.outer,
        background: color,
        color: textColor,
        transform: `rotate(${rotation}deg)`,
        boxShadow: '4px 4px 0px 0px #1b1b1b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        // Clip-path is applied by .starburst — content must stay in center 55%
      }}
    >
      {/* Shrink wrapper keeps text strictly inside the visible star area */}
      <div style={{ ...innerStyle, width: '55%', lineHeight: 1 }}>
        <span
          className="font-bangers block leading-none"
          style={{ fontSize: s.font, whiteSpace: 'nowrap' }}
        >
          {value}
        </span>
        {subLabel && (
          <span
            className="font-bangers block leading-none mt-px"
            style={{ fontSize: s.sub, whiteSpace: 'nowrap' }}
          >
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}
