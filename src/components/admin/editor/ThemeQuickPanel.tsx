'use client'

/**
 * ThemeQuickPanel — slide-over drawer for quickly previewing and applying a
 * theme without leaving the current page. The full theme gallery still lives
 * at /editor/themes; this drawer is the "lightweight quick-access" surface.
 *
 * UX:
 *   - The drawer is controlled — parent owns `open` / `onClose`.
 *   - Pick a theme in the list → preview area instantly re-renders in that
 *     theme (live, no save). The selected swatch is held in local state.
 *   - "Appliquer" calls `setDocTheme` server action and persists the choice.
 *   - "Réinitialiser" reverts the local preview to the doc's saved theme.
 *   - Escape, backdrop click, or the X button closes the drawer.
 *
 * The preview is a tiny representative tree (navbar + hero + product grid +
 * footer) rendered through the same `renderBlock` pipeline the canvas uses,
 * inside `.we-canvas.we-theme-<id>` so the active theme tokens drive the
 * cards' colors/typography — that's what wires Item 3 (theme-adaptive cards).
 */

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Check,
  ChevronRight,
  ExternalLink,
  Palette as PaletteIcon,
  X,
} from 'lucide-react'
import { renderBlock, type RenderCtx } from './BlockRender'
import { createBlock, getDef } from './registry'
import { THEMES, getTheme, type ThemeDef } from './themes'
import { setContentTheme } from '@/server/content-actions'
import type { Block, PageDoc } from './types'

// ── small preview tree used inside the drawer ───────────────────────
function previewDocSample(): PageDoc {
  return {
    id: 'theme-quick-preview',
    name: 'Aperçu',
    background: '',
    blocks: [
      createBlock('navbar'),
      createBlock('hero'),
      createBlock('productGrid'),
      createBlock('footer'),
    ],
  }
}

function renderTree(blocks: Block[]): React.ReactNode {
  return blocks.map((b) => {
    const def = getDef(b.type)
    const ctx: RenderCtx = { editing: false, selected: false }
    const slot = def?.isContainer ? renderTree(b.children ?? []) : null
    return <React.Fragment key={b.id}>{renderBlock(b, ctx, slot)}</React.Fragment>
  })
}

// ── public API ─────────────────────────────────────────────────────
export interface ThemeQuickPanelProps {
  /** Whether the drawer is visible. Parent owns the open state. */
  open: boolean
  /** Called when the drawer requests to close (X, backdrop, Escape). */
  onClose: () => void
  /** The page document — used both for preview content and to know which
   *  theme is currently saved. Falls back to a sample tree if null. */
  doc: PageDoc | null
  /** Has the editor actually saved a page yet? Affects whether Apply is
   *  available (no saved page means there's nothing to attach a theme to). */
  hasSavedPage?: boolean
  /** Whether the saved page is currently published — drives the success
   *  toast wording ("en ligne sur le site" vs "appliqué à votre page"). */
  published?: boolean
  /** Optional notification when the user actually applies a theme; the
   *  editor uses this to update its local `doc.theme` so the canvas
   *  immediately reflects the new choice. */
  onApplied?: (themeId: string) => void
  /** Which page key the theme applies to (defaults to the homepage). */
  pageKey?: string
}

export function ThemeQuickPanel({
  open,
  onClose,
  doc,
  hasSavedPage = !!doc,
  published = false,
  onApplied,
  pageKey = 'home',
}: ThemeQuickPanelProps) {
  const savedTheme = doc?.theme ?? 'nightline'
  const previewDoc = useMemo(() => doc ?? previewDocSample(), [doc])
  const [selected, setSelected] = useState(savedTheme)
  const [applying, setApplying] = useState(false)
  const selectedDef = getTheme(selected)
  const dirty = selected !== savedTheme

  // ── reset selection when the saved theme changes (e.g. after apply) ──
  useEffect(() => {
    setSelected(savedTheme)
  }, [savedTheme])

  // ── close on Escape ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // ── lock body scroll while open ─────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  async function apply() {
    setApplying(true)
    try {
      const r = await setContentTheme(pageKey, selected)
      if (r.ok) {
        onApplied?.(selected)
        toast.success(
          published
            ? 'Thème appliqué — en ligne sur le site'
            : 'Thème appliqué à votre page'
        )
      } else {
        toast.error(r.error ?? 'Échec')
      }
    } catch {
      toast.error('Échec')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      className={`tqp-root ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
      data-tqp-uiclass={`${selectedDef.dark ? '' : 'we-ui-light'} we-accent-${selected}`.trim()}
    >
      <button
        type="button"
        className="tqp-backdrop"
        aria-label="Fermer le panneau"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className="tqp-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tqp-title"
      >
        <header className="tqp-head">
          <p className="tqp-kicker">
            <PaletteIcon size={13} style={{ color: 'var(--c-mint)' }} />
            Thème · accès rapide
          </p>
          <h2 id="tqp-title" className="tqp-title">
            Habillez en un clic.
          </h2>
          <p className="tqp-sub">
            Cliquez un thème pour voir le rendu instantané. Validez avec
            « Appliquer » pour enregistrer le choix.
          </p>
          <button
            type="button"
            className="tqp-close"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="tqp-body">
          <ul className="tqp-list" role="radiogroup" aria-label="Thèmes disponibles">
            {THEMES.map((t) => (
              <ThemeRow
                key={t.id}
                theme={t}
                selected={selected === t.id}
                isSaved={savedTheme === t.id}
                onSelect={() => setSelected(t.id)}
              />
            ))}
          </ul>

          <section className="tqp-previewWrap" aria-label="Aperçu du thème">
            <p className="tqp-previewLabel">Aperçu — {selectedDef.name}</p>
            <div className="tqp-previewFrame">
              <div
                className={`we-canvas we-theme-${selected}`}
                style={{ width: 1280, transform: 'scale(0.27)', transformOrigin: 'top left' }}
              >
                {renderTree(previewDoc.blocks)}
              </div>
            </div>
          </section>
        </div>

        <footer className="tqp-foot">
          <button
            type="button"
            className="tqp-reset"
            onClick={() => setSelected(savedTheme)}
            disabled={!dirty}
          >
            Réinitialiser
          </button>
          <Link
            href="/editor/themes"
            className="tqp-gallery"
            onClick={onClose}
            title="Ouvrir la bibliothèque complète"
          >
            Voir la bibliothèque
            <ExternalLink size={13} />
          </Link>
          <button
            type="button"
            className="tqp-apply"
            disabled={applying || !dirty || !hasSavedPage}
            onClick={apply}
          >
            {applying ? 'Application…' : dirty ? 'Appliquer' : 'Thème actuel'}
            {!applying && dirty && <ChevronRight size={15} />}
            {!applying && !dirty && <Check size={15} />}
          </button>
        </footer>
      </aside>
    </div>
  )
}

// ── one row in the theme list ──────────────────────────────────────
function ThemeRow({
  theme,
  selected,
  isSaved,
  onSelect,
}: {
  theme: ThemeDef
  selected: boolean
  isSaved: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        className={`tqp-row ${selected ? 'is-on' : ''}`}
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
      >
        <span
          className="tqp-swatch"
          aria-hidden
          style={{
            background: theme.swatch.bg,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${theme.swatch.accent} 35%, transparent)`,
          }}
        >
          <span style={{ background: theme.swatch.accent }} />
          <span style={{ background: theme.swatch.accent2 }} />
          <span style={{ background: theme.swatch.ink, opacity: 0.85 }} />
        </span>
        <span className="tqp-rowText">
          <span className="tqp-rowName">
            {theme.name}
            {isSaved && <span className="tqp-rowLive">Actif</span>}
          </span>
          <span className="tqp-rowTag">{theme.tagline}</span>
        </span>
        {selected && (
          <span className="tqp-rowCheck" aria-hidden>
            <Check size={13} />
          </span>
        )}
      </button>
    </li>
  )
}

/**
 * Optional standalone trigger button — useful if you want to mount the same
 * styled button in another toolbar. Both built-in call sites (the editor's
 * appbar and the theme gallery page) render their own button and just call
 * `setOpen(true)`; this export is provided for future surfaces.
 */
export function ThemeQuickPanelTrigger({
  onClick,
  className,
  label = 'Thèmes',
}: {
  onClick: () => void
  className?: string
  label?: string
}) {
  return (
    <button
      type="button"
      className={className ?? 'we-appbar-btn'}
      onClick={onClick}
      title="Changer de thème rapidement"
    >
      <PaletteIcon size={15} /> {label}
    </button>
  )
}
