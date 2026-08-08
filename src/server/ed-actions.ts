'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { imageBlobs, sitePages } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'
import { bustDataCache } from '@/lib/data-cache'
import { revalidateStorefront } from '@/lib/revalidate'
import { processHeroSlide, validateImage } from '@/lib/image-processing'
import { R2_CONFIGURED, generateHash, uploadToR2 } from '@/lib/r2'
import { coerceDoc, coerceSite, type EdDoc } from '@/lib/ed-editor/model'
import { starterCustom } from '@/lib/ed-editor/defaults'
import { getEdDoc } from '@/server/ed-doc'
import {
  coerceCustomPages,
  customKeyForPath,
  getPageDef,
  normalizePath,
  pathConflicts,
  rowKey,
  CUSTOM_ROW_KEY,
  SITE_ROW_KEY,
  type EdCustomPage,
} from '@/lib/ed-editor/pages'

/**
 * ed-actions.ts — les écritures de l'éditeur « Éditorial ».
 *
 * CE FICHIER EST UNE SURFACE PUBLIQUE. Chaque export d'un module `'use
 * server'` devient une route appelable par n'importe qui, avec n'importe quel
 * argument : le navigateur poste un identifiant d'action et un corps JSON, et
 * Next exécute la fonction. Deux conséquences qui expliquent la forme du
 * fichier :
 *
 *  1. On n'exporte QUE des actions. Tout le reste (l'upsert, la lecture du
 *     manifeste, les validations) est privé — un helper exporté « pour le
 *     confort » serait un point d'entrée non gardé de plus.
 *  2. Chaque action commence par `await requireSection('editor')`, AVANT de
 *     toucher au moindre argument. Valider d'abord et authentifier ensuite
 *     laisserait un visiteur anonyme sonder la base par les messages d'erreur.
 *
 * Les erreurs ne remontent jamais telles quelles au client : on renvoie
 * toujours `{ ok, error? }` pour que l'éditeur puisse afficher un message en
 * français plutôt qu'un écran d'erreur React.
 */

export interface EdLoadResult {
  ok: boolean
  error?: string
  doc?: EdDoc
}

export interface EdActionResult {
  ok: boolean
  error?: string
}

/** Résultat de la création d'une page personnalisée (la clé sert à naviguer). */
export interface EdCreatePageResult extends EdActionResult {
  key?: string
}

/** Résultat d'un envoi d'image. Forme discriminée : `url` n'existe que si ok. */
export type EdUploadResult =
  | { ok: true; url: string; width?: number; height?: number }
  | { ok: false; error: string }

/* ────────────────────────── plomberie commune ────────────────────────── */

/** Les colonnes qu'une action a le droit de réécrire sur une ligne `ed:*`. */
interface EdRowPatch {
  draft?: unknown
  published?: unknown
  publishedAt?: Date | null
}

/**
 * L'unique écriture du fichier.
 *
 * `onConflictDoUpdate` plutôt que « lire puis décider » : deux onglets de
 * l'éditeur ouverts sur la même page (ou une sauvegarde automatique qui croise
 * une publication) doivent produire une ligne cohérente, pas une erreur de clé
 * dupliquée. Et surtout, le patch ne cite QUE les colonnes concernées : c'est
 * ce qui permet à la sauvegarde automatique de ne pas effleurer `published`,
 * donc de ne jamais publier par accident ce que l'auteur est en train
 * d'essayer.
 */
async function upsert(key: string, patch: EdRowPatch): Promise<void> {
  const now = new Date()
  await db
    .insert(sitePages)
    .values({ key, ...patch, updatedAt: now })
    .onConflictDoUpdate({
      target: sitePages.key,
      set: { ...patch, updatedAt: now },
    })
}

/**
 * À appeler dès qu'une ligne VISIBLE PAR UN VISITEUR change.
 *
 * `bustDataCache('sitePage:')` vide le cache en mémoire (frais ET périmé) de
 * toutes les lignes de `site_pages`, y compris celle qu'on vient d'écrire :
 * sans lui, la régénération ISR déclenchée juste après relirait la valeur
 * d'avant et la publication semblerait n'avoir rien fait. `revalidateStorefront`
 * enchaîne sur le cache de routes de Next — et se termine par un
 * `revalidatePath('/', 'layout')`, ce qui couvre les changements de chrome
 * (palette, polices, menu, pied de page) portés par la ligne `ed:__site__`.
 */
function flush(): void {
  bustDataCache('sitePage:')
  revalidateStorefront()
}

/**
 * Une clé de page acceptable = une page déclarée dans ED_PAGES, ou une page
 * personnalisée (`custom:/…`). `getPageDef` connaît les deux cas.
 *
 * Ce garde-fou n'est pas cosmétique : sans lui, un compte « éditeur » pourrait
 * écrire sous n'importe quelle clé de `site_pages` — donc écraser
 * `site:design`, `home-hero` ou le manifeste de l'ancien éditeur, qui vivent
 * dans la même table.
 */
function isEditablePageKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && key.length < 200 && !!getPageDef(key)
}

/** Message d'erreur présentable, sans jamais exposer une trace SQL. */
function toMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : ''
  if (raw.startsWith('Unauthorized')) return 'Session expirée — reconnectez-vous.'
  if (raw.startsWith('Forbidden')) return 'Accès « éditeur » requis.'
  return fallback
}

/**
 * Lecture FRAÎCHE du manifeste des pages personnalisées.
 *
 * On ne passe volontairement pas par `getEdCustomPages()` de ed-doc.ts, qui
 * est mis en cache : créer et supprimer sont des lectures-modifications-
 * écritures, et repartir d'un manifeste vieux d'une minute effacerait
 * silencieusement la page qu'un collègue vient d'ajouter.
 */
async function readCustomPages(): Promise<EdCustomPage[]> {
  const rows = await db
    .select()
    .from(sitePages)
    .where(eq(sitePages.key, CUSTOM_ROW_KEY))
    .limit(1)
  const row = rows[0]
  return coerceCustomPages(row?.published ?? row?.draft)
}

/** Le manifeste est écrit dans les DEUX colonnes — voir edCreateCustomPage. */
async function writeCustomPages(pages: EdCustomPage[]): Promise<void> {
  const manifest = { pages }
  await upsert(CUSTOM_ROW_KEY, { draft: manifest, published: manifest })
}

/* ──────────────────────────── pages : documents ──────────────────────── */

/**
 * Sauvegarde automatique. Appelée toutes les quelques secondes pendant qu'on
 * édite : elle doit rester la plus légère possible, donc AUCUNE invalidation
 * de cache et AUCUNE régénération ISR. Un brouillon n'est visible que dans
 * l'éditeur, qui lit toujours hors cache (`getEdDoc(key, { draft: true })`).
 */
export async function edSaveDraft(
  pageKey: string,
  doc: unknown
): Promise<EdActionResult> {
  try {
    await requireSection('editor')
    if (!isEditablePageKey(pageKey)) return { ok: false, error: 'Page inconnue.' }
    const clean = coerceDoc(doc)
    if (!clean) return { ok: false, error: 'Document invalide.' }
    await upsert(rowKey(pageKey), { draft: clean })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec de la sauvegarde.') }
  }
}

/**
 * Mise en ligne. Le brouillon ET le publié reçoivent le même document : sans
 * cela, publier puis rouvrir l'éditeur repartirait d'un brouillon plus ancien
 * que ce que voient les visiteurs.
 *
 * On passe par `coerceDoc` avant d'écrire — c'est la même fonction que celle
 * qui relit la ligne au rendu, donc on ne peut pas stocker quelque chose que
 * le site refuserait d'afficher.
 */
export async function edPublish(
  pageKey: string,
  doc: unknown
): Promise<EdActionResult> {
  try {
    await requireSection('editor')
    if (!isEditablePageKey(pageKey)) return { ok: false, error: 'Page inconnue.' }
    const clean = coerceDoc(doc)
    if (!clean) return { ok: false, error: 'Document invalide.' }
    await upsert(rowKey(pageKey), {
      draft: clean,
      published: clean,
      publishedAt: new Date(),
    })
    flush()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec de la mise en ligne.') }
  }
}

/**
 * Retirer du site sans rien perdre : `published` repasse à NULL, la page
 * publique retrouve sa composition codée, et le brouillon reste intact pour
 * qu'on puisse continuer à travailler puis republier.
 */
export async function edUnpublish(pageKey: string): Promise<EdActionResult> {
  try {
    await requireSection('editor')
    if (!isEditablePageKey(pageKey)) return { ok: false, error: 'Page inconnue.' }
    await upsert(rowKey(pageKey), { published: null, publishedAt: null })
    flush()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec du retrait.') }
  }
}

/**
 * Réinitialiser : les deux colonnes repassent à NULL, donc `getEdDoc` retombe
 * sur `defaultSections(pageKey)`. C'est le bouton « annuler tout » qui rend la
 * peau Éditorial sans risque : quoi qu'on ait bricolé, la page redevient
 * exactement celle d'avant l'éditeur.
 *
 * On garde la ligne (avec ses colonnes vidées) plutôt que de la supprimer :
 * `updatedAt` reste une trace utile de la dernière intervention.
 */
export async function edReset(pageKey: string): Promise<EdActionResult> {
  try {
    await requireSection('editor')
    if (!isEditablePageKey(pageKey)) return { ok: false, error: 'Page inconnue.' }
    await upsert(rowKey(pageKey), { draft: null, published: null, publishedAt: null })
    flush()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec de la réinitialisation.') }
  }
}

/* ─────────────────────── réglages globaux du site ────────────────────── */

/** Brouillon des réglages globaux — même contrat que `edSaveDraft`. */
export async function edSaveSite(site: unknown): Promise<EdActionResult> {
  try {
    await requireSection('editor')
    const clean = coerceSite(site)
    if (!clean) return { ok: false, error: 'Réglages invalides.' }
    await upsert(SITE_ROW_KEY, { draft: clean })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec de la sauvegarde.') }
  }
}

/**
 * Mise en ligne des réglages globaux.
 *
 * Ceux-ci (jetons de couleur, polices, menu, pied de page) sont rendus par le
 * layout `[locale]`, pas par une page : c'est pourquoi `flush()` doit aller
 * jusqu'au `revalidatePath('/', 'layout')` de `revalidateStorefront`. Se
 * contenter d'invalider les routes laisserait l'ancien chrome en place sur
 * tout le site.
 */
export async function edPublishSite(site: unknown): Promise<EdActionResult> {
  try {
    await requireSection('editor')
    const clean = coerceSite(site)
    if (!clean) return { ok: false, error: 'Réglages invalides.' }
    await upsert(SITE_ROW_KEY, {
      draft: clean,
      published: clean,
      publishedAt: new Date(),
    })
    flush()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec de la mise en ligne.') }
  }
}

/**
 * Charger le document d'une AUTRE page, sans quitter l'éditeur.
 *
 * Changer de page passait par `router.push`, donc par un rendu serveur complet
 * de `/editor` : relecture des réglages du site, de l'état des quinze pages, et
 * remontage de toute l'interface. Sur une base distante, cela pouvait prendre
 * plusieurs secondes pendant lesquelles rien ne bougeait — on croyait que la
 * page refusait de s'ouvrir. Ici on ne lit qu'UNE ligne, et l'éditeur échange
 * son document en place.
 */
export async function edLoadPage(pageKey: string): Promise<EdLoadResult> {
  try {
    await requireSection('editor')
    if (!isEditablePageKey(pageKey)) return { ok: false, error: 'Page inconnue.' }
    const doc = await getEdDoc(pageKey, { draft: true })
    return { ok: true, doc }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Impossible d’ouvrir cette page.') }
  }
}

/* ────────────────────────── pages personnalisées ─────────────────────── */

/**
 * Créer une page à une adresse libre (ex. `/promo-rentree`).
 *
 * Trois écritures, dans cet ordre d'importance :
 *
 *  - le MANIFESTE, en brouillon ET en publié. La route attrape-tout
 *    (`[...slug]`) lit le manifeste publié pour décider entre « page perso » et
 *    404 : un manifeste seulement en brouillon donnerait une page introuvable
 *    alors que la page existe, ce qui est incompréhensible côté auteur.
 *  - le DOCUMENT de la page, lui aussi dans les deux colonnes, garni de
 *    `starterCustom(title)` : on ne crée jamais une page blanche, l'auteur
 *    atterrit sur un titre et un bloc de texte déjà manipulables.
 *  - l'invalidation, sans quoi la nouvelle adresse répondrait 404 jusqu'à
 *    l'expiration du cache.
 */
export async function edCreateCustomPage(input: {
  path: string
  title: string
}): Promise<EdCreatePageResult> {
  try {
    await requireSection('editor')

    const path = normalizePath(input?.path ?? '')
    if (path === '/' || path.length < 2) {
      return { ok: false, error: 'Adresse invalide — exemple : /promo-rentree' }
    }
    // `pathConflicts` couvre aussi les sous-chemins (`/products/x`) : une page
    // perso qui masquerait une vraie route casserait la boutique.
    if (pathConflicts(path)) {
      return { ok: false, error: 'Cette adresse est réservée par le site.' }
    }

    const key = customKeyForPath(path)
    const existing = await readCustomPages()
    if (existing.some((p) => p.key === key)) {
      return { ok: false, error: 'Une page existe déjà à cette adresse.' }
    }

    // Le titre sert de libellé dans le navigateur de pages ET de titre de la
    // section d'en-tête : on le borne pour ne pas déformer l'interface.
    const title = (input?.title || path).trim().slice(0, 80)

    await writeCustomPages([...existing, { key, path, title }])

    const doc = { v: 1 as const, sections: starterCustom(title) }
    await upsert(rowKey(key), {
      draft: doc,
      published: doc,
      publishedAt: new Date(),
    })

    flush()
    return { ok: true, key }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec de la création.') }
  }
}

/**
 * Supprimer une page personnalisée : hors du manifeste, puis la ligne elle-même.
 *
 * Ici on SUPPRIME la ligne au lieu de vider ses colonnes (contrairement à
 * `edReset`) : une page perso n'a pas de composition codée par défaut, une
 * ligne orpheline ne servirait donc qu'à ressusciter l'ancien contenu si
 * l'adresse était recréée plus tard.
 */
export async function edDeleteCustomPage(key: string): Promise<EdActionResult> {
  try {
    await requireSection('editor')
    if (typeof key !== 'string' || !key.startsWith('custom:')) {
      return { ok: false, error: 'Seules les pages personnalisées peuvent être supprimées.' }
    }

    const existing = await readCustomPages()
    await writeCustomPages(existing.filter((p) => p.key !== key))
    await db.delete(sitePages).where(eq(sitePages.key, rowKey(key)))

    flush()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err, 'Échec de la suppression.') }
  }
}

/* ──────────────────────────────── images ─────────────────────────────── */

/**
 * Envoi d'une image depuis l'éditeur (fond de section, bloc image…).
 *
 * C'est STRICTEMENT le pipeline de `uploadHeroImage` (hero-actions.ts) :
 * mêmes validations, même traitement `processHeroSlide`, même préfixe de clé
 * `hero/slide-…`, même stockage R2-ou-`image_blobs`, même forme d'URL. Ce
 * n'est pas de la paresse : ces images atterrissent dans la même bibliothèque,
 * sont servies par la même route `/api/images/[...key]` et nettoyées par les
 * mêmes outils d'administration. Inventer un deuxième chemin de stockage
 * créerait un jeu d'images que rien d'existant ne sait ni lister ni purger.
 *
 * `processHeroSlide` ne recadre pas : l'image garde son rapport d'aspect et
 * n'est que réduite si elle dépasse. Un fond de section ne doit pas être
 * charcuté par le serveur, c'est le CSS de la section qui décide du cadrage.
 * On renvoie donc la taille réelle produite, que l'éditeur stocke sur le nœud.
 *
 * Le format AVIF n'est produit que si R2 est configuré, exactement comme pour
 * le hero : en repli Postgres, on garde une seule variante WebP pour ne pas
 * doubler le poids de la base.
 */
export async function edUploadImage(formData: FormData): Promise<EdUploadResult> {
  try {
    await requireSection('editor')
    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'Aucun fichier reçu' }

    const buf = Buffer.from(await file.arrayBuffer())
    await validateImage(buf)
    const hash = generateHash(`${file.name}-${Date.now()}`)

    if (R2_CONFIGURED) {
      const [webp, avif] = await Promise.all([
        processHeroSlide(buf, 'webp'),
        processHeroSlide(buf, 'avif'),
      ])
      const [up] = await Promise.all([
        uploadToR2(`hero/slide-${hash}.webp`, webp.data, 'image/webp'),
        uploadToR2(`hero/slide-${hash}.avif`, avif.data, 'image/avif'),
      ])
      return { ok: true, url: up.url, width: webp.width, height: webp.height }
    }

    const webp = await processHeroSlide(buf, 'webp')
    const key = `hero/slide-${hash}.webp`
    await db
      .insert(imageBlobs)
      .values({ key, contentType: 'image/webp', data: webp.data })
      .onConflictDoUpdate({
        target: imageBlobs.key,
        set: { contentType: 'image/webp', data: webp.data },
      })
    return { ok: true, url: `/api/images/${key}`, width: webp.width, height: webp.height }
  } catch (err) {
    // Trace côté serveur (sharp est bavard et utile), message court côté client.
    console.error('[ed upload] Failed:', err)
    return { ok: false, error: toMessage(err, "Échec de l'envoi") }
  }
}
