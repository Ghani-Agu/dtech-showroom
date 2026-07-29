'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * ROUND 20 — a one-row horizontal rail with real controls.
 *
 * The /products brand strip used to `flex-wrap`, so 21 brands stacked into
 * three rows and pushed the actual results below the fold. Ghani asked for one
 * row — and one row of 21 chips is only usable if you can move it, so this
 * adds the parts a bare `overflow-x: auto` is missing:
 *
 *  - arrows that appear only when there IS overflow, and disable at each end
 *    (a mouse user has no horizontal gesture; shift+wheel is not discoverable);
 *  - edge fades that switch off at the ends, so the rail never looks clipped
 *    when it isn't;
 *  - `data-lenis-prevent`, because Lenis runs with allowNestedScroll:false and
 *    would otherwise eat the trackpad gesture and scroll the page instead.
 *
 * The scroll listener is passive + rAF-coalesced and only reads two numbers,
 * so it costs nothing next to the page's own scroll work.
 */
export function EdRail({
  children,
  label,
  className = '',
  prevLabel,
  nextLabel,
}: {
  children: ReactNode
  label: string
  className?: string
  prevLabel: string
  nextLabel: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [edge, setEdge] = useState<{ start: boolean; end: boolean; over: boolean }>({
    start: false,
    end: false,
    over: false,
  })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    // scrollLeft is NEGATIVE in RTL on every engine that follows the spec, so
    // compare on the absolute distance rather than assuming it grows from 0.
    const x = Math.abs(el.scrollLeft)
    const max = el.scrollWidth - el.clientWidth
    setEdge({ start: x > 4, end: x < max - 4, over: max > 8 })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        measure()
      })
    }
    measure()
    el.addEventListener('scroll', on, { passive: true })
    const ro = new ResizeObserver(on)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', on)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [measure])

  const nudge = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    const rtl = getComputedStyle(el).direction === 'rtl'
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * Math.round(el.clientWidth * 0.72), behavior: 'smooth' })
  }

  return (
    <div
      className={`edrail${edge.over ? ' over' : ''}${edge.start ? ' s' : ''}${edge.end ? ' e' : ''} ${className}`}
    >
      <div className="edrail-vp" ref={ref} data-lenis-prevent-touch role="group" aria-label={label}>
        {children}
      </div>
      {edge.over ? (
        <>
          <button
            type="button"
            className="edrail-btn p"
            onClick={() => nudge(-1)}
            disabled={!edge.start}
            aria-label={prevLabel}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="edrail-btn n"
            onClick={() => nudge(1)}
            disabled={!edge.end}
            aria-label={nextLabel}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  )
}
