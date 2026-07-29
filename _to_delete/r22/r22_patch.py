import io, sys, os

ROOT = None
for d in os.listdir('/sessions'):
    p = f'/sessions/{d}/mnt/dtech-showroom'
    if os.path.isdir(p):
        ROOT = p
assert ROOT, 'project root not found'

def patch(rel, pairs):
    path = os.path.join(ROOT, rel)
    src = io.open(path, encoding='utf-8', newline='').read()
    for old, new in pairs:
        n = src.count(old)
        assert n == 1, f'{rel}: expected 1 match, got {n} for:\n{old[:120]}'
        src = src.replace(old, new)
    io.open(path, 'w', encoding='utf-8', newline='').write(src)
    print('patched', rel)

# ───────────────────────── 1. ed-scroll.ts ─────────────────────────
IDLE = '''/**
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

function register(fx: Fx<unknown>) {'''

patch('src/components/editorial/ed-scroll.ts', [
    ("import { useEffect, useRef } from 'react'",
     "import { useEffect, useRef, useState } from 'react'"),

    ('function register(fx: Fx<unknown>) {', IDLE),

    ("""    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule, { passive: true })""",
     """    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', schedule, { passive: true })"""),

    ("""      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)""",
     """      removeEventListener('scroll', onScroll)
      removeEventListener('resize', schedule)
      if (idleT) {
        clearTimeout(idleT)
        idle()
      }"""),
])

MEDIA = '''
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
 * ROUND 21 — pause a heavy scene while it is off screen.'''

patch('src/components/editorial/ed-scroll.ts', [
    ('\n/**\n * ROUND 21 — pause a heavy scene while it is off screen.', MEDIA),
])

# ───────────────────── 2. EditorialSections.tsx ─────────────────────
patch('src/components/editorial/EditorialSections.tsx', [
    ("import { setVar, useAnimGate, useScrollFx } from './ed-scroll'",
     "import { setVar, useAnimGate, useMedia, useScrollFx } from './ed-scroll'"),

    ("""  /* ROUND 21d — no useScrollP (static band, see editorial-design.css). */
  const ref = useRef<HTMLElement | null>(null)
  const refsCount""",
     """  /* ROUND 21d — no useScrollP (static band, see editorial-design.css). */
  const ref = useRef<HTMLElement | null>(null)
  /* ROUND 22 — only below 1080px is .hist-in an actual scroller. See the
     data-lenis-prevent note on it below, and useMedia in ed-scroll.ts. */
  const nested = useMedia('(max-width: 1080px)')
  const refsCount"""),

    ("""      {/* data-lenis-prevent: below 1080px this becomes a nested scroller, and
          Lenis (smoothWheel, allowNestedScroll:false) would otherwise eat the
          wheel and scroll the page past the band instead. */}
      <div className="hist-in" data-lenis-prevent>""",
     """      {/* ROUND 22 — the attribute is now CONDITIONAL, and this was the lag.
          `.hist-in` is `position: absolute; inset: 0` — it covers the entire
          78vh band at every width — but it only becomes a nested scroller
          below 1080px. Carrying `data-lenis-prevent` unconditionally meant
          that on a desktop viewport every wheel event aimed anywhere at this
          section made Lenis bail out before preventDefault(), handing the
          scroll back to the browser in raw 120px steps while the rest of the
          page glided at lerp .13 — then snapping back as the pointer left.
          Measured numbers are in the useMedia doc comment in ed-scroll.ts. */}
      <div className="hist-in" {...(nested ? { 'data-lenis-prevent': '' } : null)}>"""),
])

# ───────────────────── 3. editorial-design.css ─────────────────────
MARK_OLD = "animation: edd-mark-colors 9s linear infinite; will-change: background-position; contain: paint; }"
MARK_NEW = "animation: edd-mark-colors 9s linear infinite; contain: paint; }"

GMARK_OLD = "animation: edd-mesh 5s linear infinite; will-change: background-position; contain: paint; }"
GMARK_NEW = "animation: edd-mesh 5s linear infinite; contain: paint; }"

R22_NOTE = """/* ROUND 22 — the r21c comment above is WRONG and the fix it describes never
   happened: `will-change` only promotes a layer for properties Chrome can
   composite (transform, opacity, filter, backdrop-filter, translate, scale,
   rotate). `background-position` is not one of them, so
   `will-change: background-position` was a hint Blink ignores — the marks
   were never on their own layer, and the per-frame glyph repaint has been
   landing in the shared tile all along. `contain: paint` is what has
   actually been bounding the damage, so it stays; the dead hint is gone.
   An animated text gradient CANNOT be composited, full stop. So instead of
   paying for it during the only moments it costs anything, it is frozen for
   the length of each wheel gesture — see `onScroll` in ed-scroll.ts. A 9s
   colour cycle pausing for the ~1s you spend scrolling past is invisible;
   repainting a 98px gradient wordmark on top of a full-bleed photograph at
   60fps on an Intel UHD is not. */
.ed-scrolling .editorial-root .hist-mark,
.ed-scrolling .editorial-root .gmark { animation-play-state: paused; }
"""

patch('src/styles/editorial-design.css', [
    (MARK_OLD, MARK_NEW),
    (GMARK_OLD, GMARK_NEW),
    ("@keyframes edd-mark-colors { to { background-position: 300% 0; } }\n",
     "@keyframes edd-mark-colors { to { background-position: 300% 0; } }\n" + R22_NOTE),

    # .hist-cta: glass over a backdrop that now MOVES every frame (r21e parallax)
    ("border: 1px solid rgba(255, 255, 255, .28); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 13px; font-weight: 600; color: #fff; transition: background .25s, border-color .25s, transform .25s var(--ease2); }",
     "border: 1px solid rgba(255, 255, 255, .28); font-size: 13px; font-weight: 600; color: #fff; transition: background .25s, border-color .25s, transform .25s var(--ease2); }"),

    (".editorial-root .hist-cta { align-self: flex-start; display: inline-flex; align-items: center; gap: 9px; margin-top: 6px; padding: 11px 19px; border-radius: 999px; background: rgba(255, 255, 255, .1);",
     """/* ROUND 22 — no backdrop-filter here. r21e put the band photo back in
   motion (compositor-driven parallax), and a backdrop-filter over a backdrop
   that changes every frame has to be re-run every frame — it forces the
   whole backdrop root into a texture and re-blurs it. Glass at rest is free
   on this site (measured: lorolabs runs more of it than we do); glass over
   something moving is not. A slightly stronger flat tint is indistinguishable
   against a dark photograph. */
.editorial-root .hist-cta { align-self: flex-start; display: inline-flex; align-items: center; gap: 9px; margin-top: 6px; padding: 11px 19px; border-radius: 999px; background: rgba(255, 255, 255, .16);"""),
])

print('ALL PATCHES APPLIED')
