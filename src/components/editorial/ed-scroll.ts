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

import { useEffect, useRef, useState } from 'react'

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

/**
 * ROUND 22 — an `ed-scrolling` class on <html> for the whole gesture.
 *
 * Some effects cannot be composited at all — an animated `background-position`
 * on a `background-clip: text` wordmark repaints its glyphs on the main
 * thread, every frame, forever. That is affordable while the page is still
 * and ruinous while it is moving, which is precisely backwards from how CSS
 * animations behave on their own. This flag lets the stylesheet freeze that
 * class of animation for exactly as long as the wheel is live: two class
 * writes per gesture, nothing per frame. See `.ed-scrolling` in
 * editorial-design.css.
 */
let idleT: ReturnType<typeof setTimeout> | 0 = 0

function idle() {
  idleT = 0
  document.documentElement.classList.remove('ed-scrolling')
}

function onScroll() {
  if (idleT) clearTimeout(idleT)
  else document.documentElement.classList.add('ed-scrolling')
  idleT = setTimeout(idle, 140)
  schedule()
}

function register(fx: Fx<unknown>) {
  fxs.add(fx)
  if (fxs.size === 1) {
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', schedule, { passive: true })
  }
  schedule()
  return () => {
    fxs.delete(fx)
    if (fxs.size === 0) {
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', schedule)
      if (idleT) {
        clearTimeout(idleT)
        idle()
      }
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
 * ROUND 21d — write a custom property ONLY when its value actually changed.
 *
 * `setProperty` invalidates style for the element (and, for an inherited
 * custom property, its whole subtree) even when the value is byte-identical
 * to what is already there. Most scroll frames do not move a clamped
 * progress value at all: `--p` sits pinned at 0 while a section is still
 * below the fold and at 1 once it has passed, and `--fw`/`--fstep` only
 * change on resize. Guarding the write turns the majority of frames into
 * genuinely zero work instead of "recompute the subtree, arrive at the same
 * answer".
 *
 * Keep using this for every scroll-driven custom property.
 */
export function setVar(el: HTMLElement | null | undefined, name: string, value: string) {
  if (!el) return
  const cache = (el as HTMLElement & { __sv?: Record<string, string> }).__sv ?? {}
  if (cache[name] === value) return
  cache[name] = value
  ;(el as HTMLElement & { __sv?: Record<string, string> }).__sv = cache
  el.style.setProperty(name, value)
}

/**
 * The `--p` progress variable driving the photo bands: 0 as the section
 * enters from the bottom, 1 as it leaves through the top.
 *
 * ROUND 21c — `--p` is written to the two elements that actually READ it,
 * never to the <section>.
 *
 * `--p` is an unregistered custom property, so it inherits. Setting it on
 * the section meant Chrome had to recompute inherited custom properties for
 * that section's ENTIRE subtree on every scrolled frame — for `.band.hist`
 * that is the wordmark, the three counters, six thumbnails and the CTA,
 * ~50 nodes, 60 times a second. Only `.band-media` (the parallax transform)
 * and `.band-veil` (the fading scrim) consume it, and both are leaves, so
 * writing straight to them drops the per-frame invalidation from ~50 nodes
 * to 2 with pixel-identical output.
 *
 * Exact same rule as the animated inherited @property from round 20b: cost
 * scales with the descendant count of where the property is DECLARED, not
 * with how many elements consume it. It bites through JS writes too, not
 * just CSS animations.
 */
const P_CONSUMERS = '.band-media, .band-veil'

export function useScrollP(ref: { current: HTMLElement | null }) {
  const targets = useRef<HTMLElement[] | null>(null)
  useScrollFx(
    () => {
      const el = ref.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      return Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))).toFixed(3)
    },
    (p) => {
      const el = ref.current
      if (p === null || !el) return
      if (!targets.current || targets.current.length === 0) {
        targets.current = Array.from(el.querySelectorAll<HTMLElement>(P_CONSUMERS))
      }
      for (const t of targets.current) setVar(t, '--p', p)
    },
  )
}

/**
 * ROUND 22 — `data-lenis-prevent` is a WHEEL KILL SWITCH, not a hint.
 *
 * Lenis walks the composed path of every wheel event and, the moment it
 * finds the attribute, `return`s before `preventDefault()` — so the browser
 * scrolls the page natively, in raw OS wheel steps, for as long as the
 * pointer is over that element. Measured on lenis 1.3.23 with this project's
 * exact options (lerp .13, wheelMultiplier 1.2), one 120px wheel tick:
 *
 *   plain section    18 → 27 → 35 → 42 → 49 → 56 → 63 → 69 → 75 … px  (eased)
 *   data-lenis-prevent   120px on frame 1, done                        (teleport)
 *
 * That is the whole bug when the attribute is on a full-bleed overlay: the
 * page glides everywhere else and hard-steps through that one section, and
 * Lenis resyncs from the native scroll on the way out. So the attribute must
 * be present ONLY at the sizes where the element is genuinely a nested
 * scroller — hence this hook, matched to the element's own CSS breakpoint.
 *
 * Never put a bare `data-lenis-prevent` on something that is not, right now,
 * an overflowing scroll container.
 */
export function useMedia(query: string) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const mq = matchMedia(query)
    const sync = () => setOn(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])
  return on
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
