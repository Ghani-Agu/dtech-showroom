'use client'

/**
 * PublishedPage — renders a saved editor document on the PUBLIC site.
 * Reuses the same block renderer + styles as the editor preview, so what
 * you publish is exactly what you saw. Imports only BlockRender + registry
 * (not the editor chrome) to keep the public bundle lean.
 *
 * For TEMPLATE pages (product/category/brand) a `data` context is passed and
 * `applyData()` interpolates `{{tokens}}` and binds the dynamic blocks before
 * rendering.
 */
import React from 'react'
import { renderBlock, type RenderCtx } from './BlockRender'
import { getDef } from './registry'
import type { Block, PageDoc } from './types'
import { applyData, type RenderData } from './render-context'
import './editor.css'

function renderTree(blocks: Block[]): React.ReactNode {
  return blocks.map((b) => {
    const def = getDef(b.type)
    const ctx: RenderCtx = { editing: false, selected: false }
    const slot = def?.isContainer ? renderTree(b.children ?? []) : null
    // Wrap each block in a tiny <div> so the per-device hide flags can
    // surface as data attrs even on non-container blocks. The wrapper
    // adds no visual styling — it's display:contents — so layout is
    // unaffected.
    const hide =
      b.style.hideOnDesktop || b.style.hideOnTablet || b.style.hideOnMobile
    if (!hide) {
      return <React.Fragment key={b.id}>{renderBlock(b, ctx, slot)}</React.Fragment>
    }
    return (
      <div
        key={b.id}
        className="we-vis"
        data-hide-desktop={b.style.hideOnDesktop ? '1' : undefined}
        data-hide-tablet={b.style.hideOnTablet ? '1' : undefined}
        data-hide-mobile={b.style.hideOnMobile ? '1' : undefined}
        style={{ display: 'contents' }}
      >
        {renderBlock(b, ctx, slot)}
      </div>
    )
  })
}

export function PublishedPage({
  doc,
  data,
}: {
  doc: PageDoc
  data?: RenderData
}) {
  const blocks = data ? applyData(doc.blocks, data) : doc.blocks
  return (
    <div className="we-public">
      <div
        className={`we-canvas we-theme-${doc.theme ?? 'nightline'}`}
        style={{ width: '100%' }}
      >
        {renderTree(blocks)}
      </div>
    </div>
  )
}
