/**
 * ÉDITEUR — contrat entre le registre de sections et le rendu.
 *
 * Fichier de types uniquement (aucun code émis), pour que le registre, les
 * sections, l'éditeur et le rendu serveur partagent les mêmes signatures sans
 * dépendance circulaire.
 */

import type { ReactNode } from 'react'
import type { EdLocale, EdNode } from '@/lib/ed-editor/model'
import type { EdData } from './editorial-types'
import type { EdCompanyData } from './EdCompanyPage'
import type { EdBrandPageData } from './EdBrandPage'
import type { EdGamingData } from '@/server/gaming-data'
import type { NavCat } from '@/types/nav'
import type { BrandBrandItem, BrandProduct } from '@/components/brand/brand-types'
import type { BrandProductDetailData } from '@/components/brand/BrandProductDetail'

/**
 * Les données réelles disponibles pour la page en cours de rendu.
 * Chaque page n'en remplit que ce dont ses sections ont besoin.
 */
export interface EdPageData {
  /** Accueil : catalogue complet mis en forme éditoriale. */
  home?: EdData
  catalogue?: { cats: NavCat[]; productCount: number }
  company?: EdCompanyData
  gaming?: EdGamingData
  brands?: BrandBrandItem[]
  brand?: EdBrandPageData
  product?: { product: BrandProductDetailData; similar: BrandProduct[] }
  /** Pages listant des produits (recherche). */
  grid?: { products: BrandProduct[]; title: string; eyebrow?: string; sub?: string; empty?: string }
}

export interface EdRenderCtx {
  pageKey: string
  locale: EdLocale
  /** Vrai dans l'aperçu de l'éditeur : les sections masquées restent visibles. */
  editing: boolean
  data: EdPageData
  /**
   * Fragments rendus côté serveur que l'éditeur ne peut pas reconstruire
   * (moteur de recherche produits, formulaires, contenus légaux).
   */
  slots: Record<string, ReactNode>
  t: (key: string) => string
  tf: (key: string, vars: Record<string, string | number>) => string
}

export type EdFieldType =
  | 'text'
  | 'textarea'
  | 'image'
  | 'number'
  | 'color'
  | 'select'
  | 'switch'
  | 'link'
  | 'list'

export interface EdField {
  key: string
  label: string
  type: EdFieldType
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  /** Champs d'un élément de liste. */
  itemFields?: EdField[]
  /** Libellé du bouton d'ajout d'une liste. */
  addLabel?: string
  /** Valeur stockée par langue (EdText) plutôt qu'en chaîne simple. */
  localized?: boolean
}

/** Un texte de la page, identifié par sa clé i18n. */
export interface EdTextField {
  key: string
  label: string
  /** Affiché dans une zone multi-lignes. */
  area?: boolean
  /** Clé construite à l'exécution (ex. `fam.<id>`) — non listée. */
  dynamic?: boolean
}

export interface EdSectionDef {
  type: string
  label: string
  /** Groupe dans la bibliothèque. */
  group: string
  desc?: string
  /** Nom d'icône lucide-react. */
  icon?: string
  /** Textes i18n rendus par la section, éditables dans l'onglet Contenu. */
  texts?: EdTextField[]
  /** Réglages propres, stockés dans `node.props`. */
  fields?: EdField[]
  /** Valeurs initiales de `node.props` à l'ajout. */
  defaults?: Record<string, unknown>
  /** Proposée dans la bibliothèque « Ajouter une section ». */
  addable?: boolean
  /** Pages où la section a du sens (`undefined` = partout). */
  pages?: string[]
  /** Accepte des composants enfants déplaçables. */
  container?: boolean
  /** Ne peut pas être supprimée (le corps fonctionnel d'une page). */
  locked?: boolean
  render: (props: { node: EdNode; ctx: EdRenderCtx; children?: ReactNode }) => ReactNode
}

/** Un composant qui vit à l'intérieur d'une section conteneur. */
export interface EdBlockDef {
  type: string
  label: string
  icon?: string
  fields?: EdField[]
  defaults?: Record<string, unknown>
  render: (props: { node: EdNode; ctx: EdRenderCtx }) => ReactNode
}

export type { EdNode, EdLocale }
