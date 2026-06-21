/**
 * Web Editor — data model & tree helpers.
 *
 * The editor is a self-contained, block-based page builder. A page is an
 * ordered tree of blocks; container blocks (section, columns, card) hold
 * `children`. Everything is plain JSON so it serialises to localStorage /
 * export files with no schema or DB dependency.
 */

/** Per-block style overrides. All optional — unset = use the block default. */
export interface BlockStyle {
  textColor?: string
  bgColor?: string
  bgColor2?: string // optional gradient stop
  gradient?: boolean
  fontFamily?: string
  fontSize?: number // px
  fontWeight?: number
  lineHeight?: number
  letterSpacing?: number // em * 1000 stored as px-ish; we store raw em string instead
  textAlign?: 'left' | 'center' | 'right'
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  paddingY?: number
  paddingX?: number
  marginTop?: number
  marginBottom?: number
  radius?: number
  borderWidth?: number
  borderColor?: string
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'glow'
  maxWidth?: number // content max width (px); 0 = full
  opacity?: number // 0-100
  customCss?: string // raw CSS declarations applied to the block root
  // ── Responsive visibility ────────────────────────────────────────
  // Per-device hide flags. The canvas wraps the page in
  // `.we-canvas[data-device='desktop'|'tablet'|'mobile']`, and the CSS
  // sets `display: none` on `[data-hide-<device>='1']` matching the
  // active device. Renderers attach the data-attrs on the block root.
  hideOnDesktop?: boolean
  hideOnTablet?: boolean
  hideOnMobile?: boolean
}

/** A single block instance in the tree. */
export interface Block {
  id: string
  type: string
  /** Content props — shape depends on the block type. */
  props: Record<string, unknown>
  style: BlockStyle
  /** Children — only present on container blocks. */
  children?: Block[]
}

/** The full editable document. */
export interface PageDoc {
  id: string
  name: string
  /** Page-level canvas background (legacy; themes now drive the background). */
  background: string
  /** Selected design theme id (see themes.ts). Default 'nightline'. */
  theme?: string
  /** Multi-page metadata (set for editor-managed pages/templates). */
  kind?: 'page' | 'template'
  /** Canonical route this doc publishes to ('/', '/about', '/products/[slug]'). */
  routePath?: string
  /** For template docs: the entity whose data fills the {{tokens}}. */
  entity?: 'product' | 'category' | 'brand'
  blocks: Block[]
}

/** Field control kinds rendered by the inspector. */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'color'
  | 'select'
  | 'toggle'
  | 'image'
  | 'list' // repeatable list of sub-items (objects)

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: { label: string; value: string }[]
  /** For `list` fields — the schema of each item + a label for the add button. */
  itemFields?: FieldDef[]
  addLabel?: string
  /** Only show this field when another field/prop equals a value. */
  showIf?: { key: string; equals: unknown }
  help?: string
}

/** Which style controls make sense for a block (drives the Style tab). */
export interface StyleSupport {
  typography?: boolean
  colors?: boolean
  spacing?: boolean
  border?: boolean
  layout?: boolean // maxWidth + align
}

export interface BlockDef {
  type: string
  label: string
  /** Palette grouping. */
  category: 'Layout' | 'Texte' | 'Médias' | 'Sections' | 'Commerce' | 'Avancé'
  /** lucide icon name resolved in the palette. */
  icon: string
  description?: string
  /** A short "how to use" line shown in the palette help card + guide. */
  howto?: string
  defaultProps: Record<string, unknown>
  defaultStyle?: BlockStyle
  fields: FieldDef[]
  style: StyleSupport
  /** Container blocks accept dropped children. */
  isContainer?: boolean
  /** Number of drop slots for layout containers (e.g. columns). */
}

// ───────────────────────── id + factory ─────────────────────────

let counter = 0
export function uid(prefix = 'b'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}

// ───────────────────────── tree helpers ─────────────────────────

/** A path is a list of child indices from the root blocks array. */
export type Path = number[]

export function pathEquals(a: Path | null, b: Path | null): boolean {
  if (!a || !b) return a === b
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/** Deep clone via structuredClone with a JSON fallback. */
export function clone<T>(v: T): T {
  if (typeof structuredClone === 'function') return structuredClone(v)
  return JSON.parse(JSON.stringify(v)) as T
}

/** Get the block at `path`, or null. */
export function getAt(blocks: Block[], path: Path): Block | null {
  let list: Block[] | undefined = blocks
  let node: Block | undefined
  for (const idx of path) {
    if (!list || idx < 0 || idx >= list.length) return null
    node = list[idx]
    if (!node) return null
    list = node.children
  }
  return node ?? null
}

/** Immutably update the block at `path` with `updater`. */
export function updateAt(
  blocks: Block[],
  path: Path,
  updater: (b: Block) => Block
): Block[] {
  if (path.length === 0) return blocks
  const [head, ...rest] = path
  return blocks.map((b, i) => {
    if (i !== head) return b
    if (rest.length === 0) return updater(b)
    return { ...b, children: updateAt(b.children ?? [], rest, updater) }
  })
}

/** Immutably remove the block at `path`. Returns new tree + removed block. */
export function removeAt(
  blocks: Block[],
  path: Path
): { tree: Block[]; removed: Block | null } {
  if (path.length === 0) return { tree: blocks, removed: null }
  if (path.length === 1) {
    const first = path[0] as number
    const removed = blocks[first] ?? null
    return { tree: blocks.filter((_, i) => i !== first), removed }
  }
  const [head, ...rest] = path
  let removed: Block | null = null
  const tree = blocks.map((b, i) => {
    if (i !== head) return b
    const r = removeAt(b.children ?? [], rest)
    removed = r.removed
    return { ...b, children: r.tree }
  })
  return { tree, removed }
}

/** Insert `block` into the children of `parentPath` at `index`. */
export function insertAt(
  blocks: Block[],
  parentPath: Path,
  index: number,
  block: Block
): Block[] {
  if (parentPath.length === 0) {
    const next = blocks.slice()
    next.splice(clamp(index, 0, next.length), 0, block)
    return next
  }
  const [head, ...rest] = parentPath
  return blocks.map((b, i) => {
    if (i !== head) return b
    return {
      ...b,
      children: insertAt(b.children ?? [], rest, index, block),
    }
  })
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Move the block at `from` into `parentPath` at `index`. Handles the index
 * shift that occurs when the source sits in the same parent before the target.
 */
export function moveBlock(
  blocks: Block[],
  from: Path,
  parentPath: Path,
  index: number
): Block[] {
  // Disallow dropping a node into its own descendant.
  if (isAncestor(from, parentPath)) return blocks

  const picked = getAt(blocks, from)
  if (!picked) return blocks

  const sameParent = pathEquals(from.slice(0, -1), parentPath)
  let targetIndex = index
  const fromLast = from[from.length - 1]
  if (sameParent && fromLast !== undefined && fromLast < index) targetIndex -= 1

  const { tree } = removeAt(blocks, from)
  return insertAt(tree, parentPath, targetIndex, clone(picked))
}

/** True if `maybeAncestor` is an ancestor of (or equal to) `path`. */
export function isAncestor(maybeAncestor: Path, path: Path): boolean {
  if (maybeAncestor.length > path.length) return false
  return maybeAncestor.every((v, i) => v === path[i])
}

/** Count blocks in the tree (for stats). */
export function countBlocks(blocks: Block[]): number {
  return blocks.reduce(
    (n, b) => n + 1 + (b.children ? countBlocks(b.children) : 0),
    0
  )
}
