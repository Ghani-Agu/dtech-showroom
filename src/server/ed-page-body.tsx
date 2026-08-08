import 'server-only'

/**
 * ed-page-body.tsx — les DONNÉES RÉELLES d'une page, pour l'aperçu de
 * l'éditeur.
 *
 * L'éditeur « Éditorial » rend chaque page à partir de son document, mais un
 * document ne contient que la mise en page : pas un seul produit, pas une
 * seule marque. Les sections, elles, réclament le vrai catalogue
 * (`ctx.data`) ou un fragment rendu côté serveur qu'elles se contentent
 * d'afficher (`ctx.slots.body` : moteur du catalogue, fiche produit,
 * formulaire de devis, texte légal).
 *
 * Ce module est donc le PENDANT ÉDITEUR des routes publiques : pour chaque
 * clé de page, il refait exactement les lectures que fait la branche
 * « editorial » de la route correspondante — mêmes requêtes, mêmes tris,
 * mêmes plafonds. C'est la seule façon d'obtenir la promesse du système :
 * l'aperçu n'est pas une maquette, c'est la page.
 *
 * DEUX écarts assumés avec les routes, tous les deux volontaires :
 *
 *  1. les gardes « catalogue vide » (`throw new Error('refusing to cache a
 *     hollow page')`) ne sont PAS reproduites. Elles n'existent que pour
 *     empêcher l'ISR de figer une page creuse pendant cinq minutes ; l'aperçu
 *     est `force-dynamic` et n'est jamais mis en cache, donc la garde n'a rien
 *     à protéger — alors qu'un `throw` ici afficherait un écran d'erreur dans
 *     l'iframe au lieu de la mise en page que l'auteur est en train de régler.
 *  2. `notFound()` n'est jamais appelé. Une base momentanément muette ou un
 *     exemplaire supprimé doivent donner une page vide et modifiable, pas un
 *     404 qui éjecte l'auteur de son propre éditeur.
 *
 * Corollaire de tout ça : RIEN ne doit remonter d'ici. Tout est enveloppé
 * dans un `catch` qui dégrade en données vides — même contrat que ed-doc.ts.
 *
 * Pas de `'use server'` : ce fichier n'est que de la lecture, appelée depuis
 * un composant serveur. Le marquer en ferait autant de points d'entrée
 * publics pour rien.
 */

import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { imgOr } from '@/lib/img'
import { prepareCustomHtml } from '@/lib/custom-html'
import { toExplorerProducts } from '@/lib/showroom-data'
import {
  parseProductQuery,
  runProductQuery,
  type RawSearchParams,
} from '@/lib/product-filters'
import { getPageDef } from '@/lib/ed-editor/pages'
import type { Locale } from '@/i18n/config'

import {
  getAllBrands,
  getAllCategories,
  getAllProducts,
  getBrandBySlug,
  getProductBySlug,
  getProductsByBrand,
  getProductsByCategory,
  searchProducts,
} from '@/server/queries'
import { getHomeHero, getPublishedContent } from '@/server/editor-page-data'
import { getNavData } from '@/server/nav-data'
import { buildEditorialData } from '@/server/editorial-data'
import { buildGamingData } from '@/server/gaming-data'
import { toBrandBrands, toBrandProducts } from '@/server/brand-data'

/* Les composants ci-dessous sont des modules client : on les MONTE (JSX), on
   n'en importe aucune valeur logique. Les types, eux, sont importés en
   `import type` pour ne rien traîner dans le graphe serveur. */
import { EdProductsBrowser } from '@/components/editorial/EdProductsBrowser'
import { EditorialProductDetail } from '@/components/editorial/EditorialProductDetail'
import { EdGridPage, EdInquiry } from '@/components/editorial/EditorialCollections'
import { EdLegalBody } from '@/components/editorial/EdLegalBody'
import { EdNotFoundBody } from '@/components/editorial/EdNotFoundBody'
import { ED_OWN_BRANDS } from '@/components/editorial/editorial-types'

import type { EdPageData } from '@/components/editorial/ed-ctx'
import type { EdCompanyData } from '@/components/editorial/EdCompanyPage'
import type { EdBrandPageData } from '@/components/editorial/EdBrandPage'
import type { EdLang } from '@/components/editorial/editorial-i18n'
import type { BrandProduct } from '@/components/brand/brand-types'

export interface EdBodyInput {
  pageKey: string
  locale: Locale
  /** Slug for template pages (product, brand, inquiry). */
  slug?: string
  /** Raw searchParams, for /products and /search. */
  searchParams?: Record<string, string | string[] | undefined>
}

export interface EdBodyResult {
  data: EdPageData
  slots: Record<string, ReactNode>
  /** Home only. */
  previews?: (string | null)[]
  catNames?: { id: string; name: string }[]
  /** Real route path of the rendered sample, for template pages. */
  resolvedPath?: string
}

/** Rien à charger : la page est entièrement décrite par son document. */
const EMPTY: EdBodyResult = { data: {}, slots: {} }

/** L'année de fondation, reprise du registre CACI (voir /company). */
const FOUNDED = 2006

/** La peau éditoriale ne parle que trois langues, et retombe sur le français. */
function edLang(locale: Locale): EdLang {
  return locale === 'en' || locale === 'ar' ? locale : 'fr'
}

/** Première valeur d'un paramètre d'URL, qui peut être répété. */
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/**
 * Les données et fragments d'une page, ou `null` si la clé est inconnue.
 *
 * `null` veut dire « cette page n'existe pas » (l'appelant fera un 404) ;
 * un résultat vide veut dire « la page existe, mais rien n'a pu être lu » —
 * deux situations très différentes pour l'éditeur.
 */
export async function buildEdBody(input: EdBodyInput): Promise<EdBodyResult | null> {
  // `getPageDef` connaît les pages canoniques ET les pages personnalisées
  // (`custom:/quelque-chose`), donc c'est lui qui arbitre, pas une liste
  // recopiée ici qui finirait par diverger.
  if (!getPageDef(input.pageKey)) return null

  try {
    return await loadBody(input)
  } catch (err) {
    // Une lecture qui échoue ne doit jamais noircir l'iframe : l'auteur garde
    // sa mise en page, avec des sections vides là où le catalogue manque.
    console.error(`[ed-preview] chargement impossible pour « ${input.pageKey} »`, err)
    return EMPTY
  }
}

async function loadBody(input: EdBodyInput): Promise<EdBodyResult> {
  const { pageKey, locale, slug, searchParams } = input

  switch (pageKey) {
    case 'home':
      return loadHome(locale)
    case 'catalogue':
      return loadCatalogue(locale)
    case 'company':
      return loadCompany(locale)
    case 'gaming':
      return loadGaming(locale)
    case 'brands':
      return loadBrands(locale)
    case 'brand':
      return loadBrand(locale, slug)
    case 'products':
      return loadProducts(locale, searchParams)
    case 'product':
      return loadProduct(locale, slug)
    case 'search':
      return loadSearch(locale, searchParams)
    case 'inquiry':
      return loadInquiry(locale, slug)
    case 'legal':
      return loadLegal()
    case 'notfound':
      return { data: {}, slots: { body: <EdNotFoundBody /> } }
    /* `contact`, `about` et les pages personnalisées n'ont aucune donnée :
       leurs sections sont autonomes, le document suffit. */
    default:
      return EMPTY
  }
}

/* ═════════════════════════════════ ACCUEIL ════════════════════════════════ */

/**
 * Repris de [locale]/page.tsx, branche `design === 'editorial'`.
 *
 * `previews` et `catNames` viennent d'EditorialHome : l'en-tête préchargeait
 * lui-même les visuels du hero et le pied de page listait les familles. Ces
 * deux calculs vivaient dans le composant d'accueil ; comme EdSkinPage sert
 * désormais les douze pages, ils remontent ici et redescendent en props.
 */
async function loadHome(locale: Locale): Promise<EdBodyResult> {
  const [heroConfig, products, categories, brands] = await Promise.all([
    getHomeHero(),
    getAllProducts(locale),
    getAllCategories(locale),
    getAllBrands(locale),
  ])

  const home = buildEditorialData(products, categories, brands, heroConfig)

  return {
    data: { home },
    slots: {},
    previews: [home.heroImage, ...home.cats.slice(0, 5).map((c) => c.img)],
    catNames: home.cats.map((c) => ({ id: c.id, name: c.name })),
  }
}

/* ════════════════════════════════ CATALOGUE ═══════════════════════════════ */

/** Repris de [locale]/catalogue/page.tsx : la page ne lit que getNavData. */
async function loadCatalogue(locale: Locale): Promise<EdBodyResult> {
  const nav = await getNavData(locale)
  return {
    data: { catalogue: { cats: nav.cats, productCount: nav.productCount } },
    slots: {},
  }
}

/* ════════════════════════════════ ENTREPRISE ══════════════════════════════ */

/**
 * Repris de [locale]/company/page.tsx, à l'identique — y compris les deux
 * subtilités que le fichier de route documente : les marques PROPRES sont
 * exclues du décompte des marques distribuées (sinon le titre annonce 21
 * marques au-dessus de 19 tuiles), et `years` est calculé côté serveur pour
 * qu'un passage de nouvel an ne provoque pas d'écart d'hydratation.
 */
async function loadCompany(locale: Locale): Promise<EdBodyResult> {
  const [products, brands, categories] = await Promise.all([
    getAllProducts(locale),
    getAllBrands(locale),
    getAllCategories(locale),
  ])

  const countByBrand = new Map<string, number>()
  for (const p of products) {
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
  }
  const own = new Set<string>(ED_OWN_BRANDS)

  const years = Math.max(1, new Date().getFullYear() - FOUNDED)

  const company: EdCompanyData = {
    years,
    productCount: products.length,
    brandCount: brands.filter(
      (b) => (countByBrand.get(b.slug) ?? 0) > 0 && !own.has(b.slug)
    ).length,
    categoryCount: categories.filter((c) =>
      products.some((p) => p.category.slug === c.slug)
    ).length,
    ownBrands: brands
      .filter((b) => own.has(b.slug))
      .map((b) => ({ slug: b.slug, name: b.name, count: countByBrand.get(b.slug) ?? 0 }))
      .sort(
        (a, b) => ED_OWN_BRANDS.indexOf(a.slug as (typeof ED_OWN_BRANDS)[number]) -
          ED_OWN_BRANDS.indexOf(b.slug as (typeof ED_OWN_BRANDS)[number])
      ),
    ownProducts: products
      .filter((p) => own.has(p.brand.slug))
      .sort(
        (a, b) =>
          ED_OWN_BRANDS.indexOf(a.brand.slug as (typeof ED_OWN_BRANDS)[number]) -
            ED_OWN_BRANDS.indexOf(b.brand.slug as (typeof ED_OWN_BRANDS)[number]) ||
          Number(b.featured) - Number(a.featured) ||
          a.sortOrder - b.sortOrder
      )
      .slice(0, 8)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        brand: p.brand.name,
        cat: p.category.slug,
        catName: p.category.name,
        spec: p.cardSpec ?? '',
        img: imgOr(p.cardImagePath),
        specs: p.specs,
        featured: p.featured,
      })),
    brands: brands
      .filter((b) => (countByBrand.get(b.slug) ?? 0) > 0 && !own.has(b.slug))
      .map((b) => ({ slug: b.slug, name: b.name, count: countByBrand.get(b.slug) ?? 0 }))
      .sort((a, b) => b.count - a.count),
  }

  return { data: { company }, slots: {} }
}

/* ═══════════════════════════════════ GAMING ═══════════════════════════════ */

/** Repris de [locale]/gaming/page.tsx : tout vient de `buildGamingData`. */
async function loadGaming(locale: Locale): Promise<EdBodyResult> {
  const products = await getAllProducts(locale)
  return { data: { gaming: buildGamingData(products) }, slots: {} }
}

/* ═══════════════════════════════════ MARQUES ══════════════════════════════ */

/** Repris de [locale]/brands/page.tsx, branche éditoriale. */
async function loadBrands(locale: Locale): Promise<EdBodyResult> {
  const [brands, products] = await Promise.all([
    getAllBrands(locale),
    getAllProducts(locale),
  ])
  return { data: { brands: toBrandBrands(brands, products) }, slots: {} }
}

/* ═══════════════════════════════ FICHE MARQUE ═════════════════════════════ */

/**
 * Repris de [locale]/brands/[brandSlug]/page.tsx.
 *
 * Sans slug — le cas normal dans l'éditeur, qui règle le MODÈLE et non une
 * marque en particulier — on prend la première marque qui a réellement des
 * produits : une marque au catalogue vide donnerait une page de sections
 * toutes muettes, c'est-à-dire le pire exemplaire possible pour travailler.
 */
async function loadBrand(locale: Locale, slug?: string): Promise<EdBodyResult> {
  const [allBrands, allProducts] = await Promise.all([
    getAllBrands(locale),
    getAllProducts(locale),
  ])

  const countByBrand = new Map<string, number>()
  for (const p of allProducts) {
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
  }

  const sample = allBrands.find((b) => (countByBrand.get(b.slug) ?? 0) > 0)
  const brandSlug = slug || sample?.slug
  if (!brandSlug) return EMPTY

  const [brand, products] = await Promise.all([
    getBrandBySlug(brandSlug, locale),
    getProductsByBrand(brandSlug, locale),
  ])
  if (!brand) return EMPTY

  // Familles où la marque vend vraiment, la plus fournie d'abord, avec la
  // vraie photo de famille : la grille est photographique, pas une liste.
  const catMap = new Map<string, { slug: string; name: string; count: number; img: string | null }>()
  for (const p of products) {
    const hit = catMap.get(p.category.slug)
    if (hit) hit.count += 1
    else
      catMap.set(p.category.slug, {
        slug: p.category.slug,
        name: p.category.name,
        count: 1,
        img: p.category.heroImagePath ?? null,
      })
  }
  const cats = [...catMap.values()].sort((a, b) => b.count - a.count)

  const others = allBrands
    .filter((b) => b.slug !== brandSlug && (countByBrand.get(b.slug) ?? 0) > 0)
    .map((b) => ({ slug: b.slug, name: b.name, count: countByBrand.get(b.slug) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Les mises en avant d'abord, puis le reste — plafonné pour que la page
  // reste une vitrine et non un second catalogue.
  const picked = [...products].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 8)

  const data: EdBrandPageData = {
    slug: brand.slug,
    name: brand.name,
    statement: brand.statement ?? '',
    description: brand.description ?? '',
    heroImage: brand.heroImagePath ? imgOr(brand.heroImagePath) : null,
    productCount: products.length,
    cats,
    products: picked.map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand.name,
      cat: p.category.slug,
      catName: p.category.name,
      spec: p.cardSpec ?? '',
      img: imgOr(p.cardImagePath),
      specs: p.specs,
      featured: p.featured,
    })),
    others,
  }

  return { data: { brand: data }, slots: {}, resolvedPath: `/brands/${brand.slug}` }
}

/* ═════════════════════════════ TOUS LES PRODUITS ══════════════════════════ */

/**
 * Repris de [locale]/products/page.tsx, branche éditoriale.
 *
 * Le moteur tourne ENTIÈREMENT côté serveur (filtres, tri, pagination), donc
 * l'aperçu reçoit le composant déjà rendu : l'éditeur peut l'entourer, le
 * styler, le masquer, mais pas prétendre en réordonner l'intérieur.
 *
 * Ni le JSON-LD ni le mouchard de liste ne sont montés : ils n'ont aucun sens
 * dans une iframe d'administration, et un `TrackProductList` y fausserait les
 * statistiques du site à chaque coup d'œil de l'auteur.
 */
async function loadProducts(
  locale: Locale,
  searchParams?: RawSearchParams
): Promise<EdBodyResult> {
  const query = parseProductQuery(searchParams ?? {})
  const productsRaw = await getAllProducts(locale)
  const result = runProductQuery(toExplorerProducts(productsRaw), query)

  return {
    data: {},
    slots: {
      body: <EdProductsBrowser lang={edLang(locale)} query={query} result={result} />,
    },
  }
}

/* ═══════════════════════════════ FICHE PRODUIT ════════════════════════════ */

/**
 * Repris de [locale]/products/[productSlug]/page.tsx, branche éditoriale.
 * Sans slug, on édite le modèle sur le premier produit du catalogue.
 */
async function loadProduct(locale: Locale, slug?: string): Promise<EdBodyResult> {
  const productSlug = slug || (await getAllProducts(locale))[0]?.slug
  if (!productSlug) return EMPTY

  const product = await getProductBySlug(productSlug, locale)
  if (!product) return EMPTY

  const similarRaw = (
    await getProductsByCategory(product.category.slug, locale)
  ).filter((p) => p.slug !== product.slug)

  const detail = {
    slug: product.slug,
    name: product.name,
    brandName: product.brand.name,
    brandSlug: product.brand.slug,
    catName: product.category.name,
    catSlug: product.category.slug,
    tagline: product.tagline ?? '',
    description: product.description ?? '',
    customHtml: product.customHtml ? prepareCustomHtml(product.customHtml) : '',
    image: imgOr(product.cardImagePath),
    specs: product.specs,
    images: (product.photoCarouselPaths ?? []).map(imgOr),
  }
  const similar: BrandProduct[] = toBrandProducts(similarRaw)

  return {
    data: { product: { product: detail, similar } },
    slots: { body: <EditorialProductDetail product={detail} similar={similar} /> },
    resolvedPath: `/products/${product.slug}`,
  }
}

/* ═════════════════════════════════ RECHERCHE ══════════════════════════════ */

/**
 * Repris de [locale]/search/page.tsx, branche éditoriale — y compris le seuil
 * de deux caractères, sous lequel la route ne lance aucune requête.
 *
 * `data.grid` est rempli EN PLUS du fragment : la section « Grille de
 * produits » du registre lit `ctx.data.grid`, donc un auteur qui remplace le
 * bloc verrouillé par cette section-là obtient les mêmes résultats.
 */
async function loadSearch(
  locale: Locale,
  searchParams?: RawSearchParams
): Promise<EdBodyResult> {
  const query = firstParam(searchParams?.q).trim()
  const rawResults = query.length >= 2 ? await searchProducts(query, locale) : []
  const t = await getTranslations({ locale, namespace: 'search' })

  const grid = {
    products: toBrandProducts(rawResults),
    eyebrow: t('pageTitle'),
    title: query ? `« ${query} »` : t('pageTitle'),
    empty: query ? t('noResults') : t('placeholder'),
  }

  return {
    data: { grid },
    slots: {
      body: (
        <EdGridPage
          eyebrow={grid.eyebrow}
          title={grid.title}
          products={grid.products}
          emptyLabel={grid.empty}
        />
      ),
    },
  }
}

/* ═══════════════════════════════ DEMANDE DE DEVIS ═════════════════════════ */

/**
 * Repris de [locale]/inquiry/[productSlug]/page.tsx, branche éditoriale.
 * Sans slug, le formulaire est présenté sur le premier produit du catalogue.
 */
async function loadInquiry(locale: Locale, slug?: string): Promise<EdBodyResult> {
  const productSlug = slug || (await getAllProducts(locale))[0]?.slug
  if (!productSlug) return EMPTY

  const product = await getProductBySlug(productSlug, locale)
  if (!product) return EMPTY

  return {
    data: {},
    slots: {
      body: (
        <EdInquiry
          product={{
            slug: product.slug,
            name: product.name,
            brandName: product.brand.name,
            brandSlug: product.brand.slug,
            catName: product.category.name,
            image: imgOr(product.cardImagePath),
            spec: product.cardSpec ?? '',
          }}
        />
      ),
    },
    resolvedPath: `/inquiry/${product.slug}`,
  }
}

/* ═════════════════════════════════ MENTIONS ═══════════════════════════════ */

/**
 * Repris de [locale]/legal/page.tsx. Le balisage vit maintenant dans
 * EdLegalBody, monté à l'identique par la route et par l'aperçu — c'est tout
 * l'intérêt de l'avoir sorti du fichier de route.
 */
async function loadLegal(): Promise<EdBodyResult> {
  const content = await getPublishedContent('page:legal')
  return { data: {}, slots: { body: <EdLegalBody content={content} /> } }
}
