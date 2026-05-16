import { useEffect } from 'react'

type ModifierKey = 'cmd' | 'ctrl' | 'shift' | 'alt'

interface ShortcutConfig {
  key: string
  modifiers?: ModifierKey[]
  handler: (e: KeyboardEvent) => void
  preventDefault?: boolean
  enabled?: boolean
}

export function useKeyboardShortcut(config: ShortcutConfig) {
  const {
    key,
    modifiers = ['cmd'],
    handler,
    preventDefault = true,
    enabled = true,
  } = config

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(e: KeyboardEvent) {
      const keyMatch = e.key.toLowerCase() === key.toLowerCase()
      if (!keyMatch) return

      const modMatch = modifiers.every((mod) => {
        if (mod === 'cmd') return e.metaKey || e.ctrlKey
        if (mod === 'ctrl') return e.ctrlKey
        if (mod === 'shift') return e.shiftKey
        if (mod === 'alt') return e.altKey
        return false
      })

      if (!modMatch) return

      if (preventDefault) e.preventDefault()
      handler(e)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, modifiers, handler, preventDefault, enabled])
}
