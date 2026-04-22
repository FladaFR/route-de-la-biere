// ─── StarSlider component ─────────────────────────────────────────────────────
// Renders 5 SVG stars (full / half / empty) driven by a range slider.
// value: number 0–5 in steps of 0.5
// onChange: (newValue) => void

function StarSlider({ value, onChange }) {
  // Clamp just in case
  const val = Math.min(5, Math.max(0, value ?? 0))

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Star display */}
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(starIndex => (
          <SvgStar key={starIndex} fill={getStarFill(val, starIndex)} />
        ))}
      </div>

      {/* Numeric label */}
      <p className="text-amber-700 font-semibold text-lg leading-none">
        {val.toFixed(1)} <span className="text-amber-400 font-normal text-base">/ 5</span>
      </p>

      {/* Slider */}
      <div className="w-full px-8">
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={val}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full h-2 accent-amber-600"
          style={{ touchAction: 'pan-y' }}
          aria-label="Note globale"
        />
      </div>
      <div className="flex justify-between w-full text-xs text-amber-400 -mt-1 px-8">
        <span>0</span>
        <span>5</span>
      </div>
    </div>
  )
}

// Returns 'full' | 'half' | 'empty' for a given star position (1-indexed)
function getStarFill(value, starIndex) {
  if (value >= starIndex) return 'full'
  if (value >= starIndex - 0.5) return 'half'
  return 'empty'
}

// SVG star with clip-path for half-star support
function SvgStar({ fill }) {
  // Unique ID per fill type is fine since we only have 3 variants
  const clipId = `half-${fill}`
   const filled = '#facc15'   // yellow-400
  const empty  = '#d6d3d1'   // stone-300

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      {fill === 'half' && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="20" height="40" />
          </clipPath>
        </defs>
      )}

      {/* Base layer — always empty (gray) */}
      <polygon
        points="20,4 24.9,15.2 37,16.6 28,25.3 30.5,37.3 20,31.4 9.5,37.3 12,25.3 3,16.6 15.1,15.2"
        fill={empty}
      />

      {/* Top layer — full or half amber fill */}
      {fill !== 'empty' && (
        <polygon
          points="20,4 24.9,15.2 37,16.6 28,25.3 30.5,37.3 20,31.4 9.5,37.3 12,25.3 3,16.6 15.1,15.2"
          fill={filled}
          clipPath={fill === 'half' ? `url(#${clipId})` : undefined}
        />
      )}
    </svg>
  )
}

export default StarSlider