import { getTranslations } from 'next-intl/server'
import { HeroCanvasIsland } from './HeroCanvasIsland'
import { HeroOverlay } from './HeroOverlay'

/**
 * Public-homepage hero — full-bleed particle sphere atmosphere.
 *
 * Server Component. SSR renders the section frame + overlay text (so the
 * eyebrow/headline/subhead/CTA are crawlable before hydration). The 3D
 * Canvas is mounted by `HeroCanvasIsland`, a client island that decides
 * between the live scene and the reduced-motion fallback.
 *
 * Layout assumptions:
 *   - The locale layout's <main> has no max-width / padding (verified)
 *   - SiteHeader is conditionally rendered transparent + fixed on '/'
 *     so the Hero appears full-bleed behind it
 */
export async function Hero() {
  const t = await getTranslations('hero')

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-[#050308] min-h-screen min-h-[100dvh]"
      aria-label={t('ariaLabel')}
    >
      {/* Layer 3 — CSS grid pattern (background-image), masked to fade
          out toward the edges. Pointer-events:none so the canvas owns
          cursor input. Sits BEHIND the canvas in stacking order — its
          subtle lines bleed through the deep-void background while
          being washed out by the bloom near the sphere. Opacity is
          driven by HeroScene's scroll tick via a CSS variable so it
          fades on the same schedule as the sphere itself. */}
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-0 z-0"
        style={{
          opacity: 'var(--hero-grid-opacity, 1)',
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          maskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      {/* Layers 1 + 2 + sphere — all live inside the Canvas */}
      <div className="absolute inset-0 z-10">
        <HeroCanvasIsland ariaLabel={t('ariaLabel')} />
      </div>

      {/* HTML typography overlay — split headline (cyan D) + subhead +
          CTA + scroll cue. The visible headline IS the document's
          single <h1>; no sr-only duplicate. */}
      <HeroOverlay
        headlinePrefix={t('headlinePrefix')}
        headlineRest={t('headlineRest')}
        subhead={t('subhead')}
        primaryCTA={t('primaryCTA')}
        scrollCue={t('scrollCue')}
      />
    </section>
  )
}
