'use client'

/**
 * ÉDITEUR — les sections RÉELLES du site, déclarées au registre.
 *
 * Rien n'est réécrit ici : chaque entrée pointe sur le composant qui rend déjà
 * cette partie du site. L'éditeur peut donc réordonner, masquer, styler et
 * dupliquer les vraies sections — l'aperçu et la page publique sont le même
 * code, pas une approximation.
 *
 * `texts` liste les clés i18n qu'une section affiche. L'inspecteur en fait des
 * champs de saisie, et la surcharge est appliquée par `EditorialProvider` au
 * moment où la section appelle `t()`. Aucune section n'a eu besoin d'être
 * modifiée pour devenir éditable.
 */

import type { ReactNode } from 'react'
import type { EdSectionDef } from './ed-ctx'
import type { EdHeroSlide } from './editorial-types'

import {
  EdHero,
  EdIntro,
  EdCatalogue,
  EdMarquee,
  EdProof,
  EdHistory,
  EdWhy,
  EdFan,
  EdContact,
  EdTiers,
  EdDemo,
  EdBand,
} from './EditorialSections'
import { PageHead, EdGridPage } from './EditorialCollections'
import { EdCaHead, EdCaFamilies } from './EdCataloguePage'
import { EdCtHead, EdCtChannels, EdCtLocation, EdCtForm } from './EdContactPage'
import {
  EdCoHero,
  EdCoFigures,
  EdCoStory,
  EdCoMilestones,
  EdCoOwnBrands,
  EdCoRanges,
  EdCoDistribution,
  EdCoValues,
  EdCoClients,
  EdCoCta,
} from './EdCompanyPage'
import {
  EdGmAurora,
  EdGmHero,
  EdGmRgbBar,
  EdGmBrandTicker,
  EdGmBuildPath,
  EdGmCollections,
  EdGmWhy,
  EdGmCta,
} from './EdGamingPage'
import { EdBiHead, EdBiGroups } from './EdBrandsIndex'
import {
  EdBrHero,
  EdBrStatBand,
  EdBrWhy,
  EdBrCats,
  EdBrSelection,
  EdBrFaq,
  EdBrCta,
  EdBrOthers,
} from './EdBrandPage'

/* Une section qui a besoin de données absentes ne doit pas casser la page :
   elle disparaît, exactement comme aujourd'hui quand le catalogue est vide. */
const nothing = (): ReactNode => null

/* ═════════════════════════════ ACCUEIL ═════════════════════════════ */

const HOME: EdSectionDef[] = [
  {
    type: 'home.hero',
    label: 'Hero (bandeau d’accueil)',
    group: 'Accueil',
    icon: 'Image',
    desc: 'Le diaporama d’images, plein cadre. Le texte vit dans la section « Accroche », juste en dessous.',
    pages: ['home'],
    fields: [
      {
        key: 'slides',
        label: 'Images du diaporama',
        type: 'list',
        addLabel: 'Ajouter une image',
        help: 'Laissez vide pour garder les images publiées dans « Hero » de l’admin.',
        itemFields: [
          { key: 'src', label: 'Image', type: 'image' },
          { key: 'alt', label: 'Texte alternatif', type: 'text' },
        ],
      },
      {
        key: 'overlay',
        label: 'Écrire le texte par-dessus l’image',
        type: 'switch',
        help: 'Ancien affichage. La bannière porte déjà son message, donc c’est désactivé par défaut.',
      },
    ],
    render: ({ node, ctx }) => {
      const custom = node.props?.slides as EdHeroSlide[] | undefined
      const slides =
        custom && custom.length > 0
          ? custom.filter((s) => s && typeof s.src === 'string' && s.src)
          : (ctx.data.home?.heroSlides ?? [])
      return <EdHero slides={slides} overlay={node.props?.overlay === true} />
    },
  },
  {
    type: 'home.intro',
    label: 'Accroche (titre d’accueil)',
    group: 'Accueil',
    icon: 'Type',
    desc: 'Le nom, le grand titre, l’accroche et les deux boutons — sous le bandeau.',
    addable: true,
    pages: ['home', 'about'],
    texts: [
      { key: 'hero.title1', label: 'Titre — 1re ligne' },
      { key: 'hero.title2', label: 'Titre — 2e ligne' },
      { key: 'hero.lede', label: 'Accroche', area: true },
      { key: 'hero.tag', label: 'Étiquette' },
      { key: 'hero.cta1', label: 'Bouton principal' },
      { key: 'hero.cta2', label: 'Bouton WhatsApp' },
    ],
    render: () => <EdIntro />,
  },
  {
    type: 'home.catalogue',
    label: 'Catalogue (carrousel)',
    group: 'Accueil',
    icon: 'LayoutGrid',
    desc: 'Le carrousel des familles de produits.',
    pages: ['home'],
    texts: [
      { key: 'cat.eyebrow', label: 'Sur-titre' },
      { key: 'cat.title', label: 'Titre' },
      { key: 'cat.lede', label: 'Accroche', area: true },
      { key: 'cat.from', label: 'Mention « à partir de »' },
      { key: 'cat.refs', label: 'Mot « références »' },
    ],
    render: ({ ctx }) => (ctx.data.home ? <EdCatalogue data={ctx.data.home} /> : nothing()),
  },
  {
    type: 'home.marquee',
    label: 'Marques (bandeau défilant)',
    group: 'Accueil',
    icon: 'Repeat',
    desc: 'Les logos des marques qui défilent, plus la ligne de services.',
    pages: ['home'],
    texts: [
      { key: 'mq.eyebrow', label: 'Sur-titre' },
      { key: 'mq.title', label: 'Titre' },
      { key: 'mq.lede', label: 'Accroche', area: true },
      { key: 'mq.products', label: 'Mot « produits »' },
      { key: 'mq.more', label: 'Ligne « et plus »' },
      { key: 'mq.moreLink', label: 'Lien de la ligne' },
      { key: 'mq.services', label: 'Titre des services' },
      { key: 'mq.svc1', label: 'Service 1' },
      { key: 'mq.svc2', label: 'Service 2' },
      { key: 'mq.svc3', label: 'Service 3' },
      { key: 'mq.svc4', label: 'Service 4' },
    ],
    render: ({ ctx }) => (ctx.data.home ? <EdMarquee data={ctx.data.home} /> : nothing()),
  },
  {
    type: 'home.proof',
    label: 'Citation + chiffres',
    group: 'Accueil',
    icon: 'Quote',
    desc: 'La citation client et les trois compteurs animés.',
    pages: ['home'],
    texts: [
      { key: 'proof.eyebrow', label: 'Sur-titre' },
      { key: 'proof.quote', label: 'Citation', area: true },
      { key: 'proof.attrib', label: 'Signature' },
      { key: 'proof.s1', label: 'Légende du chiffre 1' },
      { key: 'proof.s2', label: 'Légende du chiffre 2' },
      { key: 'proof.s3', label: 'Légende du chiffre 3' },
    ],
    render: ({ ctx }) => (ctx.data.home ? <EdProof data={ctx.data.home} /> : nothing()),
  },
  {
    type: 'home.history',
    label: 'Bande histoire',
    group: 'Accueil',
    icon: 'BookOpen',
    desc: 'La photo pleine largeur avec l’histoire de l’entreprise et les compteurs.',
    pages: ['home'],
    texts: [
      { key: 'hist.sub', label: 'Sous-titre', area: true },
      { key: 'hist.refs', label: 'Mot « références »' },
      { key: 'hist.brands', label: 'Mot « marques »' },
      { key: 'hist.wilayas', label: 'Mot « wilayas »' },
      { key: 'hist.h', label: 'Titre du récit' },
      { key: 'hist.p1', label: 'Paragraphe 1', area: true },
      { key: 'hist.p2', label: 'Paragraphe 2', area: true },
      { key: 'hist.cta', label: 'Bouton' },
    ],
    render: ({ ctx }) => (ctx.data.home ? <EdHistory data={ctx.data.home} /> : nothing()),
  },
  {
    type: 'home.why',
    label: 'Pourquoi nous (bento)',
    group: 'Accueil',
    icon: 'Sparkles',
    desc: 'Les quatre cartes animées : banc d’essai, SAV, devis, livraison.',
    pages: ['home', 'about'],
    texts: [
      { key: 'why.eyebrow', label: 'Sur-titre' },
      { key: 'why.title', label: 'Titre' },
      { key: 'why.1.t', label: 'Carte 1 — titre' },
      { key: 'why.1.p', label: 'Carte 1 — texte', area: true },
      { key: 'why.2.t', label: 'Carte 2 — titre' },
      { key: 'why.2.p', label: 'Carte 2 — texte', area: true },
      { key: 'why.3.t', label: 'Carte 3 — titre' },
      { key: 'why.3.p', label: 'Carte 3 — texte', area: true },
      { key: 'why.4.t', label: 'Carte 4 — titre' },
      { key: 'why.4.p', label: 'Carte 4 — texte', area: true },
    ],
    render: ({ ctx }) => <EdWhy bento={ctx.data.home?.bento} />,
  },
  {
    type: 'home.fan',
    label: 'Éventail de produits',
    group: 'Accueil',
    icon: 'Layers',
    desc: 'Les cartes en éventail qui s’ouvrent au défilement.',
    pages: ['home'],
    texts: [
      { key: 'own.eyebrow', label: 'Sur-titre (marque propre)' },
      { key: 'own.title', label: 'Titre (marque propre)' },
      { key: 'own.lede', label: 'Accroche (marque propre)', area: true },
      { key: 'own.foot', label: 'Lien de bas de section' },
      { key: 'fan.eyebrow', label: 'Sur-titre (repli)' },
      { key: 'fan.title', label: 'Titre (repli)' },
      { key: 'fan.lede', label: 'Accroche (repli)', area: true },
      { key: 'fan.foot', label: 'Lien de bas de section (repli)' },
    ],
    render: ({ ctx }) => (ctx.data.home ? <EdFan data={ctx.data.home} /> : nothing()),
  },
  {
    type: 'home.contact',
    label: 'Contact (bloc court)',
    group: 'Accueil',
    icon: 'Phone',
    desc: 'Le bloc centré avec le bouton WhatsApp et les coordonnées.',
    pages: ['home', 'about'],
    texts: [
      { key: 'contact.eyebrow', label: 'Sur-titre' },
      { key: 'contact.title', label: 'Titre' },
      { key: 'contact.lede', label: 'Accroche', area: true },
      { key: 'contact.btn', label: 'Bouton' },
      { key: 'contact.addr', label: 'Adresse' },
      { key: 'contact.hours', label: 'Horaires' },
    ],
    render: () => <EdContact />,
  },
  /* Deux sections présentes dans le code mais plus posées sur l'accueil :
     elles redeviennent disponibles à la demande depuis la bibliothèque. */
  {
    type: 'home.tiers',
    label: 'Gammes (accordéon)',
    group: 'Accueil',
    icon: 'ListTree',
    desc: 'La liste dépliante des familles, avec panneau coloré et modèles phares.',
    addable: true,
    /* `EdTiers` lit `data.home` : proposée ailleurs, elle s'ajouterait sans
       jamais rien afficher. On ne l'offre donc que là où la donnée existe. */
    pages: ['home'],
    texts: [
      { key: 'tiers.eyebrow', label: 'Sur-titre' },
      { key: 'tiers.title', label: 'Titre' },
      { key: 'tiers.lede', label: 'Accroche', area: true },
      { key: 'tiers.lab1', label: 'Libellé du groupe 1' },
      { key: 'tiers.lab2', label: 'Libellé du groupe 2' },
      { key: 'tiers.refs', label: 'Mot « références »' },
      { key: 'tiers.surdevis', label: 'Mention « sur devis »' },
      { key: 'tiers.cta', label: 'Bouton du panneau' },
      { key: 'tiers.browse', label: 'Lien « parcourir »' },
      { key: 'tiers.note', label: 'Note de bas de liste' },
      { key: 'tiers.noteLink', label: 'Lien de la note' },
      { key: 'tiers.more', label: 'Deuxième note' },
      { key: 'tiers.moreLink', label: 'Lien de la deuxième note' },
    ],
    render: ({ ctx }) => (ctx.data.home ? <EdTiers data={ctx.data.home} /> : nothing()),
  },
  {
    type: 'home.demo',
    label: 'Aperçu de la boutique',
    group: 'Accueil',
    icon: 'MonitorSmartphone',
    desc: 'La fenêtre de navigateur qui présente la boutique en ligne.',
    addable: true,
    texts: [
      { key: 'demo.eyebrow', label: 'Sur-titre' },
      { key: 'demo.title', label: 'Titre' },
      { key: 'demo.lede', label: 'Accroche', area: true },
      { key: 'demo.url', label: 'Adresse affichée' },
      { key: 'demo.go', label: 'Libellé du bouton de la barre' },
      { key: 'demo.cta', label: 'Bouton' },
      { key: 'demo.note', label: 'Note' },
    ],
    fields: [{ key: 'screenshot', label: 'Capture d’écran', type: 'image' }],
    render: ({ node }) => <EdDemo screenshot={(node.props?.screenshot as string) || null} />,
  },
  {
    type: 'home.band',
    label: 'Bande photo pleine largeur',
    group: 'Accueil',
    icon: 'PanelTop',
    desc: 'Une photo pleine largeur avec une légende posée dans un coin.',
    addable: true,
    fields: [
      { key: 'img', label: 'Photo', type: 'image' },
      { key: 'cap', label: 'Légende', type: 'text', placeholder: 'Bab Ezzouar · Alger' },
      {
        key: 'pos',
        label: 'Position de la légende',
        type: 'select',
        options: [
          { value: 'tl', label: 'En haut' },
          { value: 'br', label: 'En bas' },
        ],
      },
    ],
    defaults: { cap: 'D-tech · Bab Ezzouar', pos: 'br' },
    render: ({ node }) => (
      <EdBand
        img={(node.props?.img as string) || null}
        cap={(node.props?.cap as string) ?? ''}
        ph={(node.props?.cap as string) ?? 'Photo'}
        pos={(node.props?.pos as 'tl' | 'br') ?? 'br'}
      />
    ),
  },
]

/* ═════════════════════════════ CATALOGUE ═════════════════════════════ */

const CATALOGUE: EdSectionDef[] = [
  {
    type: 'catalogue.head',
    label: 'En-tête du catalogue',
    group: 'Catalogue',
    icon: 'Heading1',
    pages: ['catalogue'],
    texts: [
      { key: 'cpage.eyebrow', label: 'Sur-titre' },
      { key: 'cpage.title', label: 'Titre' },
      { key: 'cpage.lede', label: 'Accroche', area: true },
      { key: 'cpage.refs', label: 'Mot « références »' },
      { key: 'cpage.families', label: 'Mot « familles »' },
      { key: 'cpage.all', label: 'Bouton « tout voir »' },
    ],
    render: ({ ctx }) =>
      ctx.data.catalogue ? (
        <EdCaHead cats={ctx.data.catalogue.cats} productCount={ctx.data.catalogue.productCount} />
      ) : (
        nothing()
      ),
  },
  {
    type: 'catalogue.families',
    label: 'Familles + barre de navigation',
    group: 'Catalogue',
    icon: 'LayoutGrid',
    desc: 'La barre de pastilles collante et toutes les familles avec leurs cartes.',
    pages: ['catalogue'],
    texts: [
      { key: 'cpage.jump', label: 'Libellé « aller à »' },
      { key: 'cpage.explore', label: 'Libellé « explorer »' },
      { key: 'cpage.refs', label: 'Mot « références »' },
    ],
    render: ({ ctx }) =>
      ctx.data.catalogue ? (
        <EdCaFamilies
          cats={ctx.data.catalogue.cats}
          productCount={ctx.data.catalogue.productCount}
        />
      ) : (
        nothing()
      ),
  },
]

/* ═════════════════════════════ CONTACT ═════════════════════════════ */

const CONTACT: EdSectionDef[] = [
  {
    type: 'contact.head',
    label: 'En-tête contact',
    group: 'Contact',
    icon: 'Heading1',
    pages: ['contact'],
    texts: [
      { key: 'ct.eyebrow', label: 'Sur-titre' },
      { key: 'ct.title', label: 'Titre' },
      { key: 'ct.lede', label: 'Accroche', area: true },
    ],
    render: () => <EdCtHead />,
  },
  {
    type: 'contact.channels',
    label: 'Canaux de contact',
    group: 'Contact',
    icon: 'MessageSquare',
    desc: 'Les quatre cartes : WhatsApp, commercial, SAV, e-mail.',
    pages: ['contact'],
    texts: [
      { key: 'ct.wa', label: 'Carte WhatsApp' },
      { key: 'ct.commercial', label: 'Carte commercial' },
      { key: 'ct.sav', label: 'Carte SAV' },
      { key: 'ct.mail', label: 'Carte e-mail' },
      { key: 'ct.hours', label: 'Horaires (sous-titre des cartes)' },
    ],
    render: () => <EdCtChannels />,
  },
  {
    type: 'contact.location',
    label: 'Adresse + carte',
    group: 'Contact',
    icon: 'MapPin',
    pages: ['contact'],
    texts: [
      { key: 'ct.showroom', label: 'Sur-titre' },
      { key: 'ct.addr', label: 'Adresse' },
      { key: 'ct.hoursLabel', label: 'Libellé horaires' },
      { key: 'ct.phone', label: 'Libellé téléphone' },
      { key: 'ct.since', label: 'Mention « depuis »' },
      { key: 'ct.dir', label: 'Bouton itinéraire' },
      { key: 'ct.legal', label: 'Mention légale', area: true },
      { key: 'ct.maphint', label: 'Invite de la carte' },
    ],
    render: () => <EdCtLocation />,
  },
  {
    type: 'contact.form',
    label: 'Formulaire',
    group: 'Contact',
    icon: 'Mail',
    pages: ['contact'],
    locked: true,
    texts: [
      { key: 'ct.formTitle', label: 'Titre du formulaire' },
      { key: 'ct.formLede', label: 'Accroche', area: true },
      { key: 'ct.f.h', label: 'Libellé du groupe sujet' },
      { key: 'ct.f.subject', label: 'Libellé « sujet »' },
      { key: 'ct.s.quote', label: 'Sujet — devis' },
      { key: 'ct.s.availability', label: 'Sujet — disponibilité' },
      { key: 'ct.s.support', label: 'Sujet — SAV' },
      { key: 'ct.s.partnership', label: 'Sujet — partenariat' },
      { key: 'ct.s.other', label: 'Sujet — autre' },
      { key: 'ct.f.name', label: 'Champ nom' },
      { key: 'ct.f.company', label: 'Champ société' },
      { key: 'ct.f.email', label: 'Champ e-mail' },
      { key: 'ct.f.phone', label: 'Champ téléphone' },
      { key: 'ct.f.msg', label: 'Champ message' },
      { key: 'ct.f.rate', label: 'Note sous le bouton' },
      { key: 'ct.f.send', label: 'Bouton envoyer' },
      { key: 'ct.f.sending', label: 'Bouton — envoi en cours' },
      { key: 'ct.f.error', label: 'Message d’erreur', area: true },
    ],
    render: () => <EdCtForm />,
  },
]

/* ═════════════════════════════ ENTREPRISE ═════════════════════════════ */

const COMPANY: EdSectionDef[] = [
  {
    type: 'company.hero',
    label: 'En-tête entreprise',
    group: 'Entreprise',
    icon: 'Building2',
    pages: ['company'],
    texts: [
      { key: 'co.eyebrow', label: 'Sur-titre' },
      { key: 'co.sub', label: 'Sous-titre' },
      { key: 'co.lede', label: 'Accroche', area: true },
      { key: 'co.f1', label: 'Fait 1' },
      { key: 'co.f2', label: 'Fait 2' },
      { key: 'co.f3', label: 'Fait 3' },
      { key: 'co.f4', label: 'Fait 4' },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoHero data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.figures',
    label: 'Chiffres clés',
    group: 'Entreprise',
    icon: 'BarChart3',
    pages: ['company'],
    texts: [
      { key: 'co.n1', label: 'Légende 1' },
      { key: 'co.n2', label: 'Légende 2' },
      { key: 'co.n3', label: 'Légende 3' },
      { key: 'co.n4', label: 'Légende 4' },
      { key: 'co.n5', label: 'Légende 5' },
      { key: 'co.n6', label: 'Légende 6' },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoFigures data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.story',
    label: 'Notre histoire',
    group: 'Entreprise',
    icon: 'BookOpen',
    pages: ['company'],
    texts: [
      { key: 'co.who', label: 'Sur-titre' },
      { key: 'co.whoTitle', label: 'Titre' },
      { key: 'co.p1', label: 'Paragraphe 1', area: true },
      { key: 'co.p2', label: 'Paragraphe 2', area: true },
      { key: 'co.p3', label: 'Paragraphe 3', area: true },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoStory data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.milestones',
    label: 'Étapes (chronologie)',
    group: 'Entreprise',
    icon: 'Milestone',
    pages: ['company'],
    texts: [
      { key: 'co.path', label: 'Sur-titre' },
      { key: 'co.pathTitle', label: 'Titre' },
      { key: 'co.m1.y', label: 'Étape 1 — année' },
      { key: 'co.m1.t', label: 'Étape 1 — titre' },
      { key: 'co.m1.d', label: 'Étape 1 — texte', area: true },
      { key: 'co.m2.y', label: 'Étape 2 — année' },
      { key: 'co.m2.t', label: 'Étape 2 — titre' },
      { key: 'co.m2.d', label: 'Étape 2 — texte', area: true },
      { key: 'co.m3.y', label: 'Étape 3 — année' },
      { key: 'co.m3.t', label: 'Étape 3 — titre' },
      { key: 'co.m3.d', label: 'Étape 3 — texte', area: true },
      { key: 'co.m4.y', label: 'Étape 4 — année' },
      { key: 'co.m4.t', label: 'Étape 4 — titre' },
      { key: 'co.m4.d', label: 'Étape 4 — texte', area: true },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoMilestones data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.ownBrands',
    label: 'Nos marques propres',
    group: 'Entreprise',
    icon: 'Tag',
    pages: ['company'],
    texts: [
      { key: 'co.own', label: 'Sur-titre' },
      { key: 'co.ownTitle', label: 'Titre' },
      { key: 'co.ownLede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoOwnBrands data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.ranges',
    label: 'Nos gammes',
    group: 'Entreprise',
    icon: 'Grid2x2',
    pages: ['company'],
    texts: [
      { key: 'co.ranges', label: 'Sur-titre' },
      { key: 'co.rangesTitle', label: 'Titre' },
      { key: 'co.rangesLede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoRanges data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.distribution',
    label: 'Marques distribuées',
    group: 'Entreprise',
    icon: 'Network',
    pages: ['company'],
    texts: [
      { key: 'co.dist', label: 'Sur-titre' },
      { key: 'co.distTitle', label: 'Titre' },
      { key: 'co.distLede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) =>
      ctx.data.company ? <EdCoDistribution data={ctx.data.company} /> : nothing(),
  },
  {
    type: 'company.values',
    label: 'Nos valeurs',
    group: 'Entreprise',
    icon: 'Heart',
    pages: ['company'],
    texts: [
      { key: 'co.val', label: 'Sur-titre' },
      { key: 'co.valTitle', label: 'Titre' },
      { key: 'co.v.quality', label: 'Valeur 1 — titre' },
      { key: 'co.v.quality.d', label: 'Valeur 1 — texte', area: true },
      { key: 'co.v.price', label: 'Valeur 2 — titre' },
      { key: 'co.v.price.d', label: 'Valeur 2 — texte', area: true },
      { key: 'co.v.trust', label: 'Valeur 3 — titre' },
      { key: 'co.v.trust.d', label: 'Valeur 3 — texte', area: true },
      { key: 'co.v.service', label: 'Valeur 4 — titre' },
      { key: 'co.v.service.d', label: 'Valeur 4 — texte', area: true },
      { key: 'co.quote', label: 'Citation', area: true },
      { key: 'co.quoteBy', label: 'Signature de la citation' },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoValues data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.clients',
    label: 'Ils nous font confiance',
    group: 'Entreprise',
    icon: 'Users',
    pages: ['company'],
    texts: [
      { key: 'co.trust', label: 'Sur-titre' },
      { key: 'co.trustTitle', label: 'Titre' },
      { key: 'co.trustLede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoClients data={ctx.data.company} /> : nothing()),
  },
  {
    type: 'company.cta',
    label: 'Appel à l’action',
    group: 'Entreprise',
    icon: 'Megaphone',
    pages: ['company'],
    texts: [
      { key: 'co.ctaTitle', label: 'Titre' },
      { key: 'co.ctaLede', label: 'Accroche', area: true },
      { key: 'co.ctaBtn', label: 'Bouton' },
    ],
    render: ({ ctx }) => (ctx.data.company ? <EdCoCta data={ctx.data.company} /> : nothing()),
  },
]

/* ═════════════════════════════ GAMING ═════════════════════════════ */

const GAMING: EdSectionDef[] = [
  {
    type: 'gaming.aurora',
    label: 'Halos d’ambiance',
    group: 'Gaming',
    icon: 'Sparkle',
    desc: 'Les auréoles colorées en arrière-plan de la page.',
    pages: ['gaming'],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmAurora data={ctx.data.gaming} /> : nothing()),
  },
  {
    type: 'gaming.hero',
    label: 'Hero gaming',
    group: 'Gaming',
    icon: 'Gamepad2',
    pages: ['gaming'],
    texts: [
      { key: 'gm.eyebrow', label: 'Étiquette' },
      { key: 'gm.t1', label: 'Titre — ligne 1' },
      { key: 'gm.t2', label: 'Titre — ligne 2 (dégradé)' },
      { key: 'gm.t3', label: 'Titre — ligne 3' },
      { key: 'gm.lede', label: 'Accroche', area: true },
      { key: 'gm.cta1', label: 'Bouton 1' },
      { key: 'gm.cta2', label: 'Bouton 2' },
      { key: 'gm.s1', label: 'Chiffre 1' },
      { key: 'gm.s2', label: 'Chiffre 2' },
      { key: 'gm.s3', label: 'Chiffre 3' },
      { key: 'gm.pick', label: 'Libellé du sélecteur' },
      { key: 'gm.stock', label: 'Mention stock' },
    ],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmHero data={ctx.data.gaming} /> : nothing()),
  },
  {
    type: 'gaming.rgbbar',
    label: 'Barre RGB',
    group: 'Gaming',
    icon: 'Minus',
    pages: ['gaming'],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmRgbBar data={ctx.data.gaming} /> : nothing()),
  },
  {
    type: 'gaming.ticker',
    label: 'Bandeau des marques',
    group: 'Gaming',
    icon: 'Repeat',
    pages: ['gaming'],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmBrandTicker data={ctx.data.gaming} /> : nothing()),
  },
  {
    type: 'gaming.buildpath',
    label: 'Monter sa config',
    group: 'Gaming',
    icon: 'Wrench',
    pages: ['gaming'],
    texts: [
      { key: 'gm.build', label: 'Sur-titre' },
      { key: 'gm.buildTitle', label: 'Titre' },
      { key: 'gm.buildLede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmBuildPath data={ctx.data.gaming} /> : nothing()),
  },
  {
    type: 'gaming.collections',
    label: 'Collections (onglets)',
    group: 'Gaming',
    icon: 'LayoutList',
    pages: ['gaming'],
    texts: [
      { key: 'gm.cat', label: 'Sur-titre' },
      { key: 'gm.catTitle', label: 'Titre' },
      { key: 'gm.catLede', label: 'Accroche', area: true },
      { key: 'gm.top', label: 'Badge « top »' },
      { key: 'gm.see', label: 'Lien « voir tout »' },
    ],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmCollections data={ctx.data.gaming} /> : nothing()),
  },
  {
    type: 'gaming.why',
    label: 'Pourquoi nous (gaming)',
    group: 'Gaming',
    icon: 'ShieldCheck',
    pages: ['gaming'],
    texts: [
      { key: 'gm.why', label: 'Sur-titre' },
      { key: 'gm.whyTitle', label: 'Titre' },
      { key: 'gm.whyLede', label: 'Accroche', area: true },
      { key: 'gm.w1.t', label: 'Atout 1 — titre' },
      { key: 'gm.w1.p', label: 'Atout 1 — texte', area: true },
      { key: 'gm.w2.t', label: 'Atout 2 — titre' },
      { key: 'gm.w2.p', label: 'Atout 2 — texte', area: true },
      { key: 'gm.w3.t', label: 'Atout 3 — titre' },
      { key: 'gm.w3.p', label: 'Atout 3 — texte', area: true },
      { key: 'gm.w4.t', label: 'Atout 4 — titre' },
      { key: 'gm.w4.p', label: 'Atout 4 — texte', area: true },
    ],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmWhy data={ctx.data.gaming} /> : nothing()),
  },
  {
    type: 'gaming.cta',
    label: 'Appel à l’action (gaming)',
    group: 'Gaming',
    icon: 'Megaphone',
    pages: ['gaming'],
    texts: [
      { key: 'gm.ctaTitle', label: 'Titre' },
      { key: 'gm.ctaLede', label: 'Accroche', area: true },
      { key: 'gm.ctaBtn', label: 'Bouton' },
    ],
    render: ({ ctx }) => (ctx.data.gaming ? <EdGmCta data={ctx.data.gaming} /> : nothing()),
  },
]

/* ═════════════════════════ MARQUES & FICHE MARQUE ═════════════════════════ */

const BRANDS: EdSectionDef[] = [
  {
    type: 'brands.head',
    label: 'En-tête marques',
    group: 'Marques',
    icon: 'Heading1',
    pages: ['brands'],
    texts: [
      { key: 'bi.eyebrow', label: 'Sur-titre' },
      { key: 'bi.title', label: 'Titre' },
      { key: 'bi.lede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (ctx.data.brands ? <EdBiHead brands={ctx.data.brands} /> : nothing()),
  },
  {
    type: 'brands.groups',
    label: 'Marques par statut',
    group: 'Marques',
    icon: 'LayoutGrid',
    pages: ['brands'],
    texts: [
      { key: 'bi.own', label: 'Groupe — marques propres' },
      { key: 'bi.own.d', label: 'Groupe — marques propres (texte)', area: true },
      { key: 'bi.excl', label: 'Groupe — exclusivités' },
      { key: 'bi.excl.d', label: 'Groupe — exclusivités (texte)', area: true },
      { key: 'bi.off', label: 'Groupe — distributeur officiel' },
      { key: 'bi.off.d', label: 'Groupe — officiel (texte)', area: true },
      { key: 'bi.dist', label: 'Groupe — distribuées' },
      { key: 'bi.dist.d', label: 'Groupe — distribuées (texte)', area: true },
      { key: 'bi.refs', label: 'Mot « références »' },
      { key: 'bi.see', label: 'Libellé « voir »' },
    ],
    render: ({ ctx }) => (ctx.data.brands ? <EdBiGroups brands={ctx.data.brands} /> : nothing()),
  },
]

const BRAND_TMPL: EdSectionDef[] = [
  {
    type: 'brand.hero',
    label: 'Hero de la marque',
    group: 'Fiche marque',
    icon: 'Flag',
    pages: ['brand'],
    texts: [
      { key: 'bp.crumbTop', label: 'Fil d’Ariane' },
      { key: 'bp.badge', label: 'Badge de statut' },
      { key: 'bp.h1', label: 'Titre' },
      { key: 'bp.lede', label: 'Accroche', area: true },
      { key: 'bp.lines', label: 'Libellé des gammes' },
      { key: 'bp.cta1', label: 'Bouton 1' },
      { key: 'bp.cta2', label: 'Bouton 2' },
      { key: 'bp.since', label: 'Mention « depuis »' },
    ],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrHero data={ctx.data.brand} /> : nothing()),
  },
  {
    type: 'brand.statband',
    label: 'Bandeau de chiffres',
    group: 'Fiche marque',
    icon: 'BarChart3',
    pages: ['brand'],
    texts: [
      { key: 'bp.st1', label: 'Chiffre 1' },
      { key: 'bp.st2', label: 'Chiffre 2' },
      { key: 'bp.st3', label: 'Chiffre 3' },
      { key: 'bp.st4', label: 'Chiffre 4' },
      { key: 'bp.st4d', label: 'Chiffre 4 — détail' },
    ],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrStatBand data={ctx.data.brand} /> : nothing()),
  },
  {
    type: 'brand.why',
    label: 'Pourquoi cette marque',
    group: 'Fiche marque',
    icon: 'Sparkles',
    pages: ['brand'],
    texts: [
      { key: 'bp.why', label: 'Sur-titre' },
      { key: 'bp.whyTitle', label: 'Titre' },
      { key: 'bp.whyLede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrWhy data={ctx.data.brand} /> : nothing()),
  },
  {
    type: 'brand.cats',
    label: 'Familles de la marque',
    group: 'Fiche marque',
    icon: 'Grid2x2',
    pages: ['brand'],
    texts: [
      { key: 'bp.cats', label: 'Sur-titre' },
      { key: 'bp.catsTitle', label: 'Titre' },
      { key: 'bp.catsLede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrCats data={ctx.data.brand} /> : nothing()),
  },
  {
    type: 'brand.selection',
    label: 'Sélection de produits',
    group: 'Fiche marque',
    icon: 'Package',
    pages: ['brand'],
    texts: [
      { key: 'bp.prods', label: 'Sur-titre' },
      { key: 'bp.prodsTitle', label: 'Titre' },
      { key: 'bp.prodsAll', label: 'Lien « tout voir »' },
    ],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrSelection data={ctx.data.brand} /> : nothing()),
  },
  {
    type: 'brand.faq',
    label: 'Questions fréquentes',
    group: 'Fiche marque',
    icon: 'HelpCircle',
    pages: ['brand'],
    texts: [
      { key: 'bp.faq', label: 'Sur-titre' },
      { key: 'bp.faqTitle', label: 'Titre' },
      { key: 'bp.faqLede', label: 'Accroche', area: true },
      { key: 'bp.q1', label: 'Question 1' },
      { key: 'bp.a1', label: 'Réponse 1', area: true },
      { key: 'bp.q2', label: 'Question 2' },
      { key: 'bp.a2', label: 'Réponse 2', area: true },
      { key: 'bp.q3', label: 'Question 3' },
      { key: 'bp.a3', label: 'Réponse 3', area: true },
      { key: 'bp.q4', label: 'Question 4' },
      { key: 'bp.a4', label: 'Réponse 4', area: true },
    ],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrFaq data={ctx.data.brand} /> : nothing()),
  },
  {
    type: 'brand.cta',
    label: 'Appel à l’action (marque)',
    group: 'Fiche marque',
    icon: 'Megaphone',
    pages: ['brand'],
    texts: [
      { key: 'bp.ctaTitle', label: 'Titre' },
      { key: 'bp.ctaLede', label: 'Accroche', area: true },
      { key: 'bp.ctaBtn', label: 'Bouton' },
    ],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrCta data={ctx.data.brand} /> : nothing()),
  },
  {
    type: 'brand.others',
    label: 'Autres marques',
    group: 'Fiche marque',
    icon: 'MoreHorizontal',
    pages: ['brand'],
    texts: [{ key: 'bp.other', label: 'Sur-titre' }],
    render: ({ ctx }) => (ctx.data.brand ? <EdBrOthers data={ctx.data.brand} /> : nothing()),
  },
]

/* ═══════════════ PAGES FONCTIONNELLES (rendues côté serveur) ═══════════════ */

/**
 * Certaines pages sont des applications, pas des articles : le moteur de
 * recherche produits, la fiche produit, les formulaires. Elles sont rendues
 * côté serveur et injectées telles quelles. On peut les masquer, les styler et
 * ajouter des sections autour, mais leur intérieur reste piloté par le
 * catalogue — c'est voulu : réordonner une grille de résultats n'a pas de sens.
 */
const SLOT_SECTIONS: EdSectionDef[] = [
  {
    type: 'slot.products',
    label: 'Moteur du catalogue',
    group: 'Boutique',
    icon: 'Search',
    desc: 'Filtres, tri, grille de résultats et pagination.',
    pages: ['products'],
    locked: true,
    texts: [
      { key: 'pf.eyebrow', label: 'Sur-titre' },
      { key: 'pf.title', label: 'Titre' },
      { key: 'pf.lede', label: 'Accroche', area: true },
      { key: 'pf.filters', label: 'Libellé « filtres »' },
      { key: 'pf.search', label: 'Champ de recherche' },
      { key: 'pf.featured', label: 'Filtre « en vedette »' },
      { key: 'pf.cats', label: 'Libellé « familles »' },
      { key: 'pf.allCats', label: 'Libellé « toutes les familles »' },
      { key: 'pf.results', label: 'Libellé « résultats »' },
      { key: 'pf.none', label: 'Message aucun résultat' },
      { key: 'pf.reset', label: 'Bouton réinitialiser' },
    ],
    render: ({ ctx }) => ctx.slots.body ?? null,
  },
  {
    type: 'slot.product',
    label: 'Fiche produit',
    group: 'Boutique',
    icon: 'Package',
    desc: 'Galerie, description, caractéristiques, produits similaires, avis.',
    pages: ['product'],
    locked: true,
    texts: [
      { key: 'pdp.back', label: 'Lien retour' },
      { key: 'pdp.order', label: 'Bouton WhatsApp' },
      { key: 'pdp.addcart', label: 'Bouton panier' },
      { key: 'pdp.specs', label: 'Titre caractéristiques' },
      { key: 'pdp.details', label: 'Titre détails' },
    ],
    render: ({ ctx }) => ctx.slots.body ?? null,
  },
  {
    type: 'slot.search',
    label: 'Résultats de recherche',
    group: 'Boutique',
    icon: 'Search',
    pages: ['search'],
    locked: true,
    render: ({ ctx }) => ctx.slots.body ?? null,
  },
  {
    type: 'slot.inquiry',
    label: 'Formulaire de devis',
    group: 'Utilitaires',
    icon: 'FileText',
    pages: ['inquiry'],
    locked: true,
    render: ({ ctx }) => ctx.slots.body ?? null,
  },
  {
    type: 'slot.legal',
    label: 'Texte légal',
    group: 'Utilitaires',
    icon: 'Scale',
    pages: ['legal'],
    locked: true,
    render: ({ ctx }) => ctx.slots.body ?? null,
  },
  {
    type: 'slot.notfound',
    label: 'Contenu 404',
    group: 'Utilitaires',
    icon: 'FileQuestion',
    pages: ['notfound'],
    locked: true,
    render: ({ ctx }) => ctx.slots.body ?? null,
  },
]

/* ═════════════════════════════ EN-TÊTES DE PAGE ═════════════════════════════ */

const HEADS: EdSectionDef[] = [
  {
    type: 'page.head',
    label: 'En-tête de page',
    group: 'Contenu',
    icon: 'Heading1',
    desc: 'Sur-titre, grand titre et accroche — le chapeau standard du site.',
    addable: true,
    fields: [
      { key: 'eyebrow', label: 'Sur-titre', type: 'text', localized: true },
      { key: 'title', label: 'Titre', type: 'text', localized: true },
      { key: 'sub', label: 'Accroche', type: 'textarea', localized: true },
    ],
    defaults: { title: { fr: 'Titre de la page' } },
    render: ({ node, ctx }) => {
      const pick = (key: string): string | undefined => {
        const raw = node.props?.[key]
        if (typeof raw === 'string') return raw || undefined
        if (raw && typeof raw === 'object') {
          const v = (raw as Record<string, string>)[ctx.locale]
          return v || undefined
        }
        return undefined
      }
      return <PageHead eyebrow={pick('eyebrow')} title={pick('title') ?? ''} sub={pick('sub')} />
    },
  },
  {
    type: 'about.head',
    label: 'En-tête « À propos »',
    group: 'Contenu',
    icon: 'Info',
    pages: ['about'],
    texts: [
      { key: 'hero.tag', label: 'Sur-titre' },
      { key: 'nav.why', label: 'Titre' },
      { key: 'hero.lede', label: 'Accroche', area: true },
    ],
    render: ({ ctx }) => (
      <PageHead eyebrow={ctx.t('hero.tag')} title={ctx.t('nav.why')} sub={ctx.t('hero.lede')} />
    ),
  },
  {
    type: 'content.productGrid',
    label: 'Grille de produits',
    group: 'Contenu',
    icon: 'Grid3x3',
    desc: 'Une grille de fiches produit alimentée par le catalogue réel.',
    pages: ['search'],
    render: ({ ctx }) => {
      const g = ctx.data.grid
      if (!g) return null
      return (
        <EdGridPage
          eyebrow={g.eyebrow}
          title={g.title}
          sub={g.sub}
          products={g.products}
          emptyLabel={g.empty}
        />
      )
    },
  },
]

export const ED_SITE_SECTIONS: EdSectionDef[] = [
  ...HOME,
  ...CATALOGUE,
  ...CONTACT,
  ...COMPANY,
  ...GAMING,
  ...BRANDS,
  ...BRAND_TMPL,
  ...SLOT_SECTIONS,
  ...HEADS,
]
