'use client'

/**
 * HomeShowcase — D-Tech Algérie "Nightline" design
 *
 * Ported from the standalone reference in C:\Users\abdel\Downloads\Dtech
 * (D-Tech - Nightline.html + nightline-app.jsx + nightline-sections.jsx +
 * nightline-styles.css + showcase-data.jsx).
 *
 * Sections: Nav · Hero (3D glass-card stack) · Categories · Brands ·
 * Catalog (filter + pagination) · About + timeline · Contact + map ·
 * Footer. All CSS lives in ./home-showcase.css under the
 * `.home-showcase-root` scope so it doesn't bleed into the v2 admin.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import './home-showcase.css'

import Image from 'next/image'
import { useCart, WHATSAPP_NUMBER } from '@/lib/cart'
import { SpecsToggle } from '@/components/product/SpecsToggle'
import { CartDrawer } from '@/components/showroom/CartDrawer'
import { FloatingCart } from '@/components/showroom/FloatingCart'
import { FooterNewsletter } from '@/components/forms/FooterNewsletter'
import { seededRating } from '@/lib/reviews'
import { Stars } from '@/components/showroom/Stars'
import { Carousel } from '@/components/showroom/Carousel'
import { SiteNav, Logo } from '@/components/showroom/SiteNav'
import { PartnerBand } from './PartnerBand'
import type { PartnerBandData } from '@/server/partner-band'

export type IconKind =
  | 'desktop'
  | 'laptop'
  | 'aio'
  | 'tablet'
  | 'phone'
  | 'print'
  | 'network'
  | 'parts'
  | 'gaming'

/** Lightweight catalogue rows the server page passes down. */
export interface HomeProduct {
  slug: string
  name: string
  brandName: string
  categorySlug: string
  categoryName: string
  cardSpec: string
  cardImagePath: string
  featured: boolean
  specs?: Record<string, string | number | string[]>
}

export interface HomeCategory {
  slug: string
  name: string
  count: number
  icon: IconKind
}

export interface HomeBrand {
  slug: string
  name: string
  count: number
}

import type { HeroConfig } from './hero-config'
import { EditProvider, Editable, EditableLink, SectionList, type EditData } from '@/components/site-edit/edit-context'

export function HomeShowcase({
  products,
  productCount,
  categories,
  brands,
  partner = null,
  heroConfig = null,
  content = {},
}: {
  /** Featured shortlist only — the full catalogue lives on /products. */
  products: HomeProduct[]
  /** Total published products (for counters/copy), not products.length. */
  productCount: number
  categories: HomeCategory[]
  brands: HomeBrand[]
  /** Partner spotlight, derived from the catalogue. Null hides the section. */
  partner?: PartnerBandData | null
  heroConfig?: HeroConfig | null
  content?: Partial<EditData>
}) {
  // Hero slides come ONLY from the images uploaded in the admin interface
  // (Slider Hero / éditeur — same source as the Brand design). When nothing
  // has been uploaded yet, the slider shows a branded D-Tech panel.
  const heroSlides = heroConfig?.slides ?? []

  useEffect(() => {
    document.body.dataset.homeChrome = 'showcase'
    return () => {
      delete document.body.dataset.homeChrome
    }
  }, [])

  return (
    <EditProvider initial={content}>
    <div className="home-showcase-root">
      <div className="bg-ambient" />
      <div className="bg-grid" />
      <div className="bg-orb a" />
      <div className="bg-orb b" />
      <div className="bg-orb c" />

      <SiteNav variant="home" />
      {/* Not a <main>: the locale layout already renders <main id="main-content">. */}
      <div role="presentation">
        <SectionList
          defaultOrder={['hero', 'categories', 'catalog', 'services', 'brands', 'partner', 'about', 'contact']}
          nodes={{
            hero: <HeroSlider slides={heroSlides} />,
            categories: <CategoriesSection categories={categories} />,
            catalog: (
              <FeaturedSection
                products={products}
                productCount={productCount}
                categories={categories}
                brandCount={brands.length}
              />
            ),
            services: <ServicesStrip />,
            brands: <BrandsSection brands={brands} />,
            partner: <PartnerSection partner={partner} />,
            about: <AboutSection productCount={productCount} brandCount={brands.length} categoryCount={categories.length} />,
            contact: <ContactSection />,
          }}
        />
      </div>
      <Footer />
      <CartDrawer />
      <FloatingCart />
    </div>
    </EditProvider>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Hooks + helpers
 * ──────────────────────────────────────────────────────────────── */

function useFade<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Safety: if the element is already in (or near) the viewport on mount,
    // reveal it right away. Avoids the section staying invisible when the
    // IntersectionObserver's threshold isn't met (e.g. on initial paint).
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) {
      el.classList.add('in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('in')
            io.unobserve(el)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    // Last-resort fallback — if we never trigger after 4s, just reveal.
    const fallback = window.setTimeout(() => el.classList.add('in'), 4000)
    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])
  return ref
}

function Counter({
  to,
  suffix = '',
  prefix = '',
}: {
  to: number
  suffix?: string
  prefix?: string
}) {
  const locale = useLocale()
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true
            if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
              setV(to)
              return
            }
            const start = performance.now()
            const dur = 1600
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / dur)
              const eased = 1 - Math.pow(1 - p, 3)
              setV(Math.round(to * eased))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return (
    <span ref={ref}>
      {prefix}
      {v.toLocaleString(
        locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-DZ' : 'en-US'
      )}
      {suffix}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Hero — 3D floating glass-card stack
 * ──────────────────────────────────────────────────────────────── */

function HeroSlider({
  slides,
}: {
  slides: { src: string; alt: string }[]
}) {
  const locale = useLocale()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const real = slides.length > 0 ? slides : [{ src: '', alt: '' }]
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  // Auto-advance only when there are multiple slides, the visitor hasn't
  // paused, and reduced-motion isn't requested (WCAG 2.2.2).
  useEffect(() => {
    if (real.length <= 1 || paused || reduced) return
    const id = setInterval(() => setIdx((v) => (v + 1) % real.length), 4500)
    return () => clearInterval(id)
  }, [real.length, paused, reduced])
  const slideLabel = (n: number) =>
    locale === 'ar' ? `الشريحة ${n}` : locale === 'fr' ? `Diapositive ${n}` : `Slide ${n}`
  const carouselLabel = locale === 'ar' ? 'لافتة' : locale === 'fr' ? 'Bannière' : 'Banner'
  const pauseLabel = locale === 'ar' ? 'إيقاف مؤقت' : locale === 'fr' ? 'Mettre en pause' : 'Pause'
  const playLabel = locale === 'ar' ? 'تشغيل' : locale === 'fr' ? 'Lecture' : 'Play'
  const prevLabel = locale === 'ar' ? 'السابق' : locale === 'fr' ? 'Précédent' : 'Previous'
  const nextLabel = locale === 'ar' ? 'التالي' : locale === 'fr' ? 'Suivant' : 'Next'
  const go = (n: number) => setIdx((n + real.length) % real.length)

  // Full-bleed image hero: the slider IS the hero section. No copy, no CTA —
  // the uploaded slides carry the message (admin → Slider Hero).
  return (
    <section className="hero hero-full" id="top">
      <div
        className="hero-slider"
        role="group"
        aria-roledescription="carousel"
        aria-label={carouselLabel}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {real.map((sl, i) => (
          <div key={i} className={`hero-slide ${i === idx ? 'is-active' : ''}`}>
            {sl.src ? (
              <Image
                src={sl.src}
                alt={sl.alt}
                fill
                sizes="100vw"
                priority={i === 0}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                quality={82}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="hero-slide-brand" aria-hidden>
                <span className="hsb-mark">
                  D-Tech<span className="dot">.</span>
                </span>
                <span className="hsb-tag">Algérie · Digital Technologie</span>
              </div>
            )}
          </div>
        ))}
        <div className="hero-slider-veil" />
        {real.length > 1 && (
          <>
            <button
              type="button"
              className="hero-slider-arrow prev"
              aria-label={prevLabel}
              onClick={() => go(idx - 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button
              type="button"
              className="hero-slider-arrow next"
              aria-label={nextLabel}
              onClick={() => go(idx + 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
            <div className="hero-slider-dots">
              <button
                type="button"
                className="hero-slider-play"
                aria-label={paused ? playLabel : pauseLabel}
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" /></svg>
                )}
              </button>
              {real.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === idx ? 'is-active' : ''}
                  onClick={() => setIdx(i)}
                  aria-label={slideLabel(i + 1)}
                  aria-current={i === idx ? 'true' : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Category icons
 * ──────────────────────────────────────────────────────────────── */

function CatIcon({ kind, size = 26 }: { kind: IconKind; size?: number }) {
  const props: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  switch (kind) {
    case 'desktop':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="13" rx="1" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )
    case 'laptop':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="12" rx="1" />
          <path d="M2 20h20" />
        </svg>
      )
    case 'aio':
      return (
        <svg {...props}>
          <rect x="2" y="4" width="20" height="14" rx="1" />
          <path d="M8 22h8M12 18v4M2 14h20" />
        </svg>
      )
    case 'tablet':
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M11 18h2" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...props}>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <path d="M11 19h2" />
        </svg>
      )
    case 'print':
      return (
        <svg {...props}>
          <rect x="6" y="3" width="12" height="6" />
          <rect x="3" y="9" width="18" height="9" rx="1" />
          <rect x="6" y="14" width="12" height="6" />
          <circle cx="18" cy="12.5" r="0.6" fill="currentColor" />
        </svg>
      )
    case 'network':
      return (
        <svg {...props}>
          <circle cx="12" cy="18" r="2" />
          <path d="M6 12a8 8 0 0112 0M3 8a14 14 0 0118 0M9 15a5 5 0 016 0" />
        </svg>
      )
    case 'parts':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
          <rect x="8" y="8" width="8" height="8" />
          <path d="M8 2v2M16 2v2M8 20v2M16 20v2M2 8h2M2 16h2M20 8h2M20 16h2" />
        </svg>
      )
    case 'gaming':
      return (
        <svg {...props}>
          <path d="M6 11h4M8 9v4" />
          <circle cx="15" cy="11" r="1" />
          <circle cx="17.5" cy="13" r="0.8" />
          <rect x="2" y="6" width="20" height="12" rx="4" />
        </svg>
      )
  }
}

/* ─────────────────────────────────────────────────────────────────
 * Categories section
 * ──────────────────────────────────────────────────────────────── */

function CategoriesSection({ categories }: { categories: HomeCategory[] }) {
  const t = useTranslations('showcase.categories')
  const tCar = useTranslations('showcase.catalog')
  const ref = useFade<HTMLDivElement>()
  return (
    <section id="categories" className="sec">
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <Editable as="span" id="home.categories.kicker" className="kicker" style={{ marginBottom: 12 }} label="Sur-titre — Catégories">
              {t('kicker', { count: categories.length })}
            </Editable>
            <h2 className="h-big">
              <Editable id="home.categories.title1" label="Titre — Catégories">{t('title1')}</Editable>
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                <Editable id="home.categories.title2" label="Titre (accent) — Catégories">{t('title2')}</Editable>
              </span>
            </h2>
            <p className="sub"><Editable id="home.categories.sub" label="Sous-titre — Catégories">{t('sub')}</Editable></p>
          </div>
          <EditableLink
            id="home.categories.viewAll"
            label={t('viewAll')}
            href="/categories"
            className="btn btn-ghost btn-sm"
            editLabel="Bouton — Voir catégories"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </EditableLink>
        </div>

        <div className="cat-lane">
          <Carousel variant="chips" prevLabel={tCar('prevAria')} nextLabel={tCar('nextAria')}>
          {categories.map((c, i) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="cat"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="ix">
                {String(i + 1).padStart(2, '0')} /{' '}
                {String(categories.length).padStart(2, '0')}
              </div>
              <div className="ic">
                <CatIcon kind={c.icon} size={26} />
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div className="name">{c.name}</div>
                <div className="count">
                  {t('countLabel', { count: c.count })}
                </div>
              </div>
              <span className="arr">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </span>
            </Link>
          ))}
          </Carousel>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Brands section
 * ──────────────────────────────────────────────────────────────── */

function BrandsSection({ brands }: { brands: HomeBrand[] }) {
  const t = useTranslations('showcase.brands')
  const tCat = useTranslations('showcase.categories')
  const tCar = useTranslations('showcase.catalog')
  const ref = useFade<HTMLDivElement>()
  return (
    <section id="brands" className="sec" style={{ paddingTop: 0 }}>
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <Editable as="span" id="home.brands.kicker" className="kicker" style={{ marginBottom: 12 }} label="Sur-titre — Marques">
              {t('kicker')}
            </Editable>
            <h2 className="h-big">
              <Editable id="home.brands.title1" label="Titre — Marques">{t('title1', { count: brands.length })}</Editable>
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                <Editable id="home.brands.title2" label="Titre (accent) — Marques">{t('title2')}</Editable>
              </span>
            </h2>
            <p className="sub"><Editable id="home.brands.sub" label="Sous-titre — Marques">{t('sub')}</Editable></p>
          </div>
          <EditableLink
            id="home.brands.viewAll"
            label={t('viewAll')}
            href="/brands"
            className="btn btn-ghost btn-sm"
            editLabel="Bouton — Voir marques"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </EditableLink>
        </div>

        <div className="brand-lane">
          <Carousel variant="chips" prevLabel={tCar('prevAria')} nextLabel={tCar('nextAria')}>
          {brands.map((b, i) => (
            <Link
              key={b.slug}
              className="brand"
              style={{ animationDelay: `${i * 50}ms` }}
              href={`/brands/${b.slug}`}
            >
              <div className="ix">{String(i + 1).padStart(2, '0')}</div>
              <div className="logo">{b.name}</div>
              <div className="cats">{tCat('countLabel', { count: b.count })}</div>
            </Link>
          ))}
          </Carousel>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Device illustrations for product cards
 * ──────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
 * Catalog (filterable + paginated)
 * ──────────────────────────────────────────────────────────────── */

/**
 * Featured products teaser. The full 393-product catalogue moved to
 * /products (URL-driven filters, server-side paging, indexable) — shipping
 * every row into the homepage payload was the single biggest cause of the
 * "site feels heavy" complaint. This section keeps the homepage commercial
 * with a short shortlist plus category entry points into /products.
 */
function FeaturedSection({
  products,
  productCount,
  categories,
  brandCount,
}: {
  products: HomeProduct[]
  productCount: number
  categories: HomeCategory[]
  brandCount: number
}) {
  const t = useTranslations('showcase.catalog')
  const tf = useTranslations('showroom.featured')
  const ref = useFade<HTMLDivElement>()

  return (
    <section id="products" className="sec">
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <Editable as="span" id="home.catalog.kicker" className="kicker" style={{ marginBottom: 12 }} label="Sur-titre — Catalogue">
              {t('kicker', {
                products: productCount,
                categories: categories.length,
                brands: brandCount,
              })}
            </Editable>
            <h2 className="h-big">
              <Editable id="home.catalog.title1" label="Titre — Catalogue">{t('title1')}</Editable>
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                <Editable id="home.catalog.title2" label="Titre (accent) — Catalogue">{t('title2')}</Editable>
              </span>
            </h2>
            <p className="sub"><Editable id="home.catalog.sub" label="Sous-titre — Catalogue">{t('sub')}</Editable></p>
          </div>
          <Link href="/products" className="btn btn-primary hs-seeall-top">
            <span className="shimmer" />
            {tf('seeAll', { count: productCount })}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="catalog-chips">
          <Carousel
            variant="chips"
            prevLabel={t('prevAria')}
            nextLabel={t('nextAria')}
          >
            <Link href="/products" className="cat-chip">
              {t('all')}
              <span className="ct">{productCount}</span>
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={{ pathname: '/products', query: { category: c.slug } }}
                className="cat-chip"
              >
                <CatIcon kind={c.icon} size={14} />
                {c.name}
                <span className="ct">{c.count}</span>
              </Link>
            ))}
          </Carousel>
        </div>

        <div className="prod-grid" style={{ marginTop: 22 }}>
          {products.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              animationDelay={(i % 8) * 40}
            />
          ))}
        </div>

        <div className="hs-seeall">
          <Link href="/products" className="btn btn-primary btn-lg">
            <span className="shimmer" />
            {tf('browseAll')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <span className="hs-seeall-note">{tf('note', { count: productCount })}</span>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Partner spotlight (classic skin wrapper)
 * ──────────────────────────────────────────────────────────────── */

/**
 * Wraps the shared band with `<Editable>` nodes so the headline, sub-text and
 * button label are editable through the inline site editor. The tiles are NOT
 * editable by design — they're generated from the catalogue, so editing them
 * by hand is how they'd end up pointing at products that no longer exist.
 */
function PartnerSection({ partner }: { partner: PartnerBandData | null }) {
  const t = useTranslations('showroom.partner')
  if (!partner) return null
  const brand = partner.brandName

  return (
    <PartnerBand
      brandSlug={partner.brandSlug}
      brandName={brand}
      logoPath={partner.logoPath}
      accent={partner.accent}
      accentDeep={partner.accentDeep}
      eyebrow={
        <Editable id="home.partner.eyebrow" label="Sur-titre — Partenaire">
          {t('eyebrow', { brand })}
        </Editable>
      }
      partnerLine={
        <Editable id="home.partner.line" label="Ligne partenaire">
          {t('partnerLine', { brand })}
        </Editable>
      }
      heading={
        <>
          <Editable id="home.partner.title1" label="Titre — Partenaire (ligne 1)">
            {t('title1', { brand })}
          </Editable>{' '}
          <Editable id="home.partner.title2" label="Titre — Partenaire (ligne 2)">
            {t('title2', { brand })}
          </Editable>
        </>
      }
      sub={
        <Editable id="home.partner.sub" label="Texte — Partenaire">
          {t('sub', { brand })}
        </Editable>
      }
      ctaLabel={
        <Editable id="home.partner.cta" label="Bouton — Partenaire">
          {t('cta', { brand })}
        </Editable>
      }
      tiles={partner.tiles.map((tile) => ({
        ...tile,
        sub: t('tileSub', { count: Number(tile.sub) }),
      }))}
    />
  )
}

function ProductCard({
  product,
  animationDelay,
}: {
  product: HomeProduct
  animationDelay: number
}) {
  const t = useTranslations('showcase.catalog')
  const tProd = useTranslations('showroom.product')
  const add = useCart((st) => st.add)
  const openCart = useCart((st) => st.setOpen)
  const [added, setAdded] = useState(false)
  const rating = seededRating(product.slug)
  const onAdd = () => {
    add({
      slug: product.slug,
      name: product.name,
      brand: product.brandName,
      image: product.cardImagePath,
    })
    setAdded(true)
    window.setTimeout(() => {
      setAdded(false)
      openCart(true)
    }, 650)
  }
  return (
    <article
      className="prod"
      style={{ animationDelay: `${animationDelay}ms`, position: 'relative' }}
    >
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />
      <div className="canvas">
        <Image
          src={product.cardImagePath}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 300px, 50vw"
          style={{ objectFit: 'cover' }}
        />
        <span className="brand-tag" style={{ zIndex: 2 }}>{product.brandName}</span>
        {product.featured && <span className="badge" style={{ zIndex: 2 }}>★</span>}
      </div>
      <div className="info">
        <span className="cat-lbl">{product.categoryName}</span>
        <span className="name">{product.name}</span>
        <span className="specs" dir="ltr">{product.cardSpec}</span>
        <div className="price-row">
          <Stars value={rating.avg} count={rating.count} />
          <span className="stock">{t('inStock')}</span>
        </div>
        <SpecsToggle specs={product.specs} tone="dark" variant="inline" />
        <div className="card-actions">
        <button
          type="button"
          className={`cart-btn ${added ? 'added' : ''}`}
          aria-label={t('addAria')}
          onClick={onAdd}
        >
          {added ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l5 5L20 6" />
              </svg>
              {t('added')}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2" />
              </svg>
              {t('addToCart')}
            </>
          )}
        </button>
        <a
          className="wa-mini"
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`${tProd('waProduct')} ${product.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          title="WhatsApp"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.2 8.2 0 01-2.4-1.49 9 9 0 01-1.66-2.07c-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 01-4.8-1.32l-.34-.2-3.56.93.95-3.47-.22-.36a9.42 9.42 0 1117.46-4.99 9.4 9.4 0 01-9.48 9.41zm8.03-17.43A11.32 11.32 0 0012.03.75C5.83.75.78 5.8.78 12a11.2 11.2 0 001.5 5.62L.69 23.25l5.77-1.51a11.27 11.27 0 005.57 1.47h.01c6.2 0 11.25-5.05 11.25-11.25 0-3.01-1.17-5.83-3.22-7.89z" />
          </svg>
        </a>
        </div>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Services / trust strip
 * ──────────────────────────────────────────────────────────────── */

function ServicesStrip() {
  const t = useTranslations('showcase.services')
  const ref = useFade<HTMLDivElement>()
  const iconProps: SVGProps<SVGSVGElement> = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  const items = [
    {
      icon: (
        <svg {...iconProps}>
          <path d="M1 8h11v8H1zM12 10h4l3 3v3h-7z" />
          <circle cx="5.5" cy="17.5" r="1.8" />
          <circle cx="15.5" cy="17.5" r="1.8" />
        </svg>
      ),
      tt: t('s1t'), ds: t('s1d'), idt: 'home.services.s1t', idd: 'home.services.s1d', lb: 'Livraison',
    },
    {
      icon: (
        <svg {...iconProps}>
          <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      tt: t('s2t'), ds: t('s2d'), idt: 'home.services.s2t', idd: 'home.services.s2d', lb: 'Garantie',
    },
    {
      icon: (
        <svg {...iconProps}>
          <path d="M14.7 6.3a4.5 4.5 0 00-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 006-6L14 13l-3-3z" />
        </svg>
      ),
      tt: t('s3t'), ds: t('s3d'), idt: 'home.services.s3t', idd: 'home.services.s3d', lb: 'SAV',
    },
    {
      icon: (
        <svg {...iconProps}>
          <circle cx="12" cy="9" r="6" />
          <path d="M9 14l-1.5 7L12 18.5 16.5 21 15 14M9.5 9l1.8 1.8L15 7.2" />
        </svg>
      ),
      tt: t('s4t'), ds: t('s4d'), idt: 'home.services.s4t', idd: 'home.services.s4d', lb: 'Partenaires',
    },
  ]
  return (
    <section id="services" className="sec svc-sec">
      <div ref={ref} className="wrap fade">
        <div className="svc-grid">
          {items.map((it) => (
            <div className="svc" key={it.idt}>
              <span className="ic">{it.icon}</span>
              <div style={{ minWidth: 0 }}>
                <Editable as="div" id={it.idt} className="tt" label={`Titre — ${it.lb}`}>
                  {it.tt}
                </Editable>
                <Editable as="div" id={it.idd} className="ds" label={`Texte — ${it.lb}`}>
                  {it.ds}
                </Editable>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * About + timeline
 * ──────────────────────────────────────────────────────────────── */

function AboutSection({
  productCount,
  brandCount,
  categoryCount,
}: {
  productCount: number
  brandCount: number
  categoryCount: number
}) {
  const t = useTranslations('showcase.about')
  const ref = useFade<HTMLDivElement>()
  const strong = (chunks: ReactNode) => <strong>{chunks}</strong>
  return (
    <section id="about" className="sec">
      <div ref={ref} className="wrap fade about-grid">
        <div className="about-text">
          <Editable as="span" id="home.about.kicker" className="kicker" style={{ marginBottom: 14 }} label="Sur-titre — À propos">
            {t('kicker')}
          </Editable>
          <h2 className="h-big">
            <Editable id="home.about.title1" label="Titre — À propos">{t('title1')}</Editable>
            <br />
            <span className="serif-i" style={{ color: 'var(--cyan)' }}>
              <Editable id="home.about.title2" label="Titre (accent) — À propos">{t('title2')}</Editable>
            </span>{' '}
            <Editable id="home.about.title3" label="Titre (fin) — À propos">{t('title3')}</Editable>
          </h2>
          <Editable as="p" id="home.about.p1" label="Paragraphe 1 — À propos">{t.rich('p1', { strong })}</Editable>
          <Editable as="p" id="home.about.p2" label="Paragraphe 2 — À propos">{t.rich('p2', { strong })}</Editable>

          <div className="about-stats">
            <div className="about-stat">
              <div className="v">
                <span className="accent">
                  <Counter to={2006} />
                </span>
              </div>
              <div className="l">{t('stats.founded')}</div>
            </div>
            <div className="about-stat">
              <div className="v">
                <span className="accent">
                  <Counter to={categoryCount} />
                </span>
              </div>
              <div className="l">{t('stats.families')}</div>
            </div>
            <div className="about-stat">
              <div className="v">
                <Counter to={brandCount} />
                <span className="accent"> {t('stats.brandsSuffix')}</span>
              </div>
              <div className="l">{t('stats.partners')}</div>
            </div>
            <div className="about-stat">
              <div className="v">
                <Counter to={productCount} />
                <span className="accent"> {t('stats.skuSuffix')}</span>
              </div>
              <div className="l">{t('stats.sku')}</div>
            </div>
          </div>
        </div>

        <div className="about-visual">
          <div className="timeline">
            <TLItem year="2006" title={t('timeline.t1Title')} desc={t('timeline.t1Desc')} />
            <TLItem year="2012" title={t('timeline.t2Title')} desc={t('timeline.t2Desc')} />
            <TLItem year="2017" title={t('timeline.t3Title')} desc={t('timeline.t3Desc')} />
            <TLItem year="2022" title={t('timeline.t4Title')} desc={t('timeline.t4Desc')} />
            <TLItem
              year="2026"
              title={t('timeline.t5Title', { count: productCount })}
              desc={t('timeline.t5Desc')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function TLItem({ year, title, desc }: { year: string; title: string; desc: string }) {
  return (
    <div className="tl-item">
      <div className="yr">{year}</div>
      <div className="ttl">{title}</div>
      <div className="d">{desc}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Contact + map
 * ──────────────────────────────────────────────────────────────── */

type ContactTab = 'show' | 'comm' | 'sav'

interface TabContent {
  phone: string
  email: string
  addr: string
  hours: string
}

// Locale-independent contact details. Display strings live in the
// `showcase.contact` translation namespace.
const TAB_EMAILS: Record<ContactTab, string> = {
  show: 'contact@dtech.dz',
  comm: 'commercial@dtech.dz',
  sav: 'sav@dtech.dz',
}

const TAB_TEL: Record<ContactTab, string> = {
  // Showroom has no direct line — route calls to the sales desk.
  show: '+213560990506',
  comm: '+213560990506',
  sav: '+213561616911',
}

const DAYS: { id: number; key: string; open: string | null; close: string | null }[] = [
  { id: 1, key: 'mon', open: '09:00', close: '17:00' },
  { id: 2, key: 'tue', open: '09:00', close: '17:00' },
  { id: 3, key: 'wed', open: '09:00', close: '17:00' },
  { id: 4, key: 'thu', open: '09:00', close: '17:00' },
  { id: 5, key: 'fri', open: null, close: null },
  { id: 6, key: 'sat', open: null, close: null },
  { id: 0, key: 'sun', open: '09:00', close: '17:00' },
]

function isOpenAt(d: Date): boolean {
  const day = DAYS.find((x) => x.id === d.getDay())
  if (!day?.open || !day.close) return false
  const hm = d.getHours() * 60 + d.getMinutes()
  const [oh = 0, om = 0] = day.open.split(':').map(Number)
  const [ch = 0, cm = 0] = day.close.split(':').map(Number)
  return hm >= oh * 60 + om && hm < ch * 60 + cm
}

function ContactSection() {
  const t = useTranslations('showcase.contact')
  const ref = useFade<HTMLDivElement>()
  const [tab, setTab] = useState<ContactTab>('show')
  const [today, setToday] = useState<number>(-1)
  const [live, setLive] = useState<{ time: string; open: boolean } | null>(null)

  // initialize on the client only to avoid SSR/CSR mismatch
  useEffect(() => {
    const update = () => {
      const d = new Date()
      setToday(d.getDay())
      setLive({
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        open: isOpenAt(d),
      })
    }
    update()
    const id = window.setInterval(update, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const tabData: TabContent = {
    phone: t(`tabData.${tab}.phone`),
    email: TAB_EMAILS[tab],
    addr: t(`tabData.${tab}.addr`),
    hours: t(`tabData.${tab}.hours`),
  }

  return (
    <section id="contact" className="sec">
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <Editable as="span" id="home.contact.kicker" className="kicker" style={{ marginBottom: 12 }} label="Sur-titre — Contact">
              {t('kicker')}
            </Editable>
            <h2 className="h-big">
              <Editable id="home.contact.title1" label="Titre — Contact">{t('title1')}</Editable>
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                <Editable id="home.contact.title2" label="Titre (accent) — Contact">{t('title2')}</Editable>
              </span>
            </h2>
            <p className="sub"><Editable id="home.contact.sub" label="Sous-titre — Contact">{t('sub')}</Editable></p>
          </div>
        </div>

        <div className="contact-v2">
          <MapPanel live={live} />
          <ContactPanel
            tab={tab}
            setTab={setTab}
            tabData={tabData}
            today={today}
            live={live}
          />
        </div>
      </div>
    </section>
  )
}

function MapPanel({ live }: { live: { time: string; open: boolean } | null }) {
  const t = useTranslations('showcase.contact')
  return (
    <div className="map-panel">
      <div className="map-info">
        <span className="live">
          <span className="d" />
          {live
            ? `${live.open ? t('map.open') : t('map.closedNow')} · ${live.time}`
            : t('map.open')}
        </span>
        <div className="name">{t('map.name')}</div>
        <div className="addr">
          {t('map.addr1')}
          <br />
          {t('map.addr2')}
        </div>
        <div className="coords">{t('map.coords')}</div>
      </div>

      <div className="map-compass" aria-hidden>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="20" stroke="rgba(184,239,220,0.25)" />
          <circle cx="22" cy="22" r="14" stroke="rgba(184,239,220,0.15)" />
          <text x="22" y="9" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#7ce0c3" fontWeight="600">N</text>
          <text x="22" y="40" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#8a8f99">S</text>
          <text x="6" y="25" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#8a8f99">W</text>
          <text x="38" y="25" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#8a8f99">E</text>
          <path d="M22 16 L18 26 L22 24 L26 26 Z" fill="#7ce0c3" />
          <path d="M22 16 L18 26 L22 24 L26 26 Z" fill="none" stroke="rgba(124,224,195,0.5)" />
          <circle cx="22" cy="22" r="1.5" fill="#7ce0c3" />
        </svg>
      </div>

      <div className="map-scale">
        <span>{t('map.scale')}</span>
        <div className="bar">
          <span className="s1" />
          <span className="s2" />
          <span className="s3" />
          <span className="s4" />
        </div>
        <div className="ticks">
          <span>0</span>
          <span>200m</span>
          <span>400m</span>
        </div>
      </div>

      <div className="map-legend">
        <div className="row head">{t('map.legend')}</div>
        <div className="row main">
          <span className="sw" />
          {t('map.legendMain')}
        </div>
        <div className="row poi">
          <span className="sw" />
          {t('map.legendPoi')}
        </div>
      </div>

      <svg
        viewBox="0 0 800 640"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden
      >
        <defs>
          <linearGradient id="m2-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06070a" />
            <stop offset="100%" stopColor="#0a0b0f" />
          </linearGradient>
          <linearGradient id="m2-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#13151b" />
            <stop offset="100%" stopColor="#0f1116" />
          </linearGradient>
          <radialGradient id="m2-aura" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(124,224,195,0.28)" />
            <stop offset="60%" stopColor="rgba(124,224,195,0.06)" />
            <stop offset="100%" stopColor="rgba(124,224,195,0)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="800" height="640" fill="url(#m2-sea)" />
        <path
          d="M 0 168 C 90 162, 180 178, 270 168 C 360 158, 450 178, 540 172 C 620 167, 700 175, 800 170 L 800 640 L 0 640 Z"
          fill="url(#m2-land)"
        />
        <path
          d="M 0 168 C 90 162, 180 178, 270 168 C 360 158, 450 178, 540 172 C 620 167, 700 175, 800 170"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.8"
          fill="none"
        />
        <ellipse cx="500" cy="390" rx="170" ry="120" fill="url(#m2-aura)" />

        <g fill="rgba(124,224,195,0.05)" stroke="rgba(124,224,195,0.10)" strokeWidth="0.5">
          <path d="M 260 460 C 240 450, 230 480, 250 500 C 280 514, 320 504, 326 480 C 332 460, 296 446, 260 460 Z" />
          <path d="M 600 240 C 590 232, 578 254, 590 268 C 612 280, 638 270, 638 252 C 638 238, 616 232, 600 240 Z" />
        </g>

        <g fill="rgba(255,255,255,0.025)">
          <rect x="420" y="350" width="24" height="14" rx="1" />
          <rect x="448" y="350" width="18" height="14" rx="1" />
          <rect x="470" y="350" width="22" height="14" rx="1" />
          <rect x="420" y="368" width="20" height="12" rx="1" />
          <rect x="444" y="368" width="26" height="12" rx="1" />
          <rect x="474" y="368" width="18" height="12" rx="1" />
          <rect x="528" y="350" width="30" height="14" rx="1" />
          <rect x="528" y="368" width="22" height="12" rx="1" />
          <rect x="554" y="368" width="16" height="12" rx="1" />
          <rect x="528" y="410" width="20" height="14" rx="1" />
          <rect x="552" y="410" width="24" height="14" rx="1" />
          <rect x="528" y="428" width="32" height="12" rx="1" />
          <rect x="564" y="428" width="14" height="12" rx="1" />
          <rect x="620" y="380" width="22" height="14" rx="1" />
          <rect x="646" y="380" width="18" height="14" rx="1" />
          <rect x="620" y="398" width="14" height="12" rx="1" />
          <rect x="638" y="398" width="26" height="12" rx="1" />
          <rect x="320" y="340" width="20" height="14" rx="1" />
          <rect x="344" y="340" width="18" height="14" rx="1" />
          <rect x="320" y="358" width="24" height="12" rx="1" />
          <rect x="348" y="358" width="14" height="12" rx="1" />
          <rect x="380" y="500" width="22" height="14" rx="1" />
          <rect x="406" y="500" width="18" height="14" rx="1" />
          <rect x="380" y="518" width="14" height="12" rx="1" />
          <rect x="398" y="518" width="26" height="12" rx="1" />
        </g>

        <g fill="none" strokeLinecap="round">
          <path d="M 0 322 C 200 312, 400 342, 800 306" stroke="rgba(0,0,0,0.7)" strokeWidth="6" />
          <path d="M 0 322 C 200 312, 400 342, 800 306" stroke="rgba(255,255,255,0.16)" strokeWidth="3.2" />
          <path d="M 0 322 C 200 312, 400 342, 800 306" stroke="rgba(124,224,195,0.20)" strokeWidth="1" strokeDasharray="6 6" />
          <path d="M 0 232 C 200 224, 400 244, 800 228" stroke="rgba(0,0,0,0.5)" strokeWidth="4" />
          <path d="M 0 232 C 200 224, 400 244, 800 228" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
          <path d="M 0 460 C 200 456, 400 472, 800 458" stroke="rgba(0,0,0,0.5)" strokeWidth="4" />
          <path d="M 0 460 C 200 456, 400 472, 800 458" stroke="rgba(255,255,255,0.09)" strokeWidth="2" />
          <path d="M 280 168 L 296 640" stroke="rgba(0,0,0,0.45)" strokeWidth="3" />
          <path d="M 280 168 L 296 640" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
          <path d="M 500 170 L 524 640" stroke="rgba(0,0,0,0.45)" strokeWidth="3" />
          <path d="M 500 170 L 524 640" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
          <path d="M 660 172 L 700 640" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" />
          <path d="M 660 172 L 700 640" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
          <path d="M 380 322 L 600 322" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
          <path d="M 380 388 L 600 388" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
          <path d="M 440 232 L 460 510" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
        </g>

        <g fontFamily="JetBrains Mono" fontSize="9" fill="rgba(255,255,255,0.32)" letterSpacing="3">
          <text x="400" y="80" textAnchor="middle">{t('map.sea')}</text>
        </g>
        <g fontFamily="JetBrains Mono" fontSize="8" fill="rgba(124,224,195,0.45)" letterSpacing="1.5">
          <text x="120" y="316" textAnchor="middle">A1</text>
        </g>
        <g fontFamily="JetBrains Mono" fontSize="9" fill="rgba(255,255,255,0.22)" letterSpacing="2">
          <text x="500" y="320" textAnchor="middle">{t('map.area')}</text>
        </g>
      </svg>

      <span className="poi-marker" style={{ left: '34%', top: '52%' } as CSSProperties}>
        <span className="dot" />
        <span className="name">{t('map.poiUsthb')}</span>
      </span>
      <span className="poi-marker" style={{ left: '74%', top: '50%' } as CSSProperties}>
        <span className="dot" />
        <span className="name">{t('map.poiMall')}</span>
      </span>
      <span className="poi-marker" style={{ left: '78%', top: '76%' } as CSSProperties}>
        <span className="dot" />
        <span className="name">{t('map.poiAirport')}</span>
      </span>

      <div className="pin-target" style={{ left: '62.5%', top: '61.5%' } as CSSProperties}>
        <span className="crosshair" />
        <span className="pulse" />
        <span className="pulse r2" />
        <span className="pulse r3" />
        <span className="core" />
        <span className="label">{t('map.pin')}</span>
      </div>
    </div>
  )
}

function ContactPanel({
  tab,
  setTab,
  tabData,
  today,
  live,
}: {
  tab: ContactTab
  setTab: (t: ContactTab) => void
  tabData: TabContent
  today: number
  live: { time: string; open: boolean } | null
}) {
  const t = useTranslations('showcase.contact')
  return (
    <div className="contact-panel">
      <div className="contact-hero">
        <div className="grain" />
        <span className="badge">
          {live && !live.open ? t('panel.closedNow') : t('panel.openNow')}
        </span>

        <div className="store-illus">
          <svg viewBox="0 0 400 220" fill="none">
            <defs>
              <linearGradient id="store-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A2A44" />
                <stop offset="100%" stopColor="#0d0e12" />
              </linearGradient>
            </defs>
            <rect x="50" y="40" width="300" height="20" fill="url(#store-grad)" stroke="rgba(124,224,195,0.3)" />
            <text x="200" y="56" textAnchor="middle" fontFamily="Inter" fontSize="14" fontWeight="700" fill="#7ce0c3" letterSpacing="2">D-TECH</text>
            <rect x="50" y="60" width="300" height="140" fill="url(#store-grad)" stroke="rgba(124,224,195,0.2)" />
            <rect x="74" y="76" width="116" height="100" fill="rgba(124,224,195,0.08)" stroke="rgba(124,224,195,0.4)" />
            <line x1="132" y1="76" x2="132" y2="176" stroke="rgba(124,224,195,0.3)" />
            <line x1="74" y1="126" x2="190" y2="126" stroke="rgba(124,224,195,0.2)" />
            <rect x="82" y="88" width="42" height="28" rx="2" fill="rgba(184,239,220,0.18)" />
            <rect x="140" y="88" width="42" height="28" rx="2" fill="rgba(184,239,220,0.10)" />
            <rect x="82" y="138" width="42" height="28" rx="2" fill="rgba(184,239,220,0.10)" />
            <rect x="140" y="138" width="42" height="28" rx="2" fill="rgba(184,239,220,0.18)" />
            <rect x="208" y="100" width="48" height="76" fill="rgba(124,224,195,0.06)" stroke="rgba(124,224,195,0.5)" />
            <circle cx="246" cy="138" r="1.5" fill="#7ce0c3" />
            <rect x="270" y="76" width="60" height="100" fill="rgba(124,224,195,0.06)" stroke="rgba(124,224,195,0.3)" />
            <line x1="300" y1="76" x2="300" y2="176" stroke="rgba(124,224,195,0.2)" />
            <line x1="270" y1="126" x2="330" y2="126" stroke="rgba(124,224,195,0.2)" />
            <rect x="282" y="86" width="36" height="14" rx="2" fill="rgba(124,224,195,0.2)" />
            <text x="300" y="96" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill="#7ce0c3" letterSpacing="1.5">2026</text>
            <line x1="30" y1="200" x2="370" y2="200" stroke="rgba(184,239,220,0.4)" strokeWidth="1.5" />
            <circle cx="100" cy="194" r="3" fill="rgba(184,239,220,0.55)" />
            <rect x="98" y="194" width="4" height="6" rx="1" fill="rgba(184,239,220,0.55)" />
            <circle cx="320" cy="194" r="3" fill="rgba(184,239,220,0.4)" />
            <rect x="318" y="194" width="4" height="6" rx="1" fill="rgba(184,239,220,0.4)" />
            <circle cx="80" cy="20" r="0.8" fill="rgba(184,239,220,0.6)" />
            <circle cx="180" cy="14" r="0.6" fill="rgba(184,239,220,0.5)" />
            <circle cx="290" cy="22" r="0.8" fill="rgba(184,239,220,0.55)" />
            <circle cx="340" cy="14" r="0.5" fill="rgba(184,239,220,0.45)" />
          </svg>
        </div>

        <div className="meta">
          <div className="name">{t('panel.storeName')}</div>
          <div className="since">{t('panel.since')}</div>
        </div>
      </div>

      <div className="contact-tabs">
        <button type="button" className={`contact-tab ${tab === 'show' ? 'on' : ''}`} onClick={() => setTab('show')}>
          {t('tabs.show')}
        </button>
        <button type="button" className={`contact-tab ${tab === 'comm' ? 'on' : ''}`} onClick={() => setTab('comm')}>
          {t('tabs.comm')}
        </button>
        <button type="button" className={`contact-tab ${tab === 'sav' ? 'on' : ''}`} onClick={() => setTab('sav')}>
          {t('tabs.sav')}
        </button>
      </div>

      <div className="contact-body">
        <div className="contact-row">
          <span className="l">{t('rows.phone')}</span>
          <span className="v">{tabData.phone}</span>
        </div>
        <div className="contact-row">
          <span className="l">{t('rows.email')}</span>
          <span className="v">{tabData.email}</span>
        </div>
        <div className="contact-row">
          <span className="l">{t('rows.service')}</span>
          <span className="v">
            {tabData.addr}
            <small>{tabData.hours}</small>
          </span>
        </div>

        <div className="contact-actions">
          <a className="contact-action" href={`tel:${TAB_TEL[tab]}`}>
            <span className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            {t('actions.call')}
          </a>
          <a
            className="contact-action"
            href="https://maps.google.com/?q=Bab+Ezzouar+Alger"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-8-8 18-2-8-8-2z" />
              </svg>
            </span>
            {t('actions.route')}
          </a>
          <a
            className="contact-action"
            href="https://wa.me/213560990506"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.05 4.95a10 10 0 00-14.1 14.14L4 22l3.04-.95a10 10 0 0014.1-14.1zM12 20.5a8.5 8.5 0 01-4.34-1.18l-.31-.18-2.45.76.78-2.39-.2-.32A8.5 8.5 0 1112 20.5zm4.84-6.36c-.27-.13-1.57-.78-1.81-.87-.24-.09-.42-.13-.6.13s-.69.87-.84 1.05c-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.15-1.33-.8-.71-1.33-1.59-1.49-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.52-.44-.45-.6-.46l-.51-.01c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.96 2.58 1.09 2.76.13.18 1.88 2.88 4.57 4.04.64.28 1.14.44 1.53.57.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.27.22-.62.22-1.15.16-1.26-.06-.12-.24-.18-.51-.31z" />
              </svg>
            </span>
            {t('actions.whatsapp')}
          </a>
        </div>

        <div className="hours">
          <h5>{t('hoursTitle')}</h5>
          {DAYS.map((d) => (
            <div
              key={d.id}
              className={`hours-row ${d.id === today ? 'today' : ''} ${d.open ? '' : 'closed'}`}
            >
              <span className="d">
                {t(`days.${d.key}`)}
                {d.id === today ? ` · ${t('today')}` : ''}
              </span>
              <span>{d.open ? `${d.open} – ${d.close}` : t('closed')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Footer
 * ──────────────────────────────────────────────────────────────── */

function Footer() {
  const t = useTranslations('showcase.footer')
  const tShowroom = useTranslations('showroom.footer')
  return (
    <footer>
      <div className="wrap">
        <div className="ft-grid">
          <div className="ft-brand">
            <Logo />
            <Editable as="p" id="home.footer.blurb" label="Texte du pied de page">{t('blurb')}</Editable>
            <div className="ft-socials">
              <a className="icn" aria-label="Facebook" href="https://www.facebook.com/DtechDZ/" target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.4v7A10 10 0 0022 12z" />
                </svg>
              </a>
              <a className="icn" aria-label="Instagram" href="https://www.instagram.com/dtechdz/" target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                </svg>
              </a>
              <a className="icn" aria-label="LinkedIn" href="https://www.linkedin.com/company/d-techalgerie" target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.3 18.3H5.7V10h2.6v8.3zM7 8.7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm11.3 9.6h-2.6V14c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1V18.3h-2.6V10h2.5v1c.4-.6 1.2-1.3 2.5-1.3 1.8 0 2.9 1.2 2.9 3.6v5z" />
                </svg>
              </a>
            </div>
            <FooterNewsletter source="footer-home" />
          </div>
          <FootCol
            title={t('cols.catalog.title')}
            links={[
              { label: tShowroom('allProducts'), internal: '/products' },
              { label: t('cols.catalog.l1'), internal: '/products?category=desktops' },
              { label: t('cols.catalog.l2'), internal: '/products?category=laptops' },
              { label: t('cols.catalog.l3'), internal: '/products?category=all-in-one' },
              { label: t('cols.catalog.l5'), internal: '/products?category=printers' },
            ]}
          />
          <FootCol
            title={t('cols.brands.title')}
            links={[
              { label: t('cols.brands.l1'), internal: '/brands' },
              { label: t('cols.brands.l2'), internal: '/brands/asus' },
              { label: t('cols.brands.l3'), internal: '/brands/tp-link' },
              { label: t('cols.brands.l4'), internal: '/brands/epson' },
            ]}
          />
          <FootCol
            title={t('cols.service.title')}
            links={[
              { label: t('cols.service.l1'), href: '#contact' },
              { label: t('cols.service.l2'), href: '#contact' },
              { label: t('cols.service.l3'), href: '#about' },
              { label: t('cols.service.l4'), href: '#contact' },
            ]}
          />
          <FootCol
            title={t('cols.contact.title')}
            links={[
              {
                label: t('cols.contact.l1'),
                href: 'https://maps.google.com/?q=Bab+Ezzouar+Alger',
                external: true,
              },
              { label: t('cols.contact.l2'), href: 'tel:+213560990506' },
              { label: t('cols.contact.l3'), href: 'tel:+213561616911' },
              { label: t('cols.contact.l4'), href: 'mailto:contact@dtech.dz' },
            ]}
          />
        </div>
        <div className="ft-bottom">
          <Editable as="span" id="home.footer.copyright" label="Copyright">{t('copyright')}</Editable>
          <span style={{ display: 'inline-flex', gap: 20 }}>
            <Link href="/legal#mentions">{t('legal')}</Link>
            <Link href="/legal#cgv">{t('terms')}</Link>
            <Link href="/legal#privacy">{t('privacy')}</Link>
          </span>
          <span>{t('made')}</span>
        </div>
      </div>
    </footer>
  )
}

interface FootLink {
  label: string
  href?: string
  /** locale-aware route (rendered with the i18n <Link>) */
  internal?: string
  external?: boolean
}

function FootCol({ title, links }: { title: string; links: FootLink[] }) {
  return (
    <div className="ft-col">
      <h4>{title}</h4>
      <ul>
        {links.map((l) => (
          <li key={l.label}>
            {l.internal ? (
              <Link href={l.internal}>{l.label}</Link>
            ) : (
              <a
                href={l.href}
                {...(l.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
