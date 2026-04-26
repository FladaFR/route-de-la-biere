// ─── StarSlider component ─────────────────────────────────────────────────────
// Renders 5 SVG stars (full / half / empty) driven by a range slider.
// value: number 0–5 in steps of 0.5
// onChange: (newValue) => void

import { SvgStar, getStarFill } from '@/components/StarDisplay'

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


export default StarSlider