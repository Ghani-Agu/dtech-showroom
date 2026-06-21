/**
 * Render-time data context for TEMPLATE pages (product / category / brand).
 *
 * A template doc is authored with `{{tokens}}` (e.g. `{{product.name}}`) and a
 * few "dynamic" marker blocks (a gallery bound to the product photos, a product
 * grid bound to related/category/brand products, a list bound to the specs).
 * When the page renders for a real entity we pass a `RenderData` object and
 * `applyData()` rewrites the block tree: scalar tokens are interpolated and the
 * dynamic blocks have their `items` replaced with live data.
 *
 * This module is PURE (no React / DB / server imports) so it can be unit-tested
 * with `node --experimental-strip-types` and reused on both client and server.
 */
import { clone, type Block } from './types'

export interface SpecItem {
  label: string
  value: string
}

export interface ProductCardCtx {
  slug: string
  name: string
  brandName: string
  price: string
  rating: string
  image: string
  url: string
}

export interface ProductCtx {
  slug: string
  name: string
  tagline: string
  description: string
  brandName: string
  brandSlug: string
  categoryName: string
  categorySlug: string
  cardSpec: string
  image: string
  cardImage: string
  images: string[]
  specs: SpecItem[]
  inquiryUrl: string
  productUrl: string
  related: ProductCardCtx[]
}

export interface CategoryCtx {
  slug: string
  name: string
  description: string
  count: number
  url: string
  products: ProductCardCtx[]
}

export interface BrandCtx {
  slug: string
  name: string
  statement: string
  description: string
  count: number
  url: string
  products: ProductCardCtx[]
}

export interface SiteCtx {
  name: string
  phone: string
  sav: string
  whatsapp: string
  email: string
  address: string
}

/** A category/brand reference shown in a rail (name + slug + product count). */
export interface CatalogRefCtx {
  name: string
  slug: string
  count: number
}

/** Whole-catalog context for the homepage (all products / categories / brands). */
export interface CatalogCtx {
  productCount: number
  categoryCount: number
  brandCount: number
  products: ProductCardCtx[]
  featured: ProductCardCtx[]
  categories: CatalogRefCtx[]
  brands: CatalogRefCtx[]
}

export interface RenderData {
  product?: ProductCtx
  category?: CategoryCtx
  brand?: BrandCtx
  site?: SiteCtx
  catalog?: CatalogCtx
}

/** The dynamic-binding markers a block may carry in `props.dynamic`. */
export type DynamicBinding =
  | 'product.images'
  | 'product.specs'
  | 'product.related'
  | 'category.products'
  | 'brand.products'
  | 'catalog.products'
  | 'catalog.featured'
  | 'catalog.categories'
  | 'catalog.brands'

const TOKEN_ROOTS = ['product', 'category', 'brand', 'site', 'catalog']
const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g

/** Walk a dotted path (`product.brandName`) on the data object. */
function getPath(data: RenderData, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = data
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

/**
 * Replace `{{root.path}}` tokens in a string. Only tokens whose root is a known
 * data root are touched, so literal braces in static content are left alone.
 * Unknown-but-rooted tokens resolve to '' (the field is simply empty).
 */
export function resolveTokens(input: string, data: RenderData | undefined): string {
  if (!data || input.indexOf('{{') === -1) return input
  return input.replace(TOKEN_RE, (whole, path: string) => {
    const root = path.split('.')[0]
    if (!root || !TOKEN_ROOTS.includes(root)) return whole
    const val = getPath(data, path)
    if (val == null) return ''
    if (Array.isArray(val)) return val.join(', ')
    if (typeof val === 'object') return whole
    return String(val)
  })
}

/** Recursively interpolate tokens through any string inside a props value. */
function deepResolve(value: unknown, data: RenderData | undefined): unknown {
  if (typeof value === 'string') return resolveTokens(value, data)
  if (Array.isArray(value)) return value.map((v) => deepResolve(v, data))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepResolve(v, data)
    }
    return out
  }
  return value
}

/** Replace a dynamic block's `items` with live data, in place on the clone. */
function expandDynamic(block: Block, data: RenderData | undefined): void {
  const binding = block.props.dynamic as DynamicBinding | undefined
  if (!binding || !data) return

  if (block.type === 'gallery' && binding === 'product.images') {
    const imgs = data.product?.images ?? []
    if (imgs.length) {
      block.props.items = imgs.map((src) => ({ src, alt: data.product?.name ?? '' }))
    }
    return
  }

  if (block.type === 'list' && binding === 'product.specs') {
    const specs = data.product?.specs ?? []
    if (specs.length) {
      block.props.items = specs.map((sp) => ({ text: `${sp.label} : ${sp.value}` }))
    }
    return
  }

  if (block.type === 'productGrid') {
    let cards: ProductCardCtx[] | undefined
    if (binding === 'product.related') cards = data.product?.related
    else if (binding === 'category.products') cards = data.category?.products
    else if (binding === 'brand.products') cards = data.brand?.products
    else if (binding === 'catalog.products') cards = data.catalog?.products
    else if (binding === 'catalog.featured') cards = data.catalog?.featured
    if (cards && cards.length) {
      block.props.items = cards.map((c) => ({
        image: c.image,
        name: c.name,
        brand: c.brandName,
        price: c.price,
        rating: c.rating,
        href: c.url,
      }))
    }
    return
  }

  if (block.type === 'categoryRail' && binding === 'catalog.categories') {
    const cats = data.catalog?.categories ?? []
    if (cats.length) {
      block.props.items = cats.map((c) => ({ name: c.name, count: String(c.count) }))
    }
    return
  }

  if (block.type === 'brandRail' && binding === 'catalog.brands') {
    const brs = data.catalog?.brands ?? []
    if (brs.length) {
      block.props.items = brs.map((b) => ({ name: b.name }))
    }
  }
}

/**
 * Produce a new block tree with tokens interpolated and dynamic blocks bound to
 * `data`. Returns the original tree unchanged when there is nothing to resolve.
 */
export function applyData(
  blocks: Block[],
  data: RenderData | undefined
): Block[] {
  if (!data) return blocks
  const walk = (b: Block): Block => {
    const next = clone(b)
    next.props = deepResolve(next.props, data) as Record<string, unknown>
    expandDynamic(next, data)
    if (next.children) next.children = next.children.map(walk)
    return next
  }
  return blocks.map(walk)
}

/** Representative data used by the editor preview of a template page. */
export const SAMPLE_DATA: RenderData = {
  site: {
    name: 'D-Tech Algérie',
    phone: '0560 99 05 06',
    sav: '0561 616 911',
    whatsapp: '213560990506',
    email: 'contact@dtech.dz',
    address: 'Bab Ezzouar, Alger',
  },
  product: {
    slug: 'exemple-produit',
    name: 'Ordinateur portable Pro 15',
    tagline: 'Puissance et autonomie pour les professionnels',
    description:
      'Un châssis aluminium, un écran 15" haute fidélité et une autonomie\n\nidéale pour le travail mobile. Livré configuré, prêt à l’emploi.',
    brandName: 'HP',
    brandSlug: 'hp',
    categoryName: 'Ordinateurs portables',
    categorySlug: 'laptops',
    cardSpec: 'Intel Core i7 · 16 Go · 512 Go SSD',
    image: '/placeholder-product.png',
    cardImage: '/placeholder-product.png',
    images: [
      '/placeholder-product.png',
      '/placeholder-product.png',
      '/placeholder-product.png',
    ],
    specs: [
      { label: 'Processeur', value: 'Intel Core i7' },
      { label: 'Mémoire', value: '16 Go DDR4' },
      { label: 'Stockage', value: '512 Go SSD' },
      { label: 'Écran', value: '15,6" Full HD' },
    ],
    inquiryUrl: '/inquiry/exemple-produit',
    productUrl: '/products/exemple-produit',
    related: [
      { slug: 'p1', name: 'Souris sans fil', brandName: 'Logitech', price: '', rating: '4.7', image: '/placeholder-product.png', url: '/products/p1' },
      { slug: 'p2', name: 'Écran 27" 165Hz', brandName: 'HP', price: '', rating: '4.6', image: '/placeholder-product.png', url: '/products/p2' },
      { slug: 'p3', name: 'Sacoche 15"', brandName: 'Dell', price: '', rating: '4.5', image: '/placeholder-product.png', url: '/products/p3' },
      { slug: 'p4', name: 'Station d’accueil USB-C', brandName: 'Anker', price: '', rating: '4.8', image: '/placeholder-product.png', url: '/products/p4' },
    ],
  },
  category: {
    slug: 'laptops',
    name: 'Ordinateurs portables',
    description: 'Toute notre sélection d’ordinateurs portables professionnels et gaming.',
    count: 42,
    url: '/categories/laptops',
    products: [
      { slug: 'p1', name: 'Portable Pro 15', brandName: 'HP', price: '', rating: '4.7', image: '/placeholder-product.png', url: '/products/p1' },
      { slug: 'p2', name: 'Ultrabook 14', brandName: 'Dell', price: '', rating: '4.6', image: '/placeholder-product.png', url: '/products/p2' },
      { slug: 'p3', name: 'Gaming 17', brandName: 'ASUS', price: '', rating: '4.8', image: '/placeholder-product.png', url: '/products/p3' },
    ],
  },
  brand: {
    slug: 'hp',
    name: 'HP',
    statement: 'Fiabilité et performance pour le bureau et la maison.',
    description: 'Gamme complète d’ordinateurs, imprimantes et accessoires HP.',
    count: 58,
    url: '/brands/hp',
    products: [
      { slug: 'p1', name: 'Portable Pro 15', brandName: 'HP', price: '', rating: '4.7', image: '/placeholder-product.png', url: '/products/p1' },
      { slug: 'p2', name: 'Imprimante laser', brandName: 'HP', price: '', rating: '4.5', image: '/placeholder-product.png', url: '/products/p2' },
    ],
  },
  catalog: {
    productCount: 393,
    categoryCount: 20,
    brandCount: 21,
    categories: [
      { name: 'Ordinateurs portables', slug: 'laptops', count: 30 },
      { name: 'Ordinateurs de bureau', slug: 'desktops', count: 14 },
      { name: 'Tout-en-un', slug: 'all-in-one', count: 15 },
      { name: 'Écrans & moniteurs', slug: 'monitors', count: 50 },
      { name: 'Imprimantes & copieurs', slug: 'printers', count: 28 },
      { name: 'Réseau', slug: 'networking', count: 22 },
    ],
    brands: [
      { name: 'HP', slug: 'hp', count: 58 },
      { name: 'Dell', slug: 'dell', count: 41 },
      { name: 'Lenovo', slug: 'lenovo', count: 33 },
      { name: 'ASUS', slug: 'asus', count: 27 },
      { name: 'TP-Link', slug: 'tplink', count: 19 },
      { name: 'Canon', slug: 'canon', count: 24 },
      { name: 'Epson', slug: 'epson', count: 15 },
    ],
    featured: [
      { slug: 'f1', name: 'Écran HP Z27u G3', brandName: 'HP', price: '', rating: '4.2', image: '/placeholder-product.png', url: '/products/f1' },
      { slug: 'f2', name: 'Tablette D-Tech Protab T101', brandName: 'D-Tech', price: '', rating: '4.0', image: '/placeholder-product.png', url: '/products/f2' },
      { slug: 'f3', name: 'Canon imageRUNNER 3326i', brandName: 'Canon', price: '', rating: '5.0', image: '/placeholder-product.png', url: '/products/f3' },
      { slug: 'f4', name: 'Canon imageRUNNER 2425i', brandName: 'Canon', price: '', rating: '4.5', image: '/placeholder-product.png', url: '/products/f4' },
    ],
    products: [
      { slug: 'c1', name: 'Écran HP Z27u G3', brandName: 'HP', price: '', rating: '4.2', image: '/placeholder-product.png', url: '/products/c1' },
      { slug: 'c2', name: 'Tablette D-Tech Protab T101', brandName: 'D-Tech', price: '', rating: '4.0', image: '/placeholder-product.png', url: '/products/c2' },
      { slug: 'c3', name: 'Canon imageRUNNER 3326i', brandName: 'Canon', price: '', rating: '5.0', image: '/placeholder-product.png', url: '/products/c3' },
      { slug: 'c4', name: 'Canon imageRUNNER 2425i', brandName: 'Canon', price: '', rating: '4.5', image: '/placeholder-product.png', url: '/products/c4' },
      { slug: 'c5', name: 'Portable Lenovo V15-G4', brandName: 'Lenovo', price: '', rating: '4.6', image: '/placeholder-product.png', url: '/products/c5' },
      { slug: 'c6', name: 'ASUS ROG Strix', brandName: 'ASUS', price: '', rating: '4.8', image: '/placeholder-product.png', url: '/products/c6' },
      { slug: 'c7', name: 'Routeur TP-Link AX55', brandName: 'TP-Link', price: '', rating: '4.7', image: '/placeholder-product.png', url: '/products/c7' },
      { slug: 'c8', name: 'Dell OptiPlex 7010', brandName: 'Dell', price: '', rating: '4.5', image: '/placeholder-product.png', url: '/products/c8' },
    ],
  },
}
