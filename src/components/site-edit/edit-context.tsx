'use client'

/**
 * On-page visual builder engine. Visitors get the normal site; inside the
 * editor iframe (`?edit=1`) the page becomes a builder: text/links/images are
 * click-to-edit, sections gain drag-reorder + show/hide + a settings panel,
 * and custom sections are block containers you fill with components from a
 * library, reorder by drag (within AND across sections), and remove — all
 * over postMessage with the parent editor. Library items can be dragged from
 * the parent panel and dropped onto the canvas (coordinates relayed here).
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  type BlockKind,
  type EditBlock,
  type Layout,
  defaultText,
  defaultHref,
} from './section-presets'

export interface StylePatch {
  color?: string
  fontSize?: number
  fontWeight?: number
  textAlign?: 'left' | 'center' | 'right'
  letterSpacing?: number
  textTransform?: 'none' | 'uppercase'
  background?: string
  paddingY?: number
  paddingX?: number
}

export interface SectionStyle {
  bgColor?: string
  textColor?: string
  padTop?: number
  padBottom?: number
  maxWidth?: number
  align?: 'left' | 'center' | 'right'
}

export interface SectionConfig {
  order: string[]
  hidden: string[]
}

export interface CustomSection {
  id: string
  type: string
  layout?: Layout
  blocks?: EditBlock[]
}

export interface EditData {
  overrides: Record<string, string>
  styles: Record<string, StylePatch>
  sections: SectionConfig
  sectionBg: Record<string, string>
  sectionStyles: Record<string, SectionStyle>
  customSections: CustomSection[]
  theme?: string
}

interface BlockDrop {
  secId: string
  beforeId: string | null
}

interface EditCtx {
  overrides: Record<string, string>
  styles: Record<string, StylePatch>
  sections: SectionConfig
  sectionBg: Record<string, string>
  sectionStyles: Record<string, SectionStyle>
  customSections: CustomSection[]
  editMode: boolean
  reorderSections: (order: string[]) => void
  toggleSectionHidden: (id: string) => void
  selectSection: (id: string) => void
  deleteSection: (id: string) => void
  addBlock: (secId: string, kind: BlockKind, index?: number) => void
  deleteBlock: (secId: string, blockId: string) => void
  beginBlockDrag: (secId: string, blockId: string) => void
  setBlockDrop: (d: BlockDrop | null) => void
  commitBlockDrop: () => void
  blockDrop: BlockDrop | null
  libIndex: number | null
  libHoverSec: string | null
}

const EMPTY_SECTIONS: SectionConfig = { order: [], hidden: [] }
const noop = () => {}
const Ctx = createContext<EditCtx>({
  overrides: {},
  styles: {},
  sections: EMPTY_SECTIONS,
  sectionBg: {},
  sectionStyles: {},
  customSections: [],
  editMode: false,
  reorderSections: noop,
  toggleSectionHidden: noop,
  selectSection: noop,
  deleteSection: noop,
  addBlock: noop,
  deleteBlock: noop,
  beginBlockDrag: noop,
  setBlockDrop: noop,
  commitBlockDrop: noop,
  blockDrop: null,
  libIndex: null,
  libHoverSec: null,
})

export function useText(id: string, def: string): string {
  const { overrides } = useContext(Ctx)
  return overrides[id] ?? def
}

function styleToCss(p?: StylePatch): React.CSSProperties {
  if (!p) return {}
  const css: React.CSSProperties = {}
  if (p.color) css.color = p.color
  if (p.background) css.background = p.background
  if (typeof p.fontSize === 'number') css.fontSize = p.fontSize
  if (typeof p.fontWeight === 'number') css.fontWeight = p.fontWeight
  if (p.textAlign) css.textAlign = p.textAlign
  if (typeof p.letterSpacing === 'number') css.letterSpacing = p.letterSpacing
  if (p.textTransform) css.textTransform = p.textTransform
  if (typeof p.paddingY === 'number' || typeof p.paddingX === 'number') {
    css.padding = `${p.paddingY ?? 0}px ${p.paddingX ?? 0}px`
  }
  return css
}

function uid(): string {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

export function EditProvider({
  initial,
  children,
}: {
  initial?: Partial<EditData>
  children: React.ReactNode
}) {
  const [overrides, setOverrides] = useState<Record<string, string>>(initial?.overrides ?? {})
  const [styles, setStyles] = useState<Record<string, StylePatch>>(initial?.styles ?? {})
  const [sections, setSections] = useState<SectionConfig>(initial?.sections ?? EMPTY_SECTIONS)
  const [sectionBg, setSectionBg] = useState<Record<string, string>>(initial?.sectionBg ?? {})
  const [sectionStyles, setSectionStyles] = useState<Record<string, SectionStyle>>(
    initial?.sectionStyles ?? {}
  )
  const [customSections, setCustomSections] = useState<CustomSection[]>(initial?.customSections ?? [])
  const [editMode, setEditMode] = useState(false)
  const [blockDrop, setBlockDropState] = useState<BlockDrop | null>(null)
  const [libIndex, setLibIndex] = useState<number | null>(null)
  const [libHoverSec, setLibHoverSec] = useState<string | null>(null)

  const sectionsRef = useRef(sections)
  sectionsRef.current = sections
  const sectionBgRef = useRef(sectionBg)
  sectionBgRef.current = sectionBg
  const sectionStylesRef = useRef(sectionStyles)
  sectionStylesRef.current = sectionStyles
  const customRef = useRef(customSections)
  customRef.current = customSections
  const blockDragRef = useRef<{ secId: string; blockId: string } | null>(null)
  const blockDropRef = useRef<BlockDrop | null>(null)
  blockDropRef.current = blockDrop
  const libIndexRef = useRef<number | null>(null)
  libIndexRef.current = libIndex

  function send(msg: Record<string, unknown>) {
    try {
      window.parent.postMessage({ source: 'dtech-site', ...msg }, '*')
    } catch {
      /* ignore */
    }
  }
  function syncCustom(next: CustomSection[]) {
    setCustomSections(next)
    send({ type: 'customSections', customSections: next })
  }

  function reorderSections(order: string[]) {
    setSections((s) => ({ ...s, order }))
    send({ type: 'reorder', order })
  }
  function toggleSectionHidden(id: string) {
    const cur = sectionsRef.current.hidden || []
    const hidden = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    setSections((s) => ({ ...s, hidden }))
    send({ type: 'section', id, hidden: hidden.includes(id) })
  }
  function selectSection(id: string) {
    const cs = customRef.current.find((c) => c.id === id)
    send({
      type: 'selectSection',
      id,
      bg: sectionBgRef.current[id] || '',
      style: sectionStylesRef.current[id] || {},
      isCustom: id.startsWith('custom:'),
      layout: cs?.layout || 'stack',
    })
  }
  function deleteSection(id: string) {
    send({ type: 'deleteSection', id })
  }
  function addBlock(secId: string, kind: BlockKind, index?: number) {
    const next = customRef.current.map((c) => {
      if (c.id !== secId) return c
      const blocks = [...(c.blocks || [])]
      const blk: EditBlock = { id: uid(), kind }
      if (typeof index === 'number' && index >= 0 && index <= blocks.length) blocks.splice(index, 0, blk)
      else blocks.push(blk)
      return { ...c, blocks }
    })
    syncCustom(next)
  }
  function deleteBlock(secId: string, blockId: string) {
    const next = customRef.current.map((c) =>
      c.id === secId ? { ...c, blocks: (c.blocks || []).filter((b) => b.id !== blockId) } : c
    )
    syncCustom(next)
  }
  function beginBlockDrag(secId: string, blockId: string) {
    blockDragRef.current = { secId, blockId }
  }
  function setBlockDrop(d: BlockDrop | null) {
    blockDropRef.current = d
    setBlockDropState(d)
  }
  function commitBlockDrop() {
    const from = blockDragRef.current
    const to = blockDropRef.current
    blockDragRef.current = null
    setBlockDropState(null)
    if (!from || !to) return
    if (from.secId === to.secId && from.blockId === to.beforeId) return
    const list = customRef.current.map((c) => ({ ...c, blocks: [...(c.blocks || [])] }))
    const src = list.find((c) => c.id === from.secId)
    const dst = list.find((c) => c.id === to.secId)
    if (!src || !dst) return
    const fi = src.blocks.findIndex((b) => b.id === from.blockId)
    if (fi < 0) return
    const [moved] = src.blocks.splice(fi, 1)
    if (!moved) return
    let ti = to.beforeId ? dst.blocks.findIndex((b) => b.id === to.beforeId) : dst.blocks.length
    if (ti < 0) ti = dst.blocks.length
    dst.blocks.splice(ti, 0, moved)
    syncCustom(list)
  }

  useEffect(() => {
    let inFrame = false
    try {
      inFrame = window.self !== window.top
    } catch {
      inFrame = true
    }
    const params = new URLSearchParams(window.location.search)
    const em = params.get('edit') === '1' && inFrame
    setEditMode(em)
    if (!em) return

    function sectionEls(): HTMLElement[] {
      return Array.from(document.querySelectorAll('.dtx-section')) as HTMLElement[]
    }
    function indexForY(y: number): number {
      const els = sectionEls()
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (y < r.top + r.height / 2) return i
      }
      return els.length
    }
    function customSecForY(y: number): string | null {
      const els = sectionEls()
      for (const el of els) {
        const r = el.getBoundingClientRect()
        const id = el.dataset.sectionId || ''
        if (id.startsWith('custom:') && y >= r.top && y <= r.bottom) return id
      }
      return null
    }

    function onMsg(e: MessageEvent) {
      const d = e.data
      if (!d || d.source !== 'dtech-editor') return
      if (d.type === 'snapshot') {
        if (d.overrides) setOverrides({ ...(d.overrides as Record<string, string>) })
        if (d.styles) setStyles({ ...(d.styles as Record<string, StylePatch>) })
        if (d.sections) setSections({ ...EMPTY_SECTIONS, ...(d.sections as SectionConfig) })
        if (d.sectionBg) setSectionBg({ ...(d.sectionBg as Record<string, string>) })
        if (d.sectionStyles) setSectionStyles({ ...(d.sectionStyles as Record<string, SectionStyle>) })
        if (d.customSections) setCustomSections([...(d.customSections as CustomSection[])])
      } else if (d.type === 'sectionBg' && typeof d.id === 'string') {
        setSectionBg((m) => {
          const next = { ...m }
          if (d.url) next[d.id] = d.url as string
          else delete next[d.id]
          return next
        })
      } else if (d.type === 'sectionStyle' && typeof d.id === 'string') {
        setSectionStyles((s) => ({ ...s, [d.id]: { ...(s[d.id] || {}), ...(d.patch as SectionStyle) } }))
      } else if (d.type === 'sectionLayout' && typeof d.id === 'string') {
        setCustomSections((cs) => cs.map((c) => (c.id === d.id ? { ...c, layout: d.layout as Layout } : c)))
      } else if (d.type === 'text' && typeof d.id === 'string') {
        setOverrides((o) => ({ ...o, [d.id]: d.value as string }))
      } else if (d.type === 'link' && typeof d.id === 'string') {
        setOverrides((o) => ({ ...o, [d.id]: d.value as string }))
      } else if (d.type === 'image' && typeof d.id === 'string') {
        setOverrides((o) => ({ ...o, [d.id]: d.value as string }))
      } else if (d.type === 'style' && typeof d.id === 'string') {
        setStyles((s) => ({ ...s, [d.id]: { ...(s[d.id] || {}), ...(d.patch as StylePatch) } }))
      } else if (d.type === 'scrollToSection' && typeof d.id === 'string') {
        const el = document.querySelector(`.dtx-section[data-section-id="${d.id}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (d.type === 'addBlockTo' && typeof d.secId === 'string') {
        addBlock(d.secId as string, d.kind as BlockKind)
      } else if (d.type === 'libDragOver') {
        if (d.mode === 'component') {
          setLibIndex(null)
          setLibHoverSec(customSecForY(d.y as number))
        } else {
          setLibHoverSec(null)
          setLibIndex(indexForY(d.y as number))
        }
      } else if (d.type === 'libDragEnd') {
        setLibIndex(null)
        setLibHoverSec(null)
      } else if (d.type === 'libDrop') {
        if (d.mode === 'component') {
          const sec = customSecForY(d.y as number) || libHoverSecRef.current
          if (sec) addBlock(sec, d.kind as BlockKind)
        } else {
          send({ type: 'libInsertAt', index: libIndexRef.current ?? sectionEls().length })
        }
        setLibIndex(null)
        setLibHoverSec(null)
      }
    }
    window.addEventListener('message', onMsg)

    function findEditable(t: EventTarget | null): HTMLElement | null {
      let el = t as HTMLElement | null
      while (el && !(el.dataset && el.dataset.editId)) el = el.parentElement
      return el
    }
    let hovered: HTMLElement | null = null
    function onOver(e: MouseEvent) {
      const el = findEditable(e.target)
      if (el !== hovered) {
        hovered?.classList.remove('dtx-hover')
        hovered = el
        el?.classList.add('dtx-hover')
      }
    }
    function onClick(e: MouseEvent) {
      const el = findEditable(e.target)
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      document.querySelectorAll('.dtx-sel').forEach((n) => n.classList.remove('dtx-sel'))
      el.classList.add('dtx-sel')
      const id = el.dataset.editId as string
      send({
        type: 'select',
        id,
        editType: el.dataset.editType || 'text',
        value: el.dataset.editValue ?? el.textContent ?? '',
        label: el.dataset.editLabel || '',
      })
    }
    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('click', onClick, true)
    document.documentElement.classList.add('dtx-edit')
    send({ type: 'ready' })

    return () => {
      window.removeEventListener('message', onMsg)
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('click', onClick, true)
      document.documentElement.classList.remove('dtx-edit')
    }
  }, [])

  const libHoverSecRef = useRef<string | null>(null)
  libHoverSecRef.current = libHoverSec

  return (
    <Ctx.Provider
      value={{
        overrides,
        styles,
        sections,
        sectionBg,
        sectionStyles,
        customSections,
        editMode,
        reorderSections,
        toggleSectionHidden,
        selectSection,
        deleteSection,
        addBlock,
        deleteBlock,
        beginBlockDrag,
        setBlockDrop,
        commitBlockDrop,
        blockDrop,
        libIndex,
        libHoverSec,
      }}
    >
      {children}
      <BuilderStyles />
      {editMode && <EditChrome />}
    </Ctx.Provider>
  )
}

/** A click-to-edit text node (text + visual style overrides). */
export function Editable({
  id,
  children,
  as: Tag = 'span',
  className,
  style,
  label,
}: {
  id: string
  children: React.ReactNode
  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
  label?: string
}) {
  const { overrides, styles } = useContext(Ctx)
  const value = overrides[id] ?? children
  // Rendered via createElement: `Tag` is a dynamic React.ElementType, and JSX
  // collapses the children prop of an element-type union to `never`.
  // createElement accepts variadic children, so this is type-safe and behaves
  // identically to <Tag …>{value}</Tag>.
  return React.createElement(
    Tag,
    {
      'data-edit-id': id,
      'data-edit-type': 'text',
      'data-edit-label': label,
      className,
      style: { ...style, ...styleToCss(styles[id]) },
    },
    value
  )
}

/** A click-to-edit link/button (label + href + style). */
export function EditableLink({
  id,
  label,
  href,
  className,
  style,
  editLabel,
  children,
}: {
  id: string
  label: string
  href: string
  className?: string
  style?: React.CSSProperties
  editLabel?: string
  children?: React.ReactNode
}) {
  const { overrides, styles } = useContext(Ctx)
  let curLabel = label
  let curHref = href
  const raw = overrides[id]
  if (raw) {
    try {
      const o = JSON.parse(raw) as { label?: string; href?: string }
      if (typeof o.label === 'string') curLabel = o.label
      if (typeof o.href === 'string') curHref = o.href
    } catch {
      /* ignore */
    }
  }
  const defJson = JSON.stringify({ label, href })
  return (
    <a
      href={curHref}
      data-edit-id={id}
      data-edit-type="link"
      data-edit-label={editLabel}
      data-edit-value={overrides[id] ?? defJson}
      className={className}
      style={{ ...style, ...styleToCss(styles[id]) }}
    >
      {curLabel}
      {children}
    </a>
  )
}

/** A click-to-replace image. URL stored as a plain override. */
export function EditableImage({
  id,
  src,
  alt,
  className,
  style,
  label,
}: {
  id: string
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  label?: string
}) {
  const { overrides } = useContext(Ctx)
  const url = overrides[id] || src
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt || ''}
      data-edit-id={id}
      data-edit-type="image"
      data-edit-label={label || 'Image'}
      data-edit-value={url}
      className={className}
      style={style}
    />
  )
}

/* ── block renderer ──────────────────────────────────────────────────────── */

const PLACEHOLDER = '/placeholder-product.png'

function Block({ secId, block }: { secId: string; block: EditBlock }) {
  const base = `${secId}.${block.id}`
  const k = block.kind
  const t = (f: string) => defaultText(k, f)
  switch (k) {
    case 'eyebrow':
      return <Editable as="p" className="dtx-bk dtx-bk-eyebrow" id={`${base}.text`} label="Sur-titre">{t('text')}</Editable>
    case 'badge':
      return <div className="dtx-bk dtx-bk-badgewrap"><Editable as="span" className="dtx-bk-badge" id={`${base}.text`} label="Badge">{t('text')}</Editable></div>
    case 'heading':
      return <Editable as="h2" className="dtx-bk dtx-bk-heading" id={`${base}.text`} label="Titre">{t('text')}</Editable>
    case 'text':
      return <Editable as="p" className="dtx-bk dtx-bk-text" id={`${base}.text`} label="Paragraphe">{t('text')}</Editable>
    case 'button':
      return (
        <div className="dtx-bk dtx-bk-btnwrap">
          <EditableLink id={base} label={t('button' === k ? 'label' : 'label')} href={defaultHref()} className="btn btn-primary btn-lg" editLabel="Bouton" />
        </div>
      )
    case 'image':
      return <EditableImage id={base} src={PLACEHOLDER} className="dtx-bk dtx-bk-image" label="Image" />
    case 'logo':
      return <EditableImage id={base} src={PLACEHOLDER} className="dtx-bk dtx-bk-logo" label="Logo" />
    case 'video':
      return (
        <div className="dtx-bk dtx-bk-video">
          <EditableImage id={base} src={PLACEHOLDER} className="dtx-bk-video-poster" label="Image video" />
          <span className="dtx-bk-play" aria-hidden>&#9654;</span>
        </div>
      )
    case 'feature':
      return (
        <div className="dtx-bk dtx-bk-card dtx-bk-feature">
          <Editable as="div" className="dtx-bk-ficon" id={`${base}.icon`} label="Icone">{t('icon')}</Editable>
          <Editable as="h3" className="dtx-bk-ftitle" id={`${base}.title`} label="Titre">{t('title')}</Editable>
          <Editable as="p" className="dtx-bk-ftext" id={`${base}.text`} label="Texte">{t('text')}</Editable>
        </div>
      )
    case 'iconText':
      return (
        <div className="dtx-bk dtx-bk-icontext">
          <Editable as="span" className="dtx-bk-iticon" id={`${base}.icon`} label="Icone">{t('icon')}</Editable>
          <Editable as="span" className="dtx-bk-ittext" id={`${base}.text`} label="Texte">{t('text')}</Editable>
        </div>
      )
    case 'stat':
      return (
        <div className="dtx-bk dtx-bk-stat">
          <Editable as="div" className="dtx-bk-svalue" id={`${base}.value`} label="Chiffre">{t('value')}</Editable>
          <Editable as="div" className="dtx-bk-slabel" id={`${base}.label`} label="Libelle">{t('label')}</Editable>
        </div>
      )
    case 'step':
      return (
        <div className="dtx-bk dtx-bk-card dtx-bk-step">
          <Editable as="div" className="dtx-bk-stepnum" id={`${base}.num`} label="Numero">{t('num')}</Editable>
          <Editable as="h3" className="dtx-bk-ftitle" id={`${base}.title`} label="Titre">{t('title')}</Editable>
          <Editable as="p" className="dtx-bk-ftext" id={`${base}.text`} label="Texte">{t('text')}</Editable>
        </div>
      )
    case 'quote':
      return (
        <blockquote className="dtx-bk dtx-bk-quote">
          <Editable as="p" className="dtx-bk-qtext" id={`${base}.text`} label="Citation">{t('text')}</Editable>
          <Editable as="cite" className="dtx-bk-qauthor" id={`${base}.author`} label="Auteur">{t('author')}</Editable>
        </blockquote>
      )
    case 'testimonial':
      return (
        <div className="dtx-bk dtx-bk-card dtx-bk-testi">
          <Editable as="p" className="dtx-bk-testitext" id={`${base}.text`} label="Avis">{t('text')}</Editable>
          <div className="dtx-bk-testifoot">
            <EditableImage id={`${base}.avatar`} src={PLACEHOLDER} className="dtx-bk-avatar" label="Photo" />
            <span className="dtx-bk-testimeta">
              <Editable as="b" className="dtx-bk-testiname" id={`${base}.name`} label="Nom">{t('name')}</Editable>
              <Editable as="i" className="dtx-bk-testirole" id={`${base}.role`} label="Role">{t('role')}</Editable>
            </span>
          </div>
        </div>
      )
    case 'team':
      return (
        <div className="dtx-bk dtx-bk-card dtx-bk-team">
          <EditableImage id={`${base}.avatar`} src={PLACEHOLDER} className="dtx-bk-teamphoto" label="Photo" />
          <Editable as="b" className="dtx-bk-teamname" id={`${base}.name`} label="Nom">{t('name')}</Editable>
          <Editable as="i" className="dtx-bk-teamrole" id={`${base}.role`} label="Role">{t('role')}</Editable>
        </div>
      )
    case 'priceCard':
      return (
        <div className="dtx-bk dtx-bk-card dtx-bk-price">
          <Editable as="div" className="dtx-bk-plan" id={`${base}.plan`} label="Offre">{t('plan')}</Editable>
          <div className="dtx-bk-pricerow">
            <Editable as="span" className="dtx-bk-priceval" id={`${base}.price`} label="Prix">{t('price')}</Editable>
            <Editable as="span" className="dtx-bk-priceper" id={`${base}.period`} label="Periode">{t('period')}</Editable>
          </div>
          <ul className="dtx-bk-pricelist">
            <li><Editable as="span" id={`${base}.f1`} label="Avantage">{t('f1')}</Editable></li>
            <li><Editable as="span" id={`${base}.f2`} label="Avantage">{t('f2')}</Editable></li>
            <li><Editable as="span" id={`${base}.f3`} label="Avantage">{t('f3')}</Editable></li>
          </ul>
          <EditableLink id={`${base}.btn`} label={t('label')} href={defaultHref()} className="btn btn-primary" editLabel="Bouton" />
        </div>
      )
    case 'richtext':
      return (
        <div className="dtx-bk dtx-bk-rich">
          <Editable as="h3" className="dtx-bk-rtitle" id={`${base}.title`} label="Titre">{t('title')}</Editable>
          <Editable as="p" className="dtx-bk-rtext" id={`${base}.text`} label="Texte">{t('text')}</Editable>
          <EditableLink id={`${base}.btn`} label={t('label')} href={defaultHref()} className="btn btn-ghost" editLabel="Bouton" />
        </div>
      )
    case 'heroText':
      return (
        <div className="dtx-bk dtx-bk-herotext">
          <Editable as="p" className="dtx-bk-eyebrow" id={`${base}.eyebrow`} label="Sur-titre">{t('eyebrow')}</Editable>
          <Editable as="h1" className="dtx-bk-herotitle" id={`${base}.title`} label="Titre">{t('title')}</Editable>
          <Editable as="p" className="dtx-bk-text" id={`${base}.text`} label="Texte">{t('text')}</Editable>
          <EditableLink id={`${base}.btn`} label={t('label')} href={defaultHref()} className="btn btn-primary btn-lg" editLabel="Bouton" />
        </div>
      )
    case 'checklist':
      return (
        <div className="dtx-bk dtx-bk-checklist">
          <Editable as="h3" className="dtx-bk-cltitle" id={`${base}.title`} label="Titre">{t('title')}</Editable>
          <ul>
            <li><span className="dtx-bk-check" aria-hidden>&#10003;</span><Editable as="span" id={`${base}.i1`} label="Element">{t('i1')}</Editable></li>
            <li><span className="dtx-bk-check" aria-hidden>&#10003;</span><Editable as="span" id={`${base}.i2`} label="Element">{t('i2')}</Editable></li>
            <li><span className="dtx-bk-check" aria-hidden>&#10003;</span><Editable as="span" id={`${base}.i3`} label="Element">{t('i3')}</Editable></li>
          </ul>
        </div>
      )
    case 'faqItem':
      return (
        <div className="dtx-bk dtx-bk-faq">
          <Editable as="h3" className="dtx-bk-faqq" id={`${base}.q`} label="Question">{t('q')}</Editable>
          <Editable as="p" className="dtx-bk-faqa" id={`${base}.a`} label="Reponse">{t('a')}</Editable>
        </div>
      )
    case 'socialRow':
      return (
        <div className="dtx-bk dtx-bk-social">
          <EditableLink id={`${base}.l1`} label="Facebook" href="#" className="dtx-bk-soc" editLabel="Lien" />
          <EditableLink id={`${base}.l2`} label="Instagram" href="#" className="dtx-bk-soc" editLabel="Lien" />
          <EditableLink id={`${base}.l3`} label="LinkedIn" href="#" className="dtx-bk-soc" editLabel="Lien" />
        </div>
      )
    case 'spacer':
      return <div className="dtx-bk dtx-bk-spacer" />
    case 'divider':
      return <hr className="dtx-bk dtx-bk-divider" />
    default:
      return null
  }
}

const COMP_BTNS: { kind: BlockKind; label: string; icon: string }[] = [
  { kind: 'heading', label: 'Titre', icon: 'T' },
  { kind: 'text', label: 'Paragraphe', icon: 'P' },
  { kind: 'eyebrow', label: 'Sur-titre', icon: '-' },
  { kind: 'badge', label: 'Badge', icon: 'o' },
  { kind: 'button', label: 'Bouton', icon: 'B' },
  { kind: 'image', label: 'Image', icon: 'I' },
  { kind: 'video', label: 'Video', icon: 'V' },
  { kind: 'feature', label: 'Atout', icon: '*' },
  { kind: 'iconText', label: 'Icone + texte', icon: 'i' },
  { kind: 'stat', label: 'Statistique', icon: '9' },
  { kind: 'step', label: 'Etape', icon: '1' },
  { kind: 'quote', label: 'Citation', icon: 'Q' },
  { kind: 'testimonial', label: 'Temoignage', icon: 'C' },
  { kind: 'team', label: 'Equipe', icon: 'U' },
  { kind: 'priceCard', label: 'Carte tarif', icon: '$' },
  { kind: 'richtext', label: 'Texte + bouton', icon: 'R' },
  { kind: 'checklist', label: 'Liste', icon: 'V' },
  { kind: 'faqItem', label: 'Question', icon: '?' },
  { kind: 'socialRow', label: 'Reseaux', icon: '@' },
  { kind: 'spacer', label: 'Espace', icon: '=' },
  { kind: 'divider', label: 'Separateur', icon: '_' },
]

/** A user-added section from the library: a block container. */
function CustomSection({ section }: { section: CustomSection }) {
  const { editMode, addBlock, deleteBlock, beginBlockDrag, setBlockDrop, commitBlockDrop, blockDrop, libHoverSec } =
    useContext(Ctx)
  const blocks = section.blocks || []
  const layout = section.layout || 'stack'
  const [adderOpen, setAdderOpen] = useState(false)
  const isLibHover = libHoverSec === section.id

  const inner = blocks.map((b) => {
    const node = <Block secId={section.id} block={b} />
    if (!editMode) return <div key={b.id} className="dtx-bw">{node}</div>
    const showLine = blockDrop && blockDrop.secId === section.id && blockDrop.beforeId === b.id
    return (
      <div
        key={b.id}
        className={`dtx-bw dtx-bw-edit ${showLine ? 'dtx-bw-dropbefore' : ''}`}
        data-block-id={b.id}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setBlockDrop({ secId: section.id, beforeId: b.id })
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          commitBlockDrop()
        }}
      >
        <span className="dtx-bw-bar">
          <span
            className="dtx-bw-drag"
            draggable
            onDragStart={(e) => {
              e.stopPropagation()
              beginBlockDrag(section.id, b.id)
            }}
            title="Glisser pour deplacer (entre sections aussi)"
          >
            ::
          </span>
          <button type="button" className="dtx-bw-del" title="Supprimer le composant" onClick={() => deleteBlock(section.id, b.id)}>
            &times;
          </button>
        </span>
        {node}
      </div>
    )
  })

  return (
    <section
      className={`dtx-cs dtx-cs-${layout} ${isLibHover ? 'dtx-cs-libhover' : ''}`}
      onDragOver={editMode ? (e) => { e.preventDefault(); setBlockDrop({ secId: section.id, beforeId: null }) } : undefined}
      onDrop={editMode ? (e) => { e.preventDefault(); commitBlockDrop() } : undefined}
    >
      <div className="dtx-cs-wrap">
        <div className={`dtx-cs-grid dtx-cs-grid-${layout}`}>
          {inner}
          {editMode && (
            <div
              className={`dtx-cs-endzone ${blockDrop && blockDrop.secId === section.id && blockDrop.beforeId === null ? 'dtx-bw-dropbefore' : ''}`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setBlockDrop({ secId: section.id, beforeId: null }) }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); commitBlockDrop() }}
            />
          )}
        </div>
        {editMode && (
          <div className="dtx-cs-add">
            <button type="button" className="dtx-cs-addbtn" onClick={() => setAdderOpen((v) => !v)}>
              + Ajouter un composant
            </button>
            {adderOpen && (
              <div className="dtx-cs-addmenu">
                {COMP_BTNS.map((c) => (
                  <button key={c.kind} type="button" onClick={() => { addBlock(section.id, c.kind); setAdderOpen(false) }}>
                    <b>{c.icon}</b> {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  categories: 'Categories',
  catalog: 'Catalogue',
  brands: 'Marques',
  about: 'A propos',
  contact: 'Contact',
}

function sectionWrapStyle(s?: SectionStyle): React.CSSProperties {
  if (!s) return {}
  const css: React.CSSProperties = {}
  if (s.bgColor) css.background = s.bgColor
  if (s.textColor) css.color = s.textColor
  if (typeof s.padTop === 'number') css.paddingTop = s.padTop
  if (typeof s.padBottom === 'number') css.paddingBottom = s.padBottom
  if (s.align) css.textAlign = s.align
  return css
}

export function SectionList({
  nodes,
  defaultOrder,
}: {
  nodes: Record<string, React.ReactNode>
  defaultOrder: string[]
}) {
  const {
    sections,
    sectionBg,
    sectionStyles,
    customSections,
    editMode,
    reorderSections,
    toggleSectionHidden,
    selectSection,
    deleteSection,
    libIndex,
  } = useContext(Ctx)
  const dragId = useRef<string | null>(null)

  const customNodes: Record<string, React.ReactNode> = {}
  for (const cs of customSections) customNodes[cs.id] = <CustomSection section={cs} />
  const allNodes = { ...nodes, ...customNodes }

  const present = [
    ...defaultOrder.filter((id) => allNodes[id] !== undefined),
    ...customSections.map((c) => c.id),
  ]
  const saved = (sections.order || []).filter((id) => present.includes(id))
  const order = [...saved, ...present.filter((id) => !saved.includes(id))]

  function onDropOn(targetId: string) {
    const from = dragId.current
    dragId.current = null
    if (!from || from === targetId) return
    const next = order.filter((x) => x !== from)
    const idx = next.indexOf(targetId)
    next.splice(idx < 0 ? next.length : idx, 0, from)
    reorderSections(next)
  }

  return (
    <>
      {order.map((id, i) => {
        const hidden = (sections.hidden || []).includes(id)
        const isCustom = id.startsWith('custom:')
        const bg = sectionBg[id]
        const sStyle = sectionStyles[id]
        const inner = allNodes[id]
        const wrapStyle = sectionWrapStyle(sStyle)
        const maxW = sStyle?.maxWidth
        let body: React.ReactNode = inner
        if (maxW) body = <div style={{ maxWidth: maxW, marginInline: 'auto' }}>{inner}</div>
        const hasWrap = Object.keys(wrapStyle).length > 0 || !!bg
        const content = hasWrap ? (
          <div
            className="dtx-secbg"
            style={{
              ...wrapStyle,
              ...(bg ? { backgroundImage: `url("${bg}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
            }}
          >
            {body}
          </div>
        ) : (
          body
        )
        if (!editMode) return hidden ? null : <React.Fragment key={id}>{content}</React.Fragment>
        return (
          <React.Fragment key={id}>
            {libIndex === i && <div className="dtx-lib-line" />}
            <div
              className={`dtx-section ${hidden ? 'dtx-section-off' : ''}`}
              data-section-id={id}
              onDragOver={(e) => { if (dragId.current) e.preventDefault() }}
              onDrop={(e) => { e.preventDefault(); onDropOn(id) }}
            >
              <div className="dtx-sec-bar">
                <span
                  className="dtx-sec-handle"
                  draggable
                  onDragStart={() => { dragId.current = id }}
                  onDragEnd={() => { dragId.current = null }}
                  title="Glisser pour reordonner"
                >
                  :: {SECTION_LABELS[id] || (isCustom ? 'Section' : id)}
                </span>
                <span className="dtx-sec-actions">
                  <button type="button" className="dtx-sec-toggle is-primary" onClick={() => selectSection(id)}>Reglages</button>
                  <button type="button" className="dtx-sec-toggle" onClick={() => toggleSectionHidden(id)}>{hidden ? 'Afficher' : 'Masquer'}</button>
                  {isCustom && <button type="button" className="dtx-sec-toggle" onClick={() => deleteSection(id)}>Supprimer</button>}
                </span>
              </div>
              <div className="dtx-sec-body">{content}</div>
            </div>
          </React.Fragment>
        )
      })}
      {editMode && libIndex === order.length && <div className="dtx-lib-line" />}
    </>
  )
}

/** Always-on styling for builder blocks (theme-adaptive + RTL-safe). */
function BuilderStyles() {
  return (
    <style>{`
      .dtx-cs { padding: 64px 0; }
      .dtx-cs-wrap { width: min(1120px, 92vw); margin-inline: auto; }
      .dtx-cs-grid { display: grid; gap: 24px; }
      .dtx-cs-grid-stack { grid-template-columns: 1fr; }
      .dtx-cs-grid-center { grid-template-columns: 1fr; max-width: 760px; margin-inline: auto; text-align: center; justify-items: center; }
      .dtx-cs-grid-cols2 { grid-template-columns: repeat(2, 1fr); align-items: center; }
      .dtx-cs-grid-cols3 { grid-template-columns: repeat(3, 1fr); }
      .dtx-cs-grid-cols4 { grid-template-columns: repeat(4, 1fr); }
      .dtx-cs-grid-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 36px; }
      @media (max-width: 820px) {
        .dtx-cs-grid-cols2, .dtx-cs-grid-cols3, .dtx-cs-grid-cols4 { grid-template-columns: 1fr 1fr; }
      }
      @media (max-width: 520px) {
        .dtx-cs-grid-cols2, .dtx-cs-grid-cols3, .dtx-cs-grid-cols4 { grid-template-columns: 1fr; }
      }
      .dtx-bw { min-width: 0; }
      .dtx-bk-eyebrow { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; letter-spacing: .18em; text-transform: uppercase; opacity: .65; margin: 0 0 8px; }
      .dtx-bk-badgewrap { }
      .dtx-bk-badge { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .04em; padding: 5px 12px; border-radius: 999px; background: var(--cyan, #14b88a); color: #04130d; }
      .dtx-bk-heading { font-size: clamp(26px, 4vw, 42px); font-weight: 800; line-height: 1.08; letter-spacing: -.02em; margin: 0; }
      .dtx-bk-text { font-size: 17px; line-height: 1.7; opacity: .82; margin: 12px 0 0; }
      .dtx-bk-btnwrap { margin-top: 10px; }
      .dtx-bk-image { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; display: block; aspect-ratio: 4 / 3; }
      .dtx-bk-logo { width: 100%; max-width: 140px; height: 48px; object-fit: contain; opacity: .7; filter: grayscale(1); }
      .dtx-bk-video { position: relative; border-radius: 16px; overflow: hidden; }
      .dtx-bk-video-poster { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
      .dtx-bk-play { position: absolute; inset: 0; margin: auto; width: 64px; height: 64px; display: grid; place-items: center; border-radius: 999px; background: color-mix(in srgb, var(--cyan, #14b88a) 90%, transparent); color: #04130d; font-size: 22px; pointer-events: none; }
      .dtx-bk-card { padding: 26px; border: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-radius: 18px; background: color-mix(in srgb, currentColor 4%, transparent); text-align: start; }
      .dtx-bk-feature .dtx-bk-ficon, .dtx-bk-step .dtx-bk-stepnum { display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 12px; background: color-mix(in srgb, var(--cyan, #14b88a) 18%, transparent); color: var(--cyan, #14b88a); font-size: 20px; font-weight: 800; }
      .dtx-bk-ftitle { font-size: 19px; font-weight: 700; margin: 14px 0 6px; }
      .dtx-bk-ftext { font-size: 15px; line-height: 1.6; opacity: .78; margin: 0; }
      .dtx-bk-icontext { display: flex; align-items: center; gap: 12px; }
      .dtx-bk-iticon { display: inline-grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: 9px; background: color-mix(in srgb, var(--cyan,#14b88a) 16%, transparent); color: var(--cyan,#14b88a); font-weight: 800; }
      .dtx-bk-ittext { font-size: 15.5px; }
      .dtx-bk-stat { text-align: center; }
      .dtx-bk-svalue { font-size: clamp(32px, 5vw, 52px); font-weight: 800; letter-spacing: -.02em; color: var(--cyan, #14b88a); }
      .dtx-bk-slabel { font-size: 14px; letter-spacing: .03em; opacity: .7; margin-top: 6px; }
      .dtx-bk-stepnum { font-size: 18px; }
      .dtx-bk-quote { border: 0; margin: 0; padding: 0; }
      .dtx-bk-qtext { font-size: clamp(20px, 3vw, 30px); font-weight: 600; line-height: 1.4; margin: 0; }
      .dtx-bk-qauthor { display: block; font-style: normal; opacity: .65; margin-top: 16px; font-size: 15px; }
      .dtx-bk-testi { display: flex; flex-direction: column; gap: 16px; }
      .dtx-bk-testitext { font-size: 16px; line-height: 1.65; margin: 0; }
      .dtx-bk-testifoot { display: flex; align-items: center; gap: 12px; }
      .dtx-bk-avatar, .dtx-bk-teamphoto { border-radius: 999px; object-fit: cover; }
      .dtx-bk-avatar { width: 44px; height: 44px; }
      .dtx-bk-testimeta { display: flex; flex-direction: column; line-height: 1.3; }
      .dtx-bk-testiname { font-weight: 700; font-size: 14.5px; }
      .dtx-bk-testirole { font-style: normal; opacity: .65; font-size: 13px; }
      .dtx-bk-team { text-align: center; }
      .dtx-bk-teamphoto { width: 96px; height: 96px; margin-inline: auto; }
      .dtx-bk-teamname { display: block; font-weight: 700; margin-top: 14px; }
      .dtx-bk-teamrole { display: block; font-style: normal; opacity: .65; font-size: 14px; }
      .dtx-bk-price { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
      .dtx-bk-plan { font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; opacity: .7; }
      .dtx-bk-pricerow { display: flex; align-items: baseline; gap: 8px; }
      .dtx-bk-priceval { font-size: 38px; font-weight: 800; letter-spacing: -.02em; }
      .dtx-bk-priceper { opacity: .6; font-size: 14px; }
      .dtx-bk-pricelist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; width: 100%; }
      .dtx-bk-pricelist li { font-size: 14.5px; opacity: .82; padding-inline-start: 22px; position: relative; }
      .dtx-bk-pricelist li::before { content: "\\2713"; position: absolute; inset-inline-start: 0; color: var(--cyan, #14b88a); font-weight: 800; }
      .dtx-bk-rich .dtx-bk-rtitle { font-size: 26px; font-weight: 700; margin: 0 0 12px; letter-spacing: -.01em; }
      .dtx-bk-rich .dtx-bk-rtext { font-size: 16px; line-height: 1.7; opacity: .82; margin: 0 0 18px; }
      .dtx-bk-herotext { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: start; }
      .dtx-bk-herotitle { font-size: clamp(34px, 6vw, 64px); font-weight: 800; line-height: 1.02; letter-spacing: -.03em; margin: 6px 0; }
      .dtx-bk-checklist h3.dtx-bk-cltitle { font-size: 22px; font-weight: 700; margin: 0 0 14px; }
      .dtx-bk-checklist ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
      .dtx-bk-checklist li { display: flex; align-items: flex-start; gap: 12px; font-size: 16px; line-height: 1.5; }
      .dtx-bk-check { display: inline-grid; place-items: center; width: 24px; height: 24px; flex: none; border-radius: 999px; background: color-mix(in srgb, var(--cyan,#14b88a) 18%, transparent); color: var(--cyan,#14b88a); font-size: 13px; font-weight: 800; }
      .dtx-bk-faq { padding: 18px 0; border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent); text-align: start; }
      .dtx-bk-faqq { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
      .dtx-bk-faqa { font-size: 15px; line-height: 1.6; opacity: .78; margin: 0; }
      .dtx-bk-social { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .dtx-bk-soc { padding: 9px 16px; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); font-size: 14px; text-decoration: none; color: inherit; }
      .dtx-bk-spacer { min-height: 56px; }
      .dtx-bk-divider { border: 0; border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent); width: 100%; margin: 0; }
    `}</style>
  )
}

function EditChrome() {
  return (
    <style>{`
      html.dtx-edit [data-edit-id] { cursor: pointer; transition: outline .12s ease; }
      html.dtx-edit .dtx-hover { outline: 2px dashed #14b88a; outline-offset: 3px; border-radius: 3px; }
      html.dtx-edit .dtx-sel { outline: 2px solid #14b88a; outline-offset: 3px; border-radius: 3px; }
      html.dtx-edit .dtx-section { position: relative; outline: 1px dashed rgba(20,184,138,0.30); outline-offset: -1px; }
      html.dtx-edit .dtx-section-off .dtx-sec-body { opacity: 0.32; filter: grayscale(0.6); pointer-events: none; }
      html.dtx-edit .dtx-sec-bar { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 5px 10px; background: #0c1f1a; color: #cdeee2; font-size: 12px; font-family: system-ui, sans-serif; }
      html.dtx-edit .dtx-sec-actions { display: inline-flex; gap: 6px; }
      html.dtx-edit .dtx-sec-handle { cursor: grab; font-weight: 600; user-select: none; }
      html.dtx-edit .dtx-sec-toggle { cursor: pointer; border: 1px solid rgba(205,238,226,0.3); background: transparent; color: #cdeee2; border-radius: 6px; padding: 3px 10px; font-size: 11.5px; }
      html.dtx-edit .dtx-sec-toggle.is-primary { background: #14b88a; border-color: #14b88a; color: #04130e; font-weight: 700; }
      html.dtx-edit .dtx-cs-libhover { box-shadow: inset 0 0 0 2px #14b88a; background: rgba(20,184,138,0.05); }
      html.dtx-edit .dtx-lib-line { height: 4px; background: #14b88a; border-radius: 4px; margin: 0 24px; box-shadow: 0 0 12px rgba(20,184,138,.7); }
      html.dtx-edit .dtx-bw-edit { position: relative; }
      html.dtx-edit .dtx-bw-edit:hover { outline: 1px dashed rgba(20,184,138,0.5); outline-offset: 4px; }
      html.dtx-edit .dtx-bw-dropbefore { position: relative; }
      html.dtx-edit .dtx-bw-dropbefore::before { content: ""; position: absolute; inset-inline: -8px; inset-block-start: -8px; height: 4px; background: #14b88a; border-radius: 4px; box-shadow: 0 0 10px rgba(20,184,138,.7); }
      html.dtx-edit .dtx-cs-endzone { min-height: 8px; }
      html.dtx-edit .dtx-cs-grid:has(.dtx-cs-endzone:only-child) { min-height: 40px; }
      html.dtx-edit .dtx-bw-bar { position: absolute; top: -10px; inset-inline-end: -6px; z-index: 40; display: none; gap: 3px; }
      html.dtx-edit .dtx-bw-edit:hover > .dtx-bw-bar { display: inline-flex; }
      html.dtx-edit .dtx-bw-drag, html.dtx-edit .dtx-bw-del { cursor: pointer; width: 22px; height: 22px; line-height: 20px; text-align: center; border-radius: 6px; background: #0c1f1a; color: #cdeee2; font-size: 13px; border: 1px solid rgba(205,238,226,.3); }
      html.dtx-edit .dtx-bw-drag { cursor: grab; }
      html.dtx-edit .dtx-cs-add { margin-top: 24px; text-align: center; position: relative; }
      html.dtx-edit .dtx-cs-addbtn { cursor: pointer; border: 1.5px dashed #14b88a; background: rgba(20,184,138,.08); color: #0f9d75; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 600; }
      html.dtx-edit .dtx-cs-addmenu { position: absolute; inset-inline-start: 50%; transform: translateX(-50%); margin-top: 6px; z-index: 60; background: #0c1f1a; border: 1px solid rgba(205,238,226,.2); border-radius: 12px; padding: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 340px; max-height: 320px; overflow: auto; }
      html.dtx-edit .dtx-cs-addmenu button { cursor: pointer; text-align: start; background: transparent; border: 0; color: #cdeee2; padding: 8px 10px; border-radius: 8px; font-size: 12.5px; }
      html.dtx-edit .dtx-cs-addmenu button:hover { background: rgba(205,238,226,.1); }
      html.dtx-edit .dtx-cs-addmenu button b { display: inline-block; width: 18px; opacity: .7; }
      @media (prefers-reduced-motion: reduce) { html.dtx-edit * { scroll-behavior: auto !important; } }
    `}</style>
  )
}
