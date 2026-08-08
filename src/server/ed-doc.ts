import { eq, inArray } from 'drizzle-orm'
import { cachedData } from '@/lib/data-cache'
import { db } from '@/db/client'
import { withDb } from '@/db/health'
import { sitePages, type SitePageRow } from '@/db/schema'
import { defaultSections } from '@/lib/ed-editor/defaults'
import { coerceDoc, coerceSite, emptySite, type EdDoc, type EdSite } from '@/lib/ed-editor/model'
import {
  coerceCustomPages,
  rowKey,
  CUSTOM_ROW_KEY,
  SITE_ROW_KEY,
  type EdCustomPage,
} from '@/lib/ed-editor/pages'

/**
 * ed-doc.ts — la lecture des documents de l'éditeur « Éditorial ».
 *
 * Volontairement SANS `'use server'` : ce fichier n'expose que des lectures,
 * appelées depuis des composants serveur. Le marquer `'use server'` en ferait
 * autant de points d'entrée publics, ce qui n'a aucun intérêt ici — et les
 * écritures, elles, sont regroupées dans ed-actions.ts où chaque export est
 * gardé par `requireSection('editor')`.
 *
 * Tout vit dans la table `site_pages` existante, sous des clés préfixées :
 *
 *   `ed:<clé de page>`  le document d'une page      (ex. `ed:home`)
 *   `ed:__site__`       les réglages globaux        (palette, polices, chrome)
 *   `ed:__custom__`     le manifeste des pages perso
 *
 * Le préfixe `ed:` isole la peau Éditorial de l'ancien éditeur (`content:`,
 * `home-hero`, `site:design`…) : les deux systèmes cohabitent dans la même
 * table sans jamais se marcher dessus, et un `DROP` n'est nécessaire nulle
 * part pour revenir en arrière.
 *
 * RÈGLE ABSOLUE DE CE FICHIER : ne jamais lever d'exception. Une base
 * injoignable, une table pas encore créée ou une ligne corrompue doivent
 * rendre la page CODÉE par défaut — c'est-à-dire exactement ce que le site
 * affichait avant l'éditeur. Un site qui plante vaut bien moins qu'un site qui
 * ignore temporairement les personnalisations.
 */

/**
 * Lecture brute d'une ligne, bornée par le disjoncteur (`withDb`) et sourde
 * aux erreurs. Le `catch` est le même que dans editor-page-data.ts et pour la
 * même raison : au premier démarrage la table peut ne pas exister, et pendant
 * une coupure le disjoncteur rejette la requête sans même toucher au réseau.
 */
async function readRow(key: string): Promise<SitePageRow | null> {
  try {
    const rows = await withDb(() =>
      db.select().from(sitePages).where(eq(sitePages.key, key)).limit(1)
    )
    return rows[0] ?? null
  } catch {
    return null
  }
}

/**
 * Lecture MISE EN CACHE, pour tout ce que voit un visiteur.
 *
 * Le préfixe de clé `sitePage:` est repris tel quel de editor-page-data.ts :
 * c'est celui que `bustDataCache('sitePage:')` purge côté actions. Utiliser un
 * autre préfixe créerait un deuxième cache que personne n'invalide, et une
 * publication resterait invisible pendant une minute.
 *
 * `cacheEmpty` parce qu'ici « aucune ligne » est un état normal et durable :
 * une page jamais touchée n'a pas de ligne, et il ne faut pas repayer une
 * requête à chaque rendu pour se le faire confirmer.
 */
function readRowCached(key: string): Promise<SitePageRow | null> {
  return cachedData(`sitePage:${key}`, () => readRow(key), { cacheEmpty: true })
}

/**
 * Le document d'une page.
 *
 * `draft: true` = le mode éditeur : le brouillon gagne, sinon le publié, et la
 * lecture CONTOURNE le cache. C'est le point important : un auteur doit voir
 * sa sauvegarde automatique immédiatement, jamais la version d'il y a une
 * minute. Le visiteur, lui, ne lit que `published`, et via le cache.
 *
 * Un document vide (zéro section) est traité comme une absence de document :
 * une page dont toutes les sections auraient été supprimées rendrait
 * autrement une page blanche, alors que la composition codée par défaut est
 * toujours le meilleur repli.
 */
export async function getEdDoc(
  pageKey: string,
  opts?: { draft?: boolean }
): Promise<EdDoc> {
  const key = rowKey(pageKey)
  const row = opts?.draft ? await readRow(key) : await readRowCached(key)
  const raw = opts?.draft ? (row?.draft ?? row?.published) : row?.published
  const doc = coerceDoc(raw)
  if (!doc || doc.sections.length === 0) {
    return { v: 1, sections: defaultSections(pageKey) }
  }
  return doc
}

/**
 * Les réglages globaux (jetons de couleur, polices, textes partagés, menu,
 * pied de page). Même logique de fraîcheur que `getEdDoc`.
 *
 * Le repli est `emptySite()` et non un objet « thème par défaut » : un site
 * sans surcharge doit laisser la feuille de style d'origine décider, sinon la
 * première ouverture de l'éditeur figerait la palette actuelle en dur.
 */
export async function getEdSite(opts?: { draft?: boolean }): Promise<EdSite> {
  const row = opts?.draft ? await readRow(SITE_ROW_KEY) : await readRowCached(SITE_ROW_KEY)
  const raw = opts?.draft ? (row?.draft ?? row?.published) : row?.published
  return coerceSite(raw) ?? emptySite()
}

/**
 * Le manifeste des pages personnalisées.
 *
 * Lecture mise en cache parce que la route attrape-tout la consulte à CHAQUE
 * requête inconnue pour décider entre « page perso » et 404 : c'est la lecture
 * la plus chaude de tout l'éditeur. La fraîcheur est assurée à l'écriture —
 * ed-actions.ts purge le cache dès qu'une page est créée ou supprimée.
 *
 * `published` d'abord, `draft` ensuite : le manifeste est écrit dans les deux
 * colonnes à la création, mais préférer le publié garantit que le site public
 * ne se met jamais à résoudre une adresse encore en brouillon.
 */
export async function getEdCustomPages(): Promise<EdCustomPage[]> {
  const row = await readRowCached(CUSTOM_ROW_KEY)
  return coerceCustomPages(row?.published ?? row?.draft)
}

export interface EdPageState {
  published: boolean
  draft: boolean
  updatedAt: string | null
}

/**
 * L'état de publication de plusieurs pages d'un coup — les pastilles du
 * navigateur de pages de l'éditeur.
 *
 * UNE seule requête avec `inArray`. La version naïve (une lecture par clé,
 * comme `listPageStates` dans editor-page-data.ts) coûte quinze allers-retours
 * sur un lien transatlantique à chaque ouverture de l'éditeur, soit plusieurs
 * secondes avant le premier pixel.
 *
 * Toutes les clés demandées sont présentes dans le résultat, même sans ligne
 * en base : l'appelant peut indexer sans se protéger, et une base morte donne
 * simplement « rien de publié, rien en brouillon » plutôt qu'une erreur.
 *
 * `updatedAt` est renvoyé en chaîne ISO, pas en `Date` : ce résultat traverse
 * la frontière serveur → client, où une `Date` serait de toute façon
 * sérialisée. Autant que le type dise la vérité.
 */
export async function getEdPageStates(
  keys: string[]
): Promise<Record<string, EdPageState>> {
  const out: Record<string, EdPageState> = {}
  for (const key of keys) {
    out[key] = { published: false, draft: false, updatedAt: null }
  }
  // `inArray` avec une liste vide produit du SQL inutile (voire invalide selon
  // le pilote) : il n'y a de toute façon rien à demander.
  if (keys.length === 0) return out

  try {
    const rows = await withDb(() =>
      db
        .select({
          key: sitePages.key,
          draft: sitePages.draft,
          published: sitePages.published,
          updatedAt: sitePages.updatedAt,
        })
        .from(sitePages)
        .where(inArray(sitePages.key, keys.map(rowKey)))
    )
    for (const row of rows) {
      // On repasse de la clé de ligne (`ed:home`) à la clé de page (`home`).
      const pageKey = row.key.slice('ed:'.length)
      if (!(pageKey in out)) continue
      out[pageKey] = {
        published: row.published !== null && row.published !== undefined,
        draft: row.draft !== null && row.draft !== undefined,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      }
    }
  } catch {
    // Même contrat que partout ailleurs ici : l'éditeur s'ouvre avec des
    // pastilles éteintes plutôt que sur un écran d'erreur.
  }
  return out
}
