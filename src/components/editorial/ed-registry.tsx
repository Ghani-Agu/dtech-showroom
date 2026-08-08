'use client'

/**
 * ÉDITEUR — le registre.
 *
 * Un seul endroit qui sait : quelles sections existent, où elles ont le droit
 * d'aller, et de quoi une page est faite quand personne n'y a encore touché.
 *
 * Le point important : `DEFAULT_SECTIONS` reproduit EXACTEMENT le site tel
 * qu'il est aujourd'hui. Tant que rien n'est publié, chaque page rend la même
 * chose qu'avant l'éditeur — et « Réinitialiser » y revient toujours.
 */

import type { CSSProperties } from 'react'
import type { EdBlockDef, EdPageData, EdSectionDef } from './ed-ctx'
import { ED_SITE_SECTIONS } from './ed-sections'
import { ED_BLOCKS, ED_LIBRARY_SECTIONS } from './ed-library'
import { edBrandRootProps } from './EdBrandPage'

const ALL: EdSectionDef[] = [...ED_SITE_SECTIONS, ...ED_LIBRARY_SECTIONS]

const SECTION_MAP = new Map(ALL.map((d) => [d.type, d] as const))
const BLOCK_MAP = new Map(ED_BLOCKS.map((d) => [d.type, d] as const))

export function getSectionDef(type: string): EdSectionDef | undefined {
  return SECTION_MAP.get(type)
}

export function getBlockDef(type: string): EdBlockDef | undefined {
  return BLOCK_MAP.get(type)
}

export const ALL_SECTIONS = ALL
export const ALL_BLOCKS = ED_BLOCKS

/** Ordre d'affichage des familles dans la bibliothèque. */
export const GROUP_ORDER = [
  'Contenu',
  'Média',
  'Preuve',
  'Action',
  'Mise en page',
  'Avancé',
  'Accueil',
  'Catalogue',
  'Contact',
  'Entreprise',
  'Gaming',
  'Marques',
  'Fiche marque',
  'Boutique',
  'Utilitaires',
]

/**
 * Les sections proposées à l'ajout sur une page donnée : la bibliothèque
 * générique, plus les sections propres à cette page qui ne sont pas déjà
 * posées (on peut donc récupérer une section supprimée par erreur).
 */
export function addableFor(pageKey: string, present: string[]): EdSectionDef[] {
  const used = new Set(present)
  return ALL.filter((d) => {
    if (d.locked) return false
    const scoped = d.pages !== undefined
    if (scoped && !d.pages?.includes(pageKey)) return false
    if (scoped) return !used.has(d.type) || d.addable === true
    return d.addable === true
  }).sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.group)
    const gb = GROUP_ORDER.indexOf(b.group)
    if (ga !== gb) return (ga < 0 ? 99 : ga) - (gb < 0 ? 99 : gb)
    return a.label.localeCompare(b.label, 'fr')
  })
}

/* ═══════════════════ composition par défaut de chaque page ═══════════════ */

/* La liste vit dans `@/lib/ed-editor/defaults` : le serveur en a besoin aussi,
   et il ne peut pas appeler un module « use client ». */
export { defaultSections, starterCustom, DEFAULT_TYPES } from '@/lib/ed-editor/defaults'

/* ══════════════════════ enveloppe (classe racine) d'une page ═════════════ */

export interface EdPageFrame {
  className?: string
  style?: CSSProperties
  attrs?: Record<string, string>
}

/**
 * Certaines pages ont besoin d'un conteneur racine : `.edcy` porte les jetons
 * de la page Entreprise, `.edb` porte la couleur de la marque lue par une
 * vingtaine de règles CSS. Les sections restent ses enfants directs, comme
 * aujourd'hui.
 */
export function pageFrame(pageKey: string, data: EdPageData): EdPageFrame {
  switch (pageKey) {
    case 'catalogue':
      return { className: 'edc' }
    case 'contact':
      return { className: 'edct' }
    case 'company':
      return { className: 'edcy' }
    case 'gaming':
      return { className: 'edg' }
    case 'brands':
      return { className: 'edbi' }
    case 'brand': {
      if (!data.brand) return {}
      const p = edBrandRootProps(data.brand)
      return { className: p.className, style: p.style, attrs: { 'data-status': p['data-status'] } }
    }
    default:
      return {}
  }
}

/**
 * Les pages dont le corps est rendu côté serveur : l'éditeur les affiche mais
 * ne prétend pas pouvoir en réordonner l'intérieur.
 */
export const SLOT_PAGES = new Set(['products', 'product', 'search', 'inquiry', 'legal', 'notfound'])
