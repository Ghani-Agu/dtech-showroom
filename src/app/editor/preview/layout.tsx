import type { ReactNode } from 'react'

/**
 * L'aperçu n'est pas une page d'administration : c'est le SITE, affiché dans
 * l'iframe de l'éditeur. Il ne doit donc porter aucune des couleurs de
 * l'admin.
 *
 * Ce que ce fichier peut et ne peut pas faire. Dans l'App Router, une mise en
 * page imbriquée ne REMPLACE jamais celle du segment parent : `/editor` nous
 * enveloppera toujours dans son `<div class="admin-shell">`. Sortir vraiment
 * de cette enveloppe demanderait de déplacer la route hors de `/editor` — au
 * prix de l'adresse `/editor/preview` que l'éditeur appelle, et d'un
 * remaniement des routes voisines. Le minimum correct est donc de NEUTRALISER
 * l'héritage, pas de prétendre s'en affranchir :
 *
 *  - `.admin-shell` pose `color-scheme: dark`, qui teinte les contrôles
 *    natifs (menus déroulants, barres de défilement) et l'ascenseur de
 *    l'iframe ; on repasse en `normal`, comme sur le site public ;
 *  - la mise en page parente peint un fond sombre sur toute la hauteur : il
 *    apparaîtrait sous une page courte, alors que `.editorial-root` peint le
 *    sien. On rétablit une toile blanche pleine hauteur.
 *
 * Aucun `<Toaster>`, aucune métadonnée : celle du parent (`robots: noindex`)
 * est déjà la bonne, et un aperçu de brouillon n'a rien à faire dans un index.
 */
export default function EditorPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ colorScheme: 'normal', background: '#fff', minHeight: '100vh' }}>
      {children}
    </div>
  )
}
