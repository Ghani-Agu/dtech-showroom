'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface FilterSelectProps {
  paramName: string
  label: string
  options: Array<{ value: string; label: string }>
  defaultValue?: string
  includeAll?: boolean
}

export function FilterSelect({
  paramName,
  label,
  options,
  defaultValue = '',
  includeAll = true,
}: FilterSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentValue = searchParams.get(paramName) ?? defaultValue

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set(paramName, e.target.value)
    } else {
      params.delete(paramName)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <label className="relative inline-flex items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-wider text-admin-text-muted">
        {label}
      </span>
      <select
        value={currentValue}
        onChange={handleChange}
        disabled={isPending}
        className="h-10 pl-3 pr-8 rounded-lg bg-admin-surface-raised border border-admin-border font-body text-sm text-admin-text-primary focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition-all cursor-pointer appearance-none bg-no-repeat bg-[right_8px_center] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%221.5%22><path d=%22M2.5 4.5l3.5 3.5 3.5-3.5%22/></svg>')]"
      >
        {includeAll && <option value="">All {label.toLowerCase()}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
