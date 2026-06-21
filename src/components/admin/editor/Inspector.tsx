'use client'

/** Inspector — the settings panel for the selected block. */
import React, { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react'
import type { Block, BlockStyle, FieldDef } from './types'
import { clone } from './types'
import { getDef } from './registry'
import { FONT_OPTIONS } from './style'

type Tab = 'content' | 'style' | 'advanced'

export function Inspector({
  block,
  onChange,
  onClose,
  width,
}: {
  block: Block
  onChange: (b: Block) => void
  onClose: () => void
  width?: number
}) {
  const def = getDef(block.type)
  const [tab, setTab] = useState<Tab>('content')
  if (!def) return null

  function setProp(key: string, value: unknown) {
    onChange({ ...block, props: { ...block.props, [key]: value } })
  }
  function setStyle(patch: Partial<BlockStyle>) {
    onChange({ ...block, style: { ...block.style, ...patch } })
  }

  const hasContent = def.fields.length > 0
  const ss = def.style

  return (
    <div className="we-insp" style={{ width }}>
      <div className="we-insp-head">
        <div>
          <span className="we-insp-kicker">Réglages du bloc</span>
          <h3 className="we-insp-title">{def.label}</h3>
        </div>
        <button className="we-icon-btn" onClick={onClose} title="Fermer">
          <X size={16} />
        </button>
      </div>

      <div className="we-insp-tabs">
        {hasContent && (
          <button className={tab === 'content' ? 'is-on' : ''} onClick={() => setTab('content')}>
            Contenu
          </button>
        )}
        <button className={tab === 'style' ? 'is-on' : ''} onClick={() => setTab('style')}>
          Style
        </button>
        <button className={tab === 'advanced' ? 'is-on' : ''} onClick={() => setTab('advanced')}>
          Avancé
        </button>
      </div>

      <div className="we-insp-body">
        {tab === 'content' &&
          (hasContent ? (
            def.fields.map((f) => (
              <FieldControl
                key={f.key}
                field={f}
                value={block.props[f.key]}
                allProps={block.props}
                onChange={(v) => setProp(f.key, v)}
              />
            ))
          ) : (
            <p className="we-insp-empty">
              Ce bloc est un conteneur — déposez des éléments à l’intérieur, puis
              cliquez dessus pour les modifier.
            </p>
          ))}

        {tab === 'style' && (
          <StyleControls style={block.style} support={ss} onChange={setStyle} />
        )}

        {tab === 'advanced' && (
          <div className="we-field">
            <label className="we-label">CSS personnalisé</label>
            <textarea
              className="we-textarea we-mono"
              rows={6}
              placeholder={'box-shadow: 0 10px 40px rgba(0,0,0,.4);\nbackdrop-filter: blur(8px);'}
              value={block.style.customCss ?? ''}
              onChange={(e) => setStyle({ customCss: e.target.value })}
            />
            <p className="we-help">
              Déclarations CSS appliquées à la racine du bloc (ex.{' '}
              <code>transform: rotate(-2deg)</code>).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────── content field controls ───────────────────────

function FieldControl({
  field,
  value,
  allProps,
  onChange,
}: {
  field: FieldDef
  value: unknown
  allProps: Record<string, unknown>
  onChange: (v: unknown) => void
}) {
  if (field.showIf) {
    if (allProps[field.showIf.key] !== field.showIf.equals) return null
  }

  switch (field.type) {
    case 'text':
    case 'image':
      return (
        <div className="we-field">
          <label className="we-label">{field.label}</label>
          <input
            className="we-input"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && <p className="we-help">{field.help}</p>}
        </div>
      )
    case 'textarea':
    case 'richtext':
      return (
        <div className="we-field">
          <label className="we-label">{field.label}</label>
          <textarea
            className="we-textarea"
            rows={3}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )
    case 'number':
      return (
        <div className="we-field">
          <label className="we-label">{field.label}</label>
          <input
            type="number"
            className="we-input"
            value={value == null ? '' : Number(value)}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </div>
      )
    case 'select':
      return (
        <div className="we-field">
          <label className="we-label">{field.label}</label>
          <select
            className="we-select"
            value={String(value ?? field.options?.[0]?.value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )
    case 'toggle':
      return (
        <label className="we-toggle">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span className="we-toggle-track"><span className="we-toggle-knob" /></span>
          <span className="we-toggle-label">{field.label}</span>
        </label>
      )
    case 'list':
      return <ListControl field={field} value={value} onChange={onChange} />
    default:
      return null
  }
}

function ListControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const itemFields = field.itemFields ?? []

  function update(idx: number, key: string, v: unknown) {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: v } : it))
    onChange(next)
  }
  function add() {
    const blank: Record<string, unknown> = {}
    itemFields.forEach((f) => (blank[f.key] = f.type === 'toggle' ? false : ''))
    onChange([...items, blank])
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = clone(items)
    const tmp = next[idx] as Record<string, unknown>
    next[idx] = next[j] as Record<string, unknown>
    next[j] = tmp
    onChange(next)
  }

  return (
    <div className="we-field">
      <label className="we-label">{field.label}</label>
      <div className="we-list-items">
        {items.map((it, idx) => (
          <div key={idx} className="we-list-item">
            <div className="we-list-item-head">
              <span className="we-list-item-n">#{idx + 1}</span>
              <div className="we-list-item-acts">
                <button className="we-icon-btn sm" onClick={() => move(idx, -1)} disabled={idx === 0} title="Monter">
                  <ArrowUp size={13} />
                </button>
                <button className="we-icon-btn sm" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} title="Descendre">
                  <ArrowDown size={13} />
                </button>
                <button className="we-icon-btn sm danger" onClick={() => remove(idx)} title="Supprimer">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            {itemFields.map((f) => (
              <FieldControl
                key={f.key}
                field={f}
                value={it[f.key]}
                allProps={it}
                onChange={(v) => update(idx, f.key, v)}
              />
            ))}
          </div>
        ))}
      </div>
      <button className="we-add-btn" onClick={add}>
        <Plus size={14} /> {field.addLabel ?? 'Ajouter'}
      </button>
    </div>
  )
}

// ─────────────────────────── style controls ───────────────────────────

function StyleControls({
  style,
  support,
  onChange,
}: {
  style: BlockStyle
  support: { typography?: boolean; colors?: boolean; spacing?: boolean; border?: boolean; layout?: boolean }
  onChange: (patch: Partial<BlockStyle>) => void
}) {
  return (
    <>
      {support.colors && (
        <Group title="Couleurs">
          <ColorRow label="Texte" value={style.textColor} onChange={(v) => onChange({ textColor: v })} />
          <ColorRow label="Fond" value={style.bgColor} onChange={(v) => onChange({ bgColor: v })} />
          <label className="we-toggle">
            <input type="checkbox" checked={!!style.gradient} onChange={(e) => onChange({ gradient: e.target.checked })} />
            <span className="we-toggle-track"><span className="we-toggle-knob" /></span>
            <span className="we-toggle-label">Dégradé</span>
          </label>
          {style.gradient && (
            <ColorRow label="Fond (2)" value={style.bgColor2} onChange={(v) => onChange({ bgColor2: v })} />
          )}
        </Group>
      )}

      {support.typography && (
        <Group title="Typographie">
          <div className="we-field">
            <label className="we-label">Police</label>
            <select
              className="we-select"
              value={style.fontFamily ?? ''}
              onChange={(e) => onChange({ fontFamily: e.target.value || undefined })}
            >
              <option value="">Par défaut</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <Slider label="Taille" value={style.fontSize} min={10} max={120} suffix="px" onChange={(v) => onChange({ fontSize: v })} />
          <div className="we-field">
            <label className="we-label">Graisse</label>
            <select
              className="we-select"
              value={style.fontWeight ?? ''}
              onChange={(e) => onChange({ fontWeight: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Par défaut</option>
              {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <Slider label="Interligne" value={style.lineHeight} min={1} max={2.4} step={0.05} onChange={(v) => onChange({ lineHeight: v })} />
          <Slider label="Interlettrage" value={style.letterSpacing} min={-0.05} max={0.4} step={0.01} suffix="em" onChange={(v) => onChange({ letterSpacing: v })} />
          <AlignRow value={style.textAlign} onChange={(v) => onChange({ textAlign: v })} />
          <div className="we-chip-row">
            <Chip on={!!style.italic} onClick={() => onChange({ italic: !style.italic })}>Italique</Chip>
            <Chip on={!!style.underline} onClick={() => onChange({ underline: !style.underline })}>Souligné</Chip>
            <Chip on={!!style.uppercase} onClick={() => onChange({ uppercase: !style.uppercase })}>MAJUSCULES</Chip>
          </div>
        </Group>
      )}

      {support.spacing && (
        <Group title="Espacement">
          <Slider label="Marge int. ↕" value={style.paddingY} min={0} max={200} suffix="px" onChange={(v) => onChange({ paddingY: v })} />
          <Slider label="Marge int. ↔" value={style.paddingX} min={0} max={200} suffix="px" onChange={(v) => onChange({ paddingX: v })} />
          <Slider label="Marge ext. haut" value={style.marginTop} min={0} max={160} suffix="px" onChange={(v) => onChange({ marginTop: v })} />
          <Slider label="Marge ext. bas" value={style.marginBottom} min={0} max={160} suffix="px" onChange={(v) => onChange({ marginBottom: v })} />
        </Group>
      )}

      {support.border && (
        <Group title="Bordure & ombre">
          <Slider label="Arrondi" value={style.radius} min={0} max={48} suffix="px" onChange={(v) => onChange({ radius: v })} />
          <Slider label="Épaisseur bordure" value={style.borderWidth} min={0} max={8} suffix="px" onChange={(v) => onChange({ borderWidth: v })} />
          {!!style.borderWidth && style.borderWidth > 0 && (
            <ColorRow label="Couleur bordure" value={style.borderColor} onChange={(v) => onChange({ borderColor: v })} />
          )}
          <div className="we-field">
            <label className="we-label">Ombre</label>
            <select className="we-select" value={style.shadow ?? 'none'} onChange={(e) => onChange({ shadow: e.target.value as BlockStyle['shadow'] })}>
              {['none', 'sm', 'md', 'lg', 'glow'].map((sh) => (
                <option key={sh} value={sh}>{sh === 'none' ? 'Aucune' : sh === 'glow' ? 'Lueur mint' : sh}</option>
              ))}
            </select>
          </div>
        </Group>
      )}

      {support.layout && (
        <Group title="Disposition">
          <Slider label="Largeur max" value={style.maxWidth} min={0} max={1400} step={20} suffix="px" onChange={(v) => onChange({ maxWidth: v })} />
          <Slider label="Opacité" value={style.opacity} min={0} max={100} suffix="%" onChange={(v) => onChange({ opacity: v })} />
        </Group>
      )}

      {/* Responsive visibility — three small toggles. Every block supports
          this, regardless of `style` support set, since it's a layout/safety
          concern that applies universally. */}
      <Group title="Visible sur">
        <div className="we-resp-row" role="group" aria-label="Visibilité par appareil">
          <label className="we-resp-chip">
            <input
              type="checkbox"
              checked={!style.hideOnDesktop}
              onChange={(e) => onChange({ hideOnDesktop: !e.target.checked })}
            />
            <span>🖥 Bureau</span>
          </label>
          <label className="we-resp-chip">
            <input
              type="checkbox"
              checked={!style.hideOnTablet}
              onChange={(e) => onChange({ hideOnTablet: !e.target.checked })}
            />
            <span>🟦 Tablette</span>
          </label>
          <label className="we-resp-chip">
            <input
              type="checkbox"
              checked={!style.hideOnMobile}
              onChange={(e) => onChange({ hideOnMobile: !e.target.checked })}
            />
            <span>📱 Mobile</span>
          </label>
        </div>
        <p className="we-help">
          Décochez pour masquer ce bloc sur l’appareil ciblé. Le bloc reste
          dans l’éditeur (avec un voile) ; il disparaît du site publié.
        </p>
      </Group>
    </>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="we-group">
      <p className="we-group-title">{title}</p>
      {children}
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value?: string; onChange: (v: string | undefined) => void }) {
  const hex = toHex(value)
  return (
    <div className="we-field we-color-row">
      <label className="we-label">{label}</label>
      <div className="we-color-controls">
        <input type="color" className="we-color" value={hex} onChange={(e) => onChange(e.target.value)} />
        <input
          className="we-input we-mono"
          value={value ?? ''}
          placeholder="—"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value && (
          <button className="we-icon-btn sm" title="Réinitialiser" onClick={() => onChange(undefined)}>
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function Slider({
  label, value, min, max, step = 1, suffix = '', onChange,
}: {
  label: string; value?: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number | undefined) => void
}) {
  const set = value ?? min
  return (
    <div className="we-field">
      <div className="we-slider-head">
        <label className="we-label">{label}</label>
        <span className="we-slider-val">{value == null ? 'auto' : `${value}${suffix}`}</span>
      </div>
      <div className="we-slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={set}
          onChange={(e) => onChange(Number(e.target.value))}
          className="we-range"
        />
        {value != null && (
          <button className="we-icon-btn sm" title="Réinitialiser" onClick={() => onChange(undefined)}>
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function AlignRow({ value, onChange }: { value?: string; onChange: (v: BlockStyle['textAlign']) => void }) {
  return (
    <div className="we-field">
      <label className="we-label">Alignement</label>
      <div className="we-seg">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button key={a} className={value === a ? 'is-on' : ''} onClick={() => onChange(a)}>
            {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
          </button>
        ))}
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`we-style-chip ${on ? 'is-on' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

function toHex(v?: string): string {
  if (!v) return '#7ce0c3'
  if (/^#[0-9a-f]{6}$/i.test(v)) return v
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return '#' + v.slice(1).split('').map((c) => c + c).join('')
  }
  return '#7ce0c3'
}
