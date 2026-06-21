'use client'

/**
 * ThemeLibrary — the full theme page. Each card shows a LIVE preview of the
 * user's own page rendered in that theme; "Appliquer" saves the theme to the
 * page (and the live site if published).
 */
import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, Check, Palette, Sparkles, Zap } from 'lucide-react'
import { renderBlock, type RenderCtx } from './BlockRender'
import { getDef, createBlock } from './registry'
import { THEMES, getTheme } from './themes'
import { ThemeQuickPanel } from './ThemeQuickPanel'
import { setContentTheme } from '@/server/content-actions'
import type { Block, PageDoc } from './types'
import './editor.css'

function renderTree(blocks: Block[]): React.ReactNode {
  return blocks.map((b) => {
    const def = getDef(b.type)
    const ctx: RenderCtx = { editing: false, selected: false }
    const slot = def?.isContainer ? renderTree(b.children ?? []) : null
    return <React.Fragment key={b.id}>{renderBlock(b, ctx, slot)}</React.Fragment>
  })
}

/** Small stand-in page when nothing is saved yet (previews still look great). */
function samplePage(): PageDoc {
  return {
    id: 'sample',
    name: 'Aperçu',
    background: '',
    blocks: [
      createBlock('navbar'),
      createBlock('hero'),
      createBlock('featureGrid'),
      createBlock('productGrid'),
      createBlock('footer'),
    ],
  }
}

export function ThemeLibrary({
  doc,
  initialTheme,
  hasSavedPage,
  published,
  uiClass,
  pageKey = 'home',
}: {
  doc: PageDoc | null
  initialTheme: string
  hasSavedPage: boolean
  published: boolean
  uiClass: string
  pageKey?: string
}) {
  const [current, setCurrent] = useState(initialTheme)
  const [applying, setApplying] = useState<string | null>(null)
  const [uiTheme, setUiTheme] = useState(initialTheme)
  const [quickOpen, setQuickOpen] = useState(false)
  const previewDoc = doc ?? samplePage()
  // The drawer needs a PageDoc with the current theme reflected — fall back
  // to the sample tree when the user hasn't saved a page yet.
  const drawerDoc: PageDoc = doc
    ? { ...doc, theme: current }
    : { ...samplePage(), theme: current }

  async function apply(id: string) {
    setApplying(id)
    try {
      const r = await setContentTheme(pageKey, id)
      if (r.ok) {
        setCurrent(id)
        setUiTheme(id)
        toast.success('Thème appliqué — en ligne sur le site')
      } else {
        toast.error(r.error ?? 'Échec')
      }
    } catch {
      toast.error('Échec')
    } finally {
      setApplying(null)
    }
  }

  const ui = `${getTheme(uiTheme).dark ? '' : 'we-ui-light'} we-accent-${uiTheme}`.trim()

  return (
    <div className={`we-page ${ui}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="we-page-bar">
        <Link className="we-exit" href="/editor">
          <ChevronLeft size={16} /> <span>Éditeur</span>
        </Link>
        <span className="we-appbar-brand">
          <Palette size={16} style={{ color: 'var(--c-mint)' }} />
          Bibliothèque de thèmes
        </span>
        <button
          type="button"
          className="we-appbar-btn"
          onClick={() => setQuickOpen(true)}
          title="Aperçu rapide sans quitter la page"
        >
          <Zap size={14} /> Aperçu rapide
        </button>
        <Link className="we-appbar-link" href="/editor/guide">
          Guide <Sparkles size={13} />
        </Link>
      </div>

      <div className="we-tl">
        <div className="we-tl-hero">
          <p className="we-panel-kicker">Thèmes · {THEMES.length} styles</p>
          <h1 className="we-panel-title" style={{ fontSize: 30 }}>Habillez votre boutique.</h1>
          <p className="we-panel-sub" style={{ maxWidth: '64ch' }}>
            Même site, mêmes produits, mêmes informations — seul le style change.
            Chaque carte montre votre vraie page dans ce thème. L’éditeur et le
            site s’adaptent au thème choisi.
          </p>
        </div>

        <div className="we-tl-grid" data-uiclass={uiClass}>
          {THEMES.map((t) => {
            const on = t.id === current
            return (
              <div key={t.id} className={`we-tl-card ${on ? 'is-on' : ''}`}>
                <div className="we-tl-preview">
                  <div
                    className={`we-canvas we-theme-${t.id}`}
                    style={{ width: 1280, transform: 'scale(0.27)' }}
                  >
                    {renderTree(previewDoc.blocks)}
                  </div>
                </div>
                <div className="we-tl-foot">
                  <div>
                    <span className="we-tl-tag">{t.tagline}</span>
                    <div className="we-tl-name">
                      {t.name}
                      {on && published && <span className="we-tl-livebadge">● En ligne</span>}
                    </div>
                  </div>
                  <p className="we-tl-desc">{t.description}</p>
                  <div className="we-tl-actions">
                    <button
                      className={`we-tl-apply ${on ? 'is-on' : ''}`}
                      disabled={applying !== null}
                      onClick={() => apply(t.id)}
                    >
                      {on ? (
                        <>
                          <Check size={15} /> Thème actuel
                        </>
                      ) : applying === t.id ? (
                        'Application…'
                      ) : (
                        'Appliquer'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <ThemeQuickPanel
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        doc={drawerDoc}
        pageKey={pageKey}
        hasSavedPage={hasSavedPage}
        published={published}
        onApplied={(themeId) => {
          setCurrent(themeId)
          setUiTheme(themeId)
        }}
      />
    </div>
  )
}
