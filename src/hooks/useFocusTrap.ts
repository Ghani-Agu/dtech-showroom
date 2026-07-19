'use client'

import { useEffect, useRef } from 'react'

/**
 * Focus management for modal surfaces (drawers, dialogs, menus):
 *  - moves focus into the surface when it opens,
 *  - traps Tab / Shift+Tab within it,
 *  - closes on Escape,
 *  - restores focus to the previously-focused element on close.
 *
 * Attach the returned ref to the modal container and pass the open state
 * as `active`. `onClose` is held in a ref so passing an inline handler
 * does not re-run the effect (which would re-steal focus every render).
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  active: boolean,
  onClose?: () => void,
) {
  const ref = useRef<T | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    const SELECTOR =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) =>
          el.offsetWidth > 0 ||
          el.offsetHeight > 0 ||
          el === document.activeElement,
      )

    // Move focus into the surface (first control, else the container).
    const first = focusable()[0]
    if (first) {
      first.focus()
    } else {
      node.setAttribute('tabindex', '-1')
      node.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]!
      const lastEl = items[items.length - 1]!
      const activeEl = document.activeElement
      if (e.shiftKey && (activeEl === firstEl || !node.contains(activeEl))) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (activeEl === lastEl || !node.contains(activeEl))) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [active])

  return ref
}
