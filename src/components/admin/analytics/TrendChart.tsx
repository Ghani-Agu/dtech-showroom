import { cn } from '@/lib/utils'

export interface TrendPoint {
  /** ISO `YYYY-MM-DD`. */
  date: string
  value: number
}

/**
 * 30-day trend, drawn as inline SVG on the server — no chart library, no
 * client JS. An area + line reads the shape at a glance; the bars underneath
 * give each day a real hover target with an accessible label.
 *
 * A flat all-zero series still renders a baseline rather than collapsing, so
 * "no activity yet" looks like a deliberate answer instead of a broken chart.
 */
export function TrendChart({
  points,
  color,
  label,
  height = 132,
}: {
  points: TrendPoint[]
  color: string
  label: string
  height?: number
}) {
  const w = 520
  const h = height
  const pad = { t: 10, r: 4, b: 16, l: 4 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const max = Math.max(1, ...points.map((p) => p.value))
  const total = points.reduce((a, p) => a + p.value, 0)
  const peak = points.reduce<TrendPoint | null>(
    (best, p) => (best === null || p.value > best.value ? p : best),
    null
  )

  const n = points.length
  const step = n > 1 ? innerW / (n - 1) : 0
  const xy = points.map((p, i) => {
    const x = pad.l + i * step
    const y = pad.t + innerH - (p.value / max) * innerH
    return { x, y, p }
  })

  const line = xy.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')
  const first = xy[0]
  const last = xy[n - 1]
  const area =
    first && last
      ? `${line} L${last.x.toFixed(1)},${(pad.t + innerH).toFixed(1)} L${first.x.toFixed(1)},${(pad.t + innerH).toFixed(1)} Z`
      : ''

  const gradId = `trend-${label.replace(/[^a-z]/gi, '')}-${Math.round(h)}`
  const fmt = (iso: string) => {
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-2xl text-white">{total}</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[1.4px] text-[var(--admin-text-tertiary)]">
          {label} · 30 j
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full"
        style={{ height }}
        role="img"
        aria-label={`${total} ${label} sur les 30 derniers jours${
          peak && peak.value > 0 ? `, maximum ${peak.value} le ${fmt(peak.date)}` : ''
        }`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* baseline + midline */}
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={w - pad.r}
          y2={pad.t + innerH}
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1"
          className="text-white"
        />
        <line
          x1={pad.l}
          y1={pad.t + innerH / 2}
          x2={w - pad.r}
          y2={pad.t + innerH / 2}
          stroke="currentColor"
          strokeOpacity="0.07"
          strokeDasharray="3 4"
          strokeWidth="1"
          className="text-white"
        />

        {area && <path d={area} fill={`url(#${gradId})`} />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* per-day hover targets — full-height so they're easy to hit */}
        {xy.map((q) => (
          <g key={q.p.date}>
            <rect
              x={q.x - step / 2}
              y={pad.t}
              width={Math.max(step, 3)}
              height={innerH}
              fill="transparent"
            >
              <title>{`${fmt(q.p.date)} — ${q.p.value} ${label}`}</title>
            </rect>
            {q.p.value > 0 && (
              <circle cx={q.x} cy={q.y} r="2.4" fill={color}>
                <title>{`${fmt(q.p.date)} — ${q.p.value} ${label}`}</title>
              </circle>
            )}
          </g>
        ))}

        {/* first / mid / last date ticks only — 30 labels would be unreadable */}
        {[0, Math.floor(n / 2), n - 1].map((i) => {
          const q = xy[i]
          if (!q) return null
          return (
            <text
              key={`t${i}`}
              x={Math.min(Math.max(q.x, 14), w - 14)}
              y={h - 3}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-current text-white"
              fillOpacity="0.42"
              style={{ fontSize: 9.5, fontFamily: 'var(--font-mono, monospace)' }}
            >
              {fmt(q.p.date)}
            </text>
          )
        })}
      </svg>

      {total === 0 && (
        <p
          className={cn(
            'mt-1 font-body text-xs',
            'text-[var(--admin-text-tertiary)]'
          )}
        >
          Aucune activité sur cette période.
        </p>
      )}
    </div>
  )
}
