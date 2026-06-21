'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'
import { Input } from '@/components/admin/ui/Input'

type SpecValue = string | number | string[]

interface SpecsEditorProps {
  value: Record<string, SpecValue>
  onChange: (value: Record<string, SpecValue>) => void
}

export function SpecsEditor({ value, onChange }: SpecsEditorProps) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const entries = Object.entries(value)

  function addSpec() {
    if (!newKey.trim() || !newValue.trim()) return
    onChange({ ...value, [newKey.trim()]: newValue.trim() })
    setNewKey('')
    setNewValue('')
  }

  function updateSpec(key: string, newVal: string) {
    onChange({ ...value, [key]: newVal })
  }

  function removeSpec(key: string) {
    const copy = { ...value }
    delete copy[key]
    onChange(copy)
  }

  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map(([key, val]) => (
            <li key={key} className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-md bg-white/[0.04] px-3 py-2 font-mono text-sm text-[var(--admin-text-secondary)]">
                  {key}
                </div>
                <input
                  type="text"
                  value={typeof val === 'string' ? val : JSON.stringify(val)}
                  onChange={(e) => updateSpec(key, e.target.value)}
                  className="rounded-md bg-white/[0.04] px-3 py-2 font-body text-sm text-white outline-none focus:ring-1 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSpec(key)}
                className="p-2 text-[var(--admin-text-tertiary)] transition-colors hover:text-rose-300"
                aria-label={`Remove ${key}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 border-t border-white/[0.08] pt-3">
        <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
          <Input
            placeholder="Caractéristique (ex. : Processeur)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <Input
            placeholder="Valeur (ex. : Intel i9-13900HX)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSpec()
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={addSpec}
          disabled={!newKey || !newValue}
        >
          <Plus size={14} />
          Add
        </Button>
      </div>

      {entries.length === 0 && (
        <p className="font-body text-sm text-[var(--admin-text-tertiary)]">
          No specs yet. Add the first spec above.
        </p>
      )}
    </div>
  )
}
