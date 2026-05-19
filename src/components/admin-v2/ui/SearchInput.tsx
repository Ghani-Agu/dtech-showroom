'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface SearchInputProps {
  placeholder?: string
  paramName?: string
  debounceMs?: number
}

export function SearchInput({
  placeholder = 'Search...',
  paramName = 'q',
  debounceMs = 250,
}: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get(paramName) ?? ''
  const [value, setValue] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(paramName, value)
      } else {
        params.delete(paramName)
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, debounceMs)

    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative flex-1 max-w-md">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-9 rounded-lg bg-admin-surface-raised border border-admin-border font-body text-sm text-admin-text-primary placeholder:text-admin-text-muted focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded flex items-center justify-center text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-surface-elevated transition-colors"
        >
          <X size={14} />
        </button>
      )}
      {isPending && (
        <div className="absolute right-9 top-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-admin-accent border-t-transparent animate-spin" />
      )}
    </div>
  )
}
