'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderOpen,
  LayoutDashboard,
  MailQuestion,
  Package,
  Paintbrush,
  Plus,
  Search,
  Tag,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>(open, () => onOpenChange(false))

  const items: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Tableau de bord',
      description: 'Vue d’ensemble des demandes et du catalogue',
      icon: LayoutDashboard,
      action: () => router.push('/admin'),
      keywords: ['home', 'overview'],
    },
    {
      id: 'nav-products',
      label: 'Produits',
      description: 'Gérer le catalogue de produits',
      icon: Package,
      action: () => router.push('/admin/products'),
    },
    {
      id: 'action-new-product',
      label: 'Nouveau produit',
      description: 'Créer un nouveau produit',
      icon: Plus,
      action: () => router.push('/admin/products/new'),
      keywords: ['create', 'add'],
    },
    {
      id: 'action-import',
      label: 'Importer des produits',
      description: 'Importation en masse depuis CSV ou XLSX',
      icon: Upload,
      action: () => router.push('/admin/products/import'),
      keywords: ['csv', 'xlsx', 'bulk', 'upload'],
    },
    {
      id: 'nav-inquiries',
      label: 'Demandes',
      description: 'Demandes et messages des clients',
      icon: MailQuestion,
      action: () => router.push('/admin/inquiries'),
      keywords: ['messages', 'contact', 'leads'],
    },
    {
      id: 'nav-brands',
      label: 'Marques',
      description: 'Gérer les informations des marques',
      icon: Tag,
      action: () => router.push('/admin/brands'),
    },
    {
      id: 'nav-categories',
      label: 'Catégories',
      description: 'Gérer les catégories de produits',
      icon: FolderOpen,
      action: () => router.push('/admin/categories'),
    },
    {
      id: 'nav-users',
      label: 'Utilisateurs',
      description: 'Gérer les comptes admin et équipe',
      icon: Users,
      keywords: ['staff', 'team', 'admin'],
      action: () => router.push('/admin/users'),
    },
    {
      id: 'nav-editor',
      label: 'Éditeur web',
      description: 'Composer les pages du site (nouvel onglet)',
      icon: Paintbrush,
      keywords: ['editor', 'builder', 'pages', 'design', 'drag', 'blocs'],
      action: () => window.open('/editor', '_blank', 'noopener,noreferrer'),
    },
  ]

  const filtered = items.filter((item) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      item.label.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.toLowerCase().includes(q))
    )
  })

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => inputRef.current?.focus(), 10)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filtered[selectedIndex]
        if (selected) {
          selected.action()
          onOpenChange(false)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, selectedIndex, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-32"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-[var(--admin-canvas)]/80 backdrop-blur-sm" />

      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche rapide"
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-[var(--admin-glass-border)] bg-[var(--admin-glass-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--admin-glass-border)] px-4 py-3">
          <Search size={18} className="flex-shrink-0 text-[var(--admin-text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={filtered[selectedIndex] ? `cmdk-opt-${selectedIndex}` : undefined}
            aria-label="Rechercher dans l'admin"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Rechercher dans l'admin…"
            className="flex-1 bg-transparent font-body text-base text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-tertiary)]"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 text-[var(--admin-text-tertiary)] transition-colors hover:text-[var(--admin-text-primary)]"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <ul id="cmdk-list" role="listbox" aria-label="Actions" className="max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center font-body text-sm text-[var(--admin-text-tertiary)]">
              Aucun résultat pour « {query} »
            </li>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex
              return (
                <li key={item.id} id={`cmdk-opt-${idx}`} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      item.action()
                      onOpenChange(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-[var(--admin-soft-2)]'
                        : 'hover:bg-[var(--admin-soft)]'
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        isSelected ? 'text-[var(--admin-cyan)]' : 'text-[var(--admin-text-tertiary)]'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-[var(--admin-text-primary)]">
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="truncate font-body text-xs text-[var(--admin-text-tertiary)]">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-[var(--admin-glass-border)] px-4 py-2 text-[var(--admin-text-tertiary)]">
          <p className="font-mono text-xs">
            ↑↓ naviguer · ↵ sélectionner · échap fermer
          </p>
        </div>
      </div>
    </div>
  )
}
