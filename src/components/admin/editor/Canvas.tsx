'use client'

/** Canvas — renders the page tree with selection, hover tools & drop zones. */
import React, { useState } from 'react'
import {
  GripVertical, Copy, Trash2, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { Block, PageDoc, Path } from './types'
import { pathEquals } from './types'
import { getDef } from './registry'
import { renderBlock, type RenderCtx } from './BlockRender'

export interface CanvasProps {
  doc: PageDoc
  device: 'desktop' | 'tablet' | 'mobile'
  selectedPath: Path | null
  theme: string
  dragging: boolean
  onSelect: (path: Path | null) => void
  onTextEdit: (path: Path, key: string, value: string) => void
  onDelete: (path: Path) => void
  onDuplicate: (path: Path) => void
  onShift: (path: Path, dir: -1 | 1) => void
  onBeginMove: (path: Path) => void
  onDropAt: (parentPath: Path, index: number) => void
  onDragEndAll: () => void
}

const DEVICE_WIDTH = { desktop: '100%', tablet: '820px', mobile: '390px' } as const

export function Canvas(props: CanvasProps) {
  const { doc, device, theme } = props
  return (
    <div className="we-canvas-scroll" onClick={() => props.onSelect(null)}>
      {/* Fake browser chrome — frames the canvas as if it were the live
          site, so the editor feels like Shopify / WordPress in-place
          editing rather than a generic block builder. */}
      <div className="we-browser" data-device={device} style={{ width: DEVICE_WIDTH[device] }}>
        <div className="we-browser-bar" aria-hidden>
          <span className="we-browser-dots">
            <span /><span /><span />
          </span>
          <span className="we-browser-url">
            <span className="we-browser-lock" aria-hidden>🔒</span>
            <span>d-techalgerie.com/</span>
            <span className="we-browser-page">{doc.name || 'Page d’accueil'}</span>
          </span>
          <span className="we-browser-meta">{device.toUpperCase()}</span>
        </div>
        <div
          className={`we-canvas we-theme-${theme}`}
          data-device={device}
          style={{ width: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <BlockList blocks={doc.blocks} parentPath={[]} {...props} />
          {doc.blocks.length === 0 && (
            <DropZone parentPath={[]} index={0} dragging={props.dragging} onDropAt={props.onDropAt} big />
          )}
        </div>
      </div>
    </div>
  )
}

function BlockList({
  blocks,
  parentPath,
  ...props
}: { blocks: Block[]; parentPath: Path } & CanvasProps) {
  return (
    <>
      <DropZone parentPath={parentPath} index={0} dragging={props.dragging} onDropAt={props.onDropAt} />
      {blocks.map((b, i) => (
        <React.Fragment key={b.id}>
          <BlockView block={b} path={[...parentPath, i]} indexInParent={i} siblings={blocks.length} {...props} />
          <DropZone parentPath={parentPath} index={i + 1} dragging={props.dragging} onDropAt={props.onDropAt} />
        </React.Fragment>
      ))}
    </>
  )
}

function BlockView({
  block,
  path,
  indexInParent,
  siblings,
  ...props
}: {
  block: Block
  path: Path
  indexInParent: number
  siblings: number
} & CanvasProps) {
  const def = getDef(block.type)
  const selected = pathEquals(props.selectedPath, path)
  const [hover, setHover] = useState(false)
  const [textFocused, setTextFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const ctx: RenderCtx = {
    editing: true,
    selected,
    onText: (key, value) => props.onTextEdit(path, key, value),
  }

  let childrenSlot: React.ReactNode = null
  if (def?.isContainer) {
    const kids = block.children ?? []
    childrenSlot =
      kids.length === 0 ? (
        <DropZone parentPath={path} index={0} dragging={props.dragging} onDropAt={props.onDropAt} emptyLabel={def.label} />
      ) : (
        <BlockList blocks={kids} parentPath={path} {...props} />
      )
  }

  return (
    <div
      className={`we-bv is-draggable ${selected ? 'is-selected' : ''} ${hover ? 'is-hover' : ''} ${isDragging ? 'is-dragging' : ''} ${textFocused ? 'is-editing' : ''}`}
      data-type={block.type}
      data-hide-desktop={block.style.hideOnDesktop ? '1' : undefined}
      data-hide-tablet={block.style.hideOnTablet ? '1' : undefined}
      data-hide-mobile={block.style.hideOnMobile ? '1' : undefined}
      draggable={!textFocused}
      onDragStart={(e) => {
        if (textFocused) return
        e.stopPropagation()
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', block.id)
        props.onBeginMove(path)
        setIsDragging(true)
      }}
      onDragEnd={(e) => {
        e.stopPropagation()
        setIsDragging(false)
        props.onDragEndAll()
      }}
      onFocusCapture={() => setTextFocused(true)}
      onBlurCapture={() => setTextFocused(false)}
      onMouseOver={(e) => {
        e.stopPropagation()
        setHover(true)
      }}
      onMouseOut={(e) => {
        e.stopPropagation()
        setHover(false)
      }}
      onClick={(e) => {
        e.stopPropagation()
        props.onSelect(path)
      }}
    >
      {(hover || selected) && def && (
        <div className="we-bv-tag" onClick={(e) => e.stopPropagation()}>
          <span
            className="we-bv-grip"
            draggable
            title="Glisser pour déplacer (ou glissez le bloc lui-même)"
            onDragStart={(e) => {
              e.stopPropagation()
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', block.id)
              props.onBeginMove(path)
            }}
            onDragEnd={props.onDragEndAll}
          >
            <GripVertical size={13} />
          </span>
          <span className="we-bv-name">{def.label}</span>
          <button className="we-bv-act" title="Monter" disabled={indexInParent === 0} onClick={() => props.onShift(path, -1)}>
            <ChevronUp size={13} />
          </button>
          <button className="we-bv-act" title="Descendre" disabled={indexInParent === siblings - 1} onClick={() => props.onShift(path, 1)}>
            <ChevronDown size={13} />
          </button>
          <button className="we-bv-act" title="Dupliquer" onClick={() => props.onDuplicate(path)}>
            <Copy size={12} />
          </button>
          <button className="we-bv-act danger" title="Supprimer" onClick={() => props.onDelete(path)}>
            <Trash2 size={12} />
          </button>
        </div>
      )}
      {renderBlock(block, ctx, childrenSlot)}
    </div>
  )
}

function DropZone({
  parentPath,
  index,
  dragging,
  onDropAt,
  big = false,
  emptyLabel,
}: {
  parentPath: Path
  index: number
  dragging: boolean
  onDropAt: (parentPath: Path, index: number) => void
  big?: boolean
  emptyLabel?: string
}) {
  const [active, setActive] = useState(false)

  if (emptyLabel) {
    return (
      <div
        className={`we-empty-slot ${active ? 'is-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setActive(true)
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setActive(false)
          onDropAt(parentPath, index)
        }}
      >
        Déposez un bloc dans « {emptyLabel} »
      </div>
    )
  }

  return (
    <div
      className={`we-dropzone ${big ? 'big' : ''} ${dragging ? 'armed' : ''} ${active ? 'is-active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!active) setActive(true)
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setActive(false)
        onDropAt(parentPath, index)
      }}
    >
      <span className="we-dropzone-line" />
      {big && <span className="we-dropzone-hint">Glissez un bloc ici pour commencer</span>}
    </div>
  )
}
