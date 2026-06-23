/**
 * Shared, pure definitions for the visual page-builder: block kinds that can
 * live inside a custom section, the section templates in the library, and
 * their default content. Imported by the on-page engine (edit-context) and
 * the editor parent (WebEditor) so the two stay in sync.
 */

export type BlockKind =
  | 'eyebrow'
  | 'badge'
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'logo'
  | 'video'
  | 'spacer'
  | 'divider'
  | 'socialRow'
  | 'feature'
  | 'stat'
  | 'quote'
  | 'richtext'
  | 'heroText'
  | 'faqItem'
  | 'testimonial'
  | 'team'
  | 'priceCard'
  | 'step'
  | 'iconText'
  | 'checklist'

export type Layout = 'stack' | 'center' | 'cols2' | 'cols3' | 'cols4' | 'row'

export interface EditBlock {
  id: string
  kind: BlockKind
}

/* ── component library (single blocks you can drop into a section) ───────── */

export interface ComponentDef {
  kind: BlockKind
  label: string
  icon: string
  hint: string
}

export const COMPONENT_PALETTE: ComponentDef[] = [
  { kind: 'heading', label: 'Titre', icon: 'T', hint: 'Un grand titre' },
  { kind: 'text', label: 'Paragraphe', icon: 'P', hint: 'Un bloc de texte' },
  { kind: 'eyebrow', label: 'Sur-titre', icon: '-', hint: 'Petite étiquette au-dessus du titre' },
  { kind: 'badge', label: 'Badge', icon: 'o', hint: 'Pastille / étiquette colorée' },
  { kind: 'button', label: 'Bouton', icon: 'B', hint: 'Un bouton / lien' },
  { kind: 'image', label: 'Image', icon: 'I', hint: 'Une image' },
  { kind: 'logo', label: 'Logo', icon: 'L', hint: 'Logo (bande de logos)' },
  { kind: 'video', label: 'Vidéo', icon: 'V', hint: 'Lecteur vidéo (visuel)' },
  { kind: 'heroText', label: 'Bloc hero', icon: 'H', hint: 'Sur-titre + grand titre + texte + bouton' },
  { kind: 'richtext', label: 'Texte + bouton', icon: 'R', hint: 'Titre + texte + bouton' },
  { kind: 'feature', label: 'Atout', icon: '*', hint: 'Icône + titre + texte' },
  { kind: 'iconText', label: 'Icône + texte', icon: 'i', hint: 'Petite icône + ligne de texte' },
  { kind: 'stat', label: 'Statistique', icon: '9', hint: 'Un chiffre clé + libellé' },
  { kind: 'step', label: 'Étape', icon: '1', hint: 'Numéro + titre + texte' },
  { kind: 'quote', label: 'Citation', icon: 'Q', hint: 'Une citation + auteur' },
  { kind: 'testimonial', label: 'Témoignage', icon: 'C', hint: 'Avis client + nom + rôle' },
  { kind: 'team', label: 'Membre équipe', icon: 'U', hint: 'Photo + nom + rôle' },
  { kind: 'priceCard', label: 'Carte tarif', icon: '$', hint: 'Offre + prix + liste + bouton' },
  { kind: 'checklist', label: 'Liste à puces', icon: 'V', hint: 'Titre + éléments cochés' },
  { kind: 'faqItem', label: 'Question', icon: '?', hint: 'Question + réponse' },
  { kind: 'socialRow', label: 'Réseaux', icon: '@', hint: 'Rangée de liens sociaux' },
  { kind: 'spacer', label: 'Espace', icon: '=', hint: 'Espace vertical' },
  { kind: 'divider', label: 'Séparateur', icon: '_', hint: 'Trait de séparation' },
]

/* ── section templates (library) ─────────────────────────────────────────── */

export interface SectionPreset {
  id: string
  label: string
  icon: string
  group: string
  layout: Layout
  blocks: BlockKind[]
  /** One-line purpose, shown in the hover/focus help-card. */
  hint: string
}

export const SECTION_PRESETS: SectionPreset[] = [
  // Hero / en-tete
  { id: 'heroCentered', label: 'Hero centré', icon: 'H', group: 'Hero', layout: 'center', blocks: ['badge', 'heading', 'text', 'button'], hint: 'Une grande accroche centrée avec badge, titre, texte et bouton — idéale en haut de page.' },
  { id: 'heroSplit', label: 'Hero image', icon: 'H', group: 'Hero', layout: 'cols2', blocks: ['heroText', 'image'], hint: 'Accroche sur deux colonnes : texte d’un côté, image de l’autre.' },
  { id: 'banner', label: 'Bannière', icon: 'B', group: 'Hero', layout: 'center', blocks: ['eyebrow', 'heading', 'text', 'button'], hint: 'Bandeau compact pour une annonce ou une promotion.' },
  // Contenu
  { id: 'heading', label: 'Titre + texte', icon: 'T', group: 'Contenu', layout: 'center', blocks: ['eyebrow', 'heading', 'text'], hint: 'Un sur-titre, un titre et un paragraphe centrés pour présenter une idée.' },
  { id: 'richText', label: 'Texte riche', icon: 'R', group: 'Contenu', layout: 'center', blocks: ['heading', 'text'], hint: 'Un bloc titre + texte simple pour rédiger librement.' },
  { id: 'imageText', label: 'Image + texte', icon: 'I', group: 'Contenu', layout: 'cols2', blocks: ['image', 'richtext'], hint: 'Image à gauche, texte à droite — pour illustrer un propos.' },
  { id: 'textImage', label: 'Texte + image', icon: 'I', group: 'Contenu', layout: 'cols2', blocks: ['richtext', 'image'], hint: 'Texte à gauche, image à droite — l’inverse d’Image + texte.' },
  { id: 'checklist', label: 'Texte + liste', icon: 'V', group: 'Contenu', layout: 'cols2', blocks: ['richtext', 'checklist'], hint: 'Un texte accompagné d’une liste d’avantages cochés.' },
  // Preuve
  { id: 'features', label: '3 atouts', icon: '*', group: 'Preuve sociale', layout: 'cols3', blocks: ['feature', 'feature', 'feature'], hint: 'Trois atouts côte à côte, chacun avec icône, titre et texte.' },
  { id: 'featuresWide', label: '2 atouts', icon: '*', group: 'Preuve sociale', layout: 'cols2', blocks: ['feature', 'feature'], hint: 'Deux atouts larges pour mettre en avant l’essentiel.' },
  { id: 'stats', label: 'Chiffres clés', icon: '9', group: 'Preuve sociale', layout: 'cols4', blocks: ['stat', 'stat', 'stat', 'stat'], hint: 'Quatre chiffres marquants pour rassurer vos visiteurs.' },
  { id: 'logos', label: 'Bande de logos', icon: 'L', group: 'Preuve sociale', layout: 'row', blocks: ['logo', 'logo', 'logo', 'logo', 'logo'], hint: 'Une rangée de logos partenaires ou de marques distribuées.' },
  { id: 'testimonials', label: 'Témoignages', icon: 'C', group: 'Preuve sociale', layout: 'cols3', blocks: ['testimonial', 'testimonial', 'testimonial'], hint: 'Trois avis clients avec nom et rôle pour inspirer confiance.' },
  { id: 'testimonialSingle', label: 'Témoignage', icon: 'C', group: 'Preuve sociale', layout: 'center', blocks: ['testimonial'], hint: 'Un seul avis client mis en avant au centre.' },
  { id: 'team', label: 'Équipe', icon: 'U', group: 'Preuve sociale', layout: 'cols3', blocks: ['team', 'team', 'team'], hint: 'Présentez votre équipe : photo, nom et poste.' },
  // Offres
  { id: 'pricing', label: 'Tarifs', icon: '$', group: 'Offres', layout: 'cols3', blocks: ['priceCard', 'priceCard', 'priceCard'], hint: 'Trois offres comparées avec prix, liste et bouton.' },
  { id: 'steps', label: 'Étapes', icon: '1', group: 'Offres', layout: 'cols3', blocks: ['step', 'step', 'step'], hint: 'Un parcours en trois étapes numérotées.' },
  { id: 'faq', label: 'FAQ', icon: '?', group: 'Offres', layout: 'stack', blocks: ['faqItem', 'faqItem', 'faqItem', 'faqItem'], hint: 'Une liste de questions fréquentes avec leurs réponses.' },
  { id: 'quote', label: 'Citation', icon: 'Q', group: 'Offres', layout: 'center', blocks: ['quote'], hint: 'Une citation forte avec son auteur, centrée.' },
  // Media
  { id: 'gallery', label: 'Galerie', icon: 'I', group: 'Média', layout: 'cols3', blocks: ['image', 'image', 'image', 'image', 'image', 'image'], hint: 'Une grille de six images pour montrer vos produits ou réalisations.' },
  { id: 'videoSection', label: 'Vidéo', icon: 'V', group: 'Média', layout: 'center', blocks: ['heading', 'video'], hint: 'Un titre suivi d’un lecteur vidéo centré.' },
  // Action
  { id: 'cta', label: 'Appel à l’action', icon: '>', group: 'Action', layout: 'center', blocks: ['heading', 'text', 'button'], hint: 'Incitez à passer à l’action : titre, texte et bouton.' },
  { id: 'newsletter', label: 'Newsletter', icon: '@', group: 'Action', layout: 'center', blocks: ['eyebrow', 'heading', 'text', 'button'], hint: 'Invitez les visiteurs à s’inscrire à votre newsletter.' },
  { id: 'contact', label: 'Contact', icon: '@', group: 'Action', layout: 'cols2', blocks: ['richtext', 'checklist'], hint: 'Vos coordonnées d’un côté, points de réassurance de l’autre.' },
  { id: 'social', label: 'Réseaux sociaux', icon: '@', group: 'Action', layout: 'center', blocks: ['heading', 'socialRow'], hint: 'Un titre et une rangée de liens vers vos réseaux.' },
  { id: 'buttons', label: 'Boutons', icon: 'B', group: 'Action', layout: 'center', blocks: ['button'], hint: 'Un ou plusieurs boutons d’action, centrés.' },
  // Mise en page
  { id: 'columns', label: '2 colonnes', icon: '=', group: 'Mise en page', layout: 'cols2', blocks: ['richtext', 'richtext'], hint: 'Deux colonnes de texte côte à côte.' },
  { id: 'divider', label: 'Séparateur', icon: '_', group: 'Mise en page', layout: 'stack', blocks: ['divider'], hint: 'Un trait fin pour séparer deux sections.' },
  { id: 'spacer', label: 'Espace', icon: '=', group: 'Mise en page', layout: 'stack', blocks: ['spacer'], hint: 'Un espace vertical vide pour aérer la page.' },
  // ── More ready-made layouts (reuse existing blocks) ──────────────────────
  { id: 'features4', label: '4 atouts', icon: '*', group: 'Preuve sociale', layout: 'cols4', blocks: ['feature', 'feature', 'feature', 'feature'], hint: 'Quatre atouts sur une rangée pour les pages riches.' },
  { id: 'statsTrio', label: '3 chiffres', icon: '9', group: 'Preuve sociale', layout: 'cols3', blocks: ['stat', 'stat', 'stat'], hint: 'Trois chiffres clés bien lisibles.' },
  { id: 'logosGrid', label: 'Grille de logos', icon: 'L', group: 'Preuve sociale', layout: 'cols3', blocks: ['logo', 'logo', 'logo', 'logo', 'logo', 'logo'], hint: 'Une grille de six logos partenaires.' },
  { id: 'testimonialsDuo', label: '2 témoignages', icon: 'C', group: 'Preuve sociale', layout: 'cols2', blocks: ['testimonial', 'testimonial'], hint: 'Deux avis clients côte à côte.' },
  { id: 'teamWide', label: 'Équipe (4)', icon: 'U', group: 'Preuve sociale', layout: 'cols4', blocks: ['team', 'team', 'team', 'team'], hint: 'Quatre membres d’équipe sur une rangée.' },
  { id: 'pricingDuo', label: '2 tarifs', icon: '$', group: 'Offres', layout: 'cols2', blocks: ['priceCard', 'priceCard'], hint: 'Deux offres comparées.' },
  { id: 'steps4', label: '4 étapes', icon: '1', group: 'Offres', layout: 'cols4', blocks: ['step', 'step', 'step', 'step'], hint: 'Un parcours en quatre étapes.' },
  { id: 'iconList', label: 'Points clés', icon: 'i', group: 'Contenu', layout: 'stack', blocks: ['iconText', 'iconText', 'iconText'], hint: 'Une liste de points clés avec icônes.' },
  { id: 'galleryWide', label: 'Galerie (4)', icon: 'I', group: 'Média', layout: 'cols4', blocks: ['image', 'image', 'image', 'image'], hint: 'Quatre images sur une rangée.' },
  { id: 'ctaBanner', label: 'Bandeau CTA', icon: '>', group: 'Action', layout: 'center', blocks: ['eyebrow', 'heading', 'text', 'button'], hint: 'Un bandeau d’appel à l’action complet.' },
]

export function presetById(id: string): SectionPreset | undefined {
  return SECTION_PRESETS.find((p) => p.id === id)
}

/* ── default content per block kind / field ──────────────────────────────── */

export function defaultText(kind: BlockKind, field: string): string {
  const D: Record<string, string> = {
    'eyebrow.text': 'SUR-TITRE',
    'badge.text': 'Nouveau',
    'heading.text': 'Votre titre ici',
    'text.text': 'Cliquez pour modifier ce texte. Décrivez votre offre, votre produit ou votre message en quelques lignes claires.',
    'button.label': 'En savoir plus',
    'feature.icon': '*',
    'feature.title': 'Un atout clé',
    'feature.text': 'Expliquez en une phrase pourquoi c’est important pour vos clients.',
    'stat.value': '100+',
    'stat.label': 'Libellé du chiffre',
    'quote.text': 'Une citation marquante de votre client ou de votre marque qui inspire confiance.',
    'quote.author': '— Auteur, RÃ´le',
    'richtext.title': 'Un titre accrocheur',
    'richtext.text': 'Présentez votre idée en quelques lignes claires et convaincantes pour vos visiteurs.',
    'richtext.label': 'Découvrir',
    'heroText.eyebrow': 'DTECH ALGÉRIE',
    'heroText.title': 'La techno qui vous ressemble',
    'heroText.text': 'Du matÃ©riel sÃ©lectionnÃ©, distribuÃ© et garanti en AlgÃ©rie. Trouvez l’Ã©quipement qu’il vous faut.',
    'heroText.label': 'Voir le catalogue',
    'faqItem.q': 'Une question fréquente ?',
    'faqItem.a': 'La réponse claire et utile à cette question, en une ou deux phrases.',
    'testimonial.text': 'Un service impeccable et du matériel de qualité. Je recommande sans hésiter.',
    'testimonial.name': 'Nom du client',
    'testimonial.role': 'Entreprise / Rôle',
    'team.name': 'Prenom Nom',
    'team.role': 'Poste dans l’Ã©quipe',
    'priceCard.plan': 'Offre',
    'priceCard.price': '9 900 DA',
    'priceCard.period': 'par mois',
    'priceCard.f1': 'Premier avantage inclus',
    'priceCard.f2': 'Deuxieme avantage inclus',
    'priceCard.f3': 'Troisieme avantage inclus',
    'priceCard.label': 'Choisir',
    'step.num': '1',
    'step.title': 'Étape',
    'step.text': 'Décrivez cette étape du parcours en une phrase simple.',
    'iconText.icon': '*',
    'iconText.text': 'Un point clé à mettre en avant.',
    'checklist.title': 'Ce qui est inclus',
    'checklist.i1': 'Premier élément de la liste',
    'checklist.i2': 'Deuxième élément de la liste',
    'checklist.i3': 'Troisième élément de la liste',
  }
  return D[`${kind}.${field}`] ?? ''
}

export function defaultHref(): string {
  return '/products'
}
