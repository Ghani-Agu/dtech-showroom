'use client'

/**
 * GuideBook — the full Catalogue & Guide page.
 *
 * Goal: a brand-new user can learn the Web Editor end-to-end from this page
 * alone. Every panel, every setting, every block, every workflow step is
 * documented. Topics are grouped by category and linked together with
 * "Next / Previous" navigation so the page works as a guided tour OR as a
 * reference catalogue you can jump into.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ALargeSmall,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Eye,
  GripVertical,
  Keyboard,
  Layers,
  Layout,
  LayoutGrid,
  LayoutPanelLeft,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Monitor,
  MousePointerClick,
  MoveVertical,
  PackageOpen,
  Paintbrush,
  Palette,
  Pin,
  Rocket,
  Ruler,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Type,
  Undo2,
  Wand2,
  Zap,
} from 'lucide-react'
import './editor.css'

type Demo =
  | 'drag' | 'reorder' | 'type' | 'settings' | 'colors' | 'sizing'
  | 'fonts' | 'theme' | 'preview' | 'publish' | 'history'
  | 'palette' | 'layers' | 'devices' | 'quickTheme' | 'inspector'
  | 'block' | 'autosave' | 'css' | 'links' | 'images' | 'shortcuts'

interface Topic {
  id: string
  cat: string
  icon: typeof Type
  title: string
  summary: string
  /** One-paragraph intro that frames the topic for a beginner. */
  lead: string
  demo: Demo
  /** Step-by-step procedure. Markdown bold (**word**) is rendered. */
  steps: string[]
  /** Optional companion tips — things to know but not required to do. */
  tips?: string[]
  /** Optional keyboard shortcuts shown as kbd chips. */
  keys?: string[]
}

// ── CATEGORIES ─────────────────────────────────────────────────────
// Ordered as a learning path. Picking a topic in one auto-suggests the
// next; jumping around still works.
const CATS = [
  'Démarrer',
  'L’interface',
  'Manipuler les blocs',
  'Éditer le contenu',
  'Personnaliser le style',
  'Thèmes',
  'Blocs spécialisés',
  'Aperçu & publication',
  'Sauvegarde & raccourcis',
] as const

// ── TOPICS — every editor surface, panel, and setting ──────────────
const TOPICS: Topic[] = [
  // ───────── Démarrer ─────────
  {
    id: 'tour', cat: 'Démarrer', icon: Sparkles,
    title: 'Tour de l’éditeur', summary: 'Trois zones à connaître',
    lead:
      'L’éditeur est divisé en trois zones : la **palette** (à gauche), la **toile** (au centre) et le **panneau de réglages** (à droite). Au-dessus, une barre d’outils gère les actions globales. Tout est conçu pour qu’on puisse composer une page sans écrire une ligne de code.',
    demo: 'palette',
    steps: [
      'Repérez à gauche la **bibliothèque de blocs** : c’est la matière brute.',
      'Au centre, la **toile** : c’est votre vraie page, à l’échelle.',
      'À droite, le **panneau de réglages** : il pilote le bloc sélectionné.',
      'En haut, la **barre d’outils** : appareils, aperçu, annuler/rétablir, publier.',
    ],
    tips: [
      'Les panneaux gauche et droite sont **redimensionnables** : tirez la bordure pour gagner de l’espace.',
      'L’éditeur **enregistre tout seul** vos modifications en brouillon — vous ne perdez rien.',
    ],
  },
  {
    id: 'goal', cat: 'Démarrer', icon: Lightbulb,
    title: 'À quoi sert l’éditeur', summary: 'Composer la page d’accueil',
    lead:
      'L’éditeur sert à **composer la page d’accueil** du site D-Tech : héros, sections de produits, témoignages, marques distribuées, appel à l’action, pied de page… Vous travaillez sur un brouillon privé puis vous **publiez** quand vous êtes prêt.',
    demo: 'preview',
    steps: [
      'Tout part de la **page d’accueil** : c’est la page éditée ici.',
      'Vos changements vivent d’abord en **brouillon**, invisible des clients.',
      'Cliquez **Publier** pour les rendre visibles sur le site public.',
      'Vous pouvez **dépublier** à tout moment pour revenir à la version d’origine.',
    ],
  },
  {
    id: 'firstpage', cat: 'Démarrer', icon: PackageOpen,
    title: 'Votre première page', summary: 'En cinq minutes',
    lead:
      'Pas besoin de planifier : commencez par un **héros**, ajoutez une **grille de produits**, terminez par un **pied de page**. Vous étofferez ensuite.',
    demo: 'drag',
    steps: [
      'Ouvrez l’étagère **Sections** dans la palette.',
      'Glissez **Hero**, puis **Grille de produits**, puis **Pied de page** sur la toile.',
      'Cliquez chaque bloc et tapez votre vrai texte.',
      'Cliquez **Aperçu** pour voir le rendu propre — puis **Publier**.',
    ],
    keys: ['Ctrl/⌘ + S = sauvegarde manuelle', 'Esc = quitter une édition'],
  },

  // ───────── L’interface ─────────
  {
    id: 'toolbar', cat: 'L’interface', icon: LayoutPanelLeft,
    title: 'La barre d’outils', summary: 'Actions globales',
    lead:
      'En haut, la barre d’outils regroupe les actions qui s’appliquent à toute la page : changer d’appareil, annuler/rétablir, voir l’aperçu, publier, importer/exporter.',
    demo: 'devices',
    steps: [
      '**Appareils** (Bureau / Tablette / Mobile) : redimensionne la toile.',
      '**Annuler / Rétablir** (← →) : revient en arrière sans perdre l’historique.',
      '**Aperçu / Éditer** (œil) : bascule entre rendu propre et mode édition.',
      '**Bibliothèque / Pinceau** : montre/masque la palette ou le panneau réglages.',
      '**Publier** : met la page en ligne.',
    ],
    keys: ['Ctrl/⌘ + Z = annuler', 'Ctrl/⌘ + Maj + Z = rétablir', 'P = aperçu'],
  },
  {
    id: 'palette', cat: 'L’interface', icon: Boxes,
    title: 'La palette (à gauche)', summary: 'La bibliothèque de blocs',
    lead:
      'La palette est une **bibliothèque de blocs** classés par étagères : Sections, Texte, Médias, Mise en page, Composants. C’est la source de tout ce qu’on peut ajouter sur la page.',
    demo: 'palette',
    steps: [
      'Ouvrez une **étagère** (Sections, Texte, Médias…) pour la déplier.',
      '**Glissez** un bloc vers la toile pour l’insérer où vous voulez.',
      'Ou **cliquez** simplement un bloc pour l’ajouter en bas de la page.',
      'La barre de recherche en haut filtre les blocs disponibles.',
    ],
    tips: [
      'Chaque bloc a une **icône** et un **nom court** : survolez-la pour voir une description.',
      'Si vous ne trouvez pas un bloc, ouvrez **tous** les étagères avec la double-flèche en haut.',
    ],
  },
  {
    id: 'canvas', cat: 'L’interface', icon: Monitor,
    title: 'La toile (au centre)', summary: 'L’aperçu vivant',
    lead:
      'La toile est votre vraie page, en taille réelle, dans le thème actif. Tout ce qu’on voit ici sera vu par les clients après publication.',
    demo: 'block',
    steps: [
      'Survolez un bloc : un **contour mint** indique qu’il est cliquable.',
      'Cliquez-le pour le **sélectionner** — son contour devient plein.',
      'Une **étiquette** au-dessus affiche son nom et les actions (déplacer, dupliquer, supprimer).',
      'Cliquez ailleurs (sur le vide) pour **désélectionner**.',
    ],
    tips: [
      'Les **zones de dépôt** (lignes minty pulsantes) apparaissent entre les blocs quand on glisse depuis la palette.',
      'En mode **Aperçu**, ces repères disparaissent — vous voyez la page nue.',
    ],
  },
  {
    id: 'inspector', cat: 'L’interface', icon: SlidersHorizontal,
    title: 'Le panneau Réglages (à droite)', summary: 'Pilote chaque bloc',
    lead:
      'À droite, le panneau Réglages prend le bloc sélectionné et expose tous ses paramètres, répartis en trois onglets : **Contenu**, **Style**, **Avancé**.',
    demo: 'inspector',
    steps: [
      '**Contenu** : textes, liens, images, listes — la matière du bloc.',
      '**Style** : police, couleurs, taille, marges, arrondi, ombre — l’apparence.',
      '**Avancé** : champs CSS sur mesure pour les utilisateurs avertis.',
      'Une **pastille rouge** sur un onglet signale un champ à corriger (ex : lien cassé).',
    ],
  },
  {
    id: 'layers', cat: 'L’interface', icon: Layers,
    title: 'L’arborescence des couches', summary: 'Voir la structure',
    lead:
      'L’onglet **Couches** (en bas de la palette) affiche tous les blocs sous forme d’arborescence. Pratique sur les pages longues : on s’y repère en un coup d’œil.',
    demo: 'layers',
    steps: [
      'Cliquez **Couches** (icône en bas à gauche).',
      'L’**arborescence** liste chaque bloc, avec ses enfants (colonnes, cartes…).',
      'Cliquez un nom pour **sélectionner** le bloc correspondant sur la toile.',
      'Réorganisez par glisser-déposer dans l’arbre — sans toucher à la toile.',
    ],
  },

  // ───────── Manipuler les blocs ─────────
  {
    id: 'add', cat: 'Manipuler les blocs', icon: MousePointerClick,
    title: 'Ajouter un bloc', summary: 'Glisser ou cliquer',
    lead:
      'Deux gestes possibles : **glisser-déposer** pour insérer à un endroit précis, ou **cliquer simplement** pour ajouter en fin de page.',
    demo: 'drag',
    steps: [
      'Ouvrez l’étagère pertinente dans la palette (Sections, Texte…).',
      'Saisissez le bloc et **glissez-le** sur la toile.',
      'Une **ligne mint** montre où il atterrira — relâchez pour valider.',
      'Ou **cliquez** un bloc dans la palette : il s’ajoute en fin de page.',
    ],
  },
  {
    id: 'reorder', cat: 'Manipuler les blocs', icon: MoveVertical,
    title: 'Déplacer un bloc', summary: 'Drag & drop direct',
    lead:
      'Vous pouvez aussi attraper un bloc déjà sur la toile et le déplacer ailleurs — pas besoin de bouton.',
    demo: 'reorder',
    steps: [
      'Survolez un bloc : un contour mint apparaît.',
      'Cliquez et maintenez la **poignée ⠿** (ou directement le bloc).',
      'Déplacez : une **barre d’insertion** suit le curseur.',
      'Relâchez à l’endroit voulu — l’ordre est validé.',
    ],
    tips: [
      'Vous pouvez aussi utiliser les flèches **↑ ↓** dans l’étiquette du bloc pour le décaler d’un cran.',
    ],
  },
  {
    id: 'duplicate', cat: 'Manipuler les blocs', icon: GripVertical,
    title: 'Dupliquer & supprimer', summary: 'Étiquette du bloc',
    lead:
      'L’étiquette qui apparaît au-dessus d’un bloc sélectionné regroupe les actions courantes : déplacer, dupliquer, supprimer.',
    demo: 'block',
    steps: [
      'Cliquez un bloc pour le **sélectionner**.',
      'Cliquez **Dupliquer** (icône carrés) pour créer une copie en dessous.',
      'Cliquez **Supprimer** (corbeille) pour le retirer.',
      'Une suppression peut toujours être **annulée** (Ctrl/⌘ + Z).',
    ],
    keys: ['Ctrl/⌘ + D = dupliquer', 'Suppr = supprimer'],
  },
  {
    id: 'nest', cat: 'Manipuler les blocs', icon: LayoutGrid,
    title: 'Imbriquer des blocs', summary: 'Colonnes et cartes',
    lead:
      'Certains blocs (Colonnes, Carte, Grille) sont des **conteneurs** : on glisse d’autres blocs **à l’intérieur** pour composer des mises en page riches.',
    demo: 'layers',
    steps: [
      'Glissez un bloc **Colonnes** sur la toile.',
      'Réglez le nombre de colonnes dans **Contenu → Colonnes**.',
      'Glissez d’autres blocs **dans** chaque colonne (la zone se met en surbrillance).',
      'Les conteneurs vides affichent « Glissez un bloc ici ».',
    ],
  },

  // ───────── Éditer le contenu ─────────
  {
    id: 'text', cat: 'Éditer le contenu', icon: Type,
    title: 'Écrire du texte', summary: 'Édition en ligne',
    lead:
      'Le texte se modifie là où il vit, **directement sur la toile** : on clique, on tape, on valide.',
    demo: 'type',
    steps: [
      'Cliquez un bloc pour le sélectionner.',
      'Cliquez dans le **texte** : un curseur apparaît.',
      'Écrivez ; cliquez ailleurs (ou Esc) pour valider.',
      'L’onglet **Contenu** du panneau Réglages édite aussi chaque champ texte un par un.',
    ],
    tips: [
      'L’édition en ligne respecte la **police** et la **graisse** du thème — on voit immédiatement le rendu final.',
    ],
  },
  {
    id: 'links', cat: 'Éditer le contenu', icon: ChevronRight,
    title: 'Boutons & liens', summary: 'URL et libellé',
    lead:
      'Les boutons et les liens se règlent dans **Contenu** : libellé, URL, ouverture dans un nouvel onglet.',
    demo: 'links',
    steps: [
      'Sélectionnez le bouton ou le lien.',
      'Onglet **Contenu** : tapez le **libellé** et l’**URL** cible.',
      'Cochez **Nouvel onglet** si la cible est externe.',
      'Un lien invalide est marqué d’une pastille rouge.',
    ],
    tips: [
      'Les URL internes commencent par **/** (par ex. `/products/d-phone-d9`).',
      'Les URL externes complètes commencent par **https://**.',
    ],
  },
  {
    id: 'images', cat: 'Éditer le contenu', icon: Star,
    title: 'Images & médias', summary: 'Téléverser, recadrer',
    lead:
      'Glissez une image depuis votre ordinateur dans un bloc Image, ou choisissez-en une déjà téléversée. Vous pouvez recadrer en réglant la **proportion** dans Style.',
    demo: 'images',
    steps: [
      'Sélectionnez un bloc **Image** (ou une carte avec une image).',
      'Onglet **Contenu → Image** : glissez votre fichier dans la zone.',
      'Réglez **Texte alternatif** (important pour l’accessibilité).',
      'Onglet **Style → Proportion** : choisissez 1:1, 4:3, 16:9, etc.',
    ],
  },

  // ───────── Personnaliser le style ─────────
  {
    id: 'colors', cat: 'Personnaliser le style', icon: Paintbrush,
    title: 'Couleurs & dégradés', summary: 'Texte, fond, dégradé',
    lead:
      'Chaque bloc peut avoir sa **couleur de texte**, sa **couleur de fond**, ou un **dégradé** entre deux couleurs. Laissez vide pour que le thème décide.',
    demo: 'colors',
    steps: [
      'Onglet **Style → Couleurs**.',
      'Cliquez la **pastille** pour ouvrir le sélecteur, ou tapez une valeur HEX/OKLCH.',
      'Activez **Dégradé** pour mélanger deux teintes (angle réglable).',
      'Le **✕** d’un champ remet le thème par défaut.',
    ],
    tips: [
      'Les valeurs **OKLCH** assurent que les couleurs restent fidèles entre les thèmes.',
    ],
  },
  {
    id: 'sizing', cat: 'Personnaliser le style', icon: Ruler,
    title: 'Tailles & espacements', summary: 'Curseurs précis',
    lead:
      'Des curseurs règlent finement la taille du texte, les marges intérieures (padding) et extérieures (margin), l’arrondi des coins et l’ombre.',
    demo: 'sizing',
    steps: [
      'Onglet **Style → Espacement / Bordure**.',
      'Glissez un curseur : la valeur s’affiche en direct.',
      'Le **✕** d’un curseur revient à la valeur par défaut du thème.',
      'Basculez **Bureau / Tablette / Mobile** pour vérifier le rendu.',
    ],
  },
  {
    id: 'fonts', cat: 'Personnaliser le style', icon: ALargeSmall,
    title: 'Polices & typographie', summary: 'Style du texte',
    lead:
      'Choisissez une **police**, sa **graisse**, l’**interligne** et l’**alignement** par bloc — ou laissez le thème décider pour un look harmonieux.',
    demo: 'fonts',
    steps: [
      'Onglet **Style → Typographie**.',
      'Choisissez une police dans la liste (système, serif, mono…).',
      'Réglez **graisse (300-900), interligne, interlettrage, alignement**.',
      'Italique, souligné, MAJUSCULES — un seul clic.',
    ],
  },
  {
    id: 'layout', cat: 'Personnaliser le style', icon: Layout,
    title: 'Mise en page', summary: 'Colonnes & largeur',
    lead:
      'Les blocs conteneurs (Colonnes, Grille de produits, Pied de page…) gèrent leur **nombre de colonnes** et le **comportement mobile** (empiler ou non).',
    demo: 'layers',
    steps: [
      'Sélectionnez un conteneur.',
      'Onglet **Contenu → Colonnes** : 1 à 6.',
      '**Espacement entre colonnes** : règle l’écart.',
      '**Empiler sur mobile** : transforme automatiquement en pile sur petits écrans.',
    ],
  },
  {
    id: 'devices', cat: 'Personnaliser le style', icon: Smartphone,
    title: 'Bureau / Tablette / Mobile', summary: 'Réglages responsifs',
    lead:
      'Les blocs s’adaptent automatiquement aux trois largeurs, mais vous pouvez vérifier — et corriger — bloc par bloc.',
    demo: 'devices',
    steps: [
      'Cliquez l’icône **Tablette** ou **Mobile** dans la barre d’outils.',
      'La toile se redimensionne au format de l’appareil.',
      'Repérez les défauts (texte trop gros, marges serrées) et corrigez-les.',
      'Revenez en **Bureau** pour continuer le travail principal.',
    ],
    tips: [
      'Les **points de bascule** : ≤ 720 px = mobile, 721-980 px = tablette, > 980 px = bureau.',
    ],
  },
  {
    id: 'css', cat: 'Personnaliser le style', icon: Wand2,
    title: 'CSS sur mesure', summary: 'Onglet Avancé',
    lead:
      'Pour les cas pointus, l’onglet **Avancé** accepte du CSS libre que vous écrivez vous-même. Réservé aux utilisateurs à l’aise avec le code.',
    demo: 'css',
    steps: [
      'Onglet **Avancé → CSS personnalisé**.',
      'Écrivez vos déclarations (ex : `transform: rotate(2deg); filter: drop-shadow(...)`).',
      'Le CSS s’applique uniquement au bloc sélectionné.',
      '**Réinitialiser** retire votre CSS et revient au style standard.',
    ],
    tips: [
      'Évitez `position: fixed` et `z-index` extrêmes — ils peuvent casser la mise en page.',
    ],
  },

  // ───────── Thèmes ─────────
  {
    id: 'theme-apply', cat: 'Thèmes', icon: Palette,
    title: 'Changer de thème', summary: 'Toute la page, en un clic',
    lead:
      'Un thème change **toutes** les couleurs, polices, arrondis, ombres et espacements — sans toucher au contenu. L’éditeur lui-même change de tonalité pour rester cohérent.',
    demo: 'theme',
    steps: [
      'Ouvrez la **bibliothèque de thèmes** (sidebar ou bouton barre d’outils).',
      'Chaque carte est un **aperçu vivant** de votre page dans ce thème.',
      'Cliquez **Appliquer** : éditeur et site adoptent le thème.',
      'Vous pouvez toujours **personnaliser** un bloc par-dessus.',
    ],
  },
  {
    id: 'theme-quick', cat: 'Thèmes', icon: Zap,
    title: 'Sélecteur rapide', summary: 'Tester sans quitter la page',
    lead:
      'Le **sélecteur rapide** est un panneau coulissant qui apparaît à droite : vous testez les thèmes en quelques secondes sans quitter ce que vous êtes en train de faire.',
    demo: 'quickTheme',
    steps: [
      'Cliquez **Thèmes** dans la barre d’outils de l’éditeur.',
      'Le panneau s’ouvre sur la droite avec les 5 thèmes en liste.',
      'Cliquez un thème : l’aperçu se met à jour **instantanément**.',
      'Cliquez **Appliquer** pour enregistrer, ou **Réinitialiser** pour revenir.',
    ],
    tips: [
      'Le sélecteur rapide est aussi disponible **dans la bibliothèque** : bouton « Aperçu rapide ».',
    ],
  },
  {
    id: 'theme-harmony', cat: 'Thèmes', icon: Pin,
    title: 'Garder une harmonie', summary: 'Style local vs thème',
    lead:
      'Quand vous fixez une **couleur** ou une **police** sur un bloc, elle gagne **sur le thème**. C’est utile pour insister sur un détail — mais l’abus défait l’harmonie globale.',
    demo: 'colors',
    steps: [
      'Préférez **laisser le thème décider** par défaut.',
      'N’overridez que les blocs qui doivent **vraiment** se distinguer (CTA, kicker…).',
      'Si un thème ne convient plus, **changez de thème** plutôt que retoucher 30 blocs.',
      'Le bouton **✕** sur un champ retire votre choix et redonne la main au thème.',
    ],
  },

  // ───────── Blocs spécialisés ─────────
  {
    id: 'block-navbar', cat: 'Blocs spécialisés', icon: LayoutPanelLeft,
    title: 'Barre de navigation', summary: 'Logo, menu, CTA',
    lead:
      'La **navbar** est la barre du haut. Elle regroupe le logo, les liens de menu et un bouton d’action principal.',
    demo: 'block',
    steps: [
      'Glissez **Navbar** en haut de la page (ou utilisez celle par défaut).',
      'Contenu : tapez votre **logo** texte et les **liens** du menu (Catalogue, Marques…).',
      'Bouton CTA : libellé + URL.',
      'Style : choisissez l’**ombre**, la **transparence** au scroll.',
    ],
  },
  {
    id: 'block-hero', cat: 'Blocs spécialisés', icon: Star,
    title: 'Hero (en-tête)', summary: 'Titre, sous-titre, boutons',
    lead:
      'Le **hero** est la première impression de la page — gros titre, sous-titre, un ou deux boutons, parfois une image ou un visuel.',
    demo: 'block',
    steps: [
      'Glissez **Hero** sous la navbar.',
      'Contenu : remplissez **kicker**, **titre**, **sous-titre**, **boutons**.',
      'Style : choisissez la **hauteur** et le **fond** (image, dégradé, couleur).',
      'Testez en mode **Aperçu** sur Bureau et Mobile.',
    ],
  },
  {
    id: 'block-stats', cat: 'Blocs spécialisés', icon: Activity,
    title: 'Bande de statistiques', summary: 'Chiffres clés',
    lead:
      'La **statsBand** affiche 3 ou 4 chiffres clés (années d’expérience, clients servis, marques distribuées…). Idéal entre le hero et la suite.',
    demo: 'block',
    steps: [
      'Glissez **Bande de stats** après le hero.',
      'Contenu : tapez **valeur**, **suffixe** (+, %, /58…) et **libellé**.',
      'Style : **gros chiffres** ou **discrets** ; couleur d’accent réglable.',
      'Idéalement 3 ou 4 entrées — au-delà ça devient illisible.',
    ],
  },
  {
    id: 'block-grid', cat: 'Blocs spécialisés', icon: LayoutGrid,
    title: 'Grille de produits', summary: 'Catalogue mis en avant',
    lead:
      'La **grille de produits** met en avant un échantillon du catalogue. Elle peut être filtrable (par catégorie) ou figée.',
    demo: 'block',
    steps: [
      'Glissez **Grille de produits**.',
      'Contenu : choisissez les **catégories** à afficher, le **nombre de produits**.',
      'Style : **2/3/4/5 colonnes**, **ratio des cartes**, **boutons « Voir »**.',
      'Avancé : activez le **filtre par catégorie** au-dessus de la grille.',
    ],
  },
  {
    id: 'block-brands', cat: 'Blocs spécialisés', icon: Tag,
    title: 'Marques distribuées', summary: 'Logos partenaires',
    lead:
      'La **brandRail** affiche les marques partenaires sous forme de logos alignés. Variante grille pour les valoriser.',
    demo: 'block',
    steps: [
      'Glissez **Marques** entre deux sections.',
      'Contenu : sélectionnez les marques à montrer (depuis votre catalogue admin).',
      'Style : **rail défilant** ou **grille statique**.',
      'Ajustez l’**espacement** et la **hauteur** des logos.',
    ],
  },
  {
    id: 'block-testimonials', cat: 'Blocs spécialisés', icon: MessageSquare,
    title: 'Témoignages clients', summary: 'Avis et notes',
    lead:
      'Les **témoignages** rassurent : citation, nom, note. Utile pour le SAV et la satisfaction.',
    demo: 'block',
    steps: [
      'Glissez **Témoignages**.',
      'Contenu : ajoutez une **citation**, un **nom** et une **note** (0-5 étoiles).',
      'Style : **carrousel** ou **trois colonnes**.',
      'Évitez les citations trop longues — préférez 2 lignes.',
    ],
  },
  {
    id: 'block-cta', cat: 'Blocs spécialisés', icon: Megaphone,
    title: 'Bandeau d’appel à l’action', summary: 'Pousser au clic',
    lead:
      'Le **ctaBanner** clôt généralement la page sur un appel à l’action fort : « Contactez-nous », « Découvrir », etc.',
    demo: 'block',
    steps: [
      'Glissez **CTA** juste avant le pied de page.',
      'Contenu : **titre court**, **sous-titre**, **bouton** principal.',
      'Style : **dégradé** ou **couleur unie**.',
      'Mettez l’URL du formulaire de contact ou WhatsApp.',
    ],
  },
  {
    id: 'block-footer', cat: 'Blocs spécialisés', icon: Layers,
    title: 'Pied de page', summary: 'Logo, colonnes, mentions',
    lead:
      'Le **footer** est obligatoire : il regroupe le logo, les colonnes de liens, les mentions légales et les réseaux sociaux.',
    demo: 'block',
    steps: [
      'Le footer est en bas par défaut — laissez-le.',
      'Contenu : éditez les **colonnes** (Catalogue, Marques, Service, Contact).',
      'Réseaux sociaux : ajoutez vos comptes (Facebook, Instagram, LinkedIn).',
      '**Copyright** et **mentions** se règlent dans Avancé.',
    ],
  },

  // ───────── Aperçu & publication ─────────
  {
    id: 'preview', cat: 'Aperçu & publication', icon: Eye,
    title: 'Aperçu propre', summary: 'Sans repères d’édition',
    lead:
      'Le mode **Aperçu** masque tous les repères d’édition (contours, étiquettes, zones de dépôt) pour montrer la page telle que la verra un client.',
    demo: 'preview',
    steps: [
      'Cliquez **Aperçu** (icône œil) dans la barre d’outils.',
      'Testez le scroll, les liens, les animations.',
      'Basculez **Bureau / Tablette / Mobile** pour vérifier chaque format.',
      'Revenez en **Éditer** (icône crayon) pour continuer.',
    ],
    keys: ['P = bascule Aperçu'],
  },
  {
    id: 'publish', cat: 'Aperçu & publication', icon: Rocket,
    title: 'Publier la page', summary: 'Brouillon → en ligne',
    lead:
      'Tant que vous travaillez, vos modifications restent en **brouillon privé**. Cliquer **Publier** remplace la vraie page d’accueil par votre version.',
    demo: 'publish',
    steps: [
      'Vérifiez votre page en **Aperçu** sur les trois appareils.',
      'Cliquez **Publier** (fusée).',
      'La pastille passe à **● En ligne** — c’est visible des clients.',
      'Vous pouvez **Dépublier** pour restaurer l’accueil d’origine sans perdre votre design.',
    ],
    tips: [
      'Vous pouvez publier autant de fois que vous voulez — chaque publication remplace la précédente.',
    ],
  },
  {
    id: 'unpublish', cat: 'Aperçu & publication', icon: Undo2,
    title: 'Dépublier en urgence', summary: 'Retour à la version d’origine',
    lead:
      'Si quelque chose tourne mal après publication, dépublier rétablit la version par défaut **immédiatement** — vos modifications restent en brouillon, intactes.',
    demo: 'publish',
    steps: [
      'Cliquez le bouton **Dépublier**.',
      'L’accueil d’origine remplace votre version sur le site.',
      'Votre brouillon est **toujours là** : ouvrez l’éditeur pour le retrouver.',
      'Corrigez et republiez quand prêt.',
    ],
  },

  // ───────── Sauvegarde & raccourcis ─────────
  {
    id: 'autosave', cat: 'Sauvegarde & raccourcis', icon: Save,
    title: 'Sauvegarde automatique', summary: 'Rien ne se perd',
    lead:
      'L’éditeur **enregistre tout, tout le temps**. Une copie locale (votre navigateur) et une copie serveur (brouillon) sont maintenues à jour à chaque modification.',
    demo: 'autosave',
    steps: [
      'Modifiez quoi que ce soit : **« Enregistré »** apparaît dans la barre.',
      'Fermez l’onglet : votre brouillon est sécurisé côté serveur.',
      'Rouvrez l’éditeur depuis n’importe quel appareil connecté : vous retrouvez votre travail.',
      'En cas de souci réseau, la copie locale prend le relais.',
    ],
  },
  {
    id: 'history', cat: 'Sauvegarde & raccourcis', icon: Undo2,
    title: 'Annuler · Rétablir', summary: 'L’historique illimité',
    lead:
      'L’éditeur retient chaque changement. Vous pouvez **annuler** autant que vous voulez, et **rétablir** dans l’autre sens.',
    demo: 'history',
    steps: [
      '**Ctrl/⌘ + Z** annule l’action précédente.',
      '**Ctrl/⌘ + Maj + Z** rétablit.',
      'L’historique est conservé pendant toute la session — il se vide à la déconnexion.',
      'Pour un retour en arrière plus lointain, utilisez **Importer** avec un export précédent.',
    ],
    keys: ['Ctrl/⌘ + Z = annuler', 'Ctrl/⌘ + Maj + Z = rétablir'],
  },
  {
    id: 'export', cat: 'Sauvegarde & raccourcis', icon: PackageOpen,
    title: 'Exporter & importer', summary: 'Vos pages en fichier',
    lead:
      'Vous pouvez **emporter** votre design dans un fichier `.json` et le **réimporter** plus tard ou sur un autre site D-Tech.',
    demo: 'history',
    steps: [
      '**Exporter** (icône bas) : télécharge un fichier `.json` de votre page.',
      '**Importer** (icône haut) : sélectionnez un fichier `.json` pour le recharger.',
      'Utilisez ça pour **sauvegarder** une version avant un gros chantier.',
      '**Réinitialiser** repart de zéro avec le modèle par défaut.',
    ],
  },
  {
    id: 'shortcuts', cat: 'Sauvegarde & raccourcis', icon: Keyboard,
    title: 'Raccourcis clavier', summary: 'Travailler vite',
    lead:
      'Quelques raccourcis font gagner beaucoup de temps. Tous fonctionnent dès que la toile est sélectionnée.',
    demo: 'shortcuts',
    steps: [
      '**Ctrl/⌘ + Z** : annuler — **Ctrl/⌘ + Maj + Z** : rétablir.',
      '**Ctrl/⌘ + D** : dupliquer le bloc sélectionné.',
      '**Suppr / Backspace** : supprimer le bloc sélectionné.',
      '**P** : bascule Aperçu/Éditer — **Esc** : sort d’une édition en cours.',
      '**Ctrl/⌘ + K** : palette de commandes (recherche action).',
    ],
    keys: [
      'Ctrl/⌘ + Z',
      'Ctrl/⌘ + Maj + Z',
      'Ctrl/⌘ + D',
      'Suppr',
      'P',
      'Esc',
      'Ctrl/⌘ + K',
    ],
  },
]

function boldify(t: string): string {
  const e = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return e
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function DemoStage({ demo }: { demo: Demo }) {
  const stage = (inner: React.ReactNode, extra: React.CSSProperties = {}) => (
    <div className="we-guide-stage we-gp-stage" style={extra}>
      {inner}
    </div>
  )
  if (demo === 'drag' || demo === 'reorder')
    return stage(
      <>
        <span className="we-demo-ghost" />
        <div className="we-demo-block we-demo-drag">
          <div className="we-demo-row">
            <GripVertical size={14} className="we-demo-grip" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="we-demo-bar" style={{ width: '60%' }} />
              <span className="we-demo-bar" style={{ width: '90%' }} />
            </div>
          </div>
        </div>
      </>
    )
  if (demo === 'type')
    return stage(
      <div className="we-demo-block" style={{ width: 280, padding: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
          Mon titre<span className="we-demo-caret" />
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--admin-text-tertiary)' }}>
          Cliquez et tapez directement sur la page.
        </div>
      </div>
    )
  if (demo === 'settings' || demo === 'inspector')
    return stage(
      <div className="we-demo-panel">
        <div className="we-demo-tabs">
          <span className="we-demo-tab is-on" />
          <span className="we-demo-tab" />
          <span className="we-demo-tab" />
        </div>
        <span className="we-demo-bar" style={{ width: '70%', display: 'block' }} />
        <div className="we-demo-track"><span className="we-demo-thumb" /></div>
        <span className="we-demo-bar" style={{ width: '45%', display: 'block' }} />
      </div>
    )
  if (demo === 'colors')
    return stage(
      <div className="we-demo-swatches">
        {['#7ce0c3', '#5fb7e8', '#f5c97b', '#a78bfa', '#f47ea0'].map((c, i) => (
          <span key={i} className={`we-demo-sw ${i === 2 ? 'is-pick' : ''}`} style={{ background: c }} />
        ))}
      </div>
    )
  if (demo === 'sizing') return stage(<div className="we-demo-box" />)
  if (demo === 'fonts')
    return stage(
      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
        {[
          { f: "'Plus Jakarta Sans', sans-serif", n: 'Aa' },
          { f: "'Fraunces', serif", n: 'Aa' },
          { f: "'Space Grotesk', sans-serif", n: 'Aa' },
          { f: "'JetBrains Mono', monospace", n: 'Aa' },
        ].map((x, i) => (
          <span
            key={i}
            style={{
              fontFamily: x.f, fontSize: 46, fontWeight: 700,
              color: i === 1 ? 'var(--c-mint)' : 'var(--admin-text-primary)',
              animation: `wePick ${1.8 + i * 0.25}s ease-in-out infinite`,
            }}
          >
            {x.n}
          </span>
        ))}
      </div>
    )
  if (demo === 'theme' || demo === 'quickTheme')
    return stage(
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          'linear-gradient(180deg,#04060c,#0f1b30)',
          'linear-gradient(180deg, oklch(0.975 0.008 240), oklch(0.945 0.012 230))',
          'radial-gradient(120% 120% at 50% 0%, #2a2318, #14110c)',
          'linear-gradient(180deg, oklch(0.975 0.022 80), oklch(0.95 0.035 55))',
        ].map((g, i) => (
          <span
            key={i}
            style={{
              width: 104, height: 64, borderRadius: 12, background: g,
              border: '1px solid var(--admin-glass-border)',
            }}
          />
        ))}
      </div>
    )
  if (demo === 'preview' || demo === 'devices')
    return stage(
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <span style={{ width: 130, height: 86, borderRadius: 8, border: '1px solid var(--admin-glass-border-strong)', background: 'var(--admin-soft-2)' }} />
        <span style={{ width: 68, height: 76, borderRadius: 8, border: '1px solid var(--admin-glass-border-strong)', background: 'var(--admin-soft-2)' }} />
        <span style={{ width: 38, height: 62, borderRadius: 8, border: '1px solid var(--admin-glass-border-strong)', background: 'var(--admin-soft-2)' }} />
      </div>
    )
  if (demo === 'publish')
    return stage(
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="we-publish-btn" style={{ pointerEvents: 'none' }}>
          <Rocket size={15} /> Publier
        </span>
        <span className="we-pub-status is-live">● En ligne</span>
      </div>
    )
  if (demo === 'palette')
    return stage(
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: 260 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            style={{
              aspectRatio: '1', borderRadius: 10,
              border: '1px solid var(--admin-glass-border)',
              background: 'var(--admin-soft-2)',
              display: 'grid', placeItems: 'center',
              color: 'var(--admin-text-tertiary)',
            }}
          >
            <Boxes size={20} />
          </span>
        ))}
      </div>
    )
  if (demo === 'layers')
    return stage(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 240 }}>
        {['Hero', 'Stats', 'Grille de produits', 'Marques', 'Footer'].map((label, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: i === 2 ? 'color-mix(in oklab, var(--c-mint) 12%, transparent)' : 'var(--admin-soft-2)',
              border: '1px solid ' + (i === 2 ? 'color-mix(in oklab, var(--c-mint) 35%, transparent)' : 'var(--admin-glass-border)'),
              color: 'var(--admin-text-primary)',
              fontSize: 12, fontWeight: 600,
            }}
          >
            <Layers size={12} /> {label}
          </div>
        ))}
      </div>
    )
  if (demo === 'block')
    return stage(
      <div className="we-demo-block" style={{ width: 280, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--c-mint)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>BLOC SÉLECTIONNÉ</span>
          <span style={{ display: 'flex', gap: 4 }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--admin-soft-2)' }} />
            <span style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--admin-soft-2)' }} />
            <span style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--admin-soft-2)' }} />
          </span>
        </div>
        <span className="we-demo-bar" style={{ width: '80%', display: 'block', marginBottom: 6 }} />
        <span className="we-demo-bar" style={{ width: '45%', display: 'block' }} />
      </div>
    )
  if (demo === 'autosave')
    return stage(
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999, background: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--c-emerald) 40%, transparent)', color: 'var(--c-emerald)' }}>
        <Save size={14} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Enregistré · à l’instant</span>
      </div>
    )
  if (demo === 'css')
    return stage(
      <pre style={{ background: 'var(--admin-soft-2)', padding: 14, borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, color: 'var(--admin-text-primary)', border: '1px solid var(--admin-glass-border)', margin: 0 }}>
{`transform: rotate(-2deg);
filter: drop-shadow(0 12px 24px rgba(0,0,0,0.4));
border-radius: 24px;`}
      </pre>
    )
  if (demo === 'links')
    return stage(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 260 }}>
        <input
          readOnly
          value="Découvrir la gamme"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-glass-border-strong)', background: 'var(--admin-soft-2)', color: 'var(--admin-text-primary)', fontFamily: 'var(--font-body)', fontSize: 13 }}
        />
        <input
          readOnly
          value="/products"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-glass-border-strong)', background: 'var(--admin-soft-2)', color: 'var(--c-mint)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
        />
      </div>
    )
  if (demo === 'images')
    return stage(
      <div
        style={{
          width: 240, height: 130, borderRadius: 12,
          border: '2px dashed color-mix(in oklab, var(--c-mint) 35%, transparent)',
          background: 'color-mix(in oklab, var(--c-mint) 4%, var(--admin-soft-2))',
          display: 'grid', placeItems: 'center',
          color: 'var(--admin-text-secondary)', fontSize: 13, fontWeight: 600,
        }}
      >
        Déposer une image ici
      </div>
    )
  if (demo === 'shortcuts')
    return stage(
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 320 }}>
        {['Ctrl + Z', 'Ctrl + Maj + Z', 'Ctrl + D', 'Suppr', 'P', 'Esc', 'Ctrl + K'].map((k) => (
          <kbd key={k} className="we-kbd">{k}</kbd>
        ))}
      </div>
    )
  return stage(
    <div style={{ display: 'flex', gap: 14, color: 'var(--c-mint)' }}>
      <Undo2 size={38} />
      <Layers size={38} style={{ color: 'var(--admin-text-tertiary)' }} />
    </div>
  )
}

export function GuideBook({ uiClass }: { uiClass: string }) {
  const [sel, setSel] = useState<string>(TOPICS[0]!.id)
  const [query, setQuery] = useState('')
  const detailRef = useRef<HTMLDivElement | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TOPICS
    return TOPICS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.cat.toLowerCase().includes(q) ||
        t.lead.toLowerCase().includes(q)
    )
  }, [query])

  const topic = TOPICS.find((t) => t.id === sel) ?? TOPICS[0]!
  const currentIndex = TOPICS.findIndex((t) => t.id === topic.id)
  const prev = currentIndex > 0 ? TOPICS[currentIndex - 1] : null
  const next = currentIndex < TOPICS.length - 1 ? TOPICS[currentIndex + 1] : null

  // Scroll the detail pane to top when the topic changes
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [sel])

  return (
    <div className={`we-page ${uiClass}`}>
      <div className="we-page-bar">
        <Link className="we-exit" href="/editor">
          <ChevronLeft size={16} /> <span>Éditeur</span>
        </Link>
        <span className="we-appbar-brand">
          <Layers size={16} style={{ color: 'var(--c-mint)' }} />
          Catalogue &amp; guide de l’éditeur
        </span>
        <Link className="we-appbar-link" href="/editor/themes">
          Thèmes <Palette size={13} />
        </Link>
      </div>

      <div className="we-gp">
        <div className="we-gp-list">
          <div className="we-gp-search">
            <Search size={13} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Rechercher dans ${TOPICS.length} fiches…`}
              aria-label="Rechercher dans le guide"
            />
            {query && (
              <button
                type="button"
                className="we-gp-search-clear"
                onClick={() => setQuery('')}
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>

          {CATS.map((cat) => {
            const items = filtered.filter((t) => t.cat === cat)
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <p className="we-gp-cat">{cat}</p>
                {items.map((t) => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.id}
                      className={`we-guide-item ${t.id === sel ? 'is-on' : ''}`}
                      onClick={() => setSel(t.id)}
                    >
                      <span className="we-guide-item-icn"><Icon size={15} /></span>
                      <span style={{ minWidth: 0 }}>
                        <span className="we-guide-item-t" style={{ display: 'block' }}>{t.title}</span>
                        <span className="we-guide-item-d" style={{ display: 'block' }}>{t.summary}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <p className="we-gp-empty">Aucune fiche ne correspond à « {query} ».</p>
          )}
        </div>

        <div className="we-gp-detail" ref={detailRef}>
          <p className="we-gp-crumb">
            {topic.cat} · Fiche {currentIndex + 1} / {TOPICS.length}
          </p>
          <DemoStage demo={topic.demo} />
          <h1 className="we-guide-h">{topic.title}</h1>
          <p className="we-guide-lead">{topic.lead}</p>

          <h2 className="we-guide-sub">
            <Settings2 size={14} /> Marche à suivre
          </h2>
          <ol className="we-guide-steps">
            {topic.steps.map((s, i) => (
              <li key={i} className="we-guide-step">
                <span className="we-guide-step-n">{i + 1}</span>
                <span className="we-guide-step-t" dangerouslySetInnerHTML={{ __html: boldify(s) }} />
              </li>
            ))}
          </ol>

          {topic.tips && topic.tips.length > 0 && (
            <>
              <h2 className="we-guide-sub">
                <Lightbulb size={14} /> Bon à savoir
              </h2>
              <ul className="we-guide-tips">
                {topic.tips.map((s, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: boldify(s) }} />
                ))}
              </ul>
            </>
          )}

          {topic.keys && topic.keys.length > 0 && (
            <>
              <h2 className="we-guide-sub">
                <Keyboard size={14} /> Raccourcis
              </h2>
              <div className="we-guide-keys">
                {topic.keys.map((k) => (
                  <kbd key={k} className="we-kbd">{k}</kbd>
                ))}
              </div>
            </>
          )}

          <nav className="we-guide-nav" aria-label="Navigation entre fiches">
            {prev ? (
              <button type="button" className="we-guide-prev" onClick={() => setSel(prev.id)}>
                <ChevronLeft size={14} />
                <span>
                  <span className="we-guide-nav-l">Précédent</span>
                  <span className="we-guide-nav-t">{prev.title}</span>
                </span>
              </button>
            ) : <span />}
            {next ? (
              <button type="button" className="we-guide-next" onClick={() => setSel(next.id)}>
                <span style={{ textAlign: 'right' }}>
                  <span className="we-guide-nav-l">Suivant</span>
                  <span className="we-guide-nav-t">{next.title}</span>
                </span>
                <ChevronRight size={14} />
              </button>
            ) : <span />}
          </nav>
        </div>
      </div>
    </div>
  )
}
