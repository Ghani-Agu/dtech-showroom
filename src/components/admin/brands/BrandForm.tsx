'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { BilingualField } from '@/components/admin/products/BilingualField'
import { ImageUpload } from '@/components/admin/products/ImageUpload'
import { Button } from '@/components/admin/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'
import { Input } from '@/components/admin/ui/Input'
import {
  archiveBrand,
  createBrand,
  deleteBrandPermanently,
  restoreBrand,
  updateBrand,
} from '@/server/admin-brand-actions'
import { toast } from '@/lib/toast'
import type { BrandFormValues } from '@/lib/validations/brand'

interface BrandFormProps {
  mode: 'create' | 'edit'
  brandId?: string
  initialValues?: BrandFormValues
  isArchived?: boolean
}

const defaultValues: BrandFormValues = {
  slug: '',
  name: '',
  statement: '',
  description: '',
  searchKeywords: '',
  nameFr: '',
  statementFr: '',
  descriptionFr: '',
  searchKeywordsFr: '',
  sortOrder: 100,
  logoPath: '',
  heroImagePath: '',
}

type FieldErrors = Record<string, string[] | undefined>

export function BrandForm({
  mode,
  brandId,
  initialValues,
  isArchived = false,
}: BrandFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<BrandFormValues>(
    initialValues ?? defaultValues
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  // two-step confirmation for the permanent delete button
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  useKeyboardShortcut({
    key: 's',
    modifiers: ['cmd'],
    handler: () => {
      formRef.current?.requestSubmit()
    },
  })

  function update<K extends keyof BrandFormValues>(
    key: K,
    value: BrandFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key as string]) {
      setErrors((e) => ({ ...e, [key as string]: undefined }))
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createBrand(values)
          : await updateBrand(brandId!, values)

      if (!result.ok) {
        setErrors(result.errors ?? {})
        toast.error('Veuillez corriger les erreurs ci-dessous.')
        return
      }

      toast.success(mode === 'create' ? 'Marque créée' : 'Marque mise à jour')

      if (mode === 'create' && 'id' in result) {
        router.push(`/admin/brands/${result.id}/edit`)
      } else {
        router.refresh()
      }
    })
  }

  function handleArchive() {
    if (!brandId) return
    if (
      !confirm(
        'Masquer cette marque ? Elle ne sera plus visible sur le site public.'
      )
    )
      return

    startTransition(async () => {
      const result = await archiveBrand(brandId)
      if (result.ok) {
        toast.success('Marque masquée')
        router.refresh()
      } else {
        toast.error('Échec du masquage')
      }
    })
  }

  function handleRestore() {
    if (!brandId) return

    startTransition(async () => {
      const result = await restoreBrand(brandId)
      if (result.ok) {
        toast.success('Marque remise en ligne')
        router.refresh()
      } else {
        toast.error('Échec de la remise en ligne')
      }
    })
  }

  function handleDelete() {
    if (!brandId) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      window.setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    startTransition(async () => {
      const result = await deleteBrandPermanently(brandId)
      if (result.ok) {
        toast.success('Supprimé définitivement')
        router.push('/admin/brands')
        router.refresh()
      } else {
        toast.error('error' in result ? result.error : 'Échec de la suppression')
      }
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 pb-24"
    >
      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>
            L'adresse URL utilisée dans /brands/[slug].
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Adresse URL (slug)"
            description="Minuscules et tirets uniquement. Exemple : hp"
            value={values.slug}
            onChange={(e) => update('slug', e.target.value)}
            error={errors.slug?.[0]}
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contenu</CardTitle>
          <CardDescription>
            L'anglais est la version de référence. Le français est
            facultatif — l'anglais est utilisé si vide.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualField
            label="Nom"
            required
            enValue={values.name}
            frValue={values.nameFr}
            onEnChange={(v) => update('name', v)}
            onFrChange={(v) => update('nameFr', v)}
            enError={errors.name?.[0]}
            frError={errors.nameFr?.[0]}
            type="input"
          />

          <BilingualField
            label="Signature"
            description="Phrase d’accroche affichée sur la page de la marque."
            enValue={values.statement}
            frValue={values.statementFr}
            onEnChange={(v) => update('statement', v)}
            onFrChange={(v) => update('statementFr', v)}
            type="input"
          />

          <BilingualField
            label="Description"
            description="Description éditoriale affichée sur la page de la marque."
            enValue={values.description}
            frValue={values.descriptionFr}
            onEnChange={(v) => update('description', v)}
            onFrChange={(v) => update('descriptionFr', v)}
            type="textarea"
            rows={5}
          />

          <BilingualField
            label="Mots-clés de recherche"
            description="Mots-clés séparés par des espaces pour la recherche. Invisibles pour les clients."
            enValue={values.searchKeywords}
            frValue={values.searchKeywordsFr}
            onEnChange={(v) => update('searchKeywords', v)}
            onFrChange={(v) => update('searchKeywordsFr', v)}
            type="input"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affichage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Ordre de tri"
            description="Les nombres les plus bas apparaissent en premier. 100 par défaut."
            type="number"
            min={0}
            max={9999}
            value={values.sortOrder}
            onChange={(e) =>
              update('sortOrder', parseInt(e.target.value, 10) || 0)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            {!values.slug
              ? 'Enregistrez d’abord la marque pour activer l’envoi d’images.'
              : 'Glissez-déposez les images, ou cliquez pour parcourir.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            label="Logo"
            description="Logo carré, fond transparent recommandé. 600×600."
            variant="logo"
            entityType="brand"
            entitySlug={values.slug}
            value={values.logoPath}
            onChange={(url) => update('logoPath', url)}
          />

          <ImageUpload
            label="Image principale"
            description="Image 16:9 affichée en haut de la page de la marque."
            variant="hero"
            entityType="brand"
            entitySlug={values.slug}
            value={values.heroImagePath}
            onChange={(url) => update('heroImagePath', url)}
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-60 right-0 z-10 border-t border-white/[0.08] bg-[var(--admin-canvas)]/90 backdrop-blur">
        <div className="flex max-w-5xl items-center justify-between gap-3 px-8 py-4">
          <div>
            {mode === 'edit' && !isArchived && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleArchive}
                disabled={isPending}
              >
                Masquer du site
              </Button>
            )}
            {mode === 'edit' && isArchived && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleRestore}
                disabled={isPending}
              >
                Remettre en ligne
              </Button>
            )}
            {mode === 'edit' && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {confirmDelete
                  ? 'Cliquez pour confirmer la suppression'
                  : 'Supprimer définitivement'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/brands')}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              {mode === 'create' ? 'Créer la marque' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
