'use client'

/**
 * ÉDITEUR — l'application.
 *
 * Quatre zones, pas une de plus : une barre en haut, la liste des sections à
 * gauche, la page au centre, ses réglages à droite. Tout le reste (thèmes,
 * guides, palettes flottantes) a été retiré : ce qui compte, c'est de voir la
 * page et de pouvoir attraper ce qu'on y voit.
 *
 * Le centre est une VRAIE page du site, chargée dans une iframe. On ne
 * reconstruit rien : ce que l'auteur regarde est ce que le visiteur recevra.
 * À chaque modification, le document est poussé dans l'iframe par message —
 * pas de rechargement, donc pas de clignotement ni de perte de défilement — et
 * enregistré en brouillon en arrière-plan.
 *
 * Le glisser-déposer se fait sur la section elle-même, dans la page. C'est la
 * couche `ed-edit-layer` qui l'attrape et renvoie la position voulue ; ici on
 * ne fait qu'appliquer `moveNode` au document.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Check,
  ChevronDown,
  CloudUpload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  LayoutList,
  Loader2,
  Monitor,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'

import { ED_FROM_EDITOR, isSiteMsg, type EdEditorMsgBody } from '@/lib/ed-editor/bridge'
import {
  cloneDoc,
  duplicateNode,
  edId,
  findNode,
  insertNode,
  moveNode,
  patchNode,
  removeNode,
  setText,
  type EdDoc,
  type EdLocale,
  type EdNode,
  type EdSite,
} from '@/lib/ed-editor/model'
import { ED_PAGES, getPageDef, type EdCustomPage } from '@/lib/ed-editor/pages'
import {
  addableFor,
  defaultSections,
  getBlockDef,
  getSectionDef,
  ALL_BLOCKS,
} from '@/components/editorial/ed-registry'
import {
  edCreateCustomPage,
  edDeleteCustomPage,
  edLoadPage,
  edPublish,
  edPublishSite,
  edReset,
  edSaveDraft,
  edSaveSite,
} from '@/server/ed-actions'
import { EdInspector } from './EdInspector'
import { EdIcon } from './EdIcon'
import '@/styles/ed-editor.css'

type Device = 'desktop' | 'tablet' | 'mobile'
type Panel = 'layers' | 'library' | 'pages'

const DEVICE_W: Record<Device, number | null> = { desktop: null, tablet: 900, mobile: 414 }

export interface EdEditorProps {
  pageKey: string
  doc: EdDoc
  site: EdSite
  customPages: EdCustomPage[]
  states: Record<string, { published: boolean; draft: boolean; updatedAt: string | null }>
}

export function EdEditor({
  pageKey: pageKeyIn,
  doc: docIn,
  site: siteIn,
  customPages,
  states,
}: EdEditorProps) {
  const frame = useRef<HTMLIFrameElement | null>(null)

  /* La page courante est un ÉTAT, pas seulement une prop : changer de page ne
     doit pas repasser par un rendu serveur de `/editor` (lecture des réglages
     du site + état des quinze pages + remontage complet). On échange le
     document en place et on met l'URL à jour derrière. */
  const [pageKey, setPageKey] = useState(pageKeyIn)
  /* La liste des pages perso vit ici, pas dans la prop : la mettre à jour via
     `router.refresh()` re-demanderait au serveur l'URL que le routeur croit
     courante — or on la change nous-mêmes à l'ouverture d'une page. Les deux
     se contredisaient et l'éditeur pouvait sauter sur la page précédente. */
  const [pages, setPages] = useState<EdCustomPage[]>(customPages)
  const [loadingPage, setLoadingPage] = useState(false)
  const [frameBusy, setFrameBusy] = useState(true)
  /* L'aperçu tarde ? On le DIT, avec de quoi agir. Un cadre blanc muet est la
     pire réponse possible : on ne sait pas s'il faut attendre ou recommencer. */
  const [frameSlow, setFrameSlow] = useState(false)
  const [doc, setDoc] = useState<EdDoc>(docIn)
  const [site, setSite] = useState<EdSite>(siteIn)
  const [selId, setSelId] = useState<string | null>(null)
  const [locale, setLocale] = useState<EdLocale>('fr')
  const [device, setDevice] = useState<Device>('desktop')
  const [panel, setPanel] = useState<Panel>('layers')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, startPublish] = useTransition()
  const [libQuery, setLibQuery] = useState('')
  const [libDrag, setLibDrag] = useState<{ type: string; kind: 'section' | 'block' } | null>(null)

  const past = useRef<{ doc: EdDoc; site: EdSite }[]>([])
  const future = useRef<{ doc: EdDoc; site: EdSite }[]>([])
  const [histTick, setHistTick] = useState(0)

  const pageDef = getPageDef(pageKey)
  const selected = selId ? findNode(doc.sections, selId) : null
  const selDef = selected
    ? (getSectionDef(selected.type) ?? getBlockDef(selected.type) ?? null)
    : null

  /* ────────────────────── historique + application ────────────────────── */

  const commit = useCallback(
    (next: { doc?: EdDoc; site?: EdSite }, options?: { history?: boolean }) => {
      if (options?.history !== false) {
        past.current = [...past.current.slice(-49), { doc, site }]
        future.current = []
        setHistTick((n) => n + 1)
      }
      if (next.doc) setDoc(next.doc)
      if (next.site) setSite(next.site)
      setDirty(true)
    },
    [doc, site],
  )

  const undo = () => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push({ doc, site })
    setDoc(prev.doc)
    setSite(prev.site)
    setDirty(true)
    setHistTick((n) => n + 1)
  }

  const redo = () => {
    const next = future.current.pop()
    if (!next) return
    past.current.push({ doc, site })
    setDoc(next.doc)
    setSite(next.site)
    setDirty(true)
    setHistTick((n) => n + 1)
  }

  /* ───────────────────────── liaison avec l'aperçu ──────────────────────── */

  const send = useCallback((msg: EdEditorMsgBody) => {
    frame.current?.contentWindow?.postMessage({ ...msg, source: ED_FROM_EDITOR }, '*')
  }, [])

  /**
   * Le document part vers l'aperçu — mais pas à chaque touche.
   *
   * Chaque envoi redessine la page entière dans l'iframe (le catalogue, la
   * bande histoire, les quatre scènes animées du bento). Frappe après frappe,
   * c'était un rendu complet par caractère : de là les à-coups. Une pause de
   * 140 ms regroupe la rafale sans que l'aperçu paraisse en retard.
   */
  useEffect(() => {
    const id = setTimeout(() => send({ type: 'doc', doc, site }), 140)
    return () => clearTimeout(id)
  }, [doc, site, send])

  useEffect(() => {
    send({ type: 'select', id: selId })
  }, [selId, send])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isSiteMsg(e.data)) return
      const msg = e.data
      if (msg.type === 'ready') {
        send({ type: 'doc', doc, site })
        send({ type: 'select', id: selId })
        return
      }
      if (msg.type === 'select') {
        setSelId(msg.id)
        setPanel('layers')
        return
      }
      if (msg.type === 'move') {
        commit({ doc: { ...doc, sections: moveNode(doc.sections, msg.id, msg.parentId, msg.index) } })
        return
      }
      if (msg.type === 'insert') {
        addNode(msg.libType, msg.parentId, msg.index)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
    // `doc`/`site`/`selId` sont lus dans le gestionnaire : il doit être recréé
    // à chaque changement, sinon il appliquerait un déplacement sur un document
    // périmé et écraserait la modification précédente.
  })

  /* ─────────────────────────── enregistrement ──────────────────────────── */

  /* Les réglages GLOBAUX (palette, polices, chrome) ne changent presque
     jamais, alors que le document change à chaque frappe. Les réécrire
     ensemble doublait les allers-retours vers la base pour rien. */
  const savedSite = useRef(siteIn)
  useEffect(() => {
    if (!dirty) return
    const id = setTimeout(async () => {
      setSaving(true)
      const jobs: Promise<{ ok: boolean; error?: string }>[] = [edSaveDraft(pageKey, doc)]
      const siteChanged = site !== savedSite.current
      if (siteChanged) jobs.push(edSaveSite(site))
      const results = await Promise.all(jobs)
      setSaving(false)
      const bad = results.find((r) => !r.ok)
      if (bad) {
        toast.error(bad.error ?? 'Enregistrement impossible')
        return
      }
      if (siteChanged) savedSite.current = site
      setDirty(false)
    }, 900)
    return () => clearTimeout(id)
  }, [dirty, doc, site, pageKey, siteIn])

  /* Fermer l'onglet avec un brouillon non enregistré perdrait le travail des
     dernières secondes. */
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ──────────────────────── opérations sur l'arbre ─────────────────────── */

  function addNode(type: string, parentId: string | null, index: number) {
    const def = getSectionDef(type) ?? getBlockDef(type)
    if (!def) return
    const node: EdNode = {
      id: edId(type.split('.')[0] ?? 's'),
      type,
      props: def.defaults ? cloneDoc(def.defaults) : undefined,
    }
    commit({ doc: { ...doc, sections: insertNode(doc.sections, node, parentId, index) } })
    /* On sélectionne la nouvelle section (ses réglages s'ouvrent à droite) mais
       on RESTE dans la bibliothèque : en poser trois d'affilée est le cas
       courant, et repasser par l'onglet à chaque fois était pénible. */
    setSelId(node.id)
  }

  const patchSel = (patch: (n: EdNode) => EdNode) => {
    if (!selId) return
    commit({ doc: { ...doc, sections: patchNode(doc.sections, selId, patch) } })
  }

  const removeSel = () => {
    if (!selId) return
    commit({ doc: { ...doc, sections: removeNode(doc.sections, selId) } })
    setSelId(null)
  }

  const duplicateSel = () => {
    if (!selId) return
    commit({ doc: { ...doc, sections: duplicateNode(doc.sections, selId) } })
  }

  const onText = (key: string, value: string | undefined) => {
    commit({ doc: { ...doc, text: setText(doc.text, key, locale, value) } })
  }

  /* ─────────────────────────── publier / rétablir ──────────────────────── */

  const publish = () => {
    startPublish(async () => {
      const [a, b] = await Promise.all([edPublish(pageKey, doc), edPublishSite(site)])
      if (a.ok && b.ok) {
        setDirty(false)
        toast.success('En ligne.')
      } else {
        toast.error(a.error ?? b.error ?? 'Publication impossible')
      }
    })
  }

  const reset = () => {
    if (!window.confirm('Rétablir cette page telle qu’elle était au départ ? Les modifications publiées seront perdues.')) return
    startPublish(async () => {
      const res = await edReset(pageKey)
      if (!res.ok) {
        toast.error(res.error ?? 'Impossible')
        return
      }
      /* La base est vidée, mais l'éditeur, lui, garde son document en mémoire.
         `router.refresh()` ne suffit pas : la clé de montage n'a pas changé,
         donc React conserve l'état et on continuerait d'éditer — et de
         republier — la page qu'on vient justement de jeter. On rebâtit donc
         localement la composition par défaut, celle-là même que le serveur
         renverra désormais. */
      past.current = []
      future.current = []
      setHistTick((n) => n + 1)
      setDoc({ v: 1, sections: defaultSections(pageKey) })
      setSelId(null)
      setDirty(false)
      toast.success('Page rétablie.')
      setFrameSlow(false)
      setFrameBusy(true)
      reloadFrame()
    })
  }

  const reloadFrame = () => {
    const el = frame.current
    if (el) el.src = previewSrc
  }

  /**
   * Ouvrir une autre page.
   *
   * Deux règles apprises du terrain :
   *
   * · L'enregistrement du brouillon en cours part en arrière-plan et NE BLOQUE
   *   PAS l'ouverture. Il attendait sa réponse avant de naviguer, et sur une
   *   base distante lente un simple clic sur « Entreprise » pouvait ne rien
   *   faire pendant plusieurs secondes — ou, si l'enregistrement échouait,
   *   ne jamais rien faire du tout. Les deux clés étant différentes, il n'y a
   *   aucune course : le brouillon part vers SA page, on ouvre l'autre.
   *
   * · On ne lit qu'une ligne (`edLoadPage`) au lieu de re-rendre la route.
   */
  const loadPage = useCallback(
    async (key: string, opts?: { push?: boolean }) => {
      if (key === pageKey || loadingPage) return
      setFrameSlow(false)
      if (dirty) {
        const from = pageKey
        const snapshot = doc
        const snapSite = site
        setDirty(false)
        void Promise.all([edSaveDraft(from, snapshot), edSaveSite(snapSite)]).then(([a, b]) => {
          if (!a.ok || !b.ok) toast.error(a.error ?? b.error ?? 'Enregistrement impossible')
        })
      }
      setLoadingPage(true)
      const res = await edLoadPage(key)
      setLoadingPage(false)
      if (!res.ok || !res.doc) {
        toast.error(res.error ?? 'Impossible d’ouvrir cette page.')
        return
      }
      past.current = []
      future.current = []
      setHistTick((n) => n + 1)
      setDoc(res.doc)
      setSelId(null)
      setDirty(false)
      setFrameBusy(true)
      setPageKey(key)
      if (opts?.push !== false) {
        window.history.pushState({ edPage: key }, '', `/editor?page=${encodeURIComponent(key)}`)
      }
    },
    [pageKey, loadingPage, dirty, doc, site],
  )

  /* Le bouton « précédent » du navigateur doit revenir à la page précédente de
     l'éditeur, pas sortir de l'éditeur. */
  useEffect(() => {
    const onPop = () => {
      const key = new URLSearchParams(window.location.search).get('page') || 'home'
      if (key !== pageKey) void loadPage(key, { push: false })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [pageKey, loadPage])

  const previewSrc = `/editor/preview?page=${encodeURIComponent(pageKey)}&locale=${locale}`


  /**
   * Changer de langue recharge l'aperçu — les fragments rendus par le serveur
   * (moteur du catalogue, fiche produit, formulaires) sont traduits côté
   * serveur, un simple message ne suffirait pas.
   *
   * L'adresse de l'iframe dérive de la langue, donc React met l'attribut à
   * jour et le cadre navigue tout seul : il suffit d'armer le voile ici.
   */
  const changeLocale = (next: EdLocale) => {
    if (next === locale) return
    setFrameSlow(false)
    setFrameBusy(true)
    setLocale(next)
  }

  /* Douze secondes sans réponse, c'est une panne, pas une lenteur. */
  useEffect(() => {
    if (!frameBusy) return
    const id = setTimeout(() => setFrameSlow(true), 12000)
    return () => clearTimeout(id)
  }, [frameBusy, previewSrc])

  /* ──────────────────────── glisser depuis la bibliothèque ─────────────── */

  useEffect(() => {
    if (!libDrag) return
    const el = frame.current
    const onMove = (e: PointerEvent) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      send({
        type: 'libdrag',
        active: inside,
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        kind: libDrag.kind,
      })
    }
    const onUp = (e: PointerEvent) => {
      const r = el?.getBoundingClientRect()
      const inside =
        !!r &&
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      if (inside) send({ type: 'libdrop', libType: libDrag.type, kind: libDrag.kind })
      else send({ type: 'libdrag', active: false, x: 0, y: 0, kind: libDrag.kind })
      setLibDrag(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [libDrag, send])

  /* ──────────────────────────────── rendu ──────────────────────────────── */

  const width = DEVICE_W[device]

  return (
    <div className="ede">
      <TopBar
        pageDef={pageDef}
        locale={locale}
        setLocale={changeLocale}
        device={device}
        setDevice={setDevice}
        dirty={dirty}
        saving={saving}
        publishing={publishing}
        canUndo={past.current.length > 0}
        canRedo={future.current.length > 0}
        histTick={histTick}
        onUndo={undo}
        onRedo={redo}
        onPublish={publish}
        onReset={reset}
        previewPath={pageDef?.path ?? '/'}
      />

      <div className="ede-body">
        <aside className="ede-left">
          <nav className="ede-lefttabs">
            <button
              type="button"
              className={panel === 'layers' ? 'is-on' : ''}
              onClick={() => setPanel('layers')}
            >
              <LayoutList size={14} />
              Sections
            </button>
            <button
              type="button"
              className={panel === 'library' ? 'is-on' : ''}
              onClick={() => setPanel('library')}
            >
              <Plus size={14} />
              Ajouter
            </button>
            <button
              type="button"
              className={panel === 'pages' ? 'is-on' : ''}
              onClick={() => setPanel('pages')}
            >
              <FileText size={14} />
              Pages
            </button>
          </nav>

          {panel === 'layers' ? (
            <Layers
              doc={doc}
              selId={selId}
              onSelect={(id) => {
                setSelId(id)
                send({ type: 'select', id, scroll: true })
              }}
              onToggle={(id) =>
                commit({
                  doc: {
                    ...doc,
                    sections: patchNode(doc.sections, id, (n) => ({
                      ...n,
                      style: { ...(n.style ?? {}), hidden: !(n.style?.hidden === true) },
                    })),
                  },
                })
              }
              onDuplicate={(id) =>
                commit({ doc: { ...doc, sections: duplicateNode(doc.sections, id) } })
              }
              onRemove={(id) => {
                commit({ doc: { ...doc, sections: removeNode(doc.sections, id) } })
                if (selId === id) setSelId(null)
              }}
              onMove={(id, index) =>
                commit({ doc: { ...doc, sections: moveNode(doc.sections, id, null, index) } })
              }
            />
          ) : null}

          {panel === 'library' ? (
            <Library
              pageKey={pageKey}
              present={doc.sections.map((s) => s.type)}
              query={libQuery}
              setQuery={setLibQuery}
              onAdd={(type, kind) =>
                kind === 'section'
                  ? addNode(type, null, doc.sections.length)
                  : addLoose(type)
              }
              onDragStart={(type, kind) => setLibDrag({ type, kind })}
              dragging={libDrag?.type ?? null}
            />
          ) : null}

          {panel === 'pages' ? (
            <Pages
              current={pageKey}
              customPages={pages}
              states={states}
              onGo={loadPage}
              onPagesChange={setPages}
            />
          ) : null}
        </aside>

        <main className="ede-canvas">
          <div
            className={`ede-frame${width ? ' is-device' : ''}`}
            style={width ? { width, maxWidth: '100%' } : undefined}
          >
            <iframe
              ref={frame}
              src={previewSrc}
              title="Aperçu du site"
              className="ede-iframe"
              onLoad={() => setFrameBusy(false)}
            />
            {frameBusy || loadingPage ? (
              <div className="ede-loading">
                {frameSlow ? (
                  <div className="ede-slow">
                    <b>L’aperçu ne répond pas.</b>
                    <p>
                      La page met anormalement longtemps à se charger — le plus souvent la base de
                      données met du temps à répondre.
                    </p>
                    <div className="ede-slowbtns">
                      <button
                        type="button"
                        className="ede-publish"
                        onClick={() => {
                          setFrameSlow(false)
                          setFrameBusy(true)
                          reloadFrame()
                        }}
                      >
                        Réessayer
                      </button>
                      <a
                        className="edi-act"
                        href={previewSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ouvrir dans un onglet
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <Loader2 size={18} className="ede-spin" />
                    <span>Chargement de la page…</span>
                  </>
                )}
              </div>
            ) : null}
            {libDrag ? <div className="ede-dropcatch" /> : null}
          </div>
        </main>

        <aside className="ede-right">
          <EdInspector
            node={selected}
            def={selDef}
            doc={doc}
            site={site}
            locale={locale}
            onPatchNode={patchSel}
            onText={onText}
            onPatchDoc={(patch) => commit({ doc: { ...doc, ...patch } })}
            onPatchSite={(patch) => commit({ site: { ...site, ...patch } })}
            onDuplicate={duplicateSel}
            onDelete={removeSel}
          />
        </aside>
      </div>
    </div>
  )

  /** Un composant lâché hors d'un conteneur : on lui en fabrique un. */
  function addLoose(type: string) {
    const container: EdNode = {
      id: edId('cols'),
      type: 'lib.columns',
      props: { cols: 1, gap: 24 },
      children: [
        {
          id: edId(type.split('.')[1] ?? 'b'),
          type,
          props: getBlockDef(type)?.defaults ? cloneDoc(getBlockDef(type)!.defaults!) : undefined,
        },
      ],
    }
    commit({
      doc: { ...doc, sections: insertNode(doc.sections, container, null, doc.sections.length) },
    })
    setSelId(container.children?.[0]?.id ?? container.id)
  }
}

/* ══════════════════════════════ barre du haut ══════════════════════════════ */

function TopBar({
  pageDef,
  locale,
  setLocale,
  device,
  setDevice,
  dirty,
  saving,
  publishing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPublish,
  onReset,
  previewPath,
}: {
  pageDef: ReturnType<typeof getPageDef>
  locale: EdLocale
  setLocale: (l: EdLocale) => void
  device: Device
  setDevice: (d: Device) => void
  dirty: boolean
  saving: boolean
  publishing: boolean
  canUndo: boolean
  canRedo: boolean
  histTick: number
  onUndo: () => void
  onRedo: () => void
  onPublish: () => void
  onReset: () => void
  previewPath: string
}) {
  return (
    <header className="ede-top">
      <div className="ede-topl">
        {/* Sortie de secours, toujours au même endroit, toujours visible. */}
        <Link className="ede-exit" href="/admin">
          <X size={15} />
          Quitter
        </Link>
        <span className="ede-brand">
          Éditeur<i>.</i>
        </span>
        <span className="ede-page">
          {pageDef?.label ?? 'Page'}
          {pageDef?.kind === 'template' ? <em>modèle</em> : null}
        </span>
        <span className={`ede-state${dirty ? ' is-dirty' : ''}`}>
          {saving ? (
            <>
              <Loader2 size={12} className="ede-spin" /> Enregistrement…
            </>
          ) : dirty ? (
            'Brouillon non enregistré'
          ) : (
            <>
              <Check size={12} /> Brouillon enregistré
            </>
          )}
        </span>
      </div>

      <div className="ede-topc">
        <div className="ede-seg" role="group" aria-label="Langue">
          {(['fr', 'en', 'ar'] as EdLocale[]).map((l) => (
            <button
              key={l}
              type="button"
              className={locale === l ? 'is-on' : ''}
              onClick={() => setLocale(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="ede-seg" role="group" aria-label="Format d’écran">
          <button
            type="button"
            className={device === 'desktop' ? 'is-on' : ''}
            onClick={() => setDevice('desktop')}
            title="Ordinateur"
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            className={device === 'tablet' ? 'is-on' : ''}
            onClick={() => setDevice('tablet')}
            title="Tablette"
          >
            <Tablet size={14} />
          </button>
          <button
            type="button"
            className={device === 'mobile' ? 'is-on' : ''}
            onClick={() => setDevice('mobile')}
            title="Téléphone"
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>

      <div className="ede-topr">
        <button type="button" className="ede-ico" onClick={onUndo} disabled={!canUndo} title="Annuler">
          <Undo2 size={15} />
        </button>
        <button type="button" className="ede-ico" onClick={onRedo} disabled={!canRedo} title="Rétablir">
          <Redo2 size={15} />
        </button>
        <button type="button" className="ede-ico" onClick={onReset} title="Rétablir la page d’origine">
          <RotateCcw size={15} />
        </button>
        <a
          className="ede-ico"
          href={`/fr${previewPath === '/' ? '' : previewPath}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Voir la page en ligne"
        >
          <ExternalLink size={15} />
        </a>
        <button type="button" className="ede-publish" onClick={onPublish} disabled={publishing}>
          {publishing ? <Loader2 size={14} className="ede-spin" /> : <CloudUpload size={14} />}
          Publier
        </button>
      </div>
    </header>
  )
}

/* ════════════════════════════ liste des sections ═══════════════════════════ */

function Layers({
  doc,
  selId,
  onSelect,
  onToggle,
  onDuplicate,
  onRemove,
  onMove,
}: {
  doc: EdDoc
  selId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onMove: (id: string, index: number) => void
}) {
  const [over, setOver] = useState<number | null>(null)
  const dragId = useRef<string | null>(null)

  return (
    <div className="edl">
      <p className="edl-hint">
        Glissez une section dans la page pour la déplacer, ou utilisez cette liste.
      </p>
      <ul className="edl-list">
        {doc.sections.map((n, i) => {
          const def = getSectionDef(n.type)
          const hidden = n.style?.hidden === true
          return (
            <li
              key={n.id}
              className={`edl-item${selId === n.id ? ' is-sel' : ''}${hidden ? ' is-hidden' : ''}${
                over === i ? ' is-over' : ''
              }`}
              draggable
              onDragStart={() => {
                dragId.current = n.id
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(i)
              }}
              onDragLeave={() => setOver((v) => (v === i ? null : v))}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                if (dragId.current) onMove(dragId.current, i)
                dragId.current = null
              }}
              onDragEnd={() => setOver(null)}
            >
              <GripVertical size={13} className="edl-grip" />
              <button type="button" className="edl-name" onClick={() => onSelect(n.id)}>
                <EdIcon name={def?.icon} />
                <span>{def?.label ?? n.type}</span>
              </button>
              <button
                type="button"
                className="edl-act"
                onClick={() => onToggle(n.id)}
                title={hidden ? 'Afficher' : 'Masquer'}
              >
                {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button
                type="button"
                className="edl-act"
                onClick={() => onDuplicate(n.id)}
                title="Dupliquer"
                disabled={def?.locked}
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                className="edl-act"
                onClick={() => onRemove(n.id)}
                title="Supprimer"
                disabled={def?.locked}
              >
                <Trash2 size={13} />
              </button>
            </li>
          )
        })}
      </ul>
      {doc.sections.length === 0 ? (
        <p className="edl-hint">Aucune section. Ouvrez « Ajouter » pour commencer.</p>
      ) : null}
    </div>
  )
}

/* ═════════════════════════════ la bibliothèque ═════════════════════════════ */

function Library({
  pageKey,
  present,
  query,
  setQuery,
  onAdd,
  onDragStart,
  dragging,
}: {
  pageKey: string
  present: string[]
  query: string
  setQuery: (v: string) => void
  onAdd: (type: string, kind: 'section' | 'block') => void
  onDragStart: (type: string, kind: 'section' | 'block') => void
  dragging: string | null
}) {
  const sections = useMemo(() => addableFor(pageKey, present), [pageKey, present])
  const q = query.trim().toLowerCase()
  const match = (label: string, desc?: string) =>
    !q || label.toLowerCase().includes(q) || (desc ?? '').toLowerCase().includes(q)

  const groups = useMemo(() => {
    const out = new Map<string, typeof sections>()
    for (const s of sections) {
      if (!match(s.label, s.desc)) continue
      const list = out.get(s.group) ?? []
      list.push(s)
      out.set(s.group, list)
    }
    return [...out.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, q])

  return (
    <div className="edb">
      <div className="edb-search">
        <Search size={13} />
        <input
          type="search"
          value={query}
          placeholder="Chercher une section…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="edl-hint">Cliquez pour ajouter à la fin, ou glissez à l’endroit voulu.</p>

      {groups.map(([group, items]) => (
        <section key={group} className="edb-group">
          <h3>{group}</h3>
          <div className="edb-grid">
            {items.map((s) => (
              <button
                key={s.type}
                type="button"
                data-ed-lib={s.type}
                className={`edb-card${dragging === s.type ? ' is-drag' : ''}`}
                onClick={() => onAdd(s.type, 'section')}
                onPointerDown={() => onDragStart(s.type, 'section')}
                title={s.desc}
              >
                <EdIcon name={s.icon} size={17} />
                <b>{s.label}</b>
                {s.desc ? <i>{s.desc}</i> : null}
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="edb-group">
        <h3>Composants</h3>
        <p className="edl-hint">
          À glisser dans une section « Colonnes libres ». Un clic en crée une automatiquement.
        </p>
        <div className="edb-grid is-small">
          {ALL_BLOCKS.filter((b) => match(b.label)).map((b) => (
            <button
              key={b.type}
              type="button"
              data-ed-lib={b.type}
              className={`edb-card${dragging === b.type ? ' is-drag' : ''}`}
              onClick={() => onAdd(b.type, 'block')}
              onPointerDown={() => onDragStart(b.type, 'block')}
            >
              <EdIcon name={b.icon} size={16} />
              <b>{b.label}</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ══════════════════════════════ les pages ══════════════════════════════════ */

function Pages({
  current,
  customPages,
  states,
  onGo,
  onPagesChange,
}: {
  current: string
  customPages: EdCustomPage[]
  states: EdEditorProps['states']
  onGo: (key: string) => void | Promise<void>
  onPagesChange: (pages: EdCustomPage[]) => void
}) {
  const [busy, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('/')
  const [title, setTitle] = useState('')

  const go = (key: string) => onGo(key)

  const groups = useMemo(() => {
    const out = new Map<string, { key: string; label: string; desc?: string }[]>()
    for (const p of ED_PAGES) {
      const list = out.get(p.group) ?? []
      list.push({ key: p.key, label: p.label, desc: p.desc })
      out.set(p.group, list)
    }
    if (customPages.length) {
      out.set(
        'Personnalisées',
        customPages.map((c) => ({ key: c.key, label: c.title, desc: c.path })),
      )
    }
    return [...out.entries()]
  }, [customPages])

  return (
    <div className="edp2">
      {groups.map(([group, items]) => (
        <section key={group} className="edb-group">
          <h3>{group}</h3>
          <ul className="edp2-list">
            {items.map((p) => {
              const st = states[p.key]
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    className={p.key === current ? 'is-on' : ''}
                    onClick={() => go(p.key)}
                  >
                    <span>
                      <b>{p.label}</b>
                      {p.desc ? <i>{p.desc}</i> : null}
                    </span>
                    <em
                      className={`edp2-dot${st?.published ? ' is-live' : st?.draft ? ' is-draft' : ''}`}
                      title={
                        st?.published
                          ? 'Modifiée et en ligne'
                          : st?.draft
                            ? 'Brouillon en cours'
                            : 'Mise en page d’origine'
                      }
                    />
                  </button>
                  {p.key.startsWith('custom:') ? (
                    <button
                      type="button"
                      className="edp2-del"
                      title="Supprimer la page"
                      onClick={() => {
                        if (!window.confirm(`Supprimer définitivement « ${p.label} » ?`)) return
                        start(async () => {
                          const res = await edDeleteCustomPage(p.key)
                          if (res.ok) {
                            toast.success('Page supprimée.')
                            onPagesChange(customPages.filter((c) => c.key !== p.key))
                            if (p.key === current) void onGo('home')
                          } else toast.error(res.error ?? 'Impossible')
                        })
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section className="edb-group">
        <button type="button" className="edp2-new" onClick={() => setOpen((v) => !v)}>
          <Plus size={14} />
          Nouvelle page
          <ChevronDown size={13} className={open ? 'is-open' : ''} />
        </button>
        {open ? (
          <div className="edp2-form">
            <label className="edf-row">
              <span className="edf-lab">Titre</span>
              <input
                className="edf-in"
                value={title}
                placeholder="Promotions"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="edf-row">
              <span className="edf-lab">Adresse</span>
              <input
                className="edf-in"
                value={path}
                placeholder="/promotions"
                onChange={(e) => setPath(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="ede-publish edp2-create"
              disabled={busy || !title.trim()}
              onClick={() =>
                start(async () => {
                  const res = await edCreateCustomPage({ path, title: title.trim() })
                  if (res.ok && res.key) {
                    toast.success('Page créée.')
                    onPagesChange([
                      ...customPages,
                      { key: res.key, path, title: title.trim() },
                    ])
                    setOpen(false)
                    setTitle('')
                    setPath('/')
                    void onGo(res.key)
                  } else toast.error(res.error ?? 'Création impossible')
                })
              }
            >
              {busy ? <Loader2 size={14} className="ede-spin" /> : <Plus size={14} />}
              Créer
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
