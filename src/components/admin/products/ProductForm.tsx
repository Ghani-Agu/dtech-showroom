'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  AlignLeft,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Package,
  Settings2,
  ShoppingCart,
  Star,
  Trash2,
} from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { Button } from '@/components/admin/ui/Button'
import { Input } from '@/components/admin/ui/Input'
import { Textarea } from '@/components/admin/ui/Textarea'
import { BilingualField } from './BilingualField'
import { ImageManager } from './ImageManager'
import { ImageUpload } from './ImageUpload'
import { SpecsEditor } from './SpecsEditor'
import {
  archiveProduct,
  createProduct,
  deleteProductPermanently,
  restoreProduct,
  updateProduct,
} from '@/server/admin-product-actions'
import { toast } from '@/lib/toast'
import type { ProductFormValues } from '@/lib/validations/product'

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
  initialValues?: ProductFormValues
  isArchived?: boolean
  brands: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
}

const defaultValues: ProductFormValues = {
  slug: '',
  name: '',
  tagline: '',
  description: '',
  cardSpec: '',
  searchKeywords: '',
  nameFr: '',
  taglineFr: '',
  descriptionFr: '',
  cardSpecFr: '',
  searchKeywordsFr: '',
  brandId: '',
  categoryId: '',
  tier: 'longtail',
  featured: false,
  sortOrder: 100,
  specs: {},
  cardImagePath: '',
  heroImagePath: '',
  glbModelPath: '',
  photoCarouselPaths: [],
  seoTitle: '',
  seoDescription: '',
}

type FieldErrors = Record<string, string[] | undefined>

/** "Casque ASUS Gamer 2" → "casque-asus-gamer-2" */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

/* ── tabs ─────────────────────────────────────────────────── */

type TabId = 'essentiel' | 'contenu' | 'photos' | 'details' | 'seo'

const TABS: Array<{
  id: TabId
  label: string
  icon: typeof Package
  color: string
}> = [
  { id: 'essentiel', label: 'Essentiel', icon: Package, color: 'var(--c-blue)' },
  { id: 'contenu', label: 'Contenu', icon: AlignLeft, color: 'var(--c-violet)' },
  { id: 'photos', label: 'Photos', icon: ImageIcon, color: 'var(--c-orange)' },
  { id: 'details', label: 'Détails', icon: Settings2, color: 'var(--c-amber)' },
  { id: 'seo', label: 'SEO & avancé', icon: Globe, color: 'var(--c-rose)' },
]

const FIELD_TAB: Record<string, TabId> = {
  name: 'essentiel',
  nameFr: 'essentiel',
  brandId: 'essentiel',
  categoryId: 'essentiel',
  cardImagePath: 'essentiel',
  tagline: 'contenu',
  taglineFr: 'contenu',
  cardSpec: 'contenu',
  cardSpecFr: 'contenu',
  description: 'contenu',
  descriptionFr: 'contenu',
  searchKeywords: 'contenu',
  searchKeywordsFr: 'contenu',
  heroImagePath: 'photos',
  photoCarouselPaths: 'photos',
  tier: 'details',
  featured: 'details',
  sortOrder: 'details',
  specs: 'details',
  slug: 'seo',
  seoTitle: 'seo',
  seoDescription: 'seo',
}

const SELECT_CLS =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-body text-base text-white outline-none focus:border-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]'

export function ProductForm({
  mode,
  productId,
  initialValues,
  isArchived = false,
  brands,
  categories,
}: ProductFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<ProductFormValues>(
    initialValues ?? defaultValues
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [tab, setTab] = useState<TabId>('essentiel')
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  useKeyboardShortcut({
    key: 's',
    modifiers: ['cmd'],
    handler: () => {
      formRef.current?.requestSubmit()
    },
  })

  function update<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K]
  ) {
    setValues((v) => {
      const next = { ...v, [key]: value }
      if (key === 'name' && !slugTouched) {
        next.slug = slugify(String(value))
      }
      return next
    })
    if (errors[key as string]) {
      setErrors((e) => ({ ...e, [key as string]: undefined }))
    }
  }

  /* error dots per tab */
  const errorTabs = useMemo(() => {
    const set = new Set<TabId>()
    for (const key of Object.keys(errors)) {
      if (errors[key] && FIELD_TAB[key]) set.add(FIELD_TAB[key])
    }
    return set
  }, [errors])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createProduct(values)
          : await updateProduct(productId!, values)

      if (!result.ok) {
        const errs = result.errors ?? {}
        setErrors(errs)
        const firstTab = Object.keys(errs)
          .map((k) => FIELD_TAB[k])
          .find(Boolean)
        if (firstTab) setTab(firstTab)
        toast.error('Corrigez les erreurs signalées.')
        return
      }

      toast.success(mode === 'create' ? 'Produit créé' : 'Modifications enregistrées')

      if (mode === 'create' && 'id' in result) {
        router.push(`/admin/products/${result.id}/edit`)
      } else {
        router.refresh()
      }
    })
  }

  function handleArchiveToggle() {
    if (!productId) return
    startTransition(async () => {
      const result = isArchived
        ? await restoreProduct(productId)
        : await archiveProduct(productId)
      if (result.ok) {
        toast.success(isArchived ? 'Produit remis en ligne' : 'Produit masqué du site')
        router.refresh()
      } else {
        toast.error('Action impossible')
      }
    })
  }

  function handleDelete() {
    if (!productId) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      window.setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    startTransition(async () => {
      const result = await deleteProductPermanently(productId)
      if (result.ok) {
        toast.success('Produit supprimé définitivement')
        router.push('/admin/products')
        router.refresh()
      } else {
        toast.error('error' in result ? result.error : 'Échec de la suppression')
      }
    })
  }

  /* live preview + completeness inputs */
  const brandName =
    brands.find((b) => b.id === values.brandId)?.name ?? 'Marque'
  const categoryName =
    categories.find((c) => c.id === values.categoryId)?.name ?? 'Catégorie'
  const previewImage =
    values.cardImagePath && values.cardImagePath.trim() !== ''
      ? values.cardImagePath
      : '/placeholder-product.png'

  const checks: Array<{ label: string; done: boolean; tab: TabId }> = [
    { label: 'Photo principale', done: !!values.cardImagePath, tab: 'essentiel' },
    { label: 'Marque et catégorie', done: !!values.brandId && !!values.categoryId, tab: 'essentiel' },
    { label: 'Traduction française', done: !!values.nameFr, tab: 'essentiel' },
    { label: 'Spécification (carte)', done: !!(values.cardSpec || values.cardSpecFr), tab: 'contenu' },
    { label: 'Description', done: !!(values.description || values.descriptionFr), tab: 'contenu' },
    { label: 'Fiche technique', done: Object.keys(values.specs).length > 0, tab: 'details' },
    { label: 'Titre SEO', done: !!values.seoTitle, tab: 'seo' },
  ]
  const doneCount = checks.filter((c) => c.done).length
  const pct = Math.round((doneCount / checks.length) * 100)
  const pctColor = pct < 50 ? 'var(--c-orange)' : pct < 85 ? 'var(--c-amber)' : 'var(--c-mint)'

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="pb-28">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ════════ LEFT — tabbed editor ════════ */}
        <div className="min-w-0 space-y-5">
          {/* Tab bar */}
          <div className="glass-surface flex flex-wrap gap-1.5 p-2">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="relative inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-[13.5px] font-semibold transition-[background,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]"
                  style={
                    active
                      ? {
                          background: `color-mix(in oklab, ${t.color} 16%, transparent)`,
                          color: t.color,
                          border: `1px solid color-mix(in oklab, ${t.color} 45%, transparent)`,
                        }
                      : {
                          color: 'var(--admin-text-secondary)',
                          border: '1px solid transparent',
                        }
                  }
                >
                  <t.icon size={15} strokeWidth={1.9} />
                  {t.label}
                  {errorTabs.has(t.id) && (
                    <span
                      className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full"
                      style={{ background: '#f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.8)' }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Essentiel ── */}
          {tab === 'essentiel' && (
            <div className="glass-surface space-y-6 p-6">
              <TabHeading color="var(--c-blue)" title="L'essentiel" sub="Le minimum pour que le produit soit beau sur le site : nom, classement et photo." />
              <BilingualField
                label="Nom du produit"
                description="Tel qu'affiché sur les cartes et les pages du site."
                required
                enValue={values.name}
                frValue={values.nameFr}
                onEnChange={(v) => update('name', v)}
                onFrChange={(v) => update('nameFr', v)}
                enError={errors.name?.[0]}
                frError={errors.nameFr?.[0]}
                type="input"
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block font-body text-sm font-medium text-[var(--admin-text-secondary)]">
                    Marque <span style={{ color: 'var(--c-blue)' }}>*</span>
                  </label>
                  <select
                    value={values.brandId}
                    onChange={(e) => update('brandId', e.target.value)}
                    required
                    className={SELECT_CLS}
                  >
                    <option value="">Choisir une marque…</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {errors.brandId && (
                    <p className="font-body text-sm text-rose-300">{errors.brandId[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block font-body text-sm font-medium text-[var(--admin-text-secondary)]">
                    Catégorie <span style={{ color: 'var(--c-blue)' }}>*</span>
                  </label>
                  <select
                    value={values.categoryId}
                    onChange={(e) => update('categoryId', e.target.value)}
                    required
                    className={SELECT_CLS}
                  >
                    <option value="">Choisir une catégorie…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="font-body text-sm text-rose-300">{errors.categoryId[0]}</p>
                  )}
                </div>
              </div>
              <ImageUpload
                label="Photo principale"
                description={
                  values.slug
                    ? 'Affichée sur les cartes produit. Format conseillé : 4:3.'
                    : "Renseignez d'abord le nom (le slug se remplit tout seul), enregistrez, puis ajoutez la photo."
                }
                variant="card"
                entityType="product"
                entitySlug={values.slug}
                value={values.cardImagePath}
                onChange={(url) => update('cardImagePath', url)}
              />
            </div>
          )}

          {/* ── Contenu ── */}
          {tab === 'contenu' && (
            <div className="glass-surface space-y-6 p-6">
              <TabHeading color="var(--c-violet)" title="Textes du produit" sub="La colonne EN sert de référence (obligatoire), la colonne FR est affichée aux visiteurs." />
              <BilingualField
                label="Accroche"
                description="Courte phrase affichée sous le nom."
                enValue={values.tagline}
                frValue={values.taglineFr}
                onEnChange={(v) => update('tagline', v)}
                onFrChange={(v) => update('taglineFr', v)}
                type="input"
              />
              <BilingualField
                label="Spécification (carte)"
                description="Résumé technique en une ligne. Ex. : Intel i9 · 32 Go"
                enValue={values.cardSpec}
                frValue={values.cardSpecFr}
                onEnChange={(v) => update('cardSpec', v)}
                onFrChange={(v) => update('cardSpecFr', v)}
                type="input"
              />
              <BilingualField
                label="Description"
                description="Description complète affichée sur la page du produit."
                enValue={values.description}
                frValue={values.descriptionFr}
                onEnChange={(v) => update('description', v)}
                onFrChange={(v) => update('descriptionFr', v)}
                type="textarea"
                rows={6}
              />
              <BilingualField
                label="Mots-clés de recherche"
                description="Séparés par des espaces. Invisibles pour les clients."
                enValue={values.searchKeywords}
                frValue={values.searchKeywordsFr}
                onEnChange={(v) => update('searchKeywords', v)}
                onFrChange={(v) => update('searchKeywordsFr', v)}
                type="input"
              />
            </div>
          )}

          {/* ── Photos ── */}
          {tab === 'photos' && (
            <div className="glass-surface space-y-6 p-6">
              <TabHeading color="var(--c-orange)" title="Photos supplémentaires" sub="La photo principale se gère dans l'onglet Essentiel." />
              <ImageUpload
                label="Photo de couverture"
                description="Affichée en haut de la page produit. Format conseillé : 16:9."
                variant="hero"
                entityType="product"
                entitySlug={values.slug}
                value={values.heroImagePath}
                onChange={(url) => update('heroImagePath', url)}
              />
              <ImageManager
                label="Galerie photo"
                description="Vues supplémentaires du produit. Glissez pour réordonner. 8 maximum."
                entityType="product"
                entitySlug={values.slug}
                value={values.photoCarouselPaths}
                onChange={(urls) => update('photoCarouselPaths', urls)}
                maxImages={8}
              />
            </div>
          )}

          {/* ── Détails ── */}
          {tab === 'details' && (
            <div className="glass-surface space-y-6 p-6">
              <TabHeading color="var(--c-amber)" title="Fiche technique & affichage" sub="Les caractéristiques affichées en tableau, et la façon dont le produit est présenté." />
              <SpecsEditor
                value={values.specs}
                onChange={(specs) => update('specs', specs)}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block font-body text-sm font-medium text-[var(--admin-text-secondary)]">
                    Mise en scène (page produit)
                  </label>
                  <select
                    value={values.tier}
                    onChange={(e) =>
                      update('tier', e.target.value as 'hero' | 'featured' | 'longtail')
                    }
                    className={SELECT_CLS}
                  >
                    <option value="hero">Vitrine — mise en scène cinématique</option>
                    <option value="featured">Vedette — visionneuse interactive</option>
                    <option value="longtail">Standard — carrousel photo</option>
                  </select>
                </div>
                <Input
                  label="Ordre de tri"
                  description="Les plus petits nombres apparaissent en premier."
                  type="number"
                  min={0}
                  max={9999}
                  value={values.sortOrder}
                  onChange={(e) => update('sortOrder', parseInt(e.target.value, 10) || 0)}
                />
              </div>
              {/* featured toggle */}
              <button
                type="button"
                onClick={() => update('featured', !values.featured)}
                aria-pressed={values.featured}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition-colors"
                style={{
                  borderColor: values.featured
                    ? 'color-mix(in oklab, var(--c-amber) 45%, transparent)'
                    : 'var(--admin-glass-border)',
                  background: values.featured
                    ? 'color-mix(in oklab, var(--c-amber) 8%, transparent)'
                    : 'var(--admin-soft)',
                }}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{
                      background: 'color-mix(in oklab, var(--c-amber) 12%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--c-amber) 35%, transparent)',
                      color: 'var(--c-amber)',
                    }}
                  >
                    <Star
                      size={17}
                      fill={values.featured ? 'var(--c-amber)' : 'none'}
                    />
                  </span>
                  <span>
                    <span className="block font-body text-[14px] font-semibold text-white">
                      Produit mis en avant
                    </span>
                    <span className="block font-body text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>
                      Affiché avec une étoile sur le site
                    </span>
                  </span>
                </span>
                <span
                  className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                  style={{
                    background: values.featured ? 'var(--c-amber)' : 'var(--admin-soft-2)',
                  }}
                >
                  <span
                    className="absolute top-0.5 size-5 rounded-full bg-white transition-[left]"
                    style={{ left: values.featured ? '22px' : '2px' }}
                  />
                </span>
              </button>
            </div>
          )}

          {/* ── SEO & avancé ── */}
          {tab === 'seo' && (
            <div className="glass-surface space-y-6 p-6">
              <TabHeading color="var(--c-rose)" title="Référencement & avancé" sub="Tout est facultatif — le site utilise le nom et l'accroche par défaut." />
              <Input
                label="Adresse URL (slug)"
                description="Minuscules et tirets uniquement. Se remplit automatiquement à partir du nom."
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  update('slug', e.target.value)
                }}
                error={errors.slug?.[0]}
                required
              />
              <Input
                label="Titre SEO"
                description="120 caractères max. Par défaut : le nom du produit."
                value={values.seoTitle}
                onChange={(e) => update('seoTitle', e.target.value)}
              />
              <Textarea
                label="Description SEO"
                description="300 caractères max. Par défaut : l'accroche."
                rows={2}
                value={values.seoDescription}
                onChange={(e) => update('seoDescription', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* ════════ RIGHT — preview / publication / progress ════════ */}
        <aside className="space-y-5 xl:sticky xl:top-6">
          {/* Live site-card preview */}
          <div className="glass-surface overflow-hidden p-0">
            <p
              className="flex items-center gap-2 px-5 pb-3 pt-4 font-mono text-[10px] uppercase"
              style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2px' }}
            >
              <Eye size={11} />
              Aperçu sur le site
            </p>
            <div className="px-5 pb-5">
              <div
                className="overflow-hidden rounded-2xl border"
                style={{
                  borderColor: 'rgba(124,224,195,0.16)',
                  background: 'linear-gradient(180deg, #0a1322, #071120)',
                }}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={previewImage}
                    alt=""
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                  <span
                    className="absolute left-3 top-3 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      background: 'rgba(7,17,30,0.75)',
                      borderColor: 'rgba(124,224,195,0.3)',
                      color: '#b8efdc',
                    }}
                  >
                    {brandName}
                  </span>
                  {values.featured && (
                    <span
                      className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full"
                      style={{ background: '#7ce0c3', color: '#04110c' }}
                    >
                      <Star size={12} fill="#04110c" />
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 p-4">
                  <p
                    className="font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{ color: '#93a1b0' }}
                  >
                    {categoryName}
                  </p>
                  <p className="font-body text-[14px] font-bold leading-snug text-white">
                    {values.nameFr || values.name || 'Nom du produit'}
                  </p>
                  <p className="truncate font-body text-xs" style={{ color: '#93a1b0' }} dir="ltr">
                    {values.cardSpecFr || values.cardSpec || 'Spécification…'}
                  </p>
                  <div
                    className="mt-2 flex items-center justify-center gap-2 rounded-full border py-2 font-body text-[12.5px] font-semibold"
                    style={{
                      borderColor: 'rgba(124,224,195,0.38)',
                      background: 'rgba(124,224,195,0.10)',
                      color: '#7ce0c3',
                    }}
                  >
                    <ShoppingCart size={13} />
                    Ajouter au panier
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Publication */}
          <div className="glass-surface space-y-3 p-5">
            <p
              className="font-mono text-[10px] uppercase"
              style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2px' }}
            >
              Publication
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="font-body text-[13.5px] text-white">État sur le site</span>
              {mode === 'create' ? (
                <span
                  className="rounded-full px-2.5 py-1 font-body text-[11.5px] font-semibold"
                  style={{ background: 'color-mix(in oklab, var(--c-blue) 14%, transparent)', color: 'var(--c-blue)' }}
                >
                  Brouillon
                </span>
              ) : isArchived ? (
                <span
                  className="rounded-full px-2.5 py-1 font-body text-[11.5px] font-semibold"
                  style={{ background: 'color-mix(in oklab, var(--c-rose) 14%, transparent)', color: 'var(--c-rose)' }}
                >
                  Masqué
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[11.5px] font-semibold"
                  style={{ background: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)', color: 'var(--c-emerald-text)' }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: 'var(--c-emerald)', boxShadow: '0 0 6px color-mix(in oklab, var(--c-emerald) 90%, transparent)' }}
                  />
                  En ligne
                </span>
              )}
            </div>
            {mode === 'edit' && (
              <div className="space-y-2 pt-1">
                {!isArchived && (
                  <a
                    href={`/fr/products/${values.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full border py-2 font-body text-[13px] font-semibold transition-colors hover:border-[color-mix(in_oklab,_var(--c-blue)_60%,_transparent)]"
                    style={{
                      borderColor: 'color-mix(in oklab, var(--c-blue) 35%, transparent)',
                      color: 'var(--c-blue)',
                      background: 'color-mix(in oklab, var(--c-blue) 7%, transparent)',
                    }}
                  >
                    <ExternalLink size={13} />
                    Voir sur le site
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleArchiveToggle}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-full border py-2 font-body text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={
                    isArchived
                      ? {
                          borderColor: 'color-mix(in oklab, var(--c-emerald) 40%, transparent)',
                          color: 'var(--c-emerald-text)',
                          background: 'color-mix(in oklab, var(--c-emerald) 8%, transparent)',
                        }
                      : {
                          borderColor: 'color-mix(in oklab, var(--c-rose) 35%, transparent)',
                          color: 'var(--c-rose)',
                          background: 'color-mix(in oklab, var(--c-rose) 7%, transparent)',
                        }
                  }
                >
                  {isArchived ? <Eye size={13} /> : <EyeOff size={13} />}
                  {isArchived ? 'Remettre en ligne' : 'Masquer du site'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-full border py-2 font-body text-[13px] font-semibold transition-colors hover:bg-rose-500/80 hover:text-white disabled:opacity-50"
                  style={{
                    borderColor: 'rgba(244,63,94,0.4)',
                    color: '#fda4af',
                    background: 'rgba(244,63,94,0.08)',
                  }}
                >
                  <Trash2 size={13} />
                  {confirmDelete ? 'Cliquez pour confirmer' : 'Supprimer définitivement'}
                </button>
              </div>
            )}
          </div>

          {/* Completeness */}
          <div className="glass-surface space-y-3.5 p-5">
            <div className="flex items-center justify-between">
              <p
                className="font-mono text-[10px] uppercase"
                style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2px' }}
              >
                Fiche complète à
              </p>
              <span className="font-display text-[20px] font-semibold" style={{ color: pctColor }}>
                {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--admin-soft-2)' }}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, color-mix(in oklab, ${pctColor} 55%, transparent), ${pctColor})`,
                  boxShadow: `0 0 12px color-mix(in oklab, ${pctColor} 55%, transparent)`,
                }}
              />
            </div>
            <ul className="space-y-1.5 pt-1">
              {checks.map((c) => (
                <li key={c.label}>
                  <button
                    type="button"
                    onClick={() => setTab(c.tab)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span
                      className="flex size-4.5 shrink-0 items-center justify-center rounded-full border"
                      style={
                        c.done
                          ? {
                              background: 'color-mix(in oklab, var(--c-mint) 15%, transparent)',
                              borderColor: 'color-mix(in oklab, var(--c-mint) 50%, transparent)',
                              color: 'var(--c-mint)',
                            }
                          : {
                              borderColor: 'var(--admin-glass-border-strong)',
                              color: 'transparent',
                            }
                      }
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span
                      className="font-body text-[12.5px]"
                      style={{
                        color: c.done ? 'var(--admin-text-secondary)' : 'var(--admin-text-secondary)',
                        textDecoration: c.done ? 'none' : 'none',
                      }}
                    >
                      {c.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* ════════ action bar ════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-10 border-t backdrop-blur-xl md:left-[268px]"
        style={{
          borderColor: 'var(--admin-glass-border)',
          background: 'var(--admin-glass-bg)',
        }}
      >
        <div className="flex items-center justify-between gap-3 px-8 py-4">
          <p className="hidden font-mono text-[10.5px] uppercase tracking-[1.5px] sm:block" style={{ color: 'var(--admin-text-tertiary)' }}>
            Ctrl + S pour enregistrer
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              {mode === 'create' ? 'Créer le produit' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function TabHeading({ color, title, sub }: { color: string; title: string; sub: string }) {
  return (
    <div className="border-b pb-4" style={{ borderColor: 'var(--admin-line)' }}>
      <p className="font-body text-[16px] font-bold text-white">
        <span
          aria-hidden="true"
          className="mr-2.5 inline-block size-2 rounded-full align-middle"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
        {title}
      </p>
      <p className="mt-1 font-body text-[12.5px]" style={{ color: 'var(--admin-text-tertiary)' }}>
        {sub}
      </p>
    </div>
  )
}
