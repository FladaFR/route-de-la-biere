export function getStarFill(value, starIndex) {
  if (value >= starIndex) return 'full'
  if (value >= starIndex - 0.5) return 'half'
  return 'empty'
}

export function SvgStar({ fill, size = 40 }) {
  const clipId = `half-${fill}`
  const filled = '#facc15'
  const empty  = '#d6d3d1'

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      {fill === 'half' && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="20" height="40" />
          </clipPath>
        </defs>
      )}
      <polygon
        points="20,4 24.9,15.2 37,16.6 28,25.3 30.5,37.3 20,31.4 9.5,37.3 12,25.3 3,16.6 15.1,15.2"
        fill={empty}
      />
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

export default function StarDisplay({ value, size = 20 }) {
  if (value == null) return <span className="text-gray-300 text-sm">—</span>
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <SvgStar key={i} fill={getStarFill(value, i)} size={size} />
      ))}
    </div>
  )
}