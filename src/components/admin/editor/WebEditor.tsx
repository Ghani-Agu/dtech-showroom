'use client'

/**
 * WebEditor — the block-based visual page builder. Multi-page (Shopify-style):
 * it edits the homepage, content pages, dynamic catalog TEMPLATES and custom
 * pages. The current page is selected by `pageKey`; switching navigates to
 * `/editor?page=<key>` so the server re-seeds the doc. Per-page localStorage
 * autosave + server draft/publish keyed by `pageKey`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Monitor, Tablet, Smartphone, Undo2, Redo2, Download, Upload,
  RotateCcw, Eye, Pencil, PanelLeftClose, PanelLeft, Layers, Check,
  ChevronLeft, ExternalLink, Rocket, Palette as PaletteIcon, BookOpen,
  ChevronDown, Plus, Trash2, FileText, LayoutTemplate, Home as HomeIcon, ImagePlus,
  AlignLeft, AlignCenter, AlignRight, Search,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  saveDraft, publishPage, unpublishPage,
  createCustomPage, deleteCustomPage,
} from '@/server/editor-page-actions'
import { saveContentDraft, publishContent, resetContent } from '@/server/content-actions'
import { uploadHeroImage } from '@/server/hero-actions'
import type { EditData, StylePatch, SectionConfig, SectionStyle, CustomSection } from '@/components/site-edit/edit-context'
import { SECTION_PRESETS, COMPONENT_PALETTE, type BlockKind, type EditBlock as PresetBlock, type Layout } from '@/components/site-edit/section-presets'
import {
  type Block, type PageDoc, type Path,
  uid, clone, getAt, updateAt, removeAt, insertAt, moveBlock, countBlocks,
} from './types'
import { createBlock, getDef } from './registry'
import { renderBlock, type RenderCtx } from './BlockRender'
import { mirrorDoc, type SitePageDef } from './site-pages'
import { applyData, SAMPLE_DATA } from './render-context'
import { Palette } from './Palette'
import { Canvas } from './Canvas'
import { Inspector } from './Inspector'
import { DEFAULT_THEME, getTheme } from './themes'
import { ThemeQuickPanel } from './ThemeQuickPanel'
import './editor.css'

const STORAGE_KEY = 'dtech-web-editor:v1'
type Device = 'desktop' | 'tablet' | 'mobile'

/** A page entry shown in the navigator (def + live/draft state). */
export interface PageEntry {
  def: SitePageDef
  published: boolean
  hasDraft: boolean
}

// ───────────────────────── helpers ─────────────────────────

/** Deep-regenerate ids so a cloned/imported subtree has unique ids. */
function regenIds(b: Block): Block {
  return {
    ...b,
    id: uid(),
    children: b.children?.map(regenIds),
  }
}

/**
 * Legacy theme migration — earlier blocks baked Nightline colors into their
 * inline style, which would override a freshly-picked theme. We strip ONLY the
 * exact, un-customised default values so themes apply fully (a user-chosen
 * colour, which never equals these, is preserved).
 */
const LEGACY_STYLE: Record<string, Record<string, unknown>> = {
  statsBand: { bgColor: 'rgba(124,224,195,0.05)' },
  ctaBanner: { gradient: true, bgColor: 'rgba(124,224,195,0.12)', bgColor2: 'rgba(58,112,138,0.18)' },
  footer: { bgColor: 'rgba(4,8,12,0.6)' },
  card: { bgColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(124,224,195,0.18)', borderWidth: 1, radius: 18 },
  divider: { borderColor: 'rgba(124,224,195,0.2)' },
  icon: { textColor: '#7ce0c3' },
}

function migrateBlock(b: Block): Block {
  const legacy = LEGACY_STYLE[b.type]
  let style = b.style
  if (legacy) {
    const next = { ...b.style } as Record<string, unknown>
    let changed = false
    for (const [k, v] of Object.entries(legacy)) {
      if (next[k] === v) {
        delete next[k]
        changed = true
      }
    }
    if (changed) style = next as Block['style']
  }
  return { ...b, style, children: b.children?.map(migrateBlock) }
}

function migrateDoc(doc: PageDoc): PageDoc {
  return { ...doc, blocks: doc.blocks.map(migrateBlock) }
}

// ───────────────────────── component ─────────────────────────

export function WebEditor({
  fullScreen = false,
  initialDoc = null,
  initiallyPublished = false,
  serverEnabled = false,
  pageKey = 'home',
  pageDef,
  pages = [],
  contentDraft = { overrides: {}, styles: {}, sections: { order: [], hidden: [] }, sectionBg: {}, sectionStyles: {}, customSections: [] },
}: {
  fullScreen?: boolean
  initialDoc?: PageDoc | null
  initiallyPublished?: boolean
  serverEnabled?: boolean
  pageKey?: string
  pageDef?: SitePageDef
  pages?: PageEntry[]
  contentDraft?: EditData
} = {}) {
  const router = useRouter()
  const storageKey = `${STORAGE_KEY}:${pageKey}`
  const isTemplate = (initialDoc?.kind ?? pageDef?.kind) === 'template'

  const freshDoc = useCallback(
    () => mirrorDoc(pageKey, { theme: DEFAULT_THEME }),
    [pageKey]
  )

  const [doc, setDoc] = useState<PageDoc>(() =>
    initialDoc ? migrateDoc(initialDoc) : freshDoc()
  )
  const [selectedPath, setSelectedPath] = useState<Path | null>(null)
  const [device, setDevice] = useState<Device>('desktop')
  const [preview, setPreview] = useState(false)
  const [showPalette, setShowPalette] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [saved, setSaved] = useState(false)
  const [published, setPublished] = useState(initiallyPublished)
  const [publishing, setPublishing] = useState(false)
  const [themeQuickOpen, setThemeQuickOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [paletteW, setPaletteW] = useState(288)
  const [inspectorW, setInspectorW] = useState(312)
  const resizing = useRef<{ which: 'p' | 'i'; startX: number; startW: number } | null>(null)
  const theme = doc.theme ?? DEFAULT_THEME
  const uiClass = `${getTheme(theme).dark ? '' : 'we-ui-light'} we-accent-${theme}`.trim()

  const [past, setPast] = useState<PageDoc[]>([])
  const [future, setFuture] = useState<PageDoc[]>([])
  const dragRef = useRef<{ kind: 'new'; type: string } | { kind: 'move'; from: Path } | null>(null)
  const loaded = useRef(false)

  // ── load saved doc once ──
  useEffect(() => {
    if (initialDoc) {
      // server is the source of truth — don't override with localStorage
      loaded.current = true
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as PageDoc
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
        if (parsed && Array.isArray(parsed.blocks)) setDoc(migrateDoc(parsed))
      }
    } catch {
      /* ignore */
    }
    loaded.current = true
  }, [initialDoc, storageKey])

  // ── autosave (debounced) ──
  useEffect(() => {
    if (!loaded.current) return
    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(doc))
      } catch {
        /* ignore quota */
      }
      if (serverEnabled) void saveDraft(pageKey, doc)
      setSaved(true)
      setTimeout(() => setSaved(false), 1400)
    }, 700)
    return () => clearTimeout(id)
  }, [doc, serverEnabled, pageKey, storageKey])

  // ── panel widths: load once + persist + global drag listeners ──
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const pw = Number(localStorage.getItem('dtech-we-paletteW'))
        const iw = Number(localStorage.getItem('dtech-we-inspectorW'))
        if (pw > 0) setPaletteW(pw)
        if (iw > 0) setInspectorW(iw)
      } catch {
        /* ignore */
      }
    }, 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('dtech-we-paletteW', String(paletteW))
      localStorage.setItem('dtech-we-inspectorW', String(inspectorW))
    } catch {
      /* ignore */
    }
  }, [paletteW, inspectorW])

  useEffect(() => {
    function move(e: PointerEvent) {
      const r = resizing.current
      if (!r) return
      const dx = e.clientX - r.startX
      if (r.which === 'p') setPaletteW(Math.max(180, Math.min(460, r.startW + dx)))
      else setInspectorW(Math.max(240, Math.min(560, r.startW - dx)))
    }
    function up() {
      if (resizing.current) {
        resizing.current = null
        document.body.classList.remove('we-resizing')
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  // ── mutation helper: snapshot → mutate blocks ──
  const mutate = useCallback(
    (fn: (blocks: Block[]) => Block[], nextDocPatch?: Partial<PageDoc>) => {
      setPast((p) => [...p, doc].slice(-100))
      setFuture([])
      setDoc((prev) => ({ ...prev, ...nextDocPatch, blocks: fn(prev.blocks) }))
    },
    [doc]
  )

  const undo = useCallback(() => {
    if (past.length === 0) return
    const last = past[past.length - 1]
    if (!last) return
    setFuture((f) => [...f, doc])
    setPast((p) => p.slice(0, -1))
    setDoc(last)
    setSelectedPath(null)
  }, [past, doc])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const next = future[future.length - 1]
    if (!next) return
    setPast((p) => [...p, doc])
    setFuture((f) => f.slice(0, -1))
    setDoc(next)
    setSelectedPath(null)
  }, [future, doc])

  // ── block operations ──
  const addBlock = useCallback(
    (type: string) => {
      const block = createBlock(type)
      const sel = selectedPath ? getAt(doc.blocks, selectedPath) : null
      // drop into selected container, else append at root
      if (sel && getDef(sel.type)?.isContainer && selectedPath) {
        mutate((bs) => insertAt(bs, selectedPath, (sel.children?.length ?? 0), block))
        setSelectedPath([...selectedPath, sel.children?.length ?? 0])
      } else {
        mutate((bs) => [...bs, block])
        setSelectedPath([doc.blocks.length])
      }
    },
    [doc.blocks, selectedPath, mutate]
  )

  const onDropAt = useCallback(
    (parentPath: Path, index: number) => {
      const d = dragRef.current
      if (!d) return
      if (d.kind === 'new') {
        const block = createBlock(d.type)
        mutate((bs) => insertAt(bs, parentPath, index, block))
        setSelectedPath([...parentPath, index])
      } else {
        mutate((bs) => moveBlock(bs, d.from, parentPath, index))
        setSelectedPath(null)
      }
      dragRef.current = null
      setDragging(false)
    },
    [mutate]
  )

  const onTextEdit = useCallback(
    (path: Path, key: string, value: string) => {
      mutate((bs) =>
        updateAt(bs, path, (b) => ({ ...b, props: { ...b.props, [key]: value } }))
      )
    },
    [mutate]
  )

  const onChangeSelected = useCallback(
    (next: Block) => {
      if (!selectedPath) return
      mutate((bs) => updateAt(bs, selectedPath, () => next))
    },
    [selectedPath, mutate]
  )

  const onDelete = useCallback(
    (path: Path) => {
      mutate((bs) => removeAt(bs, path).tree)
      setSelectedPath(null)
    },
    [mutate]
  )

  const onDuplicate = useCallback(
    (path: Path) => {
      const b = getAt(doc.blocks, path)
      if (!b) return
      const copy = regenIds(clone(b))
      const idx = (path[path.length - 1] ?? 0) + 1
      const parent = path.slice(0, -1)
      mutate((bs) => insertAt(bs, parent, idx, copy))
      setSelectedPath([...parent, idx])
    },
    [doc.blocks, mutate]
  )

  const onShift = useCallback(
    (path: Path, dir: -1 | 1) => {
      const parent = path.slice(0, -1)
      const i = path[path.length - 1] ?? 0
      mutate((bs) => moveBlock(bs, path, parent, i + (dir === 1 ? 2 : -1)))
      setSelectedPath([...parent, i + dir])
    },
    [mutate]
  )

  // ── export / import / reset ──
  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.name.replace(/\s+/g, '-').toLowerCase() || 'page'}.dtech.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [doc])

  const fileRef = useRef<HTMLInputElement>(null)
  const importJson = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PageDoc
        if (!parsed || !Array.isArray(parsed.blocks)) throw new Error('bad')
        const fixed: PageDoc = {
          ...parsed,
          id: uid('page'),
          blocks: parsed.blocks.map((b) => regenIds(b)),
        }
        setPast((p) => [...p, doc])
        setFuture([])
        setDoc(fixed)
        setSelectedPath(null)
      } catch {
        alert('Fichier invalide — attendu un export .dtech.json de l’éditeur.')
      }
    }
    reader.readAsText(file)
  }, [doc])

  const reset = useCallback(() => {
    if (!confirm('Réinitialiser cette page avec le modèle par défaut ? Les modifications non exportées seront perdues.')) return
    setPast((p) => [...p, doc])
    setDoc(freshDoc())
    setSelectedPath(null)
  }, [doc, freshDoc])

  // ── publish / unpublish ──
  const routeLabel = pageDef?.routePath ?? '/'
  const doPublish = useCallback(async () => {
    if (!serverEnabled) return
    setPublishing(true)
    try {
      const r = await publishPage(pageKey, doc)
      if (r.ok) {
        setPublished(true)
        toast.success(`Publié — en ligne sur ${routeLabel}`)
      } else {
        toast.error(r.error ?? 'Échec de la publication')
      }
    } catch {
      toast.error('Échec de la publication')
    } finally {
      setPublishing(false)
    }
  }, [doc, serverEnabled, pageKey, routeLabel])

  const doUnpublish = useCallback(async () => {
    if (!serverEnabled) return
    if (!confirm('Dépublier ? La version d’origine de cette page sera restaurée.')) return
    setPublishing(true)
    try {
      const r = await unpublishPage(pageKey)
      if (r.ok) {
        setPublished(false)
        toast.success('Dépublié — la version d’origine est restaurée')
      } else {
        toast.error(r.error ?? 'Échec')
      }
    } catch {
      toast.error('Échec')
    } finally {
      setPublishing(false)
    }
  }, [serverEnabled, pageKey])

  // ── page navigation ──
  const switchPage = useCallback(
    async (key: string) => {
      setPagesOpen(false)
      if (key === pageKey) return
      if (serverEnabled) {
        try {
          await saveDraft(pageKey, doc)
        } catch {
          /* ignore — navigate anyway */
        }
      }
      router.push(`/editor?page=${encodeURIComponent(key)}`)
    },
    [pageKey, doc, serverEnabled, router]
  )

  const newPage = useCallback(async () => {
    const title = window.prompt('Nom de la nouvelle page :', 'Nouvelle page')
    if (!title) return
    const suggested = '/' + title.toLowerCase().trim().replace(/\s+/g, '-')
    const path = window.prompt('Adresse (URL) de la page — ex. /promotions :', suggested)
    if (!path) return
    const r = await createCustomPage({ path, title })
    if (r.ok && r.key) {
      toast.success('Page créée')
      router.push(`/editor?page=${encodeURIComponent(r.key)}`)
    } else {
      toast.error(r.error ?? 'Échec de la création')
    }
  }, [router])

  const removePage = useCallback(
    async (key: string) => {
      if (!confirm('Supprimer cette page personnalisée ? Cette action est définitive.')) return
      const r = await deleteCustomPage(key)
      if (r.ok) {
        toast.success('Page supprimée')
        if (key === pageKey) router.push('/editor?page=home')
        else router.refresh()
      } else {
        toast.error(r.error ?? 'Échec')
      }
    },
    [pageKey, router]
  )

  // ── keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null
      const typing =
        el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        redo()
      } else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selectedPath) {
        e.preventDefault()
        onDelete(selectedPath)
      } else if (e.key === 'Escape') {
        setSelectedPath(null)
        setPagesOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, onDelete, selectedPath])

  const selectedBlock = selectedPath ? getAt(doc.blocks, selectedPath) : null
  const total = useMemo(() => countBlocks(doc.blocks), [doc.blocks])

  function startResize(which: 'p' | 'i', e: React.PointerEvent) {
    e.preventDefault()
    resizing.current = { which, startX: e.clientX, startW: which === 'p' ? paletteW : inspectorW }
    document.body.classList.add('we-resizing')
  }

  const currentLabel = pageDef?.label ?? doc.name
  // Canonical pages are the REAL coded site — show them live (iframe) so the
  // editor shows exactly what visitors see. Custom pages use the block builder.
  const liveMode = !pageKey.startsWith('custom:')
  const previewPath = pageDef?.previewPath ?? '/'

  const editor = (
    <div
      className={`we-root ${fullScreen ? 'is-fullscreen' : ''}`}
      data-preview={preview ? '1' : '0'}
    >
      {/* ───── toolbar (hidden in live mode — Studio chrome takes over) ───── */}
      {!liveMode && (<div className="we-toolbar">
        <div className="we-toolbar-group">
          {!liveMode && (
            <button
              className="we-tool"
              title={showPalette ? 'Masquer les blocs' : 'Afficher les blocs'}
              onClick={() => setShowPalette((v) => !v)}
            >
              {showPalette ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
          )}

          {/* Pages navigator */}
          <div className="we-pagesnav">
            <button
              className="we-pages-btn"
              onClick={() => setPagesOpen((v) => !v)}
              title="Changer de page"
            >
              {isTemplate ? <LayoutTemplate size={14} /> : pageKey === 'home' ? <HomeIcon size={14} /> : <FileText size={14} />}
              <span className="we-pages-cur">{currentLabel}</span>
              <ChevronDown size={14} />
            </button>
            {pagesOpen && pages.length > 0 && (
              <>
                <div className="we-pages-scrim" onClick={() => setPagesOpen(false)} />
                <div className="we-pages-pop" role="menu">
                  {(['Pages', 'Modèles', 'Personnalisées'] as const).map((group) => {
                    const items = pages.filter((p) => p.def.group === group)
                    if (items.length === 0) return null
                    return (
                      <div key={group} className="we-pages-grp">
                        <p className="we-pages-grp-h">{group}</p>
                        {items.map(({ def, published: pub, hasDraft }) => (
                          <div
                            key={def.key}
                            className={`we-pages-row ${def.key === pageKey ? 'is-cur' : ''}`}
                          >
                            <button className="we-pages-item" onClick={() => switchPage(def.key)}>
                              {def.kind === 'template' ? <LayoutTemplate size={13} /> : def.key === 'home' ? <HomeIcon size={13} /> : <FileText size={13} />}
                              <span className="we-pages-lbl">{def.label}</span>
                              <span className="we-pages-path">{def.routePath}</span>
                              <span className={`we-pages-dot ${pub ? 'is-live' : hasDraft ? 'is-draft' : ''}`} title={pub ? 'En ligne' : hasDraft ? 'Brouillon' : 'Vide'} />
                            </button>
                            {def.removable && (
                              <button className="we-pages-del" title="Supprimer la page" onClick={() => removePage(def.key)}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  <button className="we-pages-new" onClick={newPage}>
                    <Plus size={14} /> Nouvelle page
                  </button>
                </div>
              </>
            )}
          </div>

          <span className="we-page-name-wrap">
            <Layers size={14} />
            <input
              className="we-page-name"
              value={doc.name}
              onChange={(e) => setDoc((d) => ({ ...d, name: e.target.value }))}
            />
          </span>
          <span className="we-count">{total} blocs</span>
          {isTemplate && (
            <span className="we-tmpl-pill" title="Page modèle — utilisez des jetons comme {{product.name}} ; l’aperçu montre un exemple.">
              <LayoutTemplate size={12} /> Modèle dynamique
            </span>
          )}
        </div>

        <div className="we-toolbar-group we-device">
          <button className={device === 'desktop' ? 'is-on' : ''} title="Bureau" onClick={() => setDevice('desktop')}>
            <Monitor size={16} />
          </button>
          <button className={device === 'tablet' ? 'is-on' : ''} title="Tablette" onClick={() => setDevice('tablet')}>
            <Tablet size={16} />
          </button>
          <button className={device === 'mobile' ? 'is-on' : ''} title="Mobile" onClick={() => setDevice('mobile')}>
            <Smartphone size={16} />
          </button>
        </div>

        {!liveMode && (
        <div className="we-toolbar-group">
          <button className="we-tool" title="Annuler (Ctrl+Z)" disabled={past.length === 0} onClick={undo}>
            <Undo2 size={16} />
          </button>
          <button className="we-tool" title="Rétablir (Ctrl+Shift+Z)" disabled={future.length === 0} onClick={redo}>
            <Redo2 size={16} />
          </button>
          <span className="we-divider-v" />
          <button className={`we-tool ${preview ? 'is-on' : ''}`} title="Aperçu" onClick={() => { setPreview((v) => !v); setSelectedPath(null) }}>
            {preview ? <Pencil size={16} /> : <Eye size={16} />}
            <span className="we-tool-label">{preview ? 'Éditer' : 'Aperçu'}</span>
          </button>
          <span className="we-divider-v" />
          <button className="we-tool" title="Importer un design" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
          </button>
          <button className="we-tool" title="Exporter le design (JSON)" onClick={exportJson}>
            <Download size={16} />
          </button>
          <button className="we-tool" title="Réinitialiser" onClick={reset}>
            <RotateCcw size={16} />
          </button>
          <span className={`we-saved ${saved ? 'show' : ''}`}><Check size={13} /> Enregistré</span>
          {serverEnabled && (
            <>
              <span className="we-divider-v" />
              <span className={`we-pub-status ${published ? 'is-live' : ''}`}>
                {published ? '● En ligne' : '○ Brouillon'}
              </span>
              {published && (
                <button className="we-tool" onClick={doUnpublish} disabled={publishing} title="Dépublier — restaurer la version d’origine">
                  Dépublier
                </button>
              )}
              <button className="we-publish-btn" onClick={doPublish} disabled={publishing} title={`Publier sur ${routeLabel}`}>
                <Rocket size={15} />
                {publishing ? 'Publication…' : published ? 'Republier' : 'Publier'}
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importJson(f)
              e.target.value = ''
            }}
          />
        </div>
        )}
      </div>)}

      {/* ───── workspace ───── */}
      <div className="we-workspace">
        {liveMode ? (
          <LiveEditor
            src={`${previewPath}${previewPath.includes('?') ? '&' : '?'}edit=1`}
            device={device}
            setDevice={setDevice}
            isHome={pageKey === 'home'}
            pageKey={pageKey}
            pageLabel={currentLabel}
            pages={pages}
            onSwitchPage={switchPage}
            previewPath={previewPath}
            initialContent={contentDraft}
          />
        ) : (
          <>
            {!preview && showPalette && (
              <Palette
                theme={theme}
                onAdd={addBlock}
                onDragNew={(type) => {
                  dragRef.current = { kind: 'new', type }
                  setDragging(true)
                }}
                onDragEnd={() => {
                  dragRef.current = null
                  setDragging(false)
                }}
                width={paletteW}
              />
            )}
            {!preview && showPalette && (
              <div className="we-resizer" onPointerDown={(e) => startResize('p', e)} />
            )}
            {preview ? (
              <PreviewStage doc={doc} device={device} theme={theme} data={SAMPLE_DATA} />
            ) : (
              <Canvas
                doc={doc}
                device={device}
                theme={theme}
                selectedPath={selectedPath}
                dragging={dragging}
                onSelect={setSelectedPath}
                onTextEdit={onTextEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onShift={onShift}
                onBeginMove={(path) => {
                  dragRef.current = { kind: 'move', from: path }
                  setDragging(true)
                }}
                onDropAt={onDropAt}
                onDragEndAll={() => {
                  dragRef.current = null
                  setDragging(false)
                }}
              />
            )}
            {!preview && (
              <div className="we-resizer" onPointerDown={(e) => startResize('i', e)} />
            )}
            {!preview && selectedBlock && selectedPath && (
              <Inspector
                key={selectedPath.join('-')}
                block={selectedBlock}
                onChange={onChangeSelected}
                onClose={() => setSelectedPath(null)}
                width={inspectorW}
              />
            )}
            {!preview && !selectedBlock && (
              <div className="we-insp we-insp-hint" style={{ width: inspectorW }}>
                <p className="we-insp-kicker">Réglages</p>
                <p className="we-insp-empty">
                  Cliquez sur un élément pour le modifier, ou glissez un bloc
                  depuis la gauche.
                </p>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )

  if (!fullScreen) return editor

  return (
    <div className={`we-app ${uiClass}`}>
      <header className="we-appbar">
        <div className="we-appbar-left">
          <Link className="we-exit" href="/admin" title="Revenir à l’administration">
            <ChevronLeft size={16} />
            <span>Quitter</span>
          </Link>
          <span className="we-appbar-brand">
            D-Tech<span style={{ color: 'var(--c-mint)' }}>.</span>
            <span className="we-appbar-sep">/</span>
            <span className="we-appbar-mode">Éditeur web</span>
          </span>
        </div>
        <div className="we-appbar-right">
          <button
            type="button"
            className="we-appbar-btn"
            onClick={() => setThemeQuickOpen(true)}
            title="Changer de thème rapidement (aperçu en direct)"
          >
            <PaletteIcon size={15} /> Thèmes
          </button>
          <Link
            className="we-appbar-link"
            href={`/editor/themes?page=${encodeURIComponent(pageKey)}`}
            title="Ouvrir la bibliothèque complète des thèmes"
          >
            Bibliothèque <ExternalLink size={13} />
          </Link>
          <Link
            className="we-appbar-btn"
            href="/editor/guide"
            title="Guide complet — comment utiliser l’éditeur"
          >
            <BookOpen size={15} /> Guide
          </Link>
          {pageKey === 'home' && (
            <Link
              className="we-appbar-btn"
              href="/editor/hero"
              title="Modifier le hero (slider) de la page d’accueil"
            >
              <ImagePlus size={15} /> Hero
            </Link>
          )}
          <Link className="we-appbar-link" href={pageDef?.previewPath ?? '/'} target="_blank" rel="noopener noreferrer">
            Voir le site <ExternalLink size={13} />
          </Link>
        </div>
      </header>
      {editor}
      <ThemeQuickPanel
        open={themeQuickOpen}
        onClose={() => setThemeQuickOpen(false)}
        doc={doc}
        pageKey={pageKey}
        hasSavedPage={serverEnabled || saved}
        published={published}
        onApplied={(themeId) => {
          // Update local doc so the canvas + the inspector reflect the new
          // theme immediately, without waiting for a navigation/refresh.
          setDoc((d) => ({ ...d, theme: themeId }))
        }}
      />
    </div>
  )
}

// ───────────────────────── live canvas (real site iframe) ─────────────────────────

function LiveEditor({
  src,
  device,
  setDevice,
  isHome,
  pageKey,
  pageLabel,
  pages,
  onSwitchPage,
  previewPath,
  initialContent,
}: {
  src: string
  device: Device
  setDevice: (d: Device) => void
  isHome: boolean
  pageKey: string
  pageLabel: string
  pages: PageEntry[]
  onSwitchPage: (key: string) => void
  previewPath: string
  initialContent: EditData
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>(initialContent?.overrides ?? {})
  const [styles, setStyles] = useState<Record<string, StylePatch>>(initialContent?.styles ?? {})
  const [sections, setSections] = useState<SectionConfig>(initialContent?.sections ?? { order: [], hidden: [] })
  const [sectionBg, setSectionBg] = useState<Record<string, string>>(initialContent?.sectionBg ?? {})
  const [sectionStyles, setSectionStyles] = useState<Record<string, SectionStyle>>(initialContent?.sectionStyles ?? {})
  const [customSections, setCustomSections] = useState<CustomSection[]>(initialContent?.customSections ?? [])
  const [sectionBlocks, setSectionBlocks] = useState<Record<string, PresetBlock[]>>(initialContent?.sectionBlocks ?? {})
  const [selSection, setSelSection] = useState<{ id: string; isCustom: boolean; layout: Layout } | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const imgFileRef = useRef<HTMLInputElement>(null)
  const blockImgId = useRef<string | null>(null)
  // The site theme is set on /editor/themes; the editor just preserves it
  // through saves/publishes so other edits don't wipe it.
  const themeRef = useRef<string | undefined>(initialContent?.theme)
  const dataRef = useRef<EditData>({ overrides, styles, sections, sectionBg, sectionStyles, customSections, sectionBlocks, theme: themeRef.current })
  dataRef.current = { overrides, styles, sections, sectionBg, sectionStyles, customSections, sectionBlocks, theme: themeRef.current }
  const [sel, setSel] = useState<{ id: string; editType: string; value: string; label: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pastRef = useRef<EditData[]>([])
  const futureRef = useRef<EditData[]>([])
  const [, bumpHist] = useState(0)
  const lastEdit = useRef<{ key: string; t: number }>({ key: '', t: 0 })

  function snapshot(): EditData {
    return {
      overrides: { ...dataRef.current.overrides },
      styles: { ...dataRef.current.styles },
      sections: { ...dataRef.current.sections },
      sectionBg: { ...dataRef.current.sectionBg },
      sectionStyles: { ...dataRef.current.sectionStyles },
      customSections: [...dataRef.current.customSections],
      sectionBlocks: { ...dataRef.current.sectionBlocks },
      theme: themeRef.current,
    }
  }
  function pushHistory(key: string) {
    const now = Date.now()
    if (lastEdit.current.key === key && now - lastEdit.current.t < 900) {
      lastEdit.current.t = now
      return
    }
    lastEdit.current = { key, t: now }
    pastRef.current = [...pastRef.current.slice(-49), snapshot()]
    futureRef.current = []
    bumpHist((x) => x + 1)
  }
  function applyHist(data: EditData) {
    dataRef.current = { overrides: { ...data.overrides }, styles: { ...data.styles }, sections: dataRef.current.sections, sectionBg: dataRef.current.sectionBg, sectionStyles: dataRef.current.sectionStyles, customSections: dataRef.current.customSections, theme: themeRef.current }
    setOverrides({ ...data.overrides })
    setStyles({ ...data.styles })
    postSnapshot()
    scheduleSave()
  }
  function undo() {
    if (!pastRef.current.length) return
    const prev = pastRef.current[pastRef.current.length - 1]!
    futureRef.current = [...futureRef.current, snapshot()]
    pastRef.current = pastRef.current.slice(0, -1)
    lastEdit.current = { key: '', t: 0 }
    applyHist(prev)
    bumpHist((x) => x + 1)
  }
  function redo() {
    if (!futureRef.current.length) return
    const nxt = futureRef.current[futureRef.current.length - 1]!
    pastRef.current = [...pastRef.current, snapshot()]
    futureRef.current = futureRef.current.slice(0, -1)
    lastEdit.current = { key: '', t: 0 }
    applyHist(nxt)
    bumpHist((x) => x + 1)
  }

  const post = (msg: Record<string, unknown>) =>
    iframeRef.current?.contentWindow?.postMessage({ source: 'dtech-editor', ...msg }, '*')
  const postSnapshot = () =>
    post({
      type: 'snapshot',
      overrides: dataRef.current.overrides,
      styles: dataRef.current.styles,
      sections: dataRef.current.sections,
      sectionBg: dataRef.current.sectionBg,
      sectionStyles: dataRef.current.sectionStyles,
      customSections: dataRef.current.customSections,
      sectionBlocks: dataRef.current.sectionBlocks ?? {},
    })
  // Post a snapshot built from explicit values merged over the current data.
  // Used by inserts that may run from a native message handler (drag-drop),
  // where React's async render flush would race a dataRef-based snapshot.
  const postSnapshotFrom = (over: Partial<EditData>) =>
    post({
      type: 'snapshot',
      overrides: over.overrides ?? dataRef.current.overrides,
      styles: over.styles ?? dataRef.current.styles,
      sections: over.sections ?? dataRef.current.sections,
      sectionBg: over.sectionBg ?? dataRef.current.sectionBg,
      sectionStyles: over.sectionStyles ?? dataRef.current.sectionStyles,
      customSections: over.customSections ?? dataRef.current.customSections,
      sectionBlocks: over.sectionBlocks ?? dataRef.current.sectionBlocks ?? {},
    })

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data
      if (!d || d.source !== 'dtech-site') return
      if (d.type === 'ready') {
        postSnapshot()
      } else if (d.type === 'deleteSection' && typeof d.id === 'string') {
        const did = d.id as string
        const orphan = (k: string) => k === did || k.startsWith(did + '.')
        setCustomSections((cs) => cs.filter((c) => c.id !== did))
        setSections((sx) => ({ ...sx, order: (sx.order || []).filter((x) => x !== did), hidden: (sx.hidden || []).filter((x) => x !== did) }))
        setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !orphan(k))))
        setStyles((s) => Object.fromEntries(Object.entries(s).filter(([k]) => !orphan(k))))
        setSectionBg((b) => Object.fromEntries(Object.entries(b).filter(([k]) => !orphan(k))))
        setTimeout(() => { postSnapshot(); scheduleSave() }, 0)
      } else if (d.type === 'selectSection' && typeof d.id === 'string') {
        setSel(null)
        setSelSection({ id: d.id as string, isCustom: !!d.isCustom, layout: (d.layout as Layout) || 'stack' })
      } else if (d.type === 'customSections' && Array.isArray(d.customSections)) {
        setCustomSections(d.customSections as CustomSection[])
        scheduleSave()
      } else if (d.type === 'sectionBlocks' && d.sectionBlocks && typeof d.sectionBlocks === 'object') {
        setSectionBlocks(d.sectionBlocks as Record<string, PresetBlock[]>)
        scheduleSave()
      } else if (d.type === 'libInsertAt' && typeof d.index === 'number') {
        // Payload travels in the message itself. By the time this round-trips
        // back from the iframe, the native dragend has already reset the drag
        // state/ref (libDragRef.current = libDrag, now null), so we must NOT
        // depend on libDragRef here — that was the drop-does-nothing bug.
        if (typeof d.presetId === 'string') addSection(d.presetId as string, d.index as number)
        else if (typeof d.blockKind === 'string') addBlockSection(d.blockKind as BlockKind, d.index as number)
        setLibDrag(null)
      } else if (d.type === 'reorder' && Array.isArray(d.order)) {
        setSections((s) => ({ ...s, order: d.order as string[] }))
        scheduleSave()
      } else if (d.type === 'section' && typeof d.id === 'string') {
        setSections((s) => {
          const hid = s.hidden || []
          const hidden = d.hidden ? [...new Set([...hid, d.id as string])] : hid.filter((x) => x !== d.id)
          return { ...s, hidden }
        })
        scheduleSave()
      } else if (d.type === 'select' && typeof d.id === 'string') {
        const id = d.id as string
        setSelSection(null)
        setSel({
          id,
          editType: (d.editType as string) || 'text',
          value: dataRef.current.overrides[id] ?? (d.value as string) ?? '',
          label: (d.label as string) || id,
        })
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await saveContentDraft(pageKey, dataRef.current)
      } finally {
        setSaving(false)
      }
    }, 600)
  }

  function editText(value: string) {
    if (!sel) return
    pushHistory('text:' + sel.id)
    setOverrides((o) => ({ ...o, [sel.id]: value }))
    setSel({ ...sel, value })
    post({ type: 'text', id: sel.id, value })
    scheduleSave()
  }
  function editLink(next: { label: string; href: string }) {
    if (!sel) return
    pushHistory('link:' + sel.id)
    const value = JSON.stringify(next)
    setOverrides((o) => ({ ...o, [sel.id]: value }))
    setSel({ ...sel, value })
    post({ type: 'link', id: sel.id, value })
    scheduleSave()
  }
  function editStyle(patch: StylePatch) {
    if (!sel) return
    pushHistory('style:' + sel.id)
    setStyles((s) => ({ ...s, [sel.id]: { ...(s[sel.id] || {}), ...patch } }))
    post({ type: 'style', id: sel.id, patch })
    scheduleSave()
  }

  async function publish() {
    setPublishing(true)
    try {
      const r = await publishContent(pageKey, dataRef.current)
      if (r.ok) toast.success('Publié — vos changements sont en ligne')
      else toast.error(r.error ?? 'Échec de la publication')
    } finally {
      setPublishing(false)
    }
  }

  async function resetPage() {
    if (!window.confirm('Réinitialiser cette page à son contenu d’origine ? Vos modifications seront supprimées.')) return
    setPublishing(true)
    try {
      const r = await resetContent(pageKey)
      if (r.ok) {
        const empty: EditData = { overrides: {}, styles: {}, sections: { order: [], hidden: [] }, sectionBg: {}, sectionStyles: {}, customSections: [], sectionBlocks: {} }
        setOverrides({}); setStyles({}); setSections({ order: [], hidden: [] }); setSectionBg({}); setSectionStyles({}); setCustomSections([]); setSectionBlocks({})
        setSel(null); setSelSection(null)
        pastRef.current = []; futureRef.current = []
        dataRef.current = empty
        post({ type: 'snapshot', ...empty })
        toast.success('Page réinitialisée')
      } else {
        toast.error(r.error ?? 'Échec de la réinitialisation')
      }
    } finally {
      setPublishing(false)
    }
  }

  function applyBg(url: string) {
    if (!selSection) return
    const id = selSection.id
    setSectionBg((m) => {
      const next = { ...m }
      if (url) next[id] = url
      else delete next[id]
      return next
    })
    post({ type: 'sectionBg', id, url })
    scheduleSave()
  }
  async function doUploadBg(file: File) {
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await uploadHeroImage(fd)
      if (r.ok) applyBg(r.url)
      else toast.error(r.error ?? "Échec de l'envoi")
    } finally {
      setUploadingImg(false)
    }
  }
  function setBlockImage(url: string) {
    if (!sel || sel.editType !== 'image') return
    const id = sel.id
    pushHistory('image:' + id)
    setOverrides((o) => ({ ...o, [id]: url }))
    setSel((s) => (s ? { ...s, value: url } : s))
    post({ type: 'image', id, value: url })
    scheduleSave()
  }
  async function doUploadBlockImage(file: File) {
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await uploadHeroImage(fd)
      if (r.ok) setBlockImage(r.url)
      else toast.error(r.error ?? "Échec de l'envoi")
    } finally {
      setUploadingImg(false)
    }
  }

  /** Section-level settings (background colour, padding, width, align, text colour). */
  function applySectionStyle(patch: Partial<SectionStyle>) {
    if (!selSection) return
    const id = selSection.id
    pushHistory('secstyle:' + id)
    setSectionStyles((m) => {
      const cur = { ...(m[id] || {}), ...patch }
      // drop empty values
      for (const k of Object.keys(cur) as (keyof SectionStyle)[]) {
        const v = cur[k]
        if (v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))) delete cur[k]
      }
      return { ...m, [id]: cur }
    })
    post({ type: 'sectionStyle', id, patch })
    scheduleSave()
  }
  function setSectionLayout(layout: Layout) {
    if (!selSection) return
    const id = selSection.id
    setSelSection((s) => (s ? { ...s, layout } : s))
    setCustomSections((cs) => cs.map((c) => (c.id === id ? { ...c, layout } : c)))
    post({ type: 'sectionLayout', id, layout })
    scheduleSave()
  }

  function addSection(presetId: string, atIndex?: number) {
    const preset = SECTION_PRESETS.find((p) => p.id === presetId)
    const id = `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
    const blocks: PresetBlock[] = (preset?.blocks ?? ['heading', 'text']).map((kind: BlockKind) => ({
      id: 'b' + Math.random().toString(36).slice(2, 8),
      kind,
    }))
    const layout: Layout = preset?.layout ?? 'stack'
    // current rendered order of editable sections (real + custom)
    const real = isHome ? ['hero', 'categories', 'catalog', 'brands', 'about', 'contact'] : []
    const curCustoms = dataRef.current.customSections.map((c) => c.id)
    const present = [...real, ...curCustoms]
    const savedOrd = (dataRef.current.sections.order || []).filter((x) => present.includes(x))
    const curOrder = [...savedOrd, ...present.filter((x) => !savedOrd.includes(x))]
    const insertAt = typeof atIndex === 'number' && atIndex >= 0 && atIndex <= curOrder.length ? atIndex : curOrder.length
    const nextOrder = [...curOrder]
    nextOrder.splice(insertAt, 0, id)
    const newCustom = { id, type: presetId, layout, blocks }
    const nextCustoms = [...dataRef.current.customSections, newCustom]
    const nextSections = { ...dataRef.current.sections, order: nextOrder }
    setCustomSections((cs) => [...cs, newCustom])
    setSections((sx) => ({ ...sx, order: nextOrder }))
    setAddOpen(false)
    // Post from freshly-computed values (not the async-synced dataRef): this is
    // also invoked from the drag-drop message handler, where React's render
    // flush races setTimeout and would otherwise post a stale snapshot — the
    // canvas-shows-nothing bug.
    postSnapshotFrom({ customSections: nextCustoms, sections: nextSections })
    scheduleSave()
    toast.success('Section ajoutée')
  }

  // Create a new custom section seeded with a single block of `kind`, inserted
  // at `atIndex`. Used when a component is dragged from the palette and dropped
  // on the canvas outside any existing block-container section.
  function addBlockSection(kind: BlockKind, atIndex?: number) {
    const id = `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
    const blocks: PresetBlock[] = [{ id: 'b' + Math.random().toString(36).slice(2, 8), kind }]
    const real = isHome ? ['hero', 'categories', 'catalog', 'brands', 'about', 'contact'] : []
    const curCustoms = dataRef.current.customSections.map((c) => c.id)
    const present = [...real, ...curCustoms]
    const savedOrd = (dataRef.current.sections.order || []).filter((x) => present.includes(x))
    const curOrder = [...savedOrd, ...present.filter((x) => !savedOrd.includes(x))]
    const insertAt = typeof atIndex === 'number' && atIndex >= 0 && atIndex <= curOrder.length ? atIndex : curOrder.length
    const nextOrder = [...curOrder]
    nextOrder.splice(insertAt, 0, id)
    const newCustom = { id, type: kind, layout: 'stack' as Layout, blocks }
    const nextCustoms = [...dataRef.current.customSections, newCustom]
    const nextSections = { ...dataRef.current.sections, order: nextOrder }
    setCustomSections((cs) => [...cs, newCustom])
    setSections((sx) => ({ ...sx, order: nextOrder }))
    postSnapshotFrom({ customSections: nextCustoms, sections: nextSections })
    scheduleSave()
    toast.success('Bloc ajouté')
  }

  const curStyle: StylePatch = sel ? styles[sel.id] || {} : {}
  let linkVal = { label: '', href: '' }
  if (sel?.editType === 'link') {
    try {
      linkVal = { ...linkVal, ...(JSON.parse(sel.value) as { label: string; href: string }) }
    } catch {
      /* ignore */
    }
  }

  // ── Studio chrome state ──────────────────────────────────────────────
  const [railTab, setRailTab] = useState<'layers' | 'insert' | 'pages' | 'theme'>('layers')
  const [zoom, setZoom] = useState(70)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [cmdkQ, setCmdkQ] = useState('')
  type LibDrag = { kind: 'section'; presetId: string } | { kind: 'component'; blockKind: BlockKind } | null
  const [libDrag, setLibDrag] = useState<LibDrag>(null)
  const libDragRef = useRef<LibDrag>(null)
  libDragRef.current = libDrag
  // ── Studio: hover/focus help-card for library items ─────────────────
  const [help, setHelp] = useState<HelpInfo | null>(null)
  const showHelp = (el: HTMLElement, title: string, purpose: string, layout: Layout, blocks: BlockKind[]) => {
    const r = el.getBoundingClientRect()
    setHelp({ title, purpose, layout, blocks, rect: { top: r.top, right: r.right } })
  }
  const hideHelp = () => setHelp(null)

  const DEF_HOME_ORDER = ['hero', 'categories', 'catalog', 'brands', 'about', 'contact']
  const presentReal = isHome ? DEF_HOME_ORDER : []
  const customIds = customSections.map((c) => c.id)
  const savedOrder = (sections.order || []).filter((id) => presentReal.includes(id) || customIds.includes(id))
  const layerIds = [
    ...savedOrder,
    ...presentReal.filter((id) => !savedOrder.includes(id)),
    ...customIds.filter((id) => !savedOrder.includes(id)),
  ]
  const hiddenSet = new Set(sections.hidden || [])
  function sectionLabel(id: string): string {
    if (SEC_LABELS[id]) return SEC_LABELS[id]
    const cs = customSections.find((c) => c.id === id)
    if (cs) return SECTION_PRESETS.find((p) => p.id === cs.type)?.label ?? 'Section'
    return id
  }
  function sectionSub(id: string): string {
    const cs = customSections.find((c) => c.id === id)
    return cs ? cs.type : id
  }
  function selectLayer(id: string) {
    setSel(null)
    const cs = customSections.find((c) => c.id === id)
    setSelSection({ id, isCustom: !!cs, layout: (cs?.layout as Layout) || 'stack' })
    post({ type: 'scrollToSection', id })
  }
  function layerReorder(fromId: string, toId: string) {
    if (fromId === toId) return
    const base = layerIds
    const next = base.filter((x) => x !== fromId)
    const idx = next.indexOf(toId)
    next.splice(idx < 0 ? next.length : idx, 0, fromId)
    setSections((s) => ({ ...s, order: next }))
    post({ type: 'reorder', order: next })
    scheduleSave()
  }
  function toggleVisible(id: string) {
    setSections((s) => {
      const hid = s.hidden || []
      const hidden = hid.includes(id) ? hid.filter((x) => x !== id) : [...hid, id]
      post({ type: 'section', id, hidden: hidden.includes(id) })
      return { ...s, hidden }
    })
    scheduleSave()
  }
  function duplicateLayer(id: string) {
    const cs = customSections.find((c) => c.id === id)
    if (!cs) return
    const nid = `custom:${Date.now().toString(36)}`
    const blocks = (cs.blocks || []).map((b) => ({ id: 'b' + Math.random().toString(36).slice(2, 8), kind: b.kind }))
    setCustomSections((arr) => [...arr, { id: nid, type: cs.type, layout: cs.layout, blocks }])
    setSections((s) => {
      const ord = s.order && s.order.length ? s.order : layerIds
      const i = ord.indexOf(id)
      const no = [...ord]
      no.splice(i < 0 ? no.length : i + 1, 0, nid)
      return { ...s, order: no }
    })
    setTimeout(() => { postSnapshot(); scheduleSave() }, 0)
  }
  const studioCommands = [
    ...SECTION_PRESETS.map((p) => ({ id: 'add:' + p.id, label: 'Ajouter — ' + p.label, run: () => addSection(p.id) })),
    { id: 'publish', label: 'Publier les changements', run: () => { void publish() } },
    { id: 'reset', label: 'Réinitialiser la page', run: () => { void resetPage() } },
    { id: 'dev-desktop', label: 'Aperçu — Bureau', run: () => setDevice('desktop') },
    { id: 'dev-tablet', label: 'Aperçu — Tablette', run: () => setDevice('tablet') },
    { id: 'dev-mobile', label: 'Aperçu — Mobile', run: () => setDevice('mobile') },
  ]
  const cmdkResults = studioCommands.filter((c) => c.label.toLowerCase().includes(cmdkQ.toLowerCase()))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdkOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setCmdkOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const layerDrag = useRef<string | null>(null)
  function deleteCustomNow(did: string) {
    const orphan = (k: string) => k === did || k.startsWith(did + '.')
    setCustomSections((cs) => cs.filter((c) => c.id !== did))
    setSections((sx) => ({ ...sx, order: (sx.order || []).filter((x) => x !== did), hidden: (sx.hidden || []).filter((x) => x !== did) }))
    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !orphan(k))))
    setStyles((s) => Object.fromEntries(Object.entries(s).filter(([k]) => !orphan(k))))
    setSectionBg((b) => Object.fromEntries(Object.entries(b).filter(([k]) => !orphan(k))))
    setSelSection((s) => (s && s.id === did ? null : s))
    setTimeout(() => { postSnapshot(); scheduleSave() }, 0)
  }

  const frameW = device === 'desktop' ? 1280 : device === 'tablet' ? 834 : 390
  return (
    <div className="st-root" data-device={device}>
      <header className="st-top">
        <div className="st-top-l">
          <span className="st-logo"><b>D</b> Studio<i>.</i></span>
          <span className="st-page"><HomeIcon size={13} /> {pageLabel}</span>
          <span className="st-saved">{saving ? 'Enregistrement…' : '● Enregistré'}</span>
        </div>
        <div className="st-top-c">
          <span className="st-devices">
            <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')} title="Bureau"><Monitor size={15} /></button>
            <button className={device === 'tablet' ? 'on' : ''} onClick={() => setDevice('tablet')} title="Tablette"><Tablet size={15} /></button>
            <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')} title="Mobile"><Smartphone size={15} /></button>
          </span>
          <span className="st-zoom">
            <button onClick={() => setZoom((z) => Math.max(25, z - 10))}>−</button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(150, z + 10))}>+</button>
          </span>
          <button className="st-cmd" onClick={() => setCmdkOpen(true)}><Search size={13} /> Commandes <kbd>⌘K</kbd></button>
        </div>
        <div className="st-top-r">
          <button className="st-icbtn" onClick={undo} disabled={pastRef.current.length === 0} title="Annuler"><Undo2 size={15} /></button>
          <button className="st-icbtn" onClick={redo} disabled={futureRef.current.length === 0} title="Rétablir"><Redo2 size={15} /></button>
          <a className="st-ghost" href={previewPath} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Aperçu</a>
          <button className="st-publish" onClick={publish} disabled={publishing}><Rocket size={14} /> {publishing ? 'Publication…' : 'Publier'}</button>
        </div>
      </header>
      <div className="st-main">
        <nav className="st-rail">
          <button className={railTab === 'layers' ? 'on' : ''} onClick={() => setRailTab('layers')} title="Calques"><Layers size={18} /></button>
          <button className={railTab === 'insert' ? 'on' : ''} onClick={() => setRailTab('insert')} title="Insérer"><Plus size={18} /></button>
          <button className={railTab === 'pages' ? 'on' : ''} onClick={() => setRailTab('pages')} title="Pages"><FileText size={18} /></button>
          <button className={railTab === 'theme' ? 'on' : ''} onClick={() => setRailTab('theme')} title="Thème"><PaletteIcon size={18} /></button>
        </nav>
        <aside className="st-left">
          {railTab === 'layers' && (
            <div className="st-layers">
              <div className="st-panel-h">Calques <span className="st-pill">{layerIds.length - hiddenSet.size} visibles</span></div>
              {isHome && (
                <>
                  <p className="st-grp">Fixe · Haut</p>
                  <div className="st-layer is-fixed"><span className="st-l-ic"><PanelLeft size={14} /></span><span className="st-l-tx"><b>En-tête</b><i>header</i></span><span className="st-fixed">Fixe</span></div>
                </>
              )}
              <p className="st-grp">Sections · glissez pour réordonner</p>
              {layerIds.length === 0 && <p className="st-empty">Cette page n’a pas de sections modulaires.</p>}
              {layerIds.map((id) => {
                const isCustom = id.startsWith('custom:')
                const hidden = hiddenSet.has(id)
                const active = selSection?.id === id
                return (
                  <div
                    key={id}
                    className={`st-layer ${active ? 'is-active' : ''} ${hidden ? 'is-off' : ''}`}
                    draggable
                    onDragStart={() => { layerDrag.current = id }}
                    onDragEnd={() => { layerDrag.current = null }}
                    onDragOver={(e) => { if (layerDrag.current || libDragRef.current) e.preventDefault() }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const ld = libDragRef.current
                      if (ld) {
                        if (ld.kind === 'section') addSection(ld.presetId, layerIds.indexOf(id))
                        else if (ld.kind === 'component' && id.startsWith('custom:')) post({ type: 'addBlockTo', secId: id, kind: ld.blockKind })
                        setLibDrag(null)
                        return
                      }
                      if (layerDrag.current) layerReorder(layerDrag.current, id)
                    }}
                    onClick={() => selectLayer(id)}
                  >
                    <span className="st-l-grip">⠿</span>
                    <span className="st-l-ic"><LayoutTemplate size={14} /></span>
                    <span className="st-l-tx"><b>{sectionLabel(id)}</b><i>{sectionSub(id)}</i></span>
                    <span className="st-l-acts">
                      <button onClick={(e) => { e.stopPropagation(); toggleVisible(id) }} title={hidden ? 'Afficher' : 'Masquer'}><Eye size={13} /></button>
                      {isCustom && <button onClick={(e) => { e.stopPropagation(); duplicateLayer(id) }} title="Dupliquer"><span style={{ fontSize: 13 }}>⧉</span></button>}
                      {isCustom && <button onClick={(e) => { e.stopPropagation(); deleteCustomNow(id) }} title="Supprimer"><Trash2 size={13} /></button>}
                    </span>
                  </div>
                )
              })}
              {isHome && (
                <>
                  <p className="st-grp">Fixe · Bas</p>
                  <div className="st-layer is-fixed"><span className="st-l-ic"><Monitor size={14} /></span><span className="st-l-tx"><b>Pied de page</b><i>footer</i></span><span className="st-fixed">Fixe</span></div>
                </>
              )}
              {isHome && <button className="st-addsec" onClick={() => setRailTab('insert')}><Plus size={14} /> Ajouter une section</button>}
            </div>
          )}
          {railTab === 'insert' && (
            <div className="st-insert">
              <div className="st-panel-h">Bibliothèque</div>
              <p className="st-hint">Cliquez pour ajouter, ou glissez vers la page / les calques.</p>
              {SECTION_GROUPS.map((grp) => (
                <div key={grp}>
                  <p className="st-grp">{grp}</p>
                  <div className="st-lib">
                    {SECTION_PRESETS.filter((p) => p.group === grp).map((p) => (
                      <button
                        key={p.id}
                        className="st-lib-card"
                        draggable
                        onDragStart={() => { libDragRef.current = { kind: 'section', presetId: p.id }; setLibDrag({ kind: 'section', presetId: p.id }); hideHelp() }}
                        onDragEnd={() => { setLibDrag(null); post({ type: 'libDragEnd' }) }}
                        onClick={() => { addSection(p.id); setRailTab('layers') }}
                        onMouseEnter={(e) => showHelp(e.currentTarget, p.label, p.hint, p.layout, p.blocks)}
                        onMouseLeave={hideHelp}
                        onFocus={(e) => showHelp(e.currentTarget, p.label, p.hint, p.layout, p.blocks)}
                        onBlur={hideHelp}
                        aria-label={`Ajouter la section ${p.label}. ${p.hint}`}
                      >
                        <span className="st-lib-ic">{p.icon}</span><span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="st-grp">Composants</p>
              <div className="st-lib st-lib-comp">
                {COMPONENT_PALETTE.map((c) => (
                  <button
                    key={c.kind}
                    className="st-lib-card st-lib-cardc"
                    draggable
                    onDragStart={() => { libDragRef.current = { kind: 'component', blockKind: c.kind }; setLibDrag({ kind: 'component', blockKind: c.kind }); hideHelp() }}
                    onDragEnd={() => { setLibDrag(null); post({ type: 'libDragEnd' }) }}
                    onMouseEnter={(e) => showHelp(e.currentTarget, c.label, c.hint, 'stack', [c.kind])}
                    onMouseLeave={hideHelp}
                    onFocus={(e) => showHelp(e.currentTarget, c.label, c.hint, 'stack', [c.kind])}
                    onBlur={hideHelp}
                    aria-label={`Composant ${c.label}. ${c.hint}. Glissez dans une section.`}
                  >
                    <span className="st-lib-ic">{c.icon}</span><span>{c.label}</span>
                  </button>
                ))}
              </div>
              {isHome && <Link className="st-ghost full" href="/editor/hero"><ImagePlus size={14} /> Éditer le Hero</Link>}
            </div>
          )}
          {railTab === 'pages' && (
            <div className="st-pages">
              <div className="st-panel-h">Pages</div>
              {pages.map((pg) => (
                <button key={pg.def.key} className={`st-pagerow ${pg.def.key === pageKey ? 'on' : ''}`} onClick={() => onSwitchPage(pg.def.key)}>
                  <span className="st-l-tx"><b>{pg.def.label}</b><i>{pg.def.routePath}</i></span>
                </button>
              ))}
            </div>
          )}
          {railTab === 'theme' && (
            <div className="st-theme">
              <div className="st-panel-h">Thème</div>
              <p className="st-empty">Le thème et les couleurs globales se gèrent depuis « Thèmes » en haut de l’éditeur.</p>
            </div>
          )}
        </aside>
        <div className="st-stage">
          <div className="st-pasteboard">
            <div className="st-frame" data-device={device} style={{ width: frameW, transform: `scale(${zoom / 100})` }}>
              <iframe ref={iframeRef} src={src} title="Votre site" className="we-live-iframe" />
            </div>
          </div>
          {libDrag && (
            <div
              className="st-dropcatch"
              onDragOver={(e) => {
                e.preventDefault()
                const fr = iframeRef.current?.getBoundingClientRect()
                if (!fr) return
                const y = (e.clientY - fr.top) / (zoom / 100)
                post({ type: 'libDragOver', mode: libDrag.kind, y })
              }}
              onDrop={(e) => {
                e.preventDefault()
                const fr = iframeRef.current?.getBoundingClientRect()
                const y = fr ? (e.clientY - fr.top) / (zoom / 100) : 0
                post({ type: 'libDrop', mode: libDrag.kind, kind: libDrag.kind === 'component' ? libDrag.blockKind : undefined, presetId: libDrag.kind === 'section' ? libDrag.presetId : undefined, y })
                if (libDrag.kind === 'component') setLibDrag(null)
              }}
            >
              <span className="st-dropcatch-hint">Déposez ici — {libDrag.kind === 'section' ? 'nouvelle section' : 'nouveau composant'}</span>
            </div>
          )}
          <div className="st-zoombar">
            <button onClick={() => setZoom((z) => Math.max(25, z - 10))}>−</button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(150, z + 10))}>+</button>
            <button className="st-fit" onClick={() => setZoom(70)} title="Ajuster">Ajuster</button>
            <span className="st-secount">{layerIds.length} sections</span>
          </div>
        </div>
        <aside className="st-inspector">
          <div className="st-panel-h">Inspecteur</div>
          {!sel && !selSection && (
            <div className="st-insp-empty">Sélectionnez une section dans les calques, ou cliquez un texte, une image ou un bouton sur la page pour le modifier.</div>
          )}
        {sel && (
          <div className="we-live-panel">
            <div className="we-live-panel-head">
              <span>{sel.label || (sel.editType === 'link' ? 'Lien' : 'Texte')}</span>
              <button className="we-live-x" onClick={() => setSel(null)} title="Fermer">✕</button>
            </div>

            {sel.editType === 'image' ? (
              <>
                {sel.value ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sel.value} alt="" className="we-live-imgprev" />
                ) : null}
                <label className="we-live-flabel">Image (URL)</label>
                <input
                  className="we-live-input"
                  value={sel.value}
                  placeholder="/images/… ou https://…"
                  onChange={(e) => setBlockImage(e.target.value)}
                />
                <button className="we-live-edit ghost" onClick={() => { blockImgId.current = sel.id; imgFileRef.current?.click() }} disabled={uploadingImg}>
                  <ImagePlus size={14} /> {uploadingImg ? 'Envoi…' : 'Téléverser une image'}
                </button>
              </>
            ) : sel.editType === 'link' ? (
              <>
                <label className="we-live-flabel">Texte du bouton</label>
                <input
                  className="we-live-input"
                  value={linkVal.label}
                  onChange={(e) => editLink({ label: e.target.value, href: linkVal.href })}
                  autoFocus
                />
                <label className="we-live-flabel">Lien (URL)</label>
                <input
                  className="we-live-input"
                  value={linkVal.href}
                  onChange={(e) => editLink({ label: linkVal.label, href: e.target.value })}
                  placeholder="/products"
                />
              </>
            ) : (
              <>
                <label className="we-live-flabel">Texte</label>
                <textarea
                  className="we-live-input"
                  rows={3}
                  value={sel.value}
                  onChange={(e) => editText(e.target.value)}
                  autoFocus
                />
              </>
            )}

            {sel.editType !== 'image' && <div className="we-live-style">
              <p className="we-live-flabel">Apparence</p>
              <div className="we-live-srow">
                <span>Couleur</span>
                <input
                  type="color"
                  className="we-live-color"
                  value={curStyle.color || '#111111'}
                  onChange={(e) => editStyle({ color: e.target.value })}
                />
                {curStyle.color && (
                  <button className="we-live-clear" onClick={() => editStyle({ color: undefined })} title="Réinitialiser">×</button>
                )}
              </div>
              <div className="we-live-srow">
                <span>Taille</span>
                <input
                  type="number"
                  className="we-live-num"
                  value={curStyle.fontSize ?? ''}
                  placeholder="auto"
                  onChange={(e) => editStyle({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
                />
                <span className="we-live-unit">px</span>
              </div>
              <div className="we-live-srow">
                <span>Graisse</span>
                <select
                  className="we-live-sel"
                  value={curStyle.fontWeight ?? ''}
                  onChange={(e) => editStyle({ fontWeight: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">auto</option>
                  <option value="400">Normal</option>
                  <option value="600">Semi-gras</option>
                  <option value="700">Gras</option>
                  <option value="800">Extra-gras</option>
                </select>
              </div>
              <div className="we-live-srow">
                <span>Alignement</span>
                <div className="we-live-align">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button
                      key={a}
                      className={curStyle.textAlign === a ? 'is-on' : ''}
                      onClick={() => editStyle({ textAlign: curStyle.textAlign === a ? undefined : a })}
                    >
                      {a === 'left' ? <AlignLeft size={14} /> : a === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="we-live-srow">
                <span>Fond</span>
                <input type="color" className="we-live-color" value={curStyle.background || '#ffffff'} onChange={(e) => editStyle({ background: e.target.value })} />
                {curStyle.background && (
                  <button className="we-live-clear" onClick={() => editStyle({ background: undefined })} title="Réinitialiser">×</button>
                )}
              </div>
              <div className="we-live-srow">
                <span>Marge Y / X</span>
                <input type="number" className="we-live-num" placeholder="auto" value={curStyle.paddingY ?? ''} onChange={(e) => editStyle({ paddingY: e.target.value ? Number(e.target.value) : undefined })} />
                <input type="number" className="we-live-num" placeholder="auto" value={curStyle.paddingX ?? ''} onChange={(e) => editStyle({ paddingX: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="we-live-srow">
                <span>Interlettre</span>
                <input type="number" step="0.5" className="we-live-num" placeholder="auto" value={curStyle.letterSpacing ?? ''} onChange={(e) => editStyle({ letterSpacing: e.target.value ? Number(e.target.value) : undefined })} />
                <span className="we-live-unit">px</span>
              </div>
              <div className="we-live-srow">
                <span>Majuscules</span>
                <button className={`we-live-toggle ${curStyle.textTransform === 'uppercase' ? 'is-on' : ''}`} onClick={() => editStyle({ textTransform: curStyle.textTransform === 'uppercase' ? undefined : 'uppercase' })}>ABC</button>
              </div>
              <div className="we-live-srow">
                <span>Interligne</span>
                <input type="number" step="0.1" className="we-live-num" placeholder="auto" value={curStyle.lineHeight ?? ''} onChange={(e) => editStyle({ lineHeight: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="we-live-srow">
                <span>Italique</span>
                <button className={`we-live-toggle ${curStyle.fontStyle === 'italic' ? 'is-on' : ''}`} onClick={() => editStyle({ fontStyle: curStyle.fontStyle === 'italic' ? undefined : 'italic' })} style={{ fontStyle: 'italic' }}>I</button>
              </div>
              <div className="we-live-srow">
                <span>Arrondi</span>
                <input type="number" className="we-live-num" placeholder="0" value={curStyle.radius ?? ''} onChange={(e) => editStyle({ radius: e.target.value ? Number(e.target.value) : undefined })} />
                <span className="we-live-unit">px</span>
              </div>
            </div>}
            <p className="we-live-phint">Modifié en direct. Cliquez « Publier » pour mettre en ligne.</p>
          </div>
        )}
        {selSection && (() => {
          const ss = sectionStyles[selSection.id] || {}
          const label = SEC_LABELS[selSection.id] || (selSection.isCustom ? 'Section' : selSection.id)
          return (
          <div className="we-live-panel">
            <div className="we-live-panel-head">
              <span>Réglages — {label}</span>
              <button className="we-live-x" onClick={() => setSelSection(null)} title="Fermer">✕</button>
            </div>

            {selSection.isCustom && (
              <div className="we-live-style">
                <p className="we-live-flabel">Disposition</p>
                <div className="we-live-layouts">
                  {(['stack', 'center', 'cols2', 'cols3', 'row'] as Layout[]).map((l) => (
                    <button
                      key={l}
                      className={selSection.layout === l ? 'is-on' : ''}
                      onClick={() => setSectionLayout(l)}
                      title={LAYOUT_LABELS[l]}
                    >
                      {LAYOUT_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="we-live-style">
              <p className="we-live-flabel">Apparence de la section</p>
              <div className="we-live-srow">
                <span>Couleur de fond</span>
                <input type="color" className="we-live-color" value={ss.bgColor || '#ffffff'} onChange={(e) => applySectionStyle({ bgColor: e.target.value })} />
                {ss.bgColor && <button className="we-live-clear" onClick={() => applySectionStyle({ bgColor: undefined })} title="Réinitialiser">×</button>}
              </div>
              <div className="we-live-srow">
                <span>Couleur du texte</span>
                <input type="color" className="we-live-color" value={ss.textColor || '#111111'} onChange={(e) => applySectionStyle({ textColor: e.target.value })} />
                {ss.textColor && <button className="we-live-clear" onClick={() => applySectionStyle({ textColor: undefined })} title="Réinitialiser">×</button>}
              </div>
              <div className="we-live-srow">
                <span>Marge haut / bas</span>
                <input type="number" className="we-live-num" placeholder="auto" value={ss.padTop ?? ''} onChange={(e) => applySectionStyle({ padTop: e.target.value ? Number(e.target.value) : undefined })} />
                <input type="number" className="we-live-num" placeholder="auto" value={ss.padBottom ?? ''} onChange={(e) => applySectionStyle({ padBottom: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="we-live-srow">
                <span>Largeur max</span>
                <input type="number" className="we-live-num" placeholder="auto" value={ss.maxWidth ?? ''} onChange={(e) => applySectionStyle({ maxWidth: e.target.value ? Number(e.target.value) : undefined })} />
                <span className="we-live-unit">px</span>
              </div>
              <div className="we-live-srow">
                <span>Alignement</span>
                <div className="we-live-align">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button key={a} className={ss.align === a ? 'is-on' : ''} onClick={() => applySectionStyle({ align: ss.align === a ? undefined : a })}>
                      {a === 'left' ? <AlignLeft size={14} /> : a === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="we-live-style">
              <p className="we-live-flabel">Espacement & bordure</p>
              <div className="we-live-srow">
                <span>Marge côtés</span>
                <input type="number" className="we-live-num" placeholder="auto" value={ss.padX ?? ''} onChange={(e) => applySectionStyle({ padX: e.target.value ? Number(e.target.value) : undefined })} />
                <span className="we-live-unit">px</span>
              </div>
              <div className="we-live-srow">
                <span>Hauteur min</span>
                <input type="number" className="we-live-num" placeholder="auto" value={ss.minHeight ?? ''} onChange={(e) => applySectionStyle({ minHeight: e.target.value ? Number(e.target.value) : undefined })} />
                <span className="we-live-unit">px</span>
              </div>
              <div className="we-live-srow">
                <span>Arrondi</span>
                <input type="number" className="we-live-num" placeholder="0" value={ss.radius ?? ''} onChange={(e) => applySectionStyle({ radius: e.target.value ? Number(e.target.value) : undefined })} />
                <span className="we-live-unit">px</span>
              </div>
              <div className="we-live-srow">
                <span>Bordure</span>
                <input type="number" className="we-live-num" placeholder="0" value={ss.borderWidth ?? ''} onChange={(e) => applySectionStyle({ borderWidth: e.target.value ? Number(e.target.value) : undefined })} />
                <input type="color" className="we-live-color" value={ss.borderColor || '#333333'} onChange={(e) => applySectionStyle({ borderColor: e.target.value })} />
                {ss.borderWidth ? <button className="we-live-clear" onClick={() => applySectionStyle({ borderWidth: undefined })} title="Réinitialiser">×</button> : null}
              </div>
              <div className="we-live-srow">
                <span>Ombre</span>
                <button className={`we-live-toggle ${ss.shadow ? 'is-on' : ''}`} onClick={() => applySectionStyle({ shadow: ss.shadow ? undefined : true })}>Ombre portée</button>
              </div>
            </div>

            <div className="we-live-style">
              <p className="we-live-flabel">Image de fond</p>
              {sectionBg[selSection.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sectionBg[selSection.id]} alt="" className="we-live-imgprev" />
              ) : null}
              <input
                className="we-live-input"
                value={sectionBg[selSection.id] || ''}
                placeholder="/images/… ou https://…"
                onChange={(e) => applyBg(e.target.value)}
              />
              <button className="we-live-edit ghost" onClick={() => { blockImgId.current = null; imgFileRef.current?.click() }} disabled={uploadingImg}>
                <ImagePlus size={14} /> {uploadingImg ? 'Envoi…' : 'Téléverser une image'}
              </button>
              {sectionBg[selSection.id] ? (
                <button className="we-live-edit ghost" onClick={() => applyBg('')}>Retirer le fond</button>
              ) : null}
            </div>
            <p className="we-live-phint">Réglages de la section. « Publier » pour mettre en ligne.</p>
          </div>
          )
        })()}
        <input
          ref={imgFileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) { if (blockImgId.current) doUploadBlockImage(file); else doUploadBg(file) }
            blockImgId.current = null
            e.target.value = ''
          }}
        />
        </aside>
      </div>
      {help && <LibHelpCard info={help} />}
      {cmdkOpen && (
        <div className="st-cmdk-scrim" onClick={() => setCmdkOpen(false)}>
          <div className="st-cmdk" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              className="st-cmdk-input"
              placeholder="Rechercher une commande…"
              value={cmdkQ}
              onChange={(e) => setCmdkQ(e.target.value)}
            />
            <div className="st-cmdk-list">
              {cmdkResults.map((c) => (
                <button key={c.id} onClick={() => { c.run(); setCmdkOpen(false); setCmdkQ('') }}>{c.label}</button>
              ))}
              {cmdkResults.length === 0 && <div className="st-cmdk-empty">Aucune commande</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type HelpInfo = {
  title: string
  purpose: string
  layout: Layout
  blocks: BlockKind[]
  rect: { top: number; right: number }
}

// Maps a block kind to a small schematic shape class for the mini-preview.
function helpShape(kind: BlockKind): string {
  switch (kind) {
    case 'heading': return 'hp-bar hp-bar-lg'
    case 'eyebrow': case 'badge': return 'hp-bar hp-bar-sm'
    case 'text': case 'richtext': case 'quote': case 'faqItem': case 'checklist': return 'hp-lines'
    case 'button': return 'hp-pill'
    case 'image': case 'video': case 'logo': return 'hp-box'
    case 'divider': return 'hp-rule'
    case 'spacer': return 'hp-gap'
    case 'heroText': return 'hp-stack'
    default: return 'hp-block'
  }
}

function HelpMiniPreview({ layout, blocks }: { layout: Layout; blocks: BlockKind[] }) {
  return (
    <div className={`hp-prev hp-prev-${layout}`} aria-hidden>
      {blocks.map((b, i) => (
        <span key={i} className={`hp-shape ${helpShape(b)}`} style={{ animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  )
}

// Floating help-card shown when a library item is hovered or focused. It is a
// presentational aid (aria-hidden); each library button keeps its own
// aria-label so screen-reader users get the same purpose text.
function LibHelpCard({ info }: { info: HelpInfo }) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const top = Math.max(12, Math.min(info.rect.top, vh - 230))
  return (
    <div className="st-help" role="presentation" aria-hidden style={{ top, left: info.rect.right + 12 }}>
      <div className="st-help-title">{info.title}</div>
      <p className="st-help-purpose">{info.purpose}</p>
      <HelpMiniPreview layout={info.layout} blocks={info.blocks} />
    </div>
  )
}

const SEC_LABELS: Record<string, string> = {
  hero: 'Hero', categories: 'Catégories', catalog: 'Catalogue', brands: 'Marques', about: 'À propos', contact: 'Contact',
}
const LAYOUT_LABELS: Record<Layout, string> = {
  stack: 'Pile', center: 'Centré', cols2: '2 colonnes', cols3: '3 colonnes', cols4: '4 colonnes', row: 'Ligne',
}
const SECTION_GROUPS = ['Hero', 'Contenu', 'Preuve sociale', 'Offres', 'Média', 'Action', 'Mise en page']

// ───────────────────────── preview (no chrome) ─────────────────────────

function PreviewStage({
  doc,
  device,
  theme,
  data,
}: {
  doc: PageDoc
  device: Device
  theme: string
  data?: import('./render-context').RenderData
}) {
  const width = device === 'desktop' ? '100%' : device === 'tablet' ? '820px' : '390px'
  const blocks = data ? applyData(doc.blocks, data) : doc.blocks
  return (
    <div className="we-canvas-scroll">
      <div className={`we-canvas we-theme-${theme}`} data-device={device} style={{ width }}>
        {renderTree(blocks)}
      </div>
    </div>
  )
}

function renderTree(blocks: Block[]): React.ReactNode {
  return blocks.map((b) => {
    const def = getDef(b.type)
    const ctx: RenderCtx = { editing: false, selected: false }
    const slot = def?.isContainer ? renderTree(b.children ?? []) : null
    return <React.Fragment key={b.id}>{renderBlock(b, ctx, slot)}</React.Fragment>
  })
}
