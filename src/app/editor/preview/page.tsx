import { notFound, redirect } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { getSessionUser } from '@/lib/auth-helpers'
import { hasAccess } from '@/lib/permissions'
import { isValidLocale, type Locale } from '@/i18n/config'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { getNavData } from '@/server/nav-data'
import { buildEdBody } from '@/server/ed-page-body'
import { NavDataProvider } from '@/components/layout/nav-data'
import { EdPreviewClient } from '@/components/editorial/ed-preview-client'

/**
 * /editor/preview — la page telle qu'elle sera, dans l'iframe de l'éditeur.
 *
 * C'est le MÊME rendu que le site public : `EdSkinPage` est l'unique
 * enveloppe des douze pages de la peau éditoriale, et on lui donne ici le
 * document en BROUILLON plutôt que le publié. D'où la promesse du système —
 * ce que l'auteur voit est la page, pas une maquette qui lui ressemble.
 *
 * `force-dynamic` : le brouillon change à chaque frappe. Une page mise en
 * cache, même une seconde, afficherait un état déjà périmé au moment où
 * l'éditeur recharge l'iframe.
 */
export const dynamic = 'force-dynamic'

interface PreviewProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Première valeur d'un paramètre, qui peut être répété dans l'URL. */
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function EditorPreviewPage({ searchParams }: PreviewProps) {
  /**
   * Deux verrous, pas un.
   *
   * La mise en page de `/editor` exige déjà une session — mais une session
   * suffit à un CLIENT inscrit sur la boutique (rôle `customer`, round 15).
   * Or cette route sert des BROUILLONS non publiés : une page à moitié
   * écrite, un tarif en préparation, une annonce datée. Il faut donc en plus
   * la permission « Éditeur web », d'où `getSessionUser` (session + ligne
   * utilisateur, mutualisée par React `cache`) plutôt que la seule session.
   *
   * Non connecté → /login, comme partout dans /editor. Connecté mais sans le
   * droit → `notFound()` et pas une redirection : rien ne doit révéler qu'il
   * existe ici quelque chose à voir.
   */
  const user = await getSessionUser()
  if (!user) redirect('/login?redirect=/editor')
  if (!hasAccess(user, 'editor')) notFound()

  const sp = await searchParams
  const pageKey = firstParam(sp.page) || 'home'
  const rawLocale = firstParam(sp.locale)
  // Le français est la langue de travail du site : c'est le défaut de
  // l'éditeur, alors que `defaultLocale` (i18n/config) vaut 'en'.
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : 'fr'
  const slug = firstParam(sp.slug) || undefined

  // Sans ça, les composants serveur de l'arbre liraient la langue dans les
  // en-têtes de la requête — c'est-à-dire celle du navigateur de l'auteur, pas
  // celle qu'il a choisie dans la barre de l'éditeur.
  setRequestLocale(locale)

  const [doc, site, messages, nav, body] = await Promise.all([
    getEdDoc(pageKey, { draft: true }),
    getEdSite({ draft: true }),
    getMessages({ locale }),
    // L'en-tête et le pied de page lisent les familles et les marques dans ce
    // contexte ; sans lui le menu Catalogue s'affiche vide et l'aperçu ment.
    getNavData(locale),
    buildEdBody({ pageKey, locale, slug, searchParams: sp }),
  ])

  // Clé inconnue : ni page canonique, ni page personnalisée.
  if (!body) notFound()

  /* Rien d'autre que la page : ni barre d'outils, ni cadre d'administration.
     Les deux fournisseurs ci-dessous ne rendent aucun balisage — ils portent
     les traductions et les données de navigation que la mise en page [locale]
     fournit d'ordinaire, et dont cette route, hors de ce segment, ne
     bénéficie pas. */
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NavDataProvider value={nav}>
        {/* L'amorce vient du serveur ; ensuite l'aperçu suit l'éditeur en
            direct (voir ed-preview-client.tsx) plutôt que de recharger. */}
        <EdPreviewClient
          locale={locale}
          pageKey={pageKey}
          initialDoc={doc}
          initialSite={site}
          data={body.data}
          slots={body.slots}
          previews={body.previews}
          catNames={body.catNames}
        />
      </NavDataProvider>
    </NextIntlClientProvider>
  )
}
