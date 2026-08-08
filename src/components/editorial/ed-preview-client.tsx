'use client'

/**
 * ÉDITEUR — l'aperçu vivant.
 *
 * La route `/editor/preview` rend la page à partir du BROUILLON en base. Mais
 * pendant qu'on édite, la vérité est dans l'éditeur, pas en base : attendre
 * l'enregistrement puis recharger l'iframe ferait clignoter la page, perdrait
 * la position de défilement et rendrait chaque frappe visible avec une seconde
 * de retard.
 *
 * Ce composant garde donc le document en état local et écoute l'éditeur. Le
 * serveur ne fournit plus que l'amorce (et les fragments que seul lui peut
 * produire : moteur du catalogue, fiche produit, formulaires).
 */

import { useEffect, useState, type ReactNode } from 'react'
import { coerceDoc, coerceSite, type EdDoc, type EdSite } from '@/lib/ed-editor/model'
import { isEditorMsg } from '@/lib/ed-editor/bridge'
import { EdSkinPage } from './ed-skin-page'
import type { EdPageData } from './ed-ctx'

export interface EdPreviewClientProps {
  locale: string
  pageKey: string
  initialDoc: EdDoc
  initialSite: EdSite
  data?: EdPageData
  slots?: Record<string, ReactNode>
  previews?: (string | null)[]
  catNames?: { id: string; name: string }[]
}

export function EdPreviewClient({
  locale,
  pageKey,
  initialDoc,
  initialSite,
  data,
  slots,
  previews,
  catNames,
}: EdPreviewClientProps) {
  const [doc, setDoc] = useState<EdDoc>(initialDoc)
  const [site, setSite] = useState<EdSite>(initialSite)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isEditorMsg(e.data) || e.data.type !== 'doc') return
      /* On repasse par les mêmes validateurs que la base : le message vient
         d'une autre fenêtre, et un document mal formé doit être ignoré, pas
         faire tomber l'aperçu. */
      const nextDoc = coerceDoc(e.data.doc)
      const nextSite = coerceSite(e.data.site)
      if (nextDoc) setDoc(nextDoc)
      if (nextSite) setSite(nextSite)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <EdSkinPage
      locale={locale}
      pageKey={pageKey}
      doc={doc}
      site={site}
      data={data}
      slots={slots}
      editing
      previews={previews}
      catNames={catNames}
    />
  )
}
