'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  className?: string
  placeholder?: string
}

export function SearchInput({
  className,
  placeholder = 'Search the catalog',
}: SearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get('q') ?? ''
  const [value, setValue] = useState(currentQuery)
  const [lastQuery, setLastQuery] = useState(currentQuery)

  // Sync input with URL when user navigates externally (adjust during render).
  if (currentQuery !== lastQuery) {
    setLastQuery(currentQuery)
    setValue(currentQuery)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      router.push('/search')
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={cn('flex w-full items-center', className)}
    >
      <label htmlFor="site-search" className="sr-only">
        Search the catalog
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm bg-surface-elevated px-4 py-2 font-body text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent"
      />
    </form>
  )
}
