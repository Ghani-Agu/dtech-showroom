/**
 * ÉDITEUR — la liste des pages éditables (pure, sans React).
 *
 * Chaque page du site en peau « Éditorial » a une clé stable. Cette clé sert
 * de clé de ligne dans `site_pages` (`ed:<clé>`), de paramètre d'URL dans
 * l'éditeur (`/editor?page=<clé>`) et de nom du document par défaut.
 *
 * Les pages « modèle » (produit, marque) décrivent une route dynamique : on
 * les édite sur un exemplaire réel, et la mise en page s'applique à tous.
 */

export type EdPageKind = 'page' | 'template' | 'system'

export interface EdPageDef {
  key: string
  /** Libellé affiché dans le navigateur de pages. */
  label: string
  /** Groupe dans le menu de l'éditeur. */
  group: 'Site' | 'Boutique' | 'Modèles' | 'Utilitaires' | 'Personnalisées'
  kind: EdPageKind
  /** Route publique, sans le préfixe de langue. */
  path: string
  /**
   * Route ouverte dans l'aperçu quand `path` contient un paramètre — remplacée
   * à l'exécution par un exemplaire réel (premier produit, première marque).
   */
  sample?: string
  desc?: string
}

export const ED_PAGES: EdPageDef[] = [
  {
    key: 'home',
    label: 'Accueil',
    group: 'Site',
    kind: 'page',
    path: '/',
    desc: 'La page d’accueil : hero, catalogue, marques, histoire, contact.',
  },
  {
    key: 'catalogue',
    label: 'Catalogue',
    group: 'Site',
    kind: 'page',
    path: '/catalogue',
    desc: 'Les familles de produits, rangées par univers.',
  },
  {
    key: 'company',
    label: 'Entreprise',
    group: 'Site',
    kind: 'page',
    path: '/company',
    desc: 'Qui est D-tech : chiffres, histoire, valeurs, clients.',
  },
  {
    key: 'contact',
    label: 'Contact',
    group: 'Site',
    kind: 'page',
    path: '/contact',
    desc: 'Canaux de contact, adresse, carte et formulaire.',
  },
  {
    key: 'gaming',
    label: 'Gaming',
    group: 'Site',
    kind: 'page',
    path: '/gaming',
    desc: 'L’univers gaming : configurateur, collections, marques.',
  },
  {
    key: 'about',
    label: 'À propos',
    group: 'Site',
    kind: 'page',
    path: '/about',
  },
  {
    key: 'brands',
    label: 'Marques',
    group: 'Boutique',
    kind: 'page',
    path: '/brands',
  },
  {
    key: 'products',
    label: 'Tous les produits',
    group: 'Boutique',
    kind: 'page',
    path: '/products',
    desc: 'Le moteur de recherche du catalogue (filtres, tri, pagination).',
  },
  {
    key: 'search',
    label: 'Recherche',
    group: 'Boutique',
    kind: 'page',
    path: '/search',
  },
  {
    key: 'product',
    label: 'Fiche produit',
    group: 'Modèles',
    kind: 'template',
    path: '/products/[slug]',
    sample: '/products',
    desc: 'S’applique à toutes les fiches produit.',
  },
  {
    key: 'brand',
    label: 'Page marque',
    group: 'Modèles',
    kind: 'template',
    path: '/brands/[slug]',
    sample: '/brands',
    desc: 'S’applique à toutes les pages marque.',
  },
  {
    key: 'inquiry',
    label: 'Demande de devis',
    group: 'Utilitaires',
    kind: 'template',
    path: '/inquiry/[slug]',
    sample: '/products',
  },
  {
    key: 'legal',
    label: 'Mentions légales',
    group: 'Utilitaires',
    kind: 'page',
    path: '/legal',
  },
  {
    key: 'notfound',
    label: 'Page introuvable (404)',
    group: 'Utilitaires',
    kind: 'system',
    path: '/_404',
    sample: '/_404-preview',
  },
]

const BY_KEY = new Map(ED_PAGES.map((p) => [p.key, p] as const))

export function getPageDef(key: string): EdPageDef | null {
  const hit = BY_KEY.get(key)
  if (hit) return hit
  if (key.startsWith('custom:')) {
    const path = key.slice('custom:'.length)
    return {
      key,
      label: path,
      group: 'Personnalisées',
      kind: 'page',
      path,
    }
  }
  return null
}

/** Clé de ligne en base pour une page. */
export const rowKey = (pageKey: string) => `ed:${pageKey}`

/** Clé de ligne des réglages globaux (chrome, palette, polices). */
export const SITE_ROW_KEY = 'ed:__site__'

/** Clé de ligne du manifeste des pages personnalisées. */
export const CUSTOM_ROW_KEY = 'ed:__custom__'

export const customKeyForPath = (path: string) => `custom:${normalizePath(path)}`

export function normalizePath(input: string): string {
  let p = input.trim().toLowerCase()
  if (!p.startsWith('/')) p = `/${p}`
  p = p.replace(/\/+/g, '/').replace(/[^a-z0-9\-_/]/g, '-')
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p
}

/** Chemins déjà pris par une vraie route — refusés pour une page perso. */
export const RESERVED_PATHS = [
  '/',
  '/about',
  '/account',
  '/admin',
  '/brands',
  '/catalogue',
  '/categories',
  '/company',
  '/contact',
  '/editor',
  '/gaming',
  '/inquiry',
  '/legal',
  '/login',
  '/newsletter',
  '/products',
  '/search',
]

export function pathConflicts(path: string): boolean {
  const p = normalizePath(path)
  return RESERVED_PATHS.some((r) => p === r || p.startsWith(`${r}/`))
}

export interface EdCustomPage {
  key: string
  path: string
  title: string
}

export function coerceCustomPages(raw: unknown): EdCustomPage[] {
  if (!raw || typeof raw !== 'object') return []
  const list = (raw as { pages?: unknown }).pages
  if (!Array.isArray(list)) return []
  const out: EdCustomPage[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    if (typeof r.path !== 'string') continue
    const path = normalizePath(r.path)
    out.push({
      key: customKeyForPath(path),
      path,
      title: typeof r.title === 'string' && r.title ? r.title : path,
    })
  }
  return out
}
