/** Homepage slider-hero configuration (shared client + server). */
export interface HeroSlide {
  src: string
  alt: string
}

export interface HeroConfig {
  slides: HeroSlide[]
  kicker?: string
  title1?: string
  title2?: string
  subtitle?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

/** Coerce arbitrary JSON into a safe HeroConfig (used on save + read). */
export function sanitizeHeroConfig(input: unknown): HeroConfig {
  const c = (input ?? {}) as Record<string, unknown>
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v : undefined
  const slides = Array.isArray(c.slides)
    ? (c.slides as unknown[])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && typeof (s as Record<string, unknown>).src === 'string')
        .map((s) => ({ src: String(s.src), alt: String(s.alt ?? '') }))
        .slice(0, 12)
    : []
  return {
    slides,
    kicker: str(c.kicker),
    title1: str(c.title1),
    title2: str(c.title2),
    subtitle: str(c.subtitle),
    primaryLabel: str(c.primaryLabel),
    primaryHref: str(c.primaryHref),
    secondaryLabel: str(c.secondaryLabel),
    secondaryHref: str(c.secondaryHref),
  }
}
