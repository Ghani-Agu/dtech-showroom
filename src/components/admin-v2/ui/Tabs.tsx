'use client'

import { useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext<{
  active: string
  setActive: (id: string) => void
} | null>(null)

interface TabsProps {
  defaultValue: string
  children: React.ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn('space-y-6', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 border-b border-admin-border">
      {children}
    </div>
  )
}

interface TabProps {
  value: string
  children: React.ReactNode
}

export function Tab({ value, children }: TabProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab must be inside Tabs')
  const isActive = ctx.active === value

  return (
    <button
      type="button"
      onClick={() => ctx.setActive(value)}
      className={cn(
        'px-4 py-3 font-body text-sm font-medium transition-colors relative',
        isActive
          ? 'text-admin-text-primary'
          : 'text-admin-text-muted hover:text-admin-text-secondary'
      )}
    >
      {children}
      {isActive && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-admin-accent rounded-t" />
      )}
    </button>
  )
}

export function TabPanel({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabPanel must be inside Tabs')
  if (ctx.active !== value) return null
  return <div>{children}</div>
}
