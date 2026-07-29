'use client'

/**
 * ROUND 21 — one scroll frame, one layout.
 *
 * The editorial home used to run FIVE independent `scroll` listeners
 * (Curtain, the two photo bands, the fan row, the chrome tone/spy), each
 * with its own rAF. They interleave read → write → read → write, and every
 * read after a write is a FORCED SYNCHRONOUS LAYOUT: measured 19 stalls
 * >60ms (1.9s of stall time, worst frame 317ms) driving real wheel events
 * down /fr. Consolidating them into a single scheduler that does ALL the
 * `getBoundingClientRect()` reads first and ALL the style writes second
 * costs the browser exactly one layout per frame no matter how many
 * effects are registered.
 *
 * Rule for anything new: never add a bare `addEventListener('scroll')` in
 * the editorial skin — register a read/write pair here instead.
 */

import { useEffect, useRef } from 'react'

type Fx<T> = { read: () => T; write: (v: T) => void }

const fxs = new Set<Fx<unknown>>()
let raf = 0

function flush() {
  raf = 0
  const list = Array.from(fxs)
  /* PHASE 1 — every measurement. No style is written in between, so the
     layout computed for the first read serves all of them. */
  const vals: unknown[] = new Array(list.length)
  for (let i = 0; i < list.length; i++) vals[i] = list[i]!.read()
  /* PHASE 2 — every write. Invalidates style once, at the end of the frame. */
  for (let i = 0; i < list.length; i++) list[i]!.write(vals[i])
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(flush)
}

function register(fx: Fx<unknown>) {
  fxs.add(fx)
  if (fxs.size === 1) {
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule, { passive: true })
  }
  schedule()
  return () => {
    fxs.delete(fx)
    if (fxs.size === 0) {
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
  }
}

/**
 * Register a scroll-driven effect. `read` may measure the DOM but must not
 * touch styles; `write` may touch styles but must not measure. Both are
 * kept in refs, so passing inline closures does not re-subscribe.
 */
export function useScrollFx<T>(read: () => T, write: (v: T) => void) {
  const r = useRef(read)
  const w = useRef(write)
  r.current = read
  w.current = write
  useEffect(() => {
    return register({
      read: () => r.current(),
      write: (v) => w.current(v as T),
    } as Fx<unknown>)
  }, [])
}

/**
 * The `--p` progress variable shared by the photo bands: 0 as the section
 * enters from the bottom, 1 as it leaves through the top.
 */
export function useScrollP(ref: { current: HTMLElement | null }) {
  useScrollFx(
    () => {
      const el = ref.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      return Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))).toFixed(3)
    },
    (p) => {
      if (p !== null) ref.current?.style.setProperty('--p', p)
    },
  )
}

/**
 * ROUND 21 — pause a heavy scene while it is off screen.
 *
 * `#pourquoi` (the bento) runs ~85 infinite CSS animations, 60 of them
 * `edd-keylite` on the laptop keycaps, which animates `background` and
 * `box-shadow` — paint properties, so they cannot be composited and tick
 * the main thread on every frame of every loop, for as long as the page is
 * open, whether or not the section is anywhere near the viewport. Toggling
 * `animation-play-state: paused` from an IntersectionObserver costs one
 * class write per crossing and nothing at all in between.
 *
 * Same rule of thumb as the animated inherited @property from round 20b:
 * an always-running animation is only free when nobody is looking at it.
 */
export function useAnimGate(ref: { current: HTMLElement | null }, margin = '35% 0px') {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return
    el.classList.add('ed-paused')
    const io = new IntersectionObserver(
      (entries) => el.classList.toggle('ed-paused', !entries.some((e) => e.isIntersecting)),
      { rootMargin: margin },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      el.classList.remove('ed-paused')
    }
  }, [ref, margin])
}
