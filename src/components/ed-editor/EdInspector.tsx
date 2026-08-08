'use client'

/**
 * ÉDITEUR — l'inspecteur.
 *
 * Une section sélectionnée ouvre ses réglages ici, en trois onglets :
 *   Contenu   les textes réellement affichés + les options propres au bloc
 *   Style     fond, couleurs, marges, largeur, polices, visibilité
 *   Avancé    HTML et CSS libres, et les actions destructrices
 *
 * Le détail qui rend « Contenu » possible sans avoir touché une seule
 * section : chaque type déclare les CLÉS i18n qu'il affiche, et la valeur
 * saisie est rangée dans `doc.text[clé][langue]`. Le champ vide n'écrit rien
 * et laisse la traduction d'origine vivre sa vie — c'est pour ça que le
 * repère (placeholder) montre toujours le texte par défaut.
 */

import { useState } from 'react'
import { Copy, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { EdBlockDef, EdSectionDef } from '@/components/editorial/ed-ctx'
import type { EdDoc, EdLocale, EdNode, EdSite, EdStyle } from '@/lib/ed-editor/model'
import { edT } from '@/components/editorial/editorial-i18n'
import {
  ColorInput,
  FieldRow,
  ImageInput,
  NumberInput,
  Row,
  SelectInput,
  Switch,
  TextInput,
} from './EdFields'

type Tab = 'content' | 'style' | 'advanced'

export interface EdInspectorProps {
  node: EdNode | null
  def: EdSectionDef | EdBlockDef | null
  doc: EdDoc
  site: EdSite
  locale: EdLocale
  onPatchNode: (patch: (node: EdNode) => EdNode) => void
  onText: (key: string, value: string | undefined) => void
  onPatchDoc: (patch: Partial<EdDoc>) => void
  onPatchSite: (patch: Partial<EdSite>) => void
  onDuplicate: () => void
  onDelete: () => void
}

export function EdInspector(props: EdInspectorProps) {
  const [tab, setTab] = useState<Tab>('content')
  const { node, def } = props

  if (!node || !def) return <PagePanel {...props} />

  const locked = 'locked' in def && def.locked === true
  const texts = 'texts' in def ? (def.texts ?? []) : []
  const fields = def.fields ?? []

  return (
    <div className="edi">
      <header className="edi-head">
        <b>{def.label}</b>
        {'desc' in def && def.desc ? <p>{def.desc}</p> : null}
      </header>

      <nav className="edi-tabs" role="tablist">
        {(
          [
            ['content', 'Contenu'],
            ['style', 'Style'],
            ['advanced', 'Avancé'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'is-on' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="edi-body">
        {tab === 'content' ? (
          <>
            {texts.length === 0 && fields.length === 0 ? (
              <p className="edi-empty">
                Cette section n’a pas de texte à régler : son contenu vient du catalogue.
              </p>
            ) : null}
            {texts.map((t) => (
              <TextKeyRow
                key={t.key}
                label={t.label}
                area={t.area === true}
                value={props.doc.text?.[t.key]?.[props.locale]}
                fallback={edT(props.locale, t.key)}
                onChange={(v) => props.onText(t.key, v)}
              />
            ))}
            {fields.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                value={node.props?.[f.key]}
                locale={props.locale}
                onChange={(v) =>
                  props.onPatchNode((n) => ({ ...n, props: { ...(n.props ?? {}), [f.key]: v } }))
                }
              />
            ))}
          </>
        ) : null}

        {tab === 'style' ? <StylePanel node={node} onPatchNode={props.onPatchNode} /> : null}

        {tab === 'advanced' ? (
          <AdvancedPanel
            node={node}
            locked={locked}
            onPatchNode={props.onPatchNode}
            onDuplicate={props.onDuplicate}
            onDelete={props.onDelete}
          />
        ) : null}
      </div>
    </div>
  )
}

/* ─────────────────────────── un texte du site ───────────────────────────── */

function TextKeyRow({
  label,
  value,
  fallback,
  area,
  onChange,
}: {
  label: string
  value: string | undefined
  fallback: string
  area: boolean
  onChange: (v: string | undefined) => void
}) {
  const custom = value !== undefined
  return (
    <div className={`edf-row${custom ? ' is-custom' : ''}`}>
      <span className="edf-lab">
        {label}
        {custom ? (
          <button type="button" className="edf-reset" onClick={() => onChange(undefined)}>
            rétablir
          </button>
        ) : null}
      </span>
      {/*
        Le texte ACTUEL est écrit dans le champ, en noir — pas suggéré en gris.
        Ghani l'a demandé et il a raison : un repère gris oblige à retaper la
        phrase entière pour n'en changer qu'un mot, et rien ne dit ce que la
        page affiche vraiment. Là, on sélectionne, on corrige, on repart.

        Contrepartie tenue ici : retaper EXACTEMENT le texte d'origine efface
        la surcharge (`undefined`) au lieu de la figer. Sans cela, effleurer un
        champ suffirait à geler la traduction FR/EN/AR de cette clé.
      */}
      <TextInput
        value={value ?? fallback}
        area={area}
        rows={area ? 4 : 2}
        onChange={(v) => onChange(v === fallback ? undefined : v)}
      />
    </div>
  )
}

/* ────────────────────────────── onglet Style ────────────────────────────── */

function StylePanel({
  node,
  onPatchNode,
}: {
  node: EdNode
  onPatchNode: (patch: (node: EdNode) => EdNode) => void
}) {
  const s = node.style ?? {}
  const set = (patch: Partial<EdStyle>) =>
    onPatchNode((n) => {
      const next: EdStyle = { ...(n.style ?? {}), ...patch }
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v === undefined) delete next[k as keyof EdStyle]
      }
      return { ...n, style: Object.keys(next).length ? next : undefined }
    })
  const numStr = (v: number | undefined) => (v === undefined ? '' : String(v))
  const toNum = (v: string) => (v === '' ? undefined : Number(v))

  return (
    <>
      <p className="edi-note">Les valeurs vides gardent le style d’origine de la section.</p>

      <Row label="Couleur de fond">
        <ColorInput value={s.bg ?? ''} onChange={(v) => set({ bg: v })} />
      </Row>
      <Row label="Couleur du texte">
        <ColorInput value={s.fg ?? ''} onChange={(v) => set({ fg: v })} />
      </Row>
      <Row label="Accent (remplace le turquoise)">
        <ColorInput value={s.accent ?? ''} onChange={(v) => set({ accent: v })} />
      </Row>
      <Row label="Accent secondaire (remplace le jaune)">
        <ColorInput value={s.accent2 ?? ''} onChange={(v) => set({ accent2: v })} />
      </Row>

      <Row label="Image de fond">
        <ImageInput value={s.bgImage ?? ''} onChange={(v) => set({ bgImage: v })} />
      </Row>
      {s.bgImage ? (
        <>
          <Row label="Cadrage de l’image">
            <SelectInput
              value={s.bgFit ?? ''}
              onChange={(v) => set({ bgFit: v === 'contain' ? 'contain' : 'cover' })}
              options={[
                { value: 'cover', label: 'Remplir' },
                { value: 'contain', label: 'Contenir' },
              ]}
            />
          </Row>
          <Row label="Voile sombre (%)" help="Pour que le texte reste lisible sur la photo.">
            <NumberInput
              value={numStr(s.bgOverlay)}
              min={0}
              max={90}
              step={5}
              onChange={(v) => set({ bgOverlay: toNum(v) })}
            />
          </Row>
        </>
      ) : null}

      <div className="edf-pair">
        <Row label="Marge haute (px)">
          <NumberInput
            value={numStr(s.padTop)}
            min={0}
            max={320}
            step={4}
            onChange={(v) => set({ padTop: toNum(v) })}
          />
        </Row>
        <Row label="Marge basse (px)">
          <NumberInput
            value={numStr(s.padBottom)}
            min={0}
            max={320}
            step={4}
            onChange={(v) => set({ padBottom: toNum(v) })}
          />
        </Row>
      </div>

      <div className="edf-pair">
        <Row label="Largeur max (px)">
          <NumberInput
            value={numStr(s.maxWidth)}
            min={480}
            max={1920}
            step={20}
            onChange={(v) => set({ maxWidth: toNum(v) })}
          />
        </Row>
        <Row label="Coins arrondis (px)">
          <NumberInput
            value={numStr(s.radius)}
            min={0}
            max={64}
            step={2}
            onChange={(v) => set({ radius: toNum(v) })}
          />
        </Row>
      </div>

      <Row label="Alignement du texte">
        <SelectInput
          value={s.align ?? ''}
          onChange={(v) =>
            set({ align: v === '' ? undefined : (v as 'start' | 'center' | 'end') })
          }
          options={[
            { value: 'start', label: 'Au début' },
            { value: 'center', label: 'Centré' },
            { value: 'end', label: 'À la fin' },
          ]}
          empty="Par défaut"
        />
      </Row>

      <div className="edf-pair">
        <Row label="Police des titres">
          <TextInput
            value={s.fontDisplay ?? ''}
            placeholder="Comfortaa"
            onChange={(v) => set({ fontDisplay: v })}
          />
        </Row>
        <Row label="Police du texte">
          <TextInput
            value={s.fontBody ?? ''}
            placeholder="DM Sans"
            onChange={(v) => set({ fontBody: v })}
          />
        </Row>
      </div>
      <Row label="Échelle du texte (%)" help="100 = taille d’origine.">
        <NumberInput
          value={numStr(s.fontScale)}
          min={60}
          max={180}
          step={5}
          onChange={(v) => set({ fontScale: toNum(v) })}
        />
      </Row>

      <Row
        label="Teinte de la barre de navigation"
        help="Sombre si la section est foncée : le menu passe en blanc au-dessus."
      >
        <SelectInput
          value={s.tone ?? ''}
          onChange={(v) => set({ tone: v === '' ? undefined : (v as 'light' | 'dark') })}
          options={[
            { value: 'light', label: 'Claire' },
            { value: 'dark', label: 'Sombre' },
          ]}
          empty="Automatique"
        />
      </Row>
    </>
  )
}

/* ───────────────────────────── onglet Avancé ────────────────────────────── */

function AdvancedPanel({
  node,
  locked,
  onPatchNode,
  onDuplicate,
  onDelete,
}: {
  node: EdNode
  locked: boolean
} & Pick<EdInspectorProps, 'onPatchNode' | 'onDuplicate' | 'onDelete'>) {
  const hidden = node.style?.hidden === true
  const setStyle = (patch: Partial<EdStyle>) =>
    onPatchNode((n) => {
      const next = { ...(n.style ?? {}), ...patch }
      for (const [k, v] of Object.entries(patch)) {
        if (v === false || v === undefined) delete next[k as keyof EdStyle]
      }
      return { ...n, style: Object.keys(next).length ? next : undefined }
    })

  return (
    <>
      <div className="edi-vis">
        <Switch
          checked={hidden}
          onChange={(v) => setStyle({ hidden: v })}
          label={hidden ? 'Masquée sur le site' : 'Visible sur le site'}
        />
        <Switch
          checked={node.style?.hideMobile === true}
          onChange={(v) => setStyle({ hideMobile: v })}
          label="Cacher sur téléphone"
        />
        <Switch
          checked={node.style?.hideDesktop === true}
          onChange={(v) => setStyle({ hideDesktop: v })}
          label="Cacher sur ordinateur"
        />
      </div>

      <Row
        label="HTML personnalisé"
        help="Inséré à la fin de la section. Les <script> sont retirés."
      >
        <TextInput
          value={node.html ?? ''}
          area
          mono
          rows={6}
          placeholder="<div class='promo'>…</div>"
          onChange={(v) => onPatchNode((n) => ({ ...n, html: v || undefined }))}
        />
      </Row>

      <Row
        label="CSS personnalisé"
        help="Appliqué à cette section uniquement. « & » désigne la section."
      >
        <TextInput
          value={node.css ?? ''}
          area
          mono
          rows={8}
          placeholder={'& { background: #fff; }\n.h2 { letter-spacing: -.04em; }'}
          onChange={(v) => onPatchNode((n) => ({ ...n, css: v || undefined }))}
        />
      </Row>

      <div className="edi-actions">
        <button type="button" className="edi-act" onClick={onDuplicate} disabled={locked}>
          <Copy size={14} />
          Dupliquer
        </button>
        <button
          type="button"
          className="edi-act is-danger"
          onClick={onDelete}
          disabled={locked}
          title={locked ? 'Cette section est le cœur de la page : elle ne peut pas être retirée.' : undefined}
        >
          <Trash2 size={14} />
          Supprimer
        </button>
      </div>
      {locked ? (
        <p className="edi-note">
          Cette section porte la fonction de la page (catalogue, fiche produit, formulaire). On peut
          la styler et la masquer, pas la supprimer.
        </p>
      ) : null}
      <p className="edi-id">id · {node.id}</p>
    </>
  )
}

/* ─────────────── rien de sélectionné : la page et le site ──────────────── */

function PagePanel({
  doc,
  site,
  onPatchDoc,
  onPatchSite,
}: EdInspectorProps) {
  const [tab, setTab] = useState<'theme' | 'page'>('theme')
  const tokens = site.tokens ?? {}
  const setToken = (name: string, value: string) => {
    const next = { ...tokens }
    if (value) next[name] = value
    else delete next[name]
    onPatchSite({ tokens: next })
  }
  const fonts = site.fonts ?? {}
  const setFont = (patch: Partial<typeof fonts>) => onPatchSite({ fonts: { ...fonts, ...patch } })

  return (
    <div className="edi">
      <header className="edi-head">
        <b>Réglages du site</b>
        <p>Sélectionnez une section dans la page pour en modifier le contenu.</p>
      </header>
      <nav className="edi-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'theme'}
          className={tab === 'theme' ? 'is-on' : ''}
          onClick={() => setTab('theme')}
        >
          Couleurs & polices
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'page'}
          className={tab === 'page' ? 'is-on' : ''}
          onClick={() => setTab('page')}
        >
          Cette page
        </button>
      </nav>

      <div className="edi-body">
        {tab === 'theme' ? (
          <>
            <p className="edi-note">
              Ces couleurs sont celles de tout le site. Une section peut les remplacer localement
              dans son onglet Style.
            </p>
            {TOKENS.map((t) => (
              <Row key={t.name} label={t.label} help={t.help}>
                <ColorInput
                  value={tokens[t.name] ?? ''}
                  onChange={(v) => setToken(t.name, v)}
                />
              </Row>
            ))}
            <div className="edf-pair">
              <Row label="Police des titres">
                <TextInput
                  value={fonts.display ?? ''}
                  placeholder="Comfortaa"
                  onChange={(v) => setFont({ display: v || undefined })}
                />
              </Row>
              <Row label="Police du texte">
                <TextInput
                  value={fonts.body ?? ''}
                  placeholder="DM Sans"
                  onChange={(v) => setFont({ body: v || undefined })}
                />
              </Row>
            </div>
            <Row
              label="Feuille de polices"
              help="Adresse d’une police web (Google Fonts…). Elle est chargée sur tout le site."
            >
              <TextInput
                value={fonts.url ?? ''}
                placeholder="https://fonts.googleapis.com/css2?family=…"
                onChange={(v) => setFont({ url: v || undefined })}
              />
            </Row>

            <div className="edi-vis">
              <Switch
                checked={site.header?.hidden !== true}
                onChange={(v) => onPatchSite({ header: { ...(site.header ?? {}), hidden: !v } })}
                label="Afficher le menu"
              />
              <Switch
                checked={site.footer?.hidden !== true}
                onChange={(v) => onPatchSite({ footer: { ...(site.footer ?? {}), hidden: !v } })}
                label="Afficher le pied de page"
              />
            </div>

            <Row label="CSS du site entier" help="« & » ou un sélecteur nu désigne le site.">
              <TextInput
                value={site.css ?? ''}
                area
                mono
                rows={8}
                onChange={(v) => onPatchSite({ css: v || undefined })}
              />
            </Row>
          </>
        ) : (
          <>
            <p className="edi-note">
              Ce CSS ne s’applique qu’à la page ouverte. Pratique pour un ajustement ponctuel sans
              toucher au reste du site.
            </p>
            <Row label="CSS de la page">
              <TextInput
                value={doc.css ?? ''}
                area
                mono
                rows={14}
                placeholder={'.hero h1 { font-size: 68px; }'}
                onChange={(v) => onPatchDoc({ css: v || undefined })}
              />
            </Row>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Les jetons exposés. Volontairement peu nombreux : ce sont ceux qui
 * repeignent réellement la peau. Le reste du système de couleurs en dérive.
 */
const TOKENS: { name: string; label: string; help?: string }[] = [
  { name: 'teal', label: 'Accent principal', help: 'Boutons, liens, pastilles.' },
  { name: 'teal-deep', label: 'Accent foncé' },
  { name: 'yellow', label: 'Accent secondaire' },
  { name: 'ink', label: 'Texte' },
  { name: 'ink-2', label: 'Texte secondaire' },
  { name: 'bg', label: 'Fond' },
  { name: 'wash', label: 'Fond alterné' },
  { name: 'black', label: 'Fond des bandes sombres' },
  { name: 'line', label: 'Filets et bordures' },
]

export { TOKENS as ED_TOKENS }

/** Rendu par le panneau « Avancé » quand la section est visible ou masquée. */
export const VisibilityIcon = { Eye, EyeOff }
