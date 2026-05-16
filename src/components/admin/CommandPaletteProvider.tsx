'use client'

import { useState } from 'react'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { CommandPalette } from './CommandPalette'

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  useKeyboardShortcut({
    key: 'k',
    modifiers: ['cmd'],
    handler: () => setOpen((v) => !v),
  })

  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  )
}
