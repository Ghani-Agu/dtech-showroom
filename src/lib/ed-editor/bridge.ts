/**
 * ÉDITEUR — le protocole entre l'éditeur et l'aperçu.
 *
 * L'aperçu est un vrai chargement du site dans une iframe : c'est la seule
 * façon d'être certain que ce que l'on édite est ce que verra un visiteur.
 * Les deux fenêtres se parlent donc par `postMessage`, avec ces messages-là et
 * pas d'autres.
 */

export const ED_FROM_SITE = 'dtech-ed-site'
export const ED_FROM_EDITOR = 'dtech-ed-editor'

/** Aperçu → éditeur. */
export type EdSiteMsg =
  /** La page est montée et écoute. */
  | { source: typeof ED_FROM_SITE; type: 'ready'; pageKey: string }
  /** L'utilisateur a cliqué une section ou un composant. */
  | { source: typeof ED_FROM_SITE; type: 'select'; id: string; kind: 'section' | 'block' }
  /** Un glisser-déposer s'est terminé dans la page. */
  | {
      source: typeof ED_FROM_SITE
      type: 'move'
      id: string
      parentId: string | null
      index: number
    }
  /** Un élément de la bibliothèque a été lâché dans la page. */
  | {
      source: typeof ED_FROM_SITE
      type: 'insert'
      libType: string
      parentId: string | null
      index: number
    }
  /** Position de défilement, pour garder le panneau de calques synchronisé. */
  | { source: typeof ED_FROM_SITE; type: 'scroll'; y: number }

/** Éditeur → aperçu. */
export type EdEditorMsg =
  /** Sélectionner (et faire défiler jusqu'à) un élément. */
  | { source: typeof ED_FROM_EDITOR; type: 'select'; id: string | null; scroll?: boolean }
  /** Recalculer les cadres (après un changement de largeur, par exemple). */
  | { source: typeof ED_FROM_EDITOR; type: 'refresh' }
  /** Un glisser depuis la bibliothèque survole l'aperçu. */
  | {
      source: typeof ED_FROM_EDITOR
      type: 'libdrag'
      active: boolean
      x: number
      y: number
      kind: 'section' | 'block'
    }
  /** L'élément de bibliothèque est lâché aux dernières coordonnées connues. */
  | { source: typeof ED_FROM_EDITOR; type: 'libdrop'; libType: string; kind: 'section' | 'block' }
  /**
   * Le document a changé dans l'éditeur.
   *
   * L'aperçu se redessine à partir de CE document plutôt que de recharger la
   * route : une frappe au clavier doit se voir tout de suite, et un rechargement
   * ferait clignoter la page et perdrait la position de défilement.
   */
  | { source: typeof ED_FROM_EDITOR; type: 'doc'; doc: unknown; site: unknown }

/**
 * Le même message, sans le champ `source` (ajouté à l'envoi).
 * Le conditionnel est DISTRIBUTIF : `Omit` appliqué directement à une union
 * l'aplatirait aux seules clés communes, et plus aucune charge utile ne
 * passerait le typage.
 */
export type EdSiteMsgBody = EdSiteMsg extends infer T
  ? T extends { source: unknown }
    ? Omit<T, 'source'>
    : never
  : never

/** Idem côté éditeur (voir EdSiteMsgBody). */
export type EdEditorMsgBody = EdEditorMsg extends infer T
  ? T extends { source: unknown }
    ? Omit<T, 'source'>
    : never
  : never

export function isSiteMsg(data: unknown): data is EdSiteMsg {
  return !!data && typeof data === 'object' && (data as { source?: string }).source === ED_FROM_SITE
}

export function isEditorMsg(data: unknown): data is EdEditorMsg {
  return (
    !!data && typeof data === 'object' && (data as { source?: string }).source === ED_FROM_EDITOR
  )
}
