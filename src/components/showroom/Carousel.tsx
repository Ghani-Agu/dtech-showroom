'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Horizontal lane with left/right arrow buttons.
 * Used for filter chip rows (variant="chips") and product carousels
 * (variant="cards"). Arrows hide automatically at each end.
 */
export function Carousel({
  children,
  variant = 'cards',
  prevLabel,
  nextLabel,
}: {
  children: ReactNode
  variant?: 'cards' | 'chips'
  prevLabel: string
  nextLabel: string
}) {
  const laneRef = useRef<HTMLDivElement | null>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const update = useCallback(() => {
    const el = laneRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    if (max <= 4) {
      setAtStart(true)
      setAtEnd(true)
      return
    }
    // RTL scrollLeft can be negative; use absolute progress
    const x = Math.abs(el.scrollLeft)
    setAtStart(x <= 4)
    setAtEnd(x >= max - 4)
  }, [])

  useEffect(() => {
    update()
    const el = laneRef.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])

  const nudge = (dir: 1 | -1) => {
    const el = laneRef.current
    if (!el) return
    const rtl = getComputedStyle(el).direction === 'rtl'
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className={variant === 'chips' ? 'sr-chiprow' : 'sr-carousel'}>
      <button
        type="button"
        className="sr-arrow prev"
        aria-label={prevLabel}
        data-hidden={atStart}
        onClick={() => nudge(-1)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: 'var(--sr-flip, none)' }}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="lane" ref={laneRef}>
        {children}
      </div>
      <button
        type="button"
        className="sr-arrow next"
        aria-label={nextLabel}
        data-hidden={atEnd}
        onClick={() => nudge(1)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: 'var(--sr-flip, none)' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}
