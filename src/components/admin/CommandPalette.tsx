'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderOpen,
  LayoutDashboard,
  MailQuestion,
  Package,
  Plus,
  Search,
  Tag,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const items: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Overview of inquiries and catalog',
      icon: LayoutDashboard,
      action: () => router.push('/admin'),
      keywords: ['home', 'overview'],
    },
    {
      id: 'nav-products',
      label: 'Products',
      description: 'Manage the product catalog',
      icon: Package,
      action: () => router.push('/admin/products'),
    },
    {
      id: 'action-new-product',
      label: 'New product',
      description: 'Create a new product',
      icon: Plus,
      action: () => router.push('/admin/products/new'),
      keywords: ['create', 'add'],
    },
    {
      id: 'action-import',
      label: 'Import products',
      description: 'Bulk import from CSV or XLSX',
      icon: Upload,
      action: () => router.push('/admin/products/import'),
      keywords: ['csv', 'xlsx', 'bulk', 'upload'],
    },
    {
      id: 'nav-inquiries',
      label: 'Inquiries',
      description: 'Customer inquiries and messages',
      icon: MailQuestion,
      action: () => router.push('/admin/inquiries'),
      keywords: ['messages', 'contact', 'leads'],
    },
    {
      id: 'nav-brands',
      label: 'Brands',
      description: 'Manage brand information',
      icon: Tag,
      action: () => router.push('/admin/brands'),
    },
    {
      id: 'nav-categories',
      label: 'Categories',
      description: 'Manage product categories',
      icon: FolderOpen,
      action: () => router.push('/admin/categories'),
    },
    {
      id: 'nav-users',
      label: 'Users',
      description: 'Manage admin and staff users',
      icon: Users,
      keywords: ['staff', 'team', 'admin'],
      action: () => router.push('/admin/users'),
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
      <div className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-surface-overlay bg-surface-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-surface-overlay px-4 py-3">
          <Search size={18} className="flex-shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search admin..."
            className="flex-1 bg-transparent font-body text-base text-text-primary outline-none placeholder:text-text-muted"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 text-text-muted transition-colors hover:text-text-primary"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center font-body text-sm text-text-muted">
              No matches for &quot;{query}&quot;
            </li>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      item.action()
                      onOpenChange(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-surface-overlay'
                        : 'hover:bg-surface-overlay/50'
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        isSelected ? 'text-accent' : 'text-text-muted'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-text-primary">
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="truncate font-body text-xs text-text-muted">
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

        <div className="flex items-center justify-between border-t border-surface-overlay px-4 py-2 text-text-muted">
          <p className="font-mono text-xs">
            ↑↓ navigate · ↵ select · esc close
          </p>
        </div>
      </div>
    </div>
  )
}
