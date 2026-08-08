/**
 * ÉDITEUR — modèle de données (pur, sans React ni accès serveur).
 *
 * Il est importé par le rendu du site (client), par l'éditeur (client) et par
 * les actions serveur, donc il ne doit dépendre de rien d'autre.
 *
 * Un document = une page. Une page = une liste ordonnée de sections, plus
 * des surcharges de texte par langue, plus du CSS libre.
 *
 * Les textes ne sont PAS copiés dans le document : chaque section déclare les
 * clés i18n qu'elle affiche, et `doc.text[clé][langue]` remplace la
 * traduction par défaut. Résultat : tout le texte du site est éditable sans
 * qu'aucune section ait besoin d'être modifiée, et une clé jamais touchée
 * garde sa traduction FR/EN/AR d'origine.
 */

export type EdLocale = 'fr' | 'en' | 'ar'

export const ED_LOCALES: EdLocale[] = ['fr', 'en', 'ar']

/** Une valeur de texte, par langue. Une langue absente = traduction d'origine. */
export type EdText = Partial<Record<EdLocale, string>>

/** Réglages visuels applicables à n'importe quelle section. */
export interface EdStyle {
  /** Couleur de fond (n'importe quelle valeur CSS). */
  bg?: string
  /** Couleur du texte. */
  fg?: string
  /** Couleur d'accent locale (remplace --teal dans la section). */
  accent?: string
  /** Deuxième accent (remplace --yellow). */
  accent2?: string
  /** Image de fond. */
  bgImage?: string
  bgFit?: 'cover' | 'contain'
  /** Voile sombre au-dessus de l'image de fond, 0 → 100. */
  bgOverlay?: number
  padTop?: number
  padBottom?: number
  /** Largeur maximale du contenu, en px. */
  maxWidth?: number
  align?: 'start' | 'center' | 'end'
  /** Rayon des coins, en px. */
  radius?: number
  /** Police des titres / du texte (nom de famille CSS). */
  fontDisplay?: string
  fontBody?: string
  /** Facteur d'échelle typographique, 50 → 200 (%). */
  fontScale?: number
  /** Barre claire ou sombre : pilote la couleur de la navigation au survol. */
  tone?: 'light' | 'dark'
  /** Masquée sur le site public (reste visible et grisée dans l'éditeur). */
  hidden?: boolean
  /** Masquée sur mobile / sur ordinateur. */
  hideMobile?: boolean
  hideDesktop?: boolean
}

/** Une section, ou un composant à l'intérieur d'une section. */
export interface EdNode {
  id: string
  /** Clé du registre (ex. `home.hero`, `lib.faq`). */
  type: string
  /** Réglages propres au type (textes libres, images, listes…). */
  props?: Record<string, unknown>
  style?: EdStyle
  /** CSS libre appliqué à cette section (les sélecteurs sont préfixés). */
  css?: string
  /** HTML libre injecté dans cette section. */
  html?: string
  /** Composants enfants (sections conteneur de la bibliothèque). */
  children?: EdNode[]
}

export interface EdDoc {
  v: 1
  sections: EdNode[]
  /** Surcharges de texte : clé i18n → valeur par langue. */
  text?: Record<string, EdText>
  /** CSS libre pour toute la page. */
  css?: string
}

/** Réglages globaux du site (chrome, palette, polices) — clé `ed:__site__`. */
export interface EdSite {
  v: 1
  /** Surcharges des variables CSS de `.editorial-root`. */
  tokens?: Record<string, string>
  fonts?: {
    display?: string
    body?: string
    /** URL d'une feuille de polices (Google Fonts…) chargée sur tout le site. */
    url?: string
  }
  /** Surcharges de texte partagées par toutes les pages (menu, pied de page). */
  text?: Record<string, EdText>
  /** CSS libre appliqué à tout le site. */
  css?: string
  /** Réglages du menu et du pied de page. */
  header?: { hidden?: boolean; nav?: EdNavItem[] }
  footer?: { hidden?: boolean }
}

export interface EdNavItem {
  id: string
  /** Libellé par langue. Vide → libellé i18n d'origine via `textKey`. */
  label?: EdText
  /** Clé i18n du libellé d'origine. */
  textKey?: string
  href: string
  hidden?: boolean
}

/* ────────────────────────── valeurs par défaut ────────────────────────── */

export const emptyDoc = (): EdDoc => ({ v: 1, sections: [] })

export const emptySite = (): EdSite => ({ v: 1 })

/* ───────────────────────────── identifiants ───────────────────────────── */

/**
 * Identifiant court, stable et sans dépendance externe.
 * `crypto.randomUUID` n'existe pas partout (vieux Safari, contexte non
 * sécurisé) : on retombe sur Math.random, qui suffit largement ici.
 */
export function edId(prefix = 's'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rnd}`
}

/* ─────────────────────────── arbre : opérations ────────────────────────── */

/** Copie profonde raisonnable (le document n'est que du JSON). */
export function cloneDoc<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T
}

/** Renvoie le nœud portant cet id, où qu'il soit dans l'arbre. */
export function findNode(nodes: EdNode[], id: string): EdNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const hit = findNode(n.children, id)
      if (hit) return hit
    }
  }
  return null
}

/** Le parent d'un nœud (null s'il est à la racine ou introuvable). */
export function findParent(nodes: EdNode[], id: string): EdNode | null {
  for (const n of nodes) {
    if (n.children?.some((c) => c.id === id)) return n
    if (n.children) {
      const hit = findParent(n.children, id)
      if (hit) return hit
    }
  }
  return null
}

/** Applique une modification à un nœud, en renvoyant un arbre neuf. */
export function patchNode(
  nodes: EdNode[],
  id: string,
  patch: (node: EdNode) => EdNode,
): EdNode[] {
  return nodes.map((n) => {
    if (n.id === id) return patch(n)
    if (n.children) return { ...n, children: patchNode(n.children, id, patch) }
    return n
  })
}

/** Retire un nœud de l'arbre. */
export function removeNode(nodes: EdNode[], id: string): EdNode[] {
  const out: EdNode[] = []
  for (const n of nodes) {
    if (n.id === id) continue
    out.push(n.children ? { ...n, children: removeNode(n.children, id) } : n)
  }
  return out
}

/**
 * Insère `node` dans la liste `parentId` (racine si null) à l'index donné.
 * `index` est borné, donc -1 ou 999 sont acceptables.
 */
export function insertNode(
  nodes: EdNode[],
  node: EdNode,
  parentId: string | null,
  index: number,
): EdNode[] {
  if (parentId === null) {
    const out = [...nodes]
    out.splice(Math.max(0, Math.min(index, out.length)), 0, node)
    return out
  }
  return patchNode(nodes, parentId, (p) => {
    const kids = [...(p.children ?? [])]
    kids.splice(Math.max(0, Math.min(index, kids.length)), 0, node)
    return { ...p, children: kids }
  })
}

/**
 * Déplace un nœud vers une nouvelle position. Renvoie l'arbre inchangé si la
 * cible est le nœud lui-même ou l'un de ses descendants (sinon on détacherait
 * une branche entière du document).
 */
export function moveNode(
  nodes: EdNode[],
  id: string,
  parentId: string | null,
  index: number,
): EdNode[] {
  const node = findNode(nodes, id)
  if (!node) return nodes
  if (parentId !== null && (parentId === id || isDescendant(node, parentId))) return nodes

  // Index d'origine dans la MÊME liste : retirer d'abord décale la cible.
  const sameList = (findParent(nodes, id)?.id ?? null) === parentId
  let target = index
  if (sameList) {
    const list = parentId === null ? nodes : (findNode(nodes, parentId)?.children ?? [])
    const from = list.findIndex((n) => n.id === id)
    if (from !== -1 && from < index) target = index - 1
  }
  return insertNode(removeNode(nodes, id), node, parentId, target)
}

function isDescendant(node: EdNode, id: string): boolean {
  for (const c of node.children ?? []) {
    if (c.id === id || isDescendant(c, id)) return true
  }
  return false
}

/** Duplique un nœud (et ses enfants) juste après l'original. */
export function duplicateNode(nodes: EdNode[], id: string): EdNode[] {
  const node = findNode(nodes, id)
  if (!node) return nodes
  const copy = reId(cloneDoc(node))
  const parent = findParent(nodes, id)
  const list = parent ? (parent.children ?? []) : nodes
  const at = list.findIndex((n) => n.id === id)
  return insertNode(nodes, copy, parent?.id ?? null, at + 1)
}

function reId(node: EdNode): EdNode {
  return {
    ...node,
    id: edId(node.type.split('.')[0] ?? 's'),
    children: node.children?.map(reId),
  }
}

/* ──────────────────────────────── textes ──────────────────────────────── */

/**
 * Résout une clé i18n : surcharge de la page, puis surcharge globale, puis
 * traduction d'origine. Une chaîne vide compte comme une valeur (l'auteur a le
 * droit de vider un texte) ; seul `undefined` retombe sur le défaut.
 */
export function resolveText(
  key: string,
  locale: EdLocale,
  fallback: string,
  page?: Record<string, EdText>,
  site?: Record<string, EdText>,
): string {
  const fromPage = page?.[key]?.[locale]
  if (fromPage !== undefined) return fromPage
  const fromSite = site?.[key]?.[locale]
  if (fromSite !== undefined) return fromSite
  return fallback
}

/** Écrit une surcharge de texte (undefined = revenir au défaut). */
export function setText(
  map: Record<string, EdText> | undefined,
  key: string,
  locale: EdLocale,
  value: string | undefined,
): Record<string, EdText> {
  const next: Record<string, EdText> = { ...(map ?? {}) }
  const entry: EdText = { ...(next[key] ?? {}) }
  if (value === undefined) delete entry[locale]
  else entry[locale] = value
  if (Object.keys(entry).length === 0) delete next[key]
  else next[key] = entry
  return next
}

/* ──────────────────────────────── styles ──────────────────────────────── */

/**
 * Traduit un EdStyle en variables CSS + propriétés.
 * Les variables sont celles de `.editorial-root`, donc une section peut
 * repeindre ses accents sans toucher au reste de la page.
 */
export function styleToCss(style: EdStyle | undefined): Record<string, string> {
  const s = style
  if (!s) return {}
  const out: Record<string, string> = {}
  if (s.bg) out['background'] = s.bg
  if (s.fg) {
    out['color'] = s.fg
    out['--ink'] = s.fg
  }
  if (s.accent) {
    out['--teal'] = s.accent
    out['--teal-deep'] = s.accent
    out['--ed-teal'] = s.accent
  }
  if (s.accent2) {
    out['--yellow'] = s.accent2
    out['--ed-gold'] = s.accent2
  }
  if (s.padTop !== undefined) out['padding-top'] = `${s.padTop}px`
  if (s.padBottom !== undefined) out['padding-bottom'] = `${s.padBottom}px`
  if (s.maxWidth !== undefined) out['--maxw'] = `${s.maxWidth}px`
  if (s.align) out['text-align'] = s.align === 'start' ? 'start' : s.align
  if (s.radius !== undefined) out['--r'] = `${s.radius}px`
  if (s.fontDisplay) out['--disp'] = s.fontDisplay
  if (s.fontBody) out['--body'] = s.fontBody
  if (s.fontScale !== undefined && s.fontScale !== 100) {
    out['font-size'] = `${(s.fontScale / 100).toFixed(3)}em`
  }
  if (s.bgImage) {
    const layer = `url(${JSON.stringify(s.bgImage)})`
    const veil = s.bgOverlay
      ? `linear-gradient(rgba(0,0,0,${(s.bgOverlay / 100).toFixed(2)}),rgba(0,0,0,${(
          s.bgOverlay / 100
        ).toFixed(2)})), `
      : ''
    out['background-image'] = `${veil}${layer}`
    out['background-size'] = s.bgFit ?? 'cover'
    out['background-position'] = 'center'
    out['background-repeat'] = 'no-repeat'
  }
  return out
}

/** Vrai si la section ne demande aucun style — on peut alors rester neutre. */
export function isStyleEmpty(style: EdStyle | undefined): boolean {
  if (!style) return true
  const keys = Object.keys(style) as (keyof EdStyle)[]
  return !keys.some((k) => {
    if (k === 'hidden' || k === 'hideMobile' || k === 'hideDesktop' || k === 'tone') return false
    return style[k] !== undefined && style[k] !== ''
  })
}

/* ──────────────────────────── CSS personnalisé ─────────────────────────── */

/**
 * Préfixe le CSS libre d'une section pour qu'il ne puisse pas repeindre la
 * page entière. `&` désigne la section ; un sélecteur nu est automatiquement
 * limité à ses descendants.
 *
 * Ce n'est pas un bac à sable de sécurité (l'auteur est un administrateur
 * authentifié) mais une garde contre l'accident : un `.btn { }` collé depuis
 * une autre page ne doit pas repeindre tous les boutons du site.
 */
export function scopeCss(css: string | undefined, scope: string): string {
  if (!css || !css.trim()) return ''
  const clean = stripAtRulesForScope(css)
  return clean
    .replace(/(^|\})\s*([^{}@]+)\{/g, (_m, close: string, sel: string) => {
      const scoped = sel
        .split(',')
        .map((part) => {
          const p = part.trim()
          if (!p) return p
          if (p.startsWith('@')) return p
          if (p.includes('&')) return p.replace(/&/g, scope)
          if (p === ':root' || p === 'html' || p === 'body') return scope
          return `${scope} ${p}`
        })
        .filter(Boolean)
        .join(', ')
      return `${close} ${scoped}{`
    })
    .trim()
}

/**
 * Les @media / @supports gardent leur bloc, mais leurs règles internes doivent
 * elles aussi être préfixées. On les aplatit en marquant l'ouverture pour que
 * la passe ci-dessus ne les prenne pas pour un sélecteur.
 */
function stripAtRulesForScope(css: string): string {
  return css.replace(/@(media|supports|container)([^{]*)\{/g, (_m, kind: string, cond: string) => {
    return `}@${kind}${cond}{`
  })
}

/* ──────────────────────────── HTML personnalisé ────────────────────────── */

/**
 * Nettoyage minimal du HTML libre : on retire ce qui casse la page ou vole la
 * session (scripts inline, handlers `on*`, `javascript:`). Les iframes restent
 * autorisées — coller une carte ou une vidéo est justement l'usage visé.
 */
export function sanitizeHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*script[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
}

/* ───────────────────────────── (dé)sérialisation ───────────────────────── */

/**
 * Relit un document venu de la base. Tout ce qui n'a pas la bonne forme est
 * ignoré : une ligne corrompue doit rendre la page par défaut, pas planter le
 * site.
 */
export function coerceDoc(raw: unknown): EdDoc | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const sections = Array.isArray(r.sections) ? r.sections.map(coerceNode).filter(isNode) : []
  return {
    v: 1,
    sections,
    text: coerceTextMap(r.text),
    css: typeof r.css === 'string' ? r.css : undefined,
  }
}

function isNode(n: EdNode | null): n is EdNode {
  return n !== null
}

function coerceNode(raw: unknown): EdNode | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.type !== 'string') return null
  const children = Array.isArray(r.children) ? r.children.map(coerceNode).filter(isNode) : undefined
  return {
    id: r.id,
    type: r.type,
    props: r.props && typeof r.props === 'object' ? (r.props as Record<string, unknown>) : undefined,
    style: coerceStyle(r.style),
    css: typeof r.css === 'string' ? r.css : undefined,
    html: typeof r.html === 'string' ? r.html : undefined,
    children,
  }
}

const STYLE_STRINGS = [
  'bg',
  'fg',
  'accent',
  'accent2',
  'bgImage',
  'fontDisplay',
  'fontBody',
] as const
const STYLE_NUMBERS = ['bgOverlay', 'padTop', 'padBottom', 'maxWidth', 'radius', 'fontScale'] as const
const STYLE_BOOLS = ['hidden', 'hideMobile', 'hideDesktop'] as const

function coerceStyle(raw: unknown): EdStyle | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const out: EdStyle = {}
  for (const k of STYLE_STRINGS) {
    const v = r[k]
    if (typeof v === 'string' && v) out[k] = v
  }
  for (const k of STYLE_NUMBERS) {
    const v = r[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  for (const k of STYLE_BOOLS) {
    if (r[k] === true) out[k] = true
  }
  if (r.align === 'start' || r.align === 'center' || r.align === 'end') out.align = r.align
  if (r.bgFit === 'cover' || r.bgFit === 'contain') out.bgFit = r.bgFit
  if (r.tone === 'light' || r.tone === 'dark') out.tone = r.tone
  return Object.keys(out).length ? out : undefined
}

function coerceTextMap(raw: unknown): Record<string, EdText> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, EdText> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const entry: EdText = {}
    for (const l of ED_LOCALES) {
      const v = (value as Record<string, unknown>)[l]
      if (typeof v === 'string') entry[l] = v
    }
    if (Object.keys(entry).length) out[key] = entry
  }
  return Object.keys(out).length ? out : undefined
}

export function coerceSite(raw: unknown): EdSite | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const tokens: Record<string, string> = {}
  if (r.tokens && typeof r.tokens === 'object') {
    for (const [k, v] of Object.entries(r.tokens as Record<string, unknown>)) {
      if (typeof v === 'string' && v && /^[-a-z0-9]+$/i.test(k)) tokens[k] = v
    }
  }
  const fontsRaw = (r.fonts ?? {}) as Record<string, unknown>
  const header = (r.header ?? {}) as Record<string, unknown>
  const footer = (r.footer ?? {}) as Record<string, unknown>
  return {
    v: 1,
    tokens: Object.keys(tokens).length ? tokens : undefined,
    fonts: {
      display: typeof fontsRaw.display === 'string' ? fontsRaw.display : undefined,
      body: typeof fontsRaw.body === 'string' ? fontsRaw.body : undefined,
      url: typeof fontsRaw.url === 'string' ? fontsRaw.url : undefined,
    },
    text: coerceTextMap(r.text),
    css: typeof r.css === 'string' ? r.css : undefined,
    header: {
      hidden: header.hidden === true,
      nav: Array.isArray(header.nav) ? header.nav.map(coerceNav).filter(isNav) : undefined,
    },
    footer: { hidden: footer.hidden === true },
  }
}

function isNav(n: EdNavItem | null): n is EdNavItem {
  return n !== null
}

function coerceNav(raw: unknown): EdNavItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.href !== 'string') return null
  const label: EdText = {}
  if (r.label && typeof r.label === 'object') {
    for (const l of ED_LOCALES) {
      const v = (r.label as Record<string, unknown>)[l]
      if (typeof v === 'string') label[l] = v
    }
  }
  return {
    id: r.id,
    href: r.href,
    textKey: typeof r.textKey === 'string' ? r.textKey : undefined,
    label: Object.keys(label).length ? label : undefined,
    hidden: r.hidden === true,
  }
}
