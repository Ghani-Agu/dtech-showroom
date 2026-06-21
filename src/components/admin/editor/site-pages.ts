/**
 * Site-pages registry + "mirror" starter builders.
 *
 * The editor is multi-page (Shopify-style): besides the homepage it can edit
 * content pages (about, legal), dynamic catalog TEMPLATES (product / category /
 * brand) and any number of custom pages. This module is the single source of
 * truth for which pages exist, the route each one publishes to, and the starter
 * document used when a page has no saved design yet (a best-effort "mirror" of
 * the current live page).
 *
 * PURE module (types + registry only) — runtime-testable, client+server safe.
 */
import { createBlock } from './registry'
import { uid, type Block, type PageDoc } from './types'

export type PageGroup = 'Pages' | 'Modèles' | 'Personnalisées'
export type PageKind = 'page' | 'template'
export type EntityKind = 'product' | 'category' | 'brand'

export interface SitePageDef {
  /** DB key in the `site_pages` table. */
  key: string
  label: string
  group: PageGroup
  kind: PageKind
  /** Canonical route this page publishes to ('/', '/about', '/products/[slug]'). */
  routePath: string
  /** For templates: which entity supplies the render data. */
  entity?: EntityKind
  description: string
  /** Concrete URL for the "Voir le site" link (templates open the index). */
  previewPath: string
  /** Custom pages can be removed from the manifest; canonical ones cannot. */
  removable?: boolean
}

/** Pages that always exist (wired to real routes). */
export const CANONICAL_PAGES: SitePageDef[] = [
  { key: 'home', label: 'Accueil', group: 'Pages', kind: 'page', routePath: '/', description: 'La page d’accueil du site.', previewPath: '/' },
  { key: 'page:about', label: 'À propos', group: 'Pages', kind: 'page', routePath: '/about', description: 'La page de présentation de l’entreprise.', previewPath: '/about' },
  { key: 'page:legal', label: 'Mentions légales', group: 'Pages', kind: 'page', routePath: '/legal', description: 'Mentions légales, CGV et confidentialité.', previewPath: '/legal' },
  { key: 'tmpl:product', label: 'Modèle · Produit', group: 'Modèles', kind: 'template', entity: 'product', routePath: '/products/[slug]', description: 'Mise en page de chaque fiche produit — alimentée par les données du produit.', previewPath: '/products' },
  { key: 'tmpl:category', label: 'Modèle · Catégorie', group: 'Modèles', kind: 'template', entity: 'category', routePath: '/categories/[slug]', description: 'Mise en page de chaque page catégorie.', previewPath: '/categories' },
  { key: 'tmpl:brand', label: 'Modèle · Marque', group: 'Modèles', kind: 'template', entity: 'brand', routePath: '/brands/[slug]', description: 'Mise en page de chaque page marque.', previewPath: '/brands' },
]

// ───────────────────────── custom pages ─────────────────────────

export const CUSTOM_PREFIX = 'custom:'

export interface CustomPageMeta {
  key: string
  title: string
  path: string
}

export function isCustomKey(key: string): boolean {
  return key.startsWith(CUSTOM_PREFIX)
}

/** Sanitise a user-typed URL into a safe absolute path slug. */
export function normalizePath(input: string): string {
  let s = (input || '').trim().toLowerCase()
  if (!s.startsWith('/')) s = '/' + s
  s = s
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9/\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/\/+/g, '/')
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
  return s || '/'
}

export function customKeyForPath(path: string): string {
  return CUSTOM_PREFIX + normalizePath(path)
}

export function customDef(meta: CustomPageMeta): SitePageDef {
  return {
    key: meta.key,
    label: meta.title || meta.path,
    group: 'Personnalisées',
    kind: 'page',
    routePath: meta.path,
    description: 'Page personnalisée.',
    previewPath: meta.path,
    removable: true,
  }
}

/** Resolve a page def by key, including custom pages from the manifest. */
export function getPageDef(
  key: string,
  customs: CustomPageMeta[] = []
): SitePageDef | undefined {
  const canon = CANONICAL_PAGES.find((p) => p.key === key)
  if (canon) return canon
  const meta = customs.find((c) => c.key === key)
  return meta ? customDef(meta) : undefined
}

/** Routes that already exist as explicit pages — cannot be a custom path. */
export const RESERVED_PATHS = new Set([
  '/', '/about', '/legal', '/products', '/categories', '/brands',
  '/search', '/inquiry', '/newsletter', '/login', '/admin', '/editor',
])

export function pathConflicts(path: string): boolean {
  const p = normalizePath(path)
  if (RESERVED_PATHS.has(p)) return true
  // also block sub-paths of dynamic catalog routes
  return /^\/(products|categories|brands|inquiry|admin|editor)\//.test(p)
}

// ───────────────────────── mirror builders ─────────────────────────

function mk(
  type: string,
  props?: Record<string, unknown>,
  style?: Record<string, unknown>,
  children?: Block[]
): Block {
  const b = createBlock(type)
  if (props) b.props = { ...b.props, ...props }
  if (style) b.style = { ...b.style, ...style } as Block['style']
  if (children) b.children = children
  return b
}

function baseDoc(
  name: string,
  blocks: Block[],
  extra: Partial<PageDoc> & { theme?: string }
): PageDoc {
  return {
    id: uid('page'),
    name,
    background: 'linear-gradient(180deg, #04060c 0%, #060b16 45%, #04060c 100%)',
    theme: extra.theme ?? 'nightline',
    blocks,
    kind: extra.kind,
    routePath: extra.routePath,
    entity: extra.entity,
  }
}

/**
 * Homepage — a faithful, editable reproduction of the live HomeShowcase, wired
 * to real catalog data via `{{catalog.*}}` tokens + dynamic rails. Includes its
 * own navbar/footer (no SiteNav is injected on '/').
 */
function homeDoc(theme?: string): PageDoc {
  return baseDoc(
    'Page d’accueil',
    [
      mk('navbar', {
        brand: 'D-Tech',
        links: [
          { label: 'Produits', href: '/products' },
          { label: 'Catégories', href: '/categories' },
          { label: 'Marques', href: '/brands' },
          { label: 'À propos', href: '/about' },
        ],
        cta: 'Contact',
        ctaHref: '/inquiry',
      }),
      mk('hero', {
        kicker: 'D-Tech Algérie · Depuis 2006',
        title: 'La techno qui vous ressemble.',
        accent: 'vous ressemble.',
        subtitle:
          'Plus de {{catalog.productCount}} produits sélectionnés — HP, Dell, Lenovo, ASUS, TP-Link, Canon, Epson — distribués et garantis en Algérie.',
        primaryLabel: 'Voir le catalogue',
        primaryHref: '/products',
        secondaryLabel: 'Notre histoire',
        secondaryHref: '/about',
        stats: [
          { value: '20+', label: 'Présence DZ' },
          { value: '{{catalog.brandCount}}', label: 'Partenaires officiels' },
          { value: '58', label: 'Wilayas livrées' },
        ],
      }),
      mk('categoryRail', {
        dynamic: 'catalog.categories',
        kicker: '{{catalog.categoryCount}} familles de produits',
        title: 'Le catalogue, par catégorie.',
      }),
      mk('productGrid', {
        dynamic: 'catalog.products',
        kicker: '{{catalog.productCount}} produits · {{catalog.categoryCount}} catégories · {{catalog.brandCount}} marques',
        title: 'Tous nos produits.',
        columns: 4,
      }),
      mk('featureGrid', {
        kicker: 'Pourquoi D-Tech',
        title: 'Vingt ans à équiper l’Algérie.',
        columns: 3,
        items: [
          { icon: 'Truck', title: 'Livraison 58 wilayas', text: '48 h en moyenne, suivi en temps réel.' },
          { icon: 'ShieldCheck', title: 'Garantie 2 ans', text: 'Garantie constructeur + SAV interne à Bab Ezzouar.' },
          { icon: 'Headphones', title: 'Conseil expert', text: 'Une équipe qui connaît le matériel.' },
        ],
      }),
      mk('brandRail', {
        dynamic: 'catalog.brands',
        kicker: 'Marques officiellement distribuées',
        title: '{{catalog.brandCount}} partenaires, une seule maison.',
      }),
      mk('ctaBanner', {
        title: 'Passez nous voir.',
        subtitle: 'Siège à Bab Ezzouar — du dimanche au jeudi, 9h–17h.',
        primaryLabel: 'Commander via WhatsApp',
        primaryHref: 'https://wa.me/213560990506',
      }),
      mk('footer', {
        brand: 'D-Tech',
        tagline:
          'L’innovation algérienne, à votre prix. Distributeur officiel HP, Dell, Lenovo, ASUS, TP-Link, Canon et Epson depuis 2006.',
        copyright: '© 2026 D-Tech Algérie. Tous droits réservés.',
      }),
    ],
    { theme, kind: 'page', routePath: '/' }
  )
}

/* Non-home pages omit navbar/footer — the site chrome is injected by
   ShowroomShell around every non-'/' route. */

function aboutDoc(theme?: string): PageDoc {
  return baseDoc(
    'À propos',
    [
      mk('section', {}, { paddingY: 56 }, [
        mk('eyebrow', { text: 'À PROPOS' }),
        mk('heading', { text: 'Le matériel tech, choisi avec soin.', level: 'h1' }, { fontSize: 46, fontWeight: 800 }),
        mk('paragraph', {
          text: 'D-Tech est un showroom informatique basé à Alger. Nous sélectionnons, testons et livrons composants, périphériques et solutions professionnelles — avec un service après-vente qui répond.',
        }, { fontSize: 18 }),
        mk('heading', { text: 'Notre approche', level: 'h2' }, { fontSize: 30, fontWeight: 700, marginTop: 24 }),
        mk('paragraph', {
          text: 'Des produits authentiques, des prix justes, et un accompagnement de bout en bout : du conseil à l’installation.',
        }),
      ]),
      mk('contactBand'),
    ],
    { theme, kind: 'page', routePath: '/about' }
  )
}

function legalDoc(theme?: string): PageDoc {
  return baseDoc(
    'Mentions légales',
    [
      mk('section', {}, { paddingY: 56, maxWidth: 860 }, [
        mk('eyebrow', { text: 'MENTIONS LÉGALES' }),
        mk('heading', { text: 'Informations légales', level: 'h1' }, { fontSize: 44, fontWeight: 800 }),
        mk('heading', { text: 'Mentions légales', level: 'h2' }, { fontSize: 26, fontWeight: 700, marginTop: 20 }),
        mk('paragraph', { text: 'D-Tech Algérie — showroom informatique, Bab Ezzouar, Alger.' }),
        mk('heading', { text: 'Conditions générales de vente', level: 'h2' }, { fontSize: 26, fontWeight: 700, marginTop: 20 }),
        mk('paragraph', { text: 'Les présentes conditions régissent les ventes réalisées par D-Tech Algérie.' }),
        mk('heading', { text: 'Confidentialité', level: 'h2' }, { fontSize: 26, fontWeight: 700, marginTop: 20 }),
        mk('paragraph', { text: 'Vos données personnelles sont traitées de manière confidentielle et ne sont jamais revendues.' }),
      ]),
    ],
    { theme, kind: 'page', routePath: '/legal' }
  )
}

/** Product template — uses {{product.*}} tokens + dynamic blocks. */
function productTemplateDoc(theme?: string): PageDoc {
  return baseDoc(
    'Modèle · Produit',
    [
      mk('heroSplit', {
        kicker: '{{product.brandName}} · {{product.categoryName}}',
        title: '{{product.name}}',
        subtitle: '{{product.tagline}}',
        primaryLabel: 'Demander un devis',
        primaryHref: '{{product.inquiryUrl}}',
        image: '{{product.image}}',
      }),
      mk('section', {}, { paddingY: 40, maxWidth: 1100 }, [
        mk('columns', { columns: 2, gap: 40, stackOnMobile: true }, {}, [
          mk('gallery', { dynamic: 'product.images', columns: 2, gap: 12 }),
          mk('section', {}, { paddingY: 0 }, [
            mk('heading', { text: 'Caractéristiques', level: 'h3' }, { fontSize: 22, fontWeight: 700 }),
            mk('list', { dynamic: 'product.specs', ordered: false }),
            mk('paragraph', { text: '{{product.description}}' }, { marginTop: 16 }),
            mk('button', { label: 'Demander un devis', href: '{{product.inquiryUrl}}', variant: 'primary' }, { marginTop: 16 }),
          ]),
        ]),
      ]),
      mk('productGrid', {
        dynamic: 'product.related',
        kicker: 'À découvrir',
        title: 'Produits similaires',
        columns: 4,
      }),
    ],
    { theme, kind: 'template', routePath: '/products/[slug]', entity: 'product' }
  )
}

function categoryTemplateDoc(theme?: string): PageDoc {
  return baseDoc(
    'Modèle · Catégorie',
    [
      mk('sectionHeader', {
        kicker: 'Catégorie',
        title: '{{category.name}}',
        subtitle: '{{category.description}}',
        align: 'left',
      }),
      mk('productGrid', {
        dynamic: 'category.products',
        kicker: '{{category.count}} produits',
        title: 'Tous les produits',
        columns: 4,
      }),
    ],
    { theme, kind: 'template', routePath: '/categories/[slug]', entity: 'category' }
  )
}

function brandTemplateDoc(theme?: string): PageDoc {
  return baseDoc(
    'Modèle · Marque',
    [
      mk('sectionHeader', {
        kicker: 'Marque',
        title: '{{brand.name}}',
        subtitle: '{{brand.statement}}',
        align: 'left',
      }),
      mk('paragraph', { text: '{{brand.description}}' }, { paddingX: 24, maxWidth: 800 }),
      mk('productGrid', {
        dynamic: 'brand.products',
        kicker: '{{brand.count}} produits',
        title: 'Produits de la marque',
        columns: 4,
      }),
    ],
    { theme, kind: 'template', routePath: '/brands/[slug]', entity: 'brand' }
  )
}

function customStarterDoc(def: SitePageDef, theme?: string): PageDoc {
  return baseDoc(
    def.label,
    [
      mk('sectionHeader', {
        kicker: 'Nouvelle page',
        title: def.label,
        subtitle: 'Glissez des blocs depuis la bibliothèque pour composer cette page.',
        align: 'center',
      }),
      mk('section', {}, { paddingY: 24, maxWidth: 800 }, [
        mk('paragraph'),
        mk('button', { label: 'Voir le catalogue', href: '/products', variant: 'primary' }),
      ]),
    ],
    { theme, kind: 'page', routePath: def.routePath }
  )
}

/**
 * Build the starter document for a page that has no saved design yet — a
 * best-effort mirror of the current live page (catalog data stays dynamic).
 */
export function mirrorDoc(
  key: string,
  opts: { theme?: string; customs?: CustomPageMeta[] } = {}
): PageDoc {
  const { theme, customs = [] } = opts
  switch (key) {
    case 'home':
      return homeDoc(theme)
    case 'page:about':
      return aboutDoc(theme)
    case 'page:legal':
      return legalDoc(theme)
    case 'tmpl:product':
      return productTemplateDoc(theme)
    case 'tmpl:category':
      return categoryTemplateDoc(theme)
    case 'tmpl:brand':
      return brandTemplateDoc(theme)
    default: {
      const def = getPageDef(key, customs)
      if (def) return customStarterDoc(def, theme)
      // unknown key — empty page
      return baseDoc('Page', [mk('sectionHeader')], { theme, kind: 'page' })
    }
  }
}
