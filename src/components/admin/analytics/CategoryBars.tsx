import Link from 'next/link'

export interface BarItem {
  label: string
  value: number
  /** Storefront path — makes the row clickable when present. */
  href?: string
}

/**
 * Horizontal ranked bars. Bar length is share-of-max (not share-of-total), so
 * the leader always fills the row and the differences between the rest stay
 * readable — share-of-total flattens everything when one item dominates.
 */
export function CategoryBars({
  items,
  color,
}: {
  items: BarItem[]
  color: string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))

  if (items.length === 0) {
    return (
      <p className="mt-6 font-body text-sm text-[var(--admin-text-tertiary)]">
        Rien à afficher pour l&apos;instant.
      </p>
    )
  }

  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item, i) => {
        const pct = Math.max(2, Math.round((item.value / max) * 100))
        const row = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate font-body text-[13px] text-white">
                <span
                  className="me-2 font-mono text-[10.5px]"
                  style={{ color: 'var(--admin-text-tertiary)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.label}
              </span>
              <span
                className="shrink-0 font-mono text-[11.5px]"
                style={{ color }}
              >
                {item.value}
              </span>
            </span>
            <span
              aria-hidden
              className="mt-1.5 block h-1.5 overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 55%, transparent))`,
                }}
              />
            </span>
          </>
        )

        return (
          <li key={`${item.label}-${i}`}>
            {item.href ? (
              <Link
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg px-1 py-1 transition-colors hover:bg-white/[0.04]"
              >
                {row}
              </Link>
            ) : (
              <span className="block px-1 py-1">{row}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
