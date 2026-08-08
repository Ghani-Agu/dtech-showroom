'use client'

/**
 * ÉDITEUR — les champs de l'inspecteur.
 *
 * Un champ, une ligne, un libellé lisible. Rien d'ingénieux : c'est la partie
 * que l'auteur manipule toute la journée, donc elle doit être ennuyeuse et
 * prévisible.
 *
 * Deux points méritent une explication :
 *
 * · Les valeurs de texte sont stockées par langue (`{fr,en,ar}`) OU en chaîne
 *   simple selon le champ. `readValue`/`writeValue` absorbent les deux formes,
 *   ce qui permet de rendre un champ multilingue sans migrer les documents
 *   déjà enregistrés.
 *
 * · Les listes se réordonnent par boutons plutôt qu'au glisser : à l'intérieur
 *   d'un panneau étroit, une poignée de 24 px est plus pénible qu'une flèche —
 *   le glisser-déposer, lui, a toute la page pour respirer.
 */

import { useRef, useState, useTransition } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { EdField } from '@/components/editorial/ed-ctx'
import type { EdLocale } from '@/lib/ed-editor/model'
import { edUploadImage } from '@/server/ed-actions'

/* ─────────────────────────── lecture / écriture ─────────────────────────── */

export function readValue(raw: unknown, field: EdField, locale: EdLocale): string {
  if (raw === undefined || raw === null) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number') return String(raw)
  if (typeof raw === 'boolean') return raw ? 'true' : ''
  if (field.localized && typeof raw === 'object') {
    const v = (raw as Record<string, unknown>)[locale]
    return typeof v === 'string' ? v : ''
  }
  return ''
}

export function writeValue(
  raw: unknown,
  field: EdField,
  locale: EdLocale,
  next: string,
): unknown {
  if (field.type === 'number') {
    if (next === '') return undefined
    const n = Number(next)
    return Number.isFinite(n) ? n : undefined
  }
  if (field.type === 'switch') return next === 'true'
  if (!field.localized) return next === '' ? undefined : next
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as object) } : {}
  const map = base as Record<string, string>
  if (next === '') delete map[locale]
  else map[locale] = next
  return Object.keys(map).length ? map : undefined
}

/* ─────────────────────────────── primitives ─────────────────────────────── */

export function Row({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <label className="edf-row">
      <span className="edf-lab">{label}</span>
      {children}
      {help ? <em className="edf-help">{help}</em> : null}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  area,
  mono,
  rows = 4,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  area?: boolean
  mono?: boolean
  rows?: number
}) {
  if (area) {
    return (
      <textarea
        className={`edf-in edf-area${mono ? ' is-mono' : ''}`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={!mono}
      />
    )
  }
  return (
    <input
      className="edf-in"
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
}) {
  return (
    <input
      className="edf-in"
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      placeholder={placeholder ?? 'auto'}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function SelectInput({
  value,
  onChange,
  options,
  empty,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  empty?: string
}) {
  return (
    <select className="edf-in" value={value} onChange={(e) => onChange(e.target.value)}>
      {empty !== undefined ? <option value="">{empty}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`edf-switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <i />
      <span>{label}</span>
    </button>
  )
}

/**
 * Couleur : le sélecteur natif ne comprend que `#rrggbb`, alors que le site
 * utilise volontiers `var(--teal)` ou `color-mix(...)`. Les deux cohabitent
 * donc — pastille pour choisir vite, champ texte pour tout le reste.
 */
export function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
  return (
    <span className="edf-color">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Choisir une couleur"
      />
      <input
        className="edf-in"
        type="text"
        value={value}
        placeholder="par défaut"
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" className="edf-clear" onClick={() => onChange('')} title="Effacer">
          <X size={13} />
        </button>
      ) : null}
    </span>
  )
}

/** Image : coller une adresse, ou téléverser depuis le poste. */
export function ImageInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const file = useRef<HTMLInputElement | null>(null)
  const [busy, start] = useTransition()
  const [error, setError] = useState('')

  const upload = (f: File) => {
    setError('')
    const fd = new FormData()
    fd.append('file', f)
    start(async () => {
      const res = await edUploadImage(fd)
      if (res.ok) onChange(res.url)
      else setError(res.error)
    })
  }

  return (
    <span className="edf-img">
      {value ? (
        // Aperçu brut : l'URL peut pointer n'importe où, y compris hors des
        // domaines déclarés à next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="edf-imgprev" />
      ) : null}
      <input
        className="edf-in"
        type="text"
        value={value}
        placeholder="/images/… ou https://…"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="edf-imgbtns">
        <button type="button" className="edf-btn" onClick={() => file.current?.click()}>
          {busy ? <Loader2 size={13} className="edf-spin" /> : <ImagePlus size={13} />}
          Téléverser
        </button>
        {value ? (
          <button type="button" className="edf-btn" onClick={() => onChange('')}>
            <Trash2 size={13} />
            Retirer
          </button>
        ) : null}
      </span>
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }}
      />
      {error ? <em className="edf-err">{error}</em> : null}
    </span>
  )
}

/* ──────────────────────────────── listes ───────────────────────────────── */

export function ListField({
  field,
  items,
  locale,
  onChange,
}: {
  field: EdField
  items: Record<string, unknown>[]
  locale: EdLocale
  onChange: (next: Record<string, unknown>[]) => void
}) {
  const [open, setOpen] = useState<number | null>(0)

  const patch = (index: number, key: string, value: unknown) => {
    const next = items.map((it, i) => (i === index ? { ...it, [key]: value } : it))
    onChange(next)
  }
  const move = (index: number, delta: number) => {
    const to = index + delta
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [row] = next.splice(index, 1)
    if (row) next.splice(to, 0, row)
    onChange(next)
  }

  const title = (it: Record<string, unknown>, i: number) => {
    for (const f of field.itemFields ?? []) {
      const v = readValue(it[f.key], f, locale)
      if (v) return v.length > 40 ? `${v.slice(0, 40)}…` : v
    }
    return `Élément ${i + 1}`
  }

  return (
    <div className="edf-list">
      <span className="edf-lab">{field.label}</span>
      {items.map((it, i) => (
        <div className={`edf-item${open === i ? ' is-open' : ''}`} key={i}>
          <div className="edf-itemhead">
            <button
              type="button"
              className="edf-itemname"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <b>{String(i + 1).padStart(2, '0')}</b>
              <span>{title(it, i)}</span>
            </button>
            <button type="button" onClick={() => move(i, -1)} title="Monter" disabled={i === 0}>
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              title="Descendre"
              disabled={i === items.length - 1}
            >
              <ArrowDown size={13} />
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, k) => k !== i))}
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          </div>
          {open === i ? (
            <div className="edf-itembody">
              {(field.itemFields ?? []).map((f) => (
                <FieldRow
                  key={f.key}
                  field={f}
                  value={it[f.key]}
                  locale={locale}
                  onChange={(v) => patch(i, f.key, v)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="edf-add"
        onClick={() => {
          onChange([...items, {}])
          setOpen(items.length)
        }}
      >
        <Plus size={14} />
        {field.addLabel ?? 'Ajouter'}
      </button>
    </div>
  )
}

/* ─────────────────────── le champ générique, par type ───────────────────── */

export function FieldRow({
  field,
  value,
  locale,
  onChange,
}: {
  field: EdField
  value: unknown
  locale: EdLocale
  onChange: (next: unknown) => void
}) {
  if (field.type === 'list') {
    const items = Array.isArray(value)
      ? (value as unknown[]).filter(
          (i): i is Record<string, unknown> => !!i && typeof i === 'object',
        )
      : []
    return <ListField field={field} items={items} locale={locale} onChange={onChange} />
  }

  const raw = readValue(value, field, locale)
  const set = (next: string) => onChange(writeValue(value, field, locale, next))

  if (field.type === 'switch') {
    return (
      <div className="edf-row">
        <Switch checked={value === true} onChange={(v) => onChange(v)} label={field.label} />
        {field.help ? <em className="edf-help">{field.help}</em> : null}
      </div>
    )
  }

  return (
    <Row label={field.label} help={field.help}>
      {field.type === 'textarea' ? (
        <TextInput value={raw} onChange={set} placeholder={field.placeholder} area />
      ) : field.type === 'number' ? (
        <NumberInput
          value={raw}
          onChange={set}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      ) : field.type === 'color' ? (
        <ColorInput value={raw} onChange={set} />
      ) : field.type === 'image' ? (
        <ImageInput value={raw} onChange={set} />
      ) : field.type === 'select' ? (
        <SelectInput value={raw} onChange={set} options={field.options ?? []} empty="Par défaut" />
      ) : (
        <TextInput
          value={raw}
          onChange={set}
          placeholder={field.placeholder ?? (field.type === 'link' ? '/contact' : undefined)}
        />
      )}
    </Row>
  )
}
