const STAR = 'M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z'

export function Star({
  fill = 1,
  size = 13,
}: {
  fill?: number
  size?: number
}) {
  const pct = Math.max(0, Math.min(1, fill)) * 100
  const id = `sg${Math.round(pct)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${pct}%`} stopColor="#7ce0c3" />
          <stop offset={`${pct}%`} stopColor="rgba(255,255,255,0.16)" />
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
}: {
  value: number
  count?: number
  size?: number
}) {
  return (
    <span className="sr-stars">
      <span className="s">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} fill={value - i + 1} />
        ))}
      </span>
      <span className="val">{value.toFixed(1)}</span>
      {count !== undefined ? <span className="ct">({count})</span> : null}
    </span>
  )
}
