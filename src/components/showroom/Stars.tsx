const STAR = 'M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z'

/** Star colors per surface tone (dark showroom vs light brand skin). */
const STAR_TONES = {
  dark: { on: '#7ce0c3', off: 'rgba(255,255,255,0.16)' },
  light: { on: '#10a396', off: 'rgba(127,138,148,0.35)' },
} as const

type StarTone = keyof typeof STAR_TONES

export function Star({
  fill = 1,
  size = 13,
  tone = 'dark',
}: {
  fill?: number
  size?: number
  tone?: StarTone
}) {
  const pct = Math.max(0, Math.min(1, fill)) * 100
  const c = STAR_TONES[tone]
  const id = `sg-${tone}-${Math.round(pct)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${pct}%`} stopColor={c.on} />
          <stop offset={`${pct}%`} stopColor={c.off} />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${id})`} />
    </svg>
  )
}

export function Stars({
  value,
  count,
  size = 13,
  tone = 'dark',
}: {
  value: number
  count?: number
  size?: number
  tone?: StarTone
}) {
  return (
    <span className="sr-stars">
      <span className="s">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} fill={value - i + 1} tone={tone} />
        ))}
      </span>
      <span className="val">{value.toFixed(1)}</span>
      {count !== undefined ? <span className="ct">({count})</span> : null}
    </span>
  )
}
