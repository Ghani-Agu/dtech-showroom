import { notFound, redirect } from 'next/navigation'

import { getSessionUser } from '@/lib/auth-helpers'
import { hasAccess } from '@/lib/permissions'
import { getEdCustomPages, getEdDoc, getEdPageStates, getEdSite } from '@/server/ed-doc'
import { ED_PAGES, getPageDef } from '@/lib/ed-editor/pages'
import { EdEditor } from '@/components/ed-editor/EdEditor'

/**
 * /editor — l'éditeur du site.
 *
 * `force-dynamic` : la page sert un BROUILLON, par définition changeant. La
 * mettre en cache, ne serait-ce qu'une seconde, ferait rouvrir l'éditeur sur
 * un état déjà dépassé.
 *
 * La page choisie voyage dans l'URL (`?page=home`) plutôt que dans un état
 * local : on peut ainsi garder un onglet ouvert sur la fiche produit et un
 * autre sur l'accueil, et le bouton « précédent » du navigateur fait ce qu'on
 * attend de lui.
 */
export const dynamic = 'force-dynamic'

interface EditorProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function EditorPage({ searchParams }: EditorProps) {
  /* La mise en page de /editor exige déjà une session, mais une session, c'est
     aussi un client de la boutique (rôle `customer`). Composer les pages
     demande la permission « Éditeur web ». */
  const user = await getSessionUser()
  if (!user) redirect('/login?redirect=/editor')
  if (!hasAccess(user, 'editor')) notFound()

  const sp = await searchParams
  const pageKey = first(sp.page) || 'home'

  const customPages = await getEdCustomPages()
  const known = getPageDef(pageKey)
  const isCustom = pageKey.startsWith('custom:')
  if (!known || (isCustom && !customPages.some((c) => c.key === pageKey))) {
    redirect('/editor?page=home')
  }

  const [doc, site, states] = await Promise.all([
    getEdDoc(pageKey, { draft: true }),
    getEdSite({ draft: true }),
    getEdPageStates([...ED_PAGES.map((p) => p.key), ...customPages.map((c) => c.key)]),
  ])

  /*
   * Pas de `key` ici, et c'est voulu : l'éditeur pilote lui-même le changement
   * de page (`loadPage`), qui recharge le document sans repasser par un rendu
   * serveur. Remonter le composant en plus rejouerait ce travail et pouvait
   * ramener la page précédente quand le routeur et l'URL divergeaient.
   */
  return (
    <EdEditor
      pageKey={pageKey}
      doc={doc}
      site={site}
      customPages={customPages}
      states={states}
    />
  )
}
