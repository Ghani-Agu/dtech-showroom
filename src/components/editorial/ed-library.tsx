'use client'

/**
 * ÉDITEUR — la bibliothèque de sections et de composants ajoutables.
 *
 * Ce sont les blocs « en plus » : ils n'existent pas encore sur le site, on les
 * pose où l'on veut, sur n'importe quelle page. Tout est écrit avec les jetons
 * de la peau Éditorial (`--ink`, `--teal`, `--r`, `.wrap`, `.eyebrow`, `.h2`,
 * `.lede`, `.btn`) : un bloc ajouté ressemble au site, pas à un widget collé.
 *
 * Deux règles tenues partout ici :
 *   · propriétés logiques (`margin-inline`, `text-align: start`) → /ar reste
 *     correct sans une seule règle en double ;
 *   · aucune animation infinie, aucun filtre au repos → rien à payer au
 *     défilement (voir les notes de performance du projet).
 */

import Image from 'next/image'
import type { ReactNode } from 'react'
import { Link } from '@/i18n/routing'
import type { EdBlockDef, EdRenderCtx, EdSectionDef } from './ed-ctx'
import type { EdLocale, EdNode } from '@/lib/ed-editor/model'
import { sanitizeHtml } from '@/lib/ed-editor/model'
import { EIcon } from './editorial-icons'
import { NewsletterSignup } from '@/components/forms/NewsletterSignup'

/* ───────────────────────────── lecture des réglages ───────────────────────── */

/** Une valeur peut être une chaîne simple ou un objet { fr, en, ar }. */
export function pickStr(value: unknown, locale: EdLocale, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>
    const hit = rec[locale] ?? rec.fr ?? rec.en ?? rec.ar
    if (typeof hit === 'string') return hit
  }
  return fallback
}

const str = (node: EdNode, key: string, locale: EdLocale, fallback = '') =>
  pickStr(node.props?.[key], locale, fallback)

const num = (node: EdNode, key: string, fallback: number) => {
  const v = node.props?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

const bool = (node: EdNode, key: string, fallback = false) => {
  const v = node.props?.[key]
  return typeof v === 'boolean' ? v : fallback
}

const list = (node: EdNode, key: string): Record<string, unknown>[] => {
  const v = node.props?.[key]
  if (!Array.isArray(v)) return []
  return v.filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
}

/** Un lien interne passe par `Link` (locale préservée), un lien externe non. */
function Anchor({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  if (!href) return <span className={className}>{children}</span>
  const external = /^(https?:|mailto:|tel:)/i.test(href)
  if (external) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  )
}

/** Le chapeau commun des blocs : sur-titre + titre + accroche. */
function BlockHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string
  title?: string
  lede?: string
}) {
  if (!eyebrow && !title && !lede) return null
  return (
    <div className="edx-head rv">
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      {title ? <h2 className="h2">{title}</h2> : null}
      {lede ? <p className="lede">{lede}</p> : null}
    </div>
  )
}

/** Champs de chapeau réutilisés par presque tous les blocs. */
const HEAD_FIELDS = [
  { key: 'eyebrow', label: 'Sur-titre', type: 'text' as const, localized: true },
  { key: 'title', label: 'Titre', type: 'text' as const, localized: true },
  { key: 'lede', label: 'Accroche', type: 'textarea' as const, localized: true },
]

const COLS_FIELD = {
  key: 'cols',
  label: 'Colonnes',
  type: 'number' as const,
  min: 1,
  max: 6,
  step: 1,
}

const head = (node: EdNode, ctx: EdRenderCtx) => ({
  eyebrow: str(node, 'eyebrow', ctx.locale) || undefined,
  title: str(node, 'title', ctx.locale) || undefined,
  lede: str(node, 'lede', ctx.locale) || undefined,
})

/* ════════════════════════════ SECTIONS ════════════════════════════ */

const CONTENT: EdSectionDef[] = [
  {
    type: 'lib.heading',
    label: 'Titre de section',
    group: 'Contenu',
    icon: 'Heading2',
    desc: 'Un sur-titre, un grand titre et une accroche, centrés ou alignés.',
    addable: true,
    fields: [...HEAD_FIELDS],
    defaults: { title: { fr: 'Un titre qui pose la section' } },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
        </div>
      </section>
    ),
  },
  {
    type: 'lib.text',
    label: 'Texte',
    group: 'Contenu',
    icon: 'AlignLeft',
    desc: 'Un ou plusieurs paragraphes. Une ligne vide crée un paragraphe.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      { key: 'body', label: 'Texte', type: 'textarea', localized: true },
      {
        key: 'width',
        label: 'Largeur du texte (caractères)',
        type: 'number',
        min: 30,
        max: 120,
        step: 1,
      },
    ],
    defaults: {
      body: {
        fr: 'Écrivez ici. Laissez une ligne vide pour commencer un nouveau paragraphe.',
      },
      width: 68,
    },
    render: ({ node, ctx }) => {
      const body = str(node, 'body', ctx.locale)
      return (
        <section className="sec edx">
          <div className="wrap">
            <BlockHead {...head(node, ctx)} />
            <div
              className="edx-prose rv"
              style={{ ['--edx-ch' as string]: `${num(node, 'width', 68)}ch` }}
            >
              {body
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </div>
        </section>
      )
    },
  },
  {
    type: 'lib.imageText',
    label: 'Image + texte',
    group: 'Contenu',
    icon: 'Columns2',
    desc: 'Une image d’un côté, le texte de l’autre.',
    addable: true,
    fields: [
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'alt', label: 'Texte alternatif', type: 'text' },
      {
        key: 'side',
        label: 'Position de l’image',
        type: 'select',
        options: [
          { value: 'start', label: 'Au début' },
          { value: 'end', label: 'À la fin' },
        ],
      },
      ...HEAD_FIELDS,
      { key: 'body', label: 'Texte', type: 'textarea', localized: true },
      { key: 'ctaLabel', label: 'Bouton — libellé', type: 'text', localized: true },
      { key: 'ctaHref', label: 'Bouton — lien', type: 'link' },
    ],
    defaults: { side: 'start', title: { fr: 'Un titre à côté de l’image' } },
    render: ({ node, ctx }) => {
      const image = str(node, 'image', ctx.locale)
      const label = str(node, 'ctaLabel', ctx.locale)
      const href = str(node, 'ctaHref', ctx.locale)
      return (
        <section className="sec edx">
          <div className="wrap">
            <div className={`edx-split rv${str(node, 'side', ctx.locale) === 'end' ? ' is-end' : ''}`}>
              <div className="edx-split-media">
                {image ? (
                  <Image
                    src={image}
                    alt={str(node, 'alt', ctx.locale)}
                    fill
                    sizes="(max-width: 900px) 92vw, 520px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <span className="edx-ph">Image</span>
                )}
              </div>
              <div className="edx-split-body">
                <BlockHead {...head(node, ctx)} />
                <div className="edx-prose">
                  {str(node, 'body', ctx.locale)
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                </div>
                {label ? (
                  <Anchor className="btn btn-k edx-cta" href={href}>
                    {label}
                  </Anchor>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )
    },
  },
  {
    type: 'lib.features',
    label: 'Atouts (icône + texte)',
    group: 'Contenu',
    icon: 'Sparkles',
    desc: 'Une grille de cartes avec une icône, un titre et un texte.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      COLS_FIELD,
      {
        key: 'items',
        label: 'Atouts',
        type: 'list',
        addLabel: 'Ajouter un atout',
        itemFields: [
          {
            key: 'icon',
            label: 'Icône',
            type: 'select',
            options: [
              'bolt',
              'shield',
              'truck',
              'wrench',
              'check',
              'globe',
              'clock',
              'chat',
              'cart',
              'pin',
              'mail',
              'tel',
              'gaming',
              'network',
              'parts',
            ].map((v) => ({ value: v, label: v })),
          },
          { key: 'title', label: 'Titre', type: 'text', localized: true },
          { key: 'text', label: 'Texte', type: 'textarea', localized: true },
        ],
      },
    ],
    defaults: {
      cols: 3,
      title: { fr: 'Ce qui fait la différence' },
      items: [
        { icon: 'bolt', title: { fr: 'Disponible' }, text: { fr: 'Le stock est réel.' } },
        { icon: 'shield', title: { fr: 'Garanti' }, text: { fr: 'Une garantie qui répond.' } },
        { icon: 'truck', title: { fr: 'Livré' }, text: { fr: 'Partout en Algérie.' } },
      ],
    },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div
            className="edx-grid rv"
            style={{ ['--edx-cols' as string]: String(num(node, 'cols', 3)) }}
          >
            {list(node, 'items').map((it, i) => (
              <article className="edx-card stag" key={i} style={{ ['--i' as string]: String(i) }}>
                <span className="edx-ic">
                  <EIcon n={pickStr(it.icon, ctx.locale, 'check')} s={20} />
                </span>
                <h3>{pickStr(it.title, ctx.locale)}</h3>
                <p>{pickStr(it.text, ctx.locale)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.steps',
    label: 'Étapes numérotées',
    group: 'Contenu',
    icon: 'ListOrdered',
    desc: 'Une marche à suivre, numérotée.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      {
        key: 'items',
        label: 'Étapes',
        type: 'list',
        addLabel: 'Ajouter une étape',
        itemFields: [
          { key: 'title', label: 'Titre', type: 'text', localized: true },
          { key: 'text', label: 'Texte', type: 'textarea', localized: true },
        ],
      },
    ],
    defaults: {
      title: { fr: 'Comment ça se passe' },
      items: [
        { title: { fr: 'Vous décrivez le besoin' }, text: { fr: 'Par téléphone ou WhatsApp.' } },
        { title: { fr: 'On propose' }, text: { fr: 'Une configuration et un devis.' } },
        { title: { fr: 'On livre' }, text: { fr: 'Testé, garanti, partout.' } },
      ],
    },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <ol className="edx-steps rv">
            {list(node, 'items').map((it, i) => (
              <li className="stag" key={i} style={{ ['--i' as string]: String(i) }}>
                <b className="edx-stepn">{String(i + 1).padStart(2, '0')}</b>
                <div>
                  <h3>{pickStr(it.title, ctx.locale)}</h3>
                  <p>{pickStr(it.text, ctx.locale)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.faq',
    label: 'Questions fréquentes',
    group: 'Contenu',
    icon: 'HelpCircle',
    desc: 'Une liste de questions dépliantes.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      {
        key: 'items',
        label: 'Questions',
        type: 'list',
        addLabel: 'Ajouter une question',
        itemFields: [
          { key: 'q', label: 'Question', type: 'text', localized: true },
          { key: 'a', label: 'Réponse', type: 'textarea', localized: true },
        ],
      },
    ],
    defaults: {
      title: { fr: 'Questions fréquentes' },
      items: [
        {
          q: { fr: 'Livrez-vous partout en Algérie ?' },
          a: { fr: 'Oui, les 58 wilayas sont couvertes.' },
        },
      ],
    },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div className="edx-faq rv">
            {list(node, 'items').map((it, i) => (
              <details className="edx-faqrow" key={i}>
                <summary>
                  <span>{pickStr(it.q, ctx.locale)}</span>
                  <i aria-hidden>
                    <EIcon n="plus" s={16} />
                  </i>
                </summary>
                <p>{pickStr(it.a, ctx.locale)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.testimonials',
    label: 'Témoignages',
    group: 'Preuve',
    icon: 'Quote',
    desc: 'Des citations de clients, en cartes.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      COLS_FIELD,
      {
        key: 'items',
        label: 'Témoignages',
        type: 'list',
        addLabel: 'Ajouter un témoignage',
        itemFields: [
          { key: 'quote', label: 'Citation', type: 'textarea', localized: true },
          { key: 'name', label: 'Nom', type: 'text' },
          { key: 'role', label: 'Fonction / société', type: 'text', localized: true },
          { key: 'image', label: 'Photo', type: 'image' },
        ],
      },
    ],
    defaults: {
      cols: 3,
      title: { fr: 'Ce que disent nos clients' },
      items: [{ quote: { fr: 'Une équipe qui répond après la facture.' }, name: 'Client' }],
    },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div
            className="edx-grid rv"
            style={{ ['--edx-cols' as string]: String(num(node, 'cols', 3)) }}
          >
            {list(node, 'items').map((it, i) => {
              const img = pickStr(it.image, ctx.locale)
              return (
                <figure className="edx-quote stag" key={i} style={{ ['--i' as string]: String(i) }}>
                  <blockquote>{pickStr(it.quote, ctx.locale)}</blockquote>
                  <figcaption>
                    {img ? (
                      <span className="edx-avatar">
                        <Image src={img} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />
                      </span>
                    ) : null}
                    <span>
                      <b>{pickStr(it.name, ctx.locale)}</b>
                      <i>{pickStr(it.role, ctx.locale)}</i>
                    </span>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.stats',
    label: 'Chiffres clés',
    group: 'Preuve',
    icon: 'BarChart3',
    desc: 'Une rangée de nombres avec leur légende.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      {
        key: 'items',
        label: 'Chiffres',
        type: 'list',
        addLabel: 'Ajouter un chiffre',
        itemFields: [
          { key: 'value', label: 'Valeur', type: 'text' },
          { key: 'label', label: 'Légende', type: 'text', localized: true },
        ],
      },
    ],
    defaults: {
      items: [
        { value: '2006', label: { fr: 'Depuis' } },
        { value: '58', label: { fr: 'Wilayas livrées' } },
        { value: '20+', label: { fr: 'Marques' } },
      ],
    },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div className="edx-stats rv">
            {list(node, 'items').map((it, i) => (
              <div className="stag" key={i} style={{ ['--i' as string]: String(i) }}>
                <b>{pickStr(it.value, ctx.locale)}</b>
                <span>{pickStr(it.label, ctx.locale)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.pricing',
    label: 'Offres / tarifs',
    group: 'Preuve',
    icon: 'CreditCard',
    desc: 'Des cartes d’offre, avec liste de points et bouton.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      COLS_FIELD,
      {
        key: 'items',
        label: 'Offres',
        type: 'list',
        addLabel: 'Ajouter une offre',
        itemFields: [
          { key: 'name', label: 'Nom', type: 'text', localized: true },
          { key: 'price', label: 'Prix / mention', type: 'text', localized: true },
          { key: 'note', label: 'Sous-titre', type: 'text', localized: true },
          {
            key: 'lines',
            label: 'Points inclus (un par ligne)',
            type: 'textarea',
            localized: true,
          },
          { key: 'ctaLabel', label: 'Bouton', type: 'text', localized: true },
          { key: 'ctaHref', label: 'Lien', type: 'link' },
          { key: 'featured', label: 'Mise en avant', type: 'switch' },
        ],
      },
    ],
    defaults: {
      cols: 3,
      title: { fr: 'Nos formules' },
      items: [
        {
          name: { fr: 'Essentiel' },
          price: { fr: 'Sur devis' },
          lines: { fr: 'Matériel testé\nGarantie 12 mois\nLivraison 58 wilayas' },
          ctaLabel: { fr: 'Demander' },
          ctaHref: '/contact',
        },
      ],
    },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div
            className="edx-grid rv"
            style={{ ['--edx-cols' as string]: String(num(node, 'cols', 3)) }}
          >
            {list(node, 'items').map((it, i) => {
              const label = pickStr(it.ctaLabel, ctx.locale)
              return (
                <article
                  className={`edx-price stag${it.featured === true ? ' is-on' : ''}`}
                  key={i}
                  style={{ ['--i' as string]: String(i) }}
                >
                  <h3>{pickStr(it.name, ctx.locale)}</h3>
                  <b className="edx-pricev">{pickStr(it.price, ctx.locale)}</b>
                  <span className="edx-pricen">{pickStr(it.note, ctx.locale)}</span>
                  <ul>
                    {pickStr(it.lines, ctx.locale)
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .map((l, k) => (
                        <li key={k}>
                          <EIcon n="check" s={15} />
                          <span>{l}</span>
                        </li>
                      ))}
                  </ul>
                  {label ? (
                    <Anchor className="btn btn-k" href={pickStr(it.ctaHref, ctx.locale)}>
                      {label}
                    </Anchor>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.team',
    label: 'Équipe',
    group: 'Preuve',
    icon: 'Users',
    desc: 'Les personnes, avec photo et fonction.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      COLS_FIELD,
      {
        key: 'items',
        label: 'Membres',
        type: 'list',
        addLabel: 'Ajouter une personne',
        itemFields: [
          { key: 'image', label: 'Photo', type: 'image' },
          { key: 'name', label: 'Nom', type: 'text' },
          { key: 'role', label: 'Fonction', type: 'text', localized: true },
        ],
      },
    ],
    defaults: { cols: 4, title: { fr: 'L’équipe' } },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div
            className="edx-grid rv"
            style={{ ['--edx-cols' as string]: String(num(node, 'cols', 4)) }}
          >
            {list(node, 'items').map((it, i) => {
              const img = pickStr(it.image, ctx.locale)
              return (
                <article className="edx-person stag" key={i} style={{ ['--i' as string]: String(i) }}>
                  <span className="edx-portrait">
                    {img ? (
                      <Image src={img} alt="" fill sizes="220px" style={{ objectFit: 'cover' }} />
                    ) : (
                      <span className="edx-ph">Photo</span>
                    )}
                  </span>
                  <b>{pickStr(it.name, ctx.locale)}</b>
                  <i>{pickStr(it.role, ctx.locale)}</i>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    ),
  },
]

const MEDIA: EdSectionDef[] = [
  {
    type: 'lib.gallery',
    label: 'Galerie d’images',
    group: 'Média',
    icon: 'Images',
    desc: 'Une grille de photos, avec légendes facultatives.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      COLS_FIELD,
      {
        key: 'ratio',
        label: 'Format des vignettes',
        type: 'select',
        options: [
          { value: '1/1', label: 'Carré' },
          { value: '4/3', label: '4:3' },
          { value: '16/9', label: '16:9' },
          { value: '3/4', label: 'Portrait' },
        ],
      },
      {
        key: 'items',
        label: 'Images',
        type: 'list',
        addLabel: 'Ajouter une image',
        itemFields: [
          { key: 'src', label: 'Image', type: 'image' },
          { key: 'caption', label: 'Légende', type: 'text', localized: true },
          { key: 'href', label: 'Lien', type: 'link' },
        ],
      },
    ],
    defaults: { cols: 3, ratio: '4/3' },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div
            className="edx-gal rv"
            style={{
              ['--edx-cols' as string]: String(num(node, 'cols', 3)),
              ['--edx-ratio' as string]: str(node, 'ratio', ctx.locale, '4/3'),
            }}
          >
            {list(node, 'items').map((it, i) => {
              const src = pickStr(it.src, ctx.locale)
              const cap = pickStr(it.caption, ctx.locale)
              const href = pickStr(it.href, ctx.locale)
              const body = (
                <>
                  <span className="edx-galimg">
                    {src ? (
                      <Image
                        src={src}
                        alt={cap}
                        fill
                        sizes="(max-width: 700px) 90vw, 380px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="edx-ph">Image</span>
                    )}
                  </span>
                  {cap ? <span className="edx-galcap">{cap}</span> : null}
                </>
              )
              return href ? (
                <Anchor className="edx-galitem stag" href={href} key={i}>
                  {body}
                </Anchor>
              ) : (
                <span className="edx-galitem stag" key={i}>
                  {body}
                </span>
              )
            })}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.logos',
    label: 'Mur de logos',
    group: 'Média',
    icon: 'Grid2x2',
    desc: 'Des logos partenaires ou clients, alignés.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      COLS_FIELD,
      {
        key: 'items',
        label: 'Logos',
        type: 'list',
        addLabel: 'Ajouter un logo',
        itemFields: [
          { key: 'src', label: 'Logo', type: 'image' },
          { key: 'name', label: 'Nom', type: 'text' },
          { key: 'href', label: 'Lien', type: 'link' },
        ],
      },
    ],
    defaults: { cols: 6 },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div
            className="edx-logos rv"
            style={{ ['--edx-cols' as string]: String(num(node, 'cols', 6)) }}
          >
            {list(node, 'items').map((it, i) => {
              const src = pickStr(it.src, ctx.locale)
              const name = pickStr(it.name, ctx.locale)
              const inner = src ? (
                <Image src={src} alt={name} fill sizes="140px" style={{ objectFit: 'contain' }} />
              ) : (
                <span className="edx-ph">{name || 'Logo'}</span>
              )
              const href = pickStr(it.href, ctx.locale)
              return href ? (
                <Anchor className="edx-logo" href={href} key={i}>
                  {inner}
                </Anchor>
              ) : (
                <span className="edx-logo" key={i}>
                  {inner}
                </span>
              )
            })}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.video',
    label: 'Vidéo',
    group: 'Média',
    icon: 'Play',
    desc: 'Une vidéo YouTube, Vimeo ou un fichier hébergé.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      {
        key: 'url',
        label: 'Adresse de la vidéo',
        type: 'text',
        placeholder: 'https://www.youtube.com/watch?v=…',
      },
      {
        key: 'ratio',
        label: 'Format',
        type: 'select',
        options: [
          { value: '16/9', label: '16:9' },
          { value: '4/3', label: '4:3' },
          { value: '1/1', label: 'Carré' },
          { value: '9/16', label: 'Vertical' },
        ],
      },
    ],
    defaults: { ratio: '16/9' },
    render: ({ node, ctx }) => {
      const url = str(node, 'url', ctx.locale).trim()
      const ratio = str(node, 'ratio', ctx.locale, '16/9')
      const embed = toEmbedUrl(url)
      return (
        <section className="sec edx">
          <div className="wrap">
            <BlockHead {...head(node, ctx)} />
            <div className="edx-video rv" style={{ ['--edx-ratio' as string]: ratio }}>
              {embed ? (
                <iframe
                  src={embed}
                  title={str(node, 'title', ctx.locale, 'Vidéo')}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : url ? (
                <video src={url} controls playsInline preload="metadata" />
              ) : (
                <span className="edx-ph">Collez l’adresse d’une vidéo</span>
              )}
            </div>
          </div>
        </section>
      )
    },
  },
  {
    type: 'lib.map',
    label: 'Carte',
    group: 'Média',
    icon: 'MapPin',
    desc: 'Une carte Google centrée sur une adresse.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      { key: 'query', label: 'Adresse', type: 'text', placeholder: 'Bab Ezzouar, Alger' },
      { key: 'height', label: 'Hauteur (px)', type: 'number', min: 200, max: 900, step: 10 },
    ],
    defaults: { query: 'Bab Ezzouar, Alger', height: 420 },
    render: ({ node, ctx }) => {
      const q = str(node, 'query', ctx.locale).trim()
      return (
        <section className="sec edx">
          <div className="wrap">
            <BlockHead {...head(node, ctx)} />
            <div className="edx-map rv" style={{ height: `${num(node, 'height', 420)}px` }}>
              {q ? (
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`}
                  title={q}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <span className="edx-ph">Indiquez une adresse</span>
              )}
            </div>
          </div>
        </section>
      )
    },
  },
]

const ACTION: EdSectionDef[] = [
  {
    type: 'lib.cta',
    label: 'Appel à l’action',
    group: 'Action',
    icon: 'Megaphone',
    desc: 'Un bandeau avec un titre fort et un ou deux boutons.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      { key: 'primaryLabel', label: 'Bouton 1 — libellé', type: 'text', localized: true },
      { key: 'primaryHref', label: 'Bouton 1 — lien', type: 'link' },
      { key: 'secondaryLabel', label: 'Bouton 2 — libellé', type: 'text', localized: true },
      { key: 'secondaryHref', label: 'Bouton 2 — lien', type: 'link' },
      { key: 'dark', label: 'Fond sombre', type: 'switch' },
    ],
    defaults: {
      title: { fr: 'Parlons de votre projet.' },
      primaryLabel: { fr: 'Nous contacter' },
      primaryHref: '/contact',
      dark: true,
    },
    render: ({ node, ctx }) => {
      const p = str(node, 'primaryLabel', ctx.locale)
      const s = str(node, 'secondaryLabel', ctx.locale)
      const dark = bool(node, 'dark', true)
      return (
        <section
          className={`edx-cta${dark ? ' is-dark' : ''}`}
          {...(dark ? { 'data-band': 'dark' } : {})}
        >
          <div className="wrap rv">
            <BlockHead {...head(node, ctx)} />
            <div className="edx-ctabtns">
              {p ? (
                <Anchor className="btn btn-w" href={str(node, 'primaryHref', ctx.locale)}>
                  {p}
                </Anchor>
              ) : null}
              {s ? (
                <Anchor className="btn btn-g" href={str(node, 'secondaryHref', ctx.locale)}>
                  {s}
                </Anchor>
              ) : null}
            </div>
          </div>
        </section>
      )
    },
  },
  {
    type: 'lib.banner',
    label: 'Bandeau d’annonce',
    group: 'Action',
    icon: 'Flag',
    desc: 'Une ligne courte, pleine largeur, pour une annonce.',
    addable: true,
    fields: [
      { key: 'text', label: 'Texte', type: 'text', localized: true },
      { key: 'linkLabel', label: 'Lien — libellé', type: 'text', localized: true },
      { key: 'linkHref', label: 'Lien — adresse', type: 'link' },
      {
        key: 'icon',
        label: 'Icône',
        type: 'select',
        options: ['bolt', 'truck', 'shield', 'check', 'clock', 'chat'].map((v) => ({
          value: v,
          label: v,
        })),
      },
    ],
    defaults: { text: { fr: 'Livraison dans les 58 wilayas.' }, icon: 'truck' },
    render: ({ node, ctx }) => {
      const label = str(node, 'linkLabel', ctx.locale)
      return (
        <div className="edx-banner">
          <div className="wrap">
            <EIcon n={str(node, 'icon', ctx.locale, 'bolt')} s={16} />
            <span>{str(node, 'text', ctx.locale)}</span>
            {label ? (
              <Anchor className="edx-bannerlink" href={str(node, 'linkHref', ctx.locale)}>
                {label}
              </Anchor>
            ) : null}
          </div>
        </div>
      )
    },
  },
  {
    type: 'lib.contact',
    label: 'Cartes de contact',
    group: 'Action',
    icon: 'Phone',
    desc: 'Téléphone, e-mail, WhatsApp — en cartes cliquables.',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      COLS_FIELD,
      {
        key: 'items',
        label: 'Cartes',
        type: 'list',
        addLabel: 'Ajouter une carte',
        itemFields: [
          {
            key: 'icon',
            label: 'Icône',
            type: 'select',
            options: ['tel', 'mail', 'chat', 'pin', 'clock', 'globe'].map((v) => ({
              value: v,
              label: v,
            })),
          },
          { key: 'label', label: 'Libellé', type: 'text', localized: true },
          { key: 'value', label: 'Valeur affichée', type: 'text' },
          { key: 'href', label: 'Lien', type: 'link' },
        ],
      },
    ],
    defaults: {
      cols: 3,
      items: [
        { icon: 'tel', label: { fr: 'Commercial' }, value: '0560 99 05 06', href: 'tel:0560990506' },
        {
          icon: 'mail',
          label: { fr: 'E-mail' },
          value: 'contact@dtech.dz',
          href: 'mailto:contact@dtech.dz',
        },
      ],
    },
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div
            className="edx-grid rv"
            style={{ ['--edx-cols' as string]: String(num(node, 'cols', 3)) }}
          >
            {list(node, 'items').map((it, i) => (
              <Anchor className="edx-contact stag" href={pickStr(it.href, ctx.locale)} key={i}>
                <span className="edx-ic">
                  <EIcon n={pickStr(it.icon, ctx.locale, 'tel')} s={19} />
                </span>
                <b>{pickStr(it.label, ctx.locale)}</b>
                <i>{pickStr(it.value, ctx.locale)}</i>
              </Anchor>
            ))}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.newsletter',
    label: 'Inscription newsletter',
    group: 'Action',
    icon: 'Mail',
    desc: 'Le vrai formulaire d’inscription, relié aux campagnes.',
    addable: true,
    fields: [...HEAD_FIELDS],
    render: ({ node, ctx }) => (
      <section className="sec edx">
        <div className="wrap">
          <BlockHead {...head(node, ctx)} />
          <div className="edx-news rv">
            <NewsletterSignup variant="inline" source="editor-block" />
          </div>
        </div>
      </section>
    ),
  },
]

const LAYOUT: EdSectionDef[] = [
  {
    type: 'lib.columns',
    label: 'Colonnes libres',
    group: 'Mise en page',
    icon: 'Columns3',
    desc: 'Un conteneur : glissez-y des composants (titre, texte, bouton, image…).',
    addable: true,
    container: true,
    fields: [
      COLS_FIELD,
      {
        key: 'gap',
        label: 'Espacement (px)',
        type: 'number',
        min: 0,
        max: 80,
        step: 2,
      },
      {
        key: 'valign',
        label: 'Alignement vertical',
        type: 'select',
        options: [
          { value: 'start', label: 'En haut' },
          { value: 'center', label: 'Centré' },
          { value: 'stretch', label: 'Étiré' },
        ],
      },
    ],
    defaults: { cols: 2, gap: 28, valign: 'start' },
    render: ({ node, ctx, children }) => (
      <section className="sec edx">
        <div className="wrap">
          <div
            className="edx-cols"
            style={{
              ['--edx-cols' as string]: String(num(node, 'cols', 2)),
              ['--edx-gap' as string]: `${num(node, 'gap', 28)}px`,
              alignItems: str(node, 'valign', ctx.locale, 'start'),
            }}
            data-ed-slot="children"
          >
            {children}
            {node.children?.length ? null : (
              <span className="edx-ph edx-drop">Glissez un composant ici</span>
            )}
          </div>
        </div>
      </section>
    ),
  },
  {
    type: 'lib.spacer',
    label: 'Espace',
    group: 'Mise en page',
    icon: 'MoveVertical',
    desc: 'Un vide réglable entre deux sections.',
    addable: true,
    fields: [{ key: 'height', label: 'Hauteur (px)', type: 'number', min: 0, max: 400, step: 4 }],
    defaults: { height: 64 },
    render: ({ node }) => <div className="edx-spacer" style={{ height: num(node, 'height', 64) }} />,
  },
  {
    type: 'lib.divider',
    label: 'Séparateur',
    group: 'Mise en page',
    icon: 'Minus',
    desc: 'Un trait fin, avec ou sans libellé.',
    addable: true,
    fields: [
      { key: 'label', label: 'Libellé au centre', type: 'text', localized: true },
      {
        key: 'style',
        label: 'Style',
        type: 'select',
        options: [
          { value: 'line', label: 'Trait plein' },
          { value: 'dash', label: 'Tirets' },
          { value: 'dot', label: 'Points' },
        ],
      },
    ],
    defaults: { style: 'line' },
    render: ({ node, ctx }) => {
      const label = str(node, 'label', ctx.locale)
      return (
        <div className="wrap">
          <div className={`edx-div is-${str(node, 'style', ctx.locale, 'line')}`}>
            {label ? <span>{label}</span> : null}
          </div>
        </div>
      )
    },
  },
]

const ADVANCED: EdSectionDef[] = [
  {
    type: 'lib.html',
    label: 'Code HTML',
    group: 'Avancé',
    icon: 'Code',
    desc: 'Collez du HTML : il est inséré tel quel dans la page.',
    addable: true,
    fields: [
      {
        key: 'code',
        label: 'HTML',
        type: 'textarea',
        help: 'Les balises <script> et les gestionnaires on… sont retirés.',
      },
      { key: 'full', label: 'Pleine largeur', type: 'switch' },
    ],
    defaults: { code: '<p>Votre HTML ici.</p>' },
    render: ({ node, ctx }) => {
      const code = sanitizeHtml(str(node, 'code', ctx.locale))
      const inner = (
        <div className="edx-html sr-customhtml" dangerouslySetInnerHTML={{ __html: code }} />
      )
      return bool(node, 'full') ? (
        <section className="edx">{inner}</section>
      ) : (
        <section className="sec edx">
          <div className="wrap">{inner}</div>
        </section>
      )
    },
  },
  {
    type: 'lib.embed',
    label: 'Contenu externe (iframe)',
    group: 'Avancé',
    icon: 'ExternalLink',
    desc: 'Intègre une page externe : formulaire, calendrier, tableau…',
    addable: true,
    fields: [
      ...HEAD_FIELDS,
      { key: 'url', label: 'Adresse', type: 'text', placeholder: 'https://…' },
      { key: 'height', label: 'Hauteur (px)', type: 'number', min: 120, max: 1400, step: 10 },
    ],
    defaults: { height: 520 },
    render: ({ node, ctx }) => {
      const url = str(node, 'url', ctx.locale).trim()
      return (
        <section className="sec edx">
          <div className="wrap">
            <BlockHead {...head(node, ctx)} />
            <div className="edx-embed rv" style={{ height: `${num(node, 'height', 520)}px` }}>
              {/^https?:\/\//i.test(url) ? (
                <iframe src={url} title={str(node, 'title', ctx.locale, 'Contenu')} loading="lazy" />
              ) : (
                <span className="edx-ph">Collez une adresse commençant par https://</span>
              )}
            </div>
          </div>
        </section>
      )
    },
  },
]

/* ════════════════════════════ COMPOSANTS ════════════════════════════ */

/**
 * Les composants vivent DANS une section conteneur (« Colonnes libres »).
 * Ils se déplacent d'une colonne à l'autre et d'une section à l'autre.
 */
export const ED_BLOCKS: EdBlockDef[] = [
  {
    type: 'blk.heading',
    label: 'Titre',
    icon: 'Heading2',
    fields: [
      { key: 'text', label: 'Texte', type: 'text', localized: true },
      {
        key: 'level',
        label: 'Niveau',
        type: 'select',
        options: [
          { value: 'h2', label: 'Titre 2' },
          { value: 'h3', label: 'Titre 3' },
          { value: 'h4', label: 'Titre 4' },
        ],
      },
    ],
    defaults: { text: { fr: 'Un titre' }, level: 'h3' },
    render: ({ node, ctx }) => {
      const text = str(node, 'text', ctx.locale)
      const level = str(node, 'level', ctx.locale, 'h3')
      if (level === 'h2') return <h2 className="h2 edx-bh">{text}</h2>
      if (level === 'h4') return <h4 className="edx-bh">{text}</h4>
      return <h3 className="edx-bh">{text}</h3>
    },
  },
  {
    type: 'blk.eyebrow',
    label: 'Sur-titre',
    icon: 'Type',
    fields: [{ key: 'text', label: 'Texte', type: 'text', localized: true }],
    defaults: { text: { fr: 'Sur-titre' } },
    render: ({ node, ctx }) => <div className="eyebrow">{str(node, 'text', ctx.locale)}</div>,
  },
  {
    type: 'blk.text',
    label: 'Paragraphe',
    icon: 'AlignLeft',
    fields: [{ key: 'text', label: 'Texte', type: 'textarea', localized: true }],
    defaults: { text: { fr: 'Un paragraphe de texte.' } },
    render: ({ node, ctx }) => (
      <div className="edx-prose">
        {str(node, 'text', ctx.locale)
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
    ),
  },
  {
    type: 'blk.button',
    label: 'Bouton',
    icon: 'MousePointerClick',
    fields: [
      { key: 'label', label: 'Libellé', type: 'text', localized: true },
      { key: 'href', label: 'Lien', type: 'link' },
      {
        key: 'variant',
        label: 'Style',
        type: 'select',
        options: [
          { value: 'k', label: 'Plein' },
          { value: 'g', label: 'Contour' },
          { value: 'w', label: 'Clair' },
        ],
      },
    ],
    defaults: { label: { fr: 'En savoir plus' }, href: '/contact', variant: 'k' },
    render: ({ node, ctx }) => (
      <Anchor
        className={`btn btn-${str(node, 'variant', ctx.locale, 'k')}`}
        href={str(node, 'href', ctx.locale)}
      >
        {str(node, 'label', ctx.locale)}
      </Anchor>
    ),
  },
  {
    type: 'blk.image',
    label: 'Image',
    icon: 'Image',
    fields: [
      { key: 'src', label: 'Image', type: 'image' },
      { key: 'alt', label: 'Texte alternatif', type: 'text' },
      {
        key: 'ratio',
        label: 'Format',
        type: 'select',
        options: [
          { value: 'auto', label: 'Naturel' },
          { value: '1/1', label: 'Carré' },
          { value: '4/3', label: '4:3' },
          { value: '16/9', label: '16:9' },
        ],
      },
    ],
    defaults: { ratio: '4/3' },
    render: ({ node, ctx }) => {
      const src = str(node, 'src', ctx.locale)
      const ratio = str(node, 'ratio', ctx.locale, '4/3')
      if (!src) return <span className="edx-ph">Image</span>
      if (ratio === 'auto') {
        return (
          <span className="edx-bimg is-auto">
            <Image
              src={src}
              alt={str(node, 'alt', ctx.locale)}
              width={1200}
              height={800}
              sizes="(max-width: 700px) 90vw, 560px"
              style={{ width: '100%', height: 'auto' }}
            />
          </span>
        )
      }
      return (
        <span className="edx-bimg" style={{ ['--edx-ratio' as string]: ratio }}>
          <Image
            src={src}
            alt={str(node, 'alt', ctx.locale)}
            fill
            sizes="(max-width: 700px) 90vw, 560px"
            style={{ objectFit: 'cover' }}
          />
        </span>
      )
    },
  },
  {
    type: 'blk.badge',
    label: 'Étiquette',
    icon: 'Tag',
    fields: [{ key: 'text', label: 'Texte', type: 'text', localized: true }],
    defaults: { text: { fr: 'Nouveau' } },
    render: ({ node, ctx }) => <span className="edx-badge">{str(node, 'text', ctx.locale)}</span>,
  },
  {
    type: 'blk.stat',
    label: 'Chiffre',
    icon: 'Hash',
    fields: [
      { key: 'value', label: 'Valeur', type: 'text' },
      { key: 'label', label: 'Légende', type: 'text', localized: true },
    ],
    defaults: { value: '58', label: { fr: 'Wilayas' } },
    render: ({ node, ctx }) => (
      <div className="edx-bstat">
        <b>{str(node, 'value', ctx.locale)}</b>
        <span>{str(node, 'label', ctx.locale)}</span>
      </div>
    ),
  },
  {
    type: 'blk.iconText',
    label: 'Icône + texte',
    icon: 'Sparkle',
    fields: [
      {
        key: 'icon',
        label: 'Icône',
        type: 'select',
        options: ['check', 'bolt', 'shield', 'truck', 'wrench', 'clock', 'globe', 'chat'].map(
          (v) => ({ value: v, label: v }),
        ),
      },
      { key: 'text', label: 'Texte', type: 'text', localized: true },
    ],
    defaults: { icon: 'check', text: { fr: 'Un point important' } },
    render: ({ node, ctx }) => (
      <div className="edx-bicon">
        <EIcon n={str(node, 'icon', ctx.locale, 'check')} s={17} />
        <span>{str(node, 'text', ctx.locale)}</span>
      </div>
    ),
  },
  {
    type: 'blk.spacer',
    label: 'Espace',
    icon: 'MoveVertical',
    fields: [{ key: 'height', label: 'Hauteur (px)', type: 'number', min: 0, max: 200, step: 2 }],
    defaults: { height: 24 },
    render: ({ node }) => <div style={{ height: num(node, 'height', 24) }} />,
  },
  {
    type: 'blk.divider',
    label: 'Séparateur',
    icon: 'Minus',
    render: () => <div className="edx-div is-line" />,
  },
  {
    type: 'blk.html',
    label: 'Code HTML',
    icon: 'Code',
    fields: [{ key: 'code', label: 'HTML', type: 'textarea' }],
    defaults: { code: '<p>HTML</p>' },
    render: ({ node, ctx }) => (
      <div
        className="edx-html sr-customhtml"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(str(node, 'code', ctx.locale)) }}
      />
    ),
  },
]

/* ─────────────────────────────── utilitaires ─────────────────────────────── */

/** YouTube / Vimeo → URL d'intégration. Tout le reste renvoie null. */
function toEmbedUrl(url: string): string | null {
  if (!url) return null
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  )
  if (yt?.[1]) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm?.[1]) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

export const ED_LIBRARY_SECTIONS: EdSectionDef[] = [
  ...CONTENT,
  ...MEDIA,
  ...ACTION,
  ...LAYOUT,
  ...ADVANCED,
]
