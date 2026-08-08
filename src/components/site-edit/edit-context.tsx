'use client'

/**
 * Enveloppes INERTES — vestiges de l'ancien éditeur visuel.
 *
 * Le moteur d'édition en ligne (clic-pour-éditer, réorganisation des
 * sections par glisser-déposer, conteneurs de blocs, dialogue postMessage
 * avec l'iframe du constructeur) a été supprimé en même temps que l'ancien
 * éditeur. Ce fichier ne garde que la SURFACE publique de l'ancien module :
 * mêmes noms, mêmes props, même balisage rendu pour un visiteur normal.
 *
 * Pourquoi le garder au lieu de tout réécrire : la peau 1 (« classic »,
 * HomeShowcase.tsx, ~2600 lignes) compte une quarantaine d'appels à
 * `Editable` / `EditableLink` / `SectionList`. Les réécrire aurait touché
 * chaque bloc de la page d'accueil pour un gain nul. Ces composants se
 * contentent donc de rendre l'élément demandé — `as`, `className` et
 * `style` sont conservés car ils font partie du balisage de la peau ; seuls
 * les attributs `data-edit-*`, propres à l'ancien éditeur et lus par
 * personne d'autre, disparaissent.
 *
 * La peau réellement éditable est désormais l'éditoriale : c'est le nouvel
 * éditeur qui la pilote. Ces composants-ci n'appliquent plus aucun contenu
 * publié par l'ancien constructeur.
 *
 * La directive 'use client' est conservée telle quelle : elle fixe la même
 * frontière serveur/client qu'avant, donc aucun changement de rendu.
 */
import React from 'react'

/**
 * Jeton de contenu publié, passé tel quel de `getPublishedContent()` aux
 * peaux. Réduit à ce qui est encore lu — le thème du site (voir
 * `getSiteTheme` dans src/server/editor-page-data.ts). Les anciens champs
 * (overrides, styles, sections, blocs…) sont partis avec l'éditeur.
 */
export interface EditData {
  theme?: string
}

/** Ancien fournisseur de contexte : ne fait plus que rendre ses enfants. */
export function EditProvider({
  children,
}: {
  /** Ignoré — conservé pour que les appelants continuent de compiler. */
  initial?: Partial<EditData>
  children: React.ReactNode
}) {
  return <>{children}</>
}

/** Ancien texte cliquable-éditable : rend simplement son élément. */
export function Editable({
  children,
  as: Tag = 'span',
  className,
  style,
}: {
  /** Ignoré — identifiant de l'ancien éditeur. */
  id: string
  children: React.ReactNode
  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
  /** Ignoré — libellé affiché dans l'ancien inspecteur. */
  label?: string
}) {
  // createElement plutôt que <Tag>…</Tag> : `Tag` est un React.ElementType
  // dynamique, et JSX réduit alors la prop children de l'union à `never`.
  return React.createElement(Tag, { className, style }, children)
}

/** Ancien lien cliquable-éditable : un `<a>` ordinaire. */
export function EditableLink({
  label,
  href,
  className,
  style,
  children,
}: {
  /** Ignoré — identifiant de l'ancien éditeur. */
  id: string
  label: string
  href: string
  className?: string
  style?: React.CSSProperties
  /** Ignoré — libellé affiché dans l'ancien inspecteur. */
  editLabel?: string
  children?: React.ReactNode
}) {
  return (
    <a href={href} className={className} style={style}>
      {label}
      {children}
    </a>
  )
}

/**
 * Ancienne liste de sections réorganisable : rend les nœuds dans l'ordre
 * par défaut, en sautant les clés absentes — exactement le comportement
 * hors mode édition.
 */
export function SectionList({
  nodes,
  defaultOrder,
}: {
  nodes: Record<string, React.ReactNode>
  defaultOrder: string[]
}) {
  return (
    <>
      {defaultOrder
        .filter((id) => nodes[id] !== undefined)
        .map((id) => (
          <React.Fragment key={id}>{nodes[id]}</React.Fragment>
        ))}
    </>
  )
}
