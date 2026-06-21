'use client'

/** Palette — the block "library": organized, collapsible shelves with a rich
 * hover help card (mini preview + how-to). */
import { useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import {
  Search, ChevronRight, LibraryBig, MousePointerClick,
  PanelsTopLeft, Type, Image as ImageIcon, ShoppingBag, LayoutGrid, Code,
} from 'lucide-react'
import { BLOCKS, CATEGORIES, createBlock } from './registry'
import { renderBlock } from './BlockRender'
import type { BlockDef } from './types'

function Icon({ name, size = 17 }: { name: string; size?: number }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>)[name]
  const C = Cmp ?? Icons.Square
  return <C size={size} strokeWidth={1.7} />
}

const CAT_META: Record<string, { color: string; desc: string; icon: React.ComponentType<{ size?: number }> }> = {
  Sections: { color: 'var(--c-mint)', desc: 'Grandes sections de page', icon: PanelsTopLeft },
  Texte: { color: 'var(--c-blue)', desc: 'Titres, textes, boutons', icon: Type },
  Médias: { color: 'var(--c-violet)', desc: 'Images, vidéos, galeries', icon: ImageIcon },
  Commerce: { color: 'var(--c-amber)', desc: 'Produits, catégories, marques', icon: ShoppingBag },
  Layout: { color: 'var(--c-orange)', desc: 'Structure & espacement', icon: LayoutGrid },
  Avancé: { color: 'var(--c-rose)', desc: 'HTML & intégrations', icon: Code },
}

interface HelpState {
  def: BlockDef
  x: number
  y: number
}

export function Palette({
  onAdd,
  onDragNew,
  onDragEnd,
  width,
  theme = 'nightline',
}: {
  onAdd: (type: string) => void
  onDragNew: (type: string) => void
  onDragEnd: () => void
  width?: number
  theme?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({
    Sections: true,
    Texte: true,
    Médias: false,
    Commerce: false,
    Layout: false,
    Avancé: false,
  })
  const [help, setHelp] = useState<HelpState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allOpen = CATEGORIES.every((c) => open[c])
  function toggleAll() {
    const next = !allOpen
    setOpen(Object.fromEntries(CATEGORIES.map((c) => [c, next])))
  }

  const query = q.trim().toLowerCase()
  const searching = query.length > 0
  const matches = (b: BlockDef) =>
    !query ||
    b.label.toLowerCase().includes(query) ||
    b.type.includes(query) ||
    (b.description ?? '').toLowerCase().includes(query)

  function showHelp(def: BlockDef, el: HTMLElement) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const r = el.getBoundingClientRect()
      const x = Math.min(r.right + 10, window.innerWidth - 292)
      const y = Math.min(Math.max(r.top - 30, 12), window.innerHeight - 280)
      setHelp({ def, x, y })
    }, 320)
  }
  function hideHelp() {
    if (timer.current) clearTimeout(timer.current)
    setHelp(null)
  }

  function Item({ b }: { b: BlockDef }) {
    return (
      <button
        className="we-palette-item"
        draggable
        title={b.label}
        onClick={() => onAdd(b.type)}
        onMouseEnter={(e) => showHelp(b, e.currentTarget)}
        onMouseLeave={hideHelp}
        onDragStart={(e) => {
          hideHelp()
          e.dataTransfer.effectAllowed = 'copy'
          e.dataTransfer.setData('text/plain', b.type)
          onDragNew(b.type)
        }}
        onDragEnd={onDragEnd}
      >
        <span className="we-palette-icon"><Icon name={b.icon} /></span>
        <span className="we-palette-label">{b.label}</span>
      </button>
    )
  }

  return (
    <div className="we-palette" style={{ width }}>
      <div className="we-palette-head">
        <span className="we-palette-title"><LibraryBig size={16} /> Bibliothèque</span>
        <button className="we-palette-toggle-all" onClick={toggleAll}>
          {allOpen ? 'Tout replier' : 'Tout déplier'}
        </button>
      </div>
      <div className="we-palette-search">
        <Search size={14} />
        <input
          placeholder="Rechercher un bloc…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="we-palette-scroll">
        {searching ? (
          <div className="we-shelf is-open">
            <div className="we-shelf-body" style={{ display: 'grid' }}>
              {BLOCKS.filter(matches).map((b) => (
                <Item key={b.type} b={b} />
              ))}
            </div>
            {BLOCKS.filter(matches).length === 0 && (
              <p className="we-help" style={{ padding: '6px 10px' }}>Aucun bloc pour « {q} ».</p>
            )}
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const items = BLOCKS.filter((b) => b.category === cat)
            if (items.length === 0) return null
            const meta = CAT_META[cat]!
            const isOpen = !!open[cat]
            const CatIcon = meta.icon
            return (
              <div key={cat} className={`we-shelf ${isOpen ? 'is-open' : ''}`}>
                <button
                  className="we-shelf-head"
                  onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))}
                >
                  <span
                    className="we-shelf-chip"
                    style={{
                      background: `color-mix(in oklab, ${meta.color} 16%, transparent)`,
                      color: meta.color,
                    }}
                  >
                    <CatIcon size={15} />
                  </span>
                  <span className="we-shelf-meta">
                    <span className="we-shelf-name">{cat}</span>
                    <span className="we-shelf-desc">{meta.desc} · {items.length}</span>
                  </span>
                  <ChevronRight size={15} className="we-shelf-caret" />
                </button>
                <div className="we-shelf-body">
                  {items.map((b) => (
                    <Item key={b.type} b={b} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {help && <HelpCard help={help} theme={theme} />}
    </div>
  )
}

function HelpCard({ help, theme }: { help: HelpState; theme: string }) {
  const def = help.def
  const previewBlock = createBlock(def.type)
  return (
    <div className="we-help-card" style={{ left: help.x, top: help.y }}>
      <div className="we-help-preview">
        <div className={`we-canvas we-theme-${theme}`} style={{ width: 760 }}>
          {renderBlock(previewBlock, { editing: false, selected: false }, null)}
        </div>
      </div>
      <div className="we-help-body">
        <p className="we-help-name">
          <span className="we-help-icn"><Icon name={def.icon} size={15} /></span>
          {def.label}
        </p>
        {def.description && <p className="we-help-desc">{def.description}</p>}
        <p className="we-help-how">
          <MousePointerClick size={13} />
          {def.howto ?? 'Glissez ce bloc vers la page, ou cliquez pour l’ajouter à la fin.'}
        </p>
      </div>
    </div>
  )
}
