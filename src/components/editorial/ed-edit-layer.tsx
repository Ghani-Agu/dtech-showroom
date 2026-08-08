'use client'

/**
 * ÉDITEUR — la couche d'édition, montée DANS l'aperçu.
 *
 * Elle ne modifie jamais la page : elle dessine par-dessus. Le contour de
 * survol, le contour de sélection et le trait d'insertion vivent dans un
 * calque `position: fixed` sans aucun événement, et les mesures sont prises
 * sur les éléments réels.
 *
 * Deux détails qui comptent :
 *
 * · Les enveloppes de section sont en `display: contents` : elles n'ont donc
 *   AUCUNE boîte, et `getBoundingClientRect()` y renvoie zéro. On mesure
 *   l'union de leurs enfants — c'est ce qui permet de ne pas changer la mise
 *   en page du site pour les besoins de l'éditeur.
 *
 * · On attrape le clic AVANT la page (phase de capture) et les liens/boutons
 *   sont neutralisés en CSS. Sans cela, sélectionner une carte produit
 *   naviguerait, et l'éditeur perdrait la page en cours d'édition.
 */

import { useEffect, useRef, useState } from 'react'
import { ED_FROM_SITE, isEditorMsg, type EdSiteMsgBody } from '@/lib/ed-editor/bridge'

interface Box {
  top: number
  left: number
  width: number
  height: number
}

interface DropLine {
  top: number
  left: number
  width: number
}

const EMPTY: Box = { top: 0, left: 0, width: 0, height: 0 }

export function EdEditLayer() {
  const [hover, setHover] = useState<Box | null>(null)
  const [hoverLabel, setHoverLabel] = useState('')
  const [sel, setSel] = useState<Box | null>(null)
  const [selLabel, setSelLabel] = useState('')
  const [line, setLine] = useState<DropLine | null>(null)
  const [dragging, setDragging] = useState(false)

  const selId = useRef<string | null>(null)
  const drag = useRef<{
    id: string
    kind: 'section' | 'block'
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const libDrag = useRef<{ kind: 'section' | 'block'; x: number; y: number } | null>(null)
  const dropTarget = useRef<{ parentId: string | null; index: number } | null>(null)

  useEffect(() => {
    const html = document.documentElement
    html.classList.add('ed-editing')

    /* `Omit` sur une union discriminée l'aplatit aux clés communes : chaque
       charge utile serait alors refusée. Le générique préserve la variante. */
    const post = (msg: EdSiteMsgBody) => {
      window.parent?.postMessage({ ...msg, source: ED_FROM_SITE }, '*')
    }

    /* ─────────────────────────── mesures ─────────────────────────── */

    /** Le cadre réel d'un nœud, même sans boîte propre. */
    const boxOf = (el: Element): Box | null => {
      const rects = el.getClientRects()
      if (rects.length > 0) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 || r.height > 0) {
          return { top: r.top, left: r.left, width: r.width, height: r.height }
        }
      }
      // display: contents → additionner les enfants.
      let top = Infinity
      let left = Infinity
      let right = -Infinity
      let bottom = -Infinity
      for (const child of Array.from(el.children)) {
        const b = boxOf(child)
        if (!b || (b.width === 0 && b.height === 0)) continue
        top = Math.min(top, b.top)
        left = Math.min(left, b.left)
        right = Math.max(right, b.left + b.width)
        bottom = Math.max(bottom, b.top + b.height)
      }
      if (!Number.isFinite(top)) return null
      return { top, left, width: right - left, height: bottom - top }
    }

    const nodeAt = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null
      const el = target.closest('[data-ed-id]')
      return el instanceof HTMLElement ? el : null
    }

    const labelOf = (el: HTMLElement) => el.dataset.edLabel ?? el.dataset.edType ?? ''

    /** Les sections de premier niveau, dans l'ordre du document. */
    const sections = (): HTMLElement[] => {
      const root = document.querySelector('[data-ed-page]')
      if (!root) return []
      return Array.from(root.children).filter(
        (c): c is HTMLElement => c instanceof HTMLElement && c.dataset.edKind === 'section',
      )
    }

    const refreshSel = () => {
      const id = selId.current
      if (!id) {
        setSel(null)
        return
      }
      const el = document.querySelector<HTMLElement>(`[data-ed-id="${cssq(id)}"]`)
      if (!el) {
        setSel(null)
        return
      }
      setSel(boxOf(el) ?? EMPTY)
      setSelLabel(labelOf(el))
    }

    /* ───────────────────────── point d'insertion ──────────────────── */

    /**
     * Où tomberait un élément lâché à cette hauteur ?
     * Sections : entre deux sections de premier niveau. Composants : dans le
     * conteneur survolé, entre deux de ses composants.
     */
    const computeDrop = (x: number, y: number, kind: 'section' | 'block') => {
      if (kind === 'block') {
        const under = document.elementFromPoint(x, y)
        const container = under?.closest('[data-ed-slot="children"]')
        if (container instanceof HTMLElement) {
          const host = container.closest<HTMLElement>('[data-ed-kind="section"]')
          const items = Array.from(container.children).filter(
            (c): c is HTMLElement => c instanceof HTMLElement && !!c.dataset.edId,
          )
          let index = items.length
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (!item) continue
            const b = boxOf(item)
            if (!b) continue
            if (y < b.top + b.height / 2) {
              index = i
              break
            }
          }
          const ref = items[Math.min(index, items.length - 1)]
          const rb = ref ? boxOf(ref) : null
          const cb = boxOf(container)
          dropTarget.current = { parentId: host?.dataset.edId ?? null, index }
          setLine({
            top: rb ? (index >= items.length ? rb.top + rb.height : rb.top) : (cb?.top ?? y),
            left: rb?.left ?? cb?.left ?? 0,
            width: rb?.width ?? cb?.width ?? 0,
          })
          return
        }
      }

      /**
       * On vise la SÉPARATION la plus proche, pas la moitié d'une section.
       *
       * La règle « moitié haute / moitié basse » convient à une liste de
       * lignes ; ici une section fait souvent 700 px, soit plus que la hauteur
       * de l'aperçu. Sa moitié haute devient alors quasi inatteignable :
       * mesuré, un glisser vers le haut du cadre retombait systématiquement
       * sur la position de départ, et le déplacement semblait ne rien faire.
       *
       * En raisonnant par séparations, le trait se cale sur l'interstice le
       * plus proche du curseur — c'est ce que l'œil vise, et c'est atteignable
       * quelle que soit la hauteur des sections.
       *
       * L'index renvoyé est la position VOULUE dans le tableau tel qu'il est
       * AVANT le déplacement ; `moveNode` corrige lui-même le décalage quand
       * l'élément vient de la même liste.
       */
      const list = sections()
      const seams: { index: number; top: number; left: number; width: number }[] = []
      let last: Box | null = null
      for (let i = 0; i < list.length; i++) {
        const s = list[i]
        if (!s) continue
        const b = boxOf(s)
        if (!b) continue
        seams.push({ index: i, top: b.top, left: b.left, width: b.width })
        last = b
      }
      if (last) {
        seams.push({
          index: list.length,
          top: last.top + last.height,
          left: last.left,
          width: last.width,
        })
      }
      const first = seams[0]
      if (!first) {
        dropTarget.current = { parentId: null, index: 0 }
        setLine({ top: 100, left: 0, width: window.innerWidth })
        return
      }
      let best = first
      for (const seam of seams) {
        if (Math.abs(seam.top - y) < Math.abs(best.top - y)) best = seam
      }
      dropTarget.current = { parentId: null, index: best.index }
      setLine({ top: best.top, left: best.left, width: best.width })
    }

    /* ─────────────────────────── interactions ─────────────────────── */

    /* Le survol se recalcule seulement en CHANGEANT d'élément. Sans ce garde,
       chaque pixel parcouru par la souris relançait la mesure récursive d'une
       section entière puis un rendu du calque — pour dessiner exactement le
       même cadre. */
    let hoverId: string | null = null
    const onOver = (e: PointerEvent) => {
      if (drag.current?.moved || libDrag.current) return
      const el = nodeAt(e.target)
      if (!el) {
        if (hoverId !== null) {
          hoverId = null
          setHover(null)
        }
        return
      }
      const id = el.dataset.edId ?? null
      if (id === hoverId) return
      hoverId = id
      setHover(boxOf(el))
      setHoverLabel(labelOf(el))
    }

    const onLeave = () => {
      if (drag.current) return
      hoverId = null
      setHover(null)
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const el = nodeAt(e.target)
      if (!el) return
      const id = el.dataset.edId
      if (!id) return
      drag.current = {
        id,
        kind: el.dataset.edKind === 'block' ? 'block' : 'section',
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      }
    }

    const onMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (!d.moved) {
        if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 6) return
        d.moved = true
        setDragging(true)
        setHover(null)
        document.documentElement.classList.add('ed-dragging')
      }
      e.preventDefault()
      computeDrop(e.clientX, e.clientY, d.kind)
      autoscroll(e.clientY)
    }

    const endDrag = () => {
      const d = drag.current
      drag.current = null
      document.documentElement.classList.remove('ed-dragging')
      setDragging(false)
      setLine(null)
      if (!d) return
      if (!d.moved) {
        // Un simple clic : on sélectionne.
        selId.current = d.id
        refreshSel()
        post({ type: 'select', id: d.id, kind: d.kind })
        return
      }
      const target = dropTarget.current
      dropTarget.current = null
      if (!target) return
      post({ type: 'move', id: d.id, parentId: target.parentId, index: target.index })
    }

    const onClick = (e: MouseEvent) => {
      // Rien ne doit naviguer pendant l'édition.
      const el = nodeAt(e.target)
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
    }

    /* Défilement automatique quand on traîne près d'un bord. */
    let scrollRaf = 0
    let scrollDir = 0
    const autoscroll = (y: number) => {
      const margin = 90
      const h = window.innerHeight
      scrollDir = y < margin ? -1 : y > h - margin ? 1 : 0
      if (scrollDir === 0) {
        if (scrollRaf) cancelAnimationFrame(scrollRaf)
        scrollRaf = 0
        return
      }
      if (scrollRaf) return
      const step = () => {
        if (scrollDir === 0) {
          scrollRaf = 0
          return
        }
        window.scrollBy(0, scrollDir * 14)
        scrollRaf = requestAnimationFrame(step)
      }
      scrollRaf = requestAnimationFrame(step)
    }

    /* ────────────────────── messages venus de l'éditeur ───────────── */

    const onMessage = (e: MessageEvent) => {
      if (!isEditorMsg(e.data)) return
      const msg = e.data
      if (msg.type === 'select') {
        selId.current = msg.id
        refreshSel()
        if (msg.id && msg.scroll) {
          const el = document.querySelector<HTMLElement>(`[data-ed-id="${cssq(msg.id)}"]`)
          const b = el ? boxOf(el) : null
          if (b) window.scrollTo({ top: window.scrollY + b.top - 120, behavior: 'smooth' })
        }
        return
      }
      if (msg.type === 'refresh') {
        revealAll()
        refreshSel()
        return
      }
      if (msg.type === 'libdrag') {
        if (!msg.active) {
          libDrag.current = null
          setLine(null)
          return
        }
        libDrag.current = { kind: msg.kind, x: msg.x, y: msg.y }
        computeDrop(msg.x, msg.y, msg.kind)
        autoscroll(msg.y)
        return
      }
      if (msg.type === 'libdrop') {
        const target = dropTarget.current
        libDrag.current = null
        dropTarget.current = null
        setLine(null)
        if (!target) return
        post({
          type: 'insert',
          libType: msg.libType,
          parentId: target.parentId,
          index: target.index,
        })
      }
    }

    let needReveal = false

    /* Les sections ajoutées après le montage n'ont jamais croisé
       l'IntersectionObserver de révélation : dans l'éditeur, tout est visible
       tout de suite, sinon un bloc neuf apparaîtrait vide. */
    const revealAll = () => {
      document
        .querySelectorAll<HTMLElement>('.rv:not([data-revealed])')
        .forEach((el) => el.setAttribute('data-revealed', ''))
    }

    /**
     * Une seule mesure par image, jamais une par événement.
     *
     * `MutationObserver` sur tout le corps de page se déclenchait des dizaines
     * de fois pendant un seul rendu React, et chaque déclenchement relançait un
     * `querySelectorAll` sur le document entier plus la mesure récursive de la
     * sélection. Idem pour le défilement, qui tire une trentaine d'événements
     * par seconde. Tout est désormais regroupé sur `requestAnimationFrame`.
     */
    let pending = 0
    const schedule = (reveal: boolean) => {
      if (reveal) needReveal = true
      if (pending) return
      pending = requestAnimationFrame(() => {
        pending = 0
        if (needReveal) {
          needReveal = false
          revealAll()
        }
        refreshSel()
      })
    }

    const onScroll = () => schedule(false)

    const ro = new ResizeObserver(() => schedule(false))
    ro.observe(document.body)
    const mo = new MutationObserver(() => schedule(true))
    mo.observe(document.body, { childList: true, subtree: true })

    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('pointerleave', onLeave, true)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', endDrag, true)
    document.addEventListener('pointercancel', endDrag, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('submit', onClick as unknown as EventListener, true)
    window.addEventListener('message', onMessage)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', refreshSel)

    revealAll()
    post({
      type: 'ready',
      pageKey:
        document.querySelector<HTMLElement>('[data-ed-page]')?.dataset.edPage ?? '',
    })

    return () => {
      html.classList.remove('ed-editing', 'ed-dragging')
      ro.disconnect()
      mo.disconnect()
      if (pending) cancelAnimationFrame(pending)
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('pointerleave', onLeave, true)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', endDrag, true)
      document.removeEventListener('pointercancel', endDrag, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('submit', onClick as unknown as EventListener, true)
      window.removeEventListener('message', onMessage)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', refreshSel)
    }
  }, [])

  return (
    <div className="ed-layer" aria-hidden>
      {hover && !dragging ? (
        <div
          className="ed-hl"
          style={{
            top: hover.top,
            left: hover.left,
            width: hover.width,
            height: hover.height,
          }}
        >
          {hoverLabel ? <span className="ed-hl-tag">{hoverLabel}</span> : null}
        </div>
      ) : null}
      {sel ? (
        <div
          className="ed-selbox"
          style={{ top: sel.top, left: sel.left, width: sel.width, height: sel.height }}
        >
          {selLabel ? <span className="ed-sel-tag">{selLabel}</span> : null}
        </div>
      ) : null}
      {line ? (
        <div className="ed-dropline" style={{ top: line.top, left: line.left, width: line.width }} />
      ) : null}
    </div>
  )
}

function cssq(id: string): string {
  return id.replace(/["\\]/g, '\\$&')
}
