'use client'

import { useEffect, useRef, type RefObject } from 'react'

export interface CursorState {
  /** Damped X position, 0..1, origin top-left. */
  x: number
  /** Damped Y position, 0..1, origin top-left. */
  y: number
  /** Target X (most recent raw input). */
  tx: number
  /** Target Y (most recent raw input). */
  ty: number
  /** Has the pointer ever entered the element this frame's interval? */
  active: boolean
}

/**
 * Ref-based pointer tracker scoped to a single element. Returns a mutable
 * ref so consumers (e.g. R3F useFrame loops) can poll without triggering
 * React renders.
 *
 * Damping is applied by the consumer in its render loop — this hook only
 * updates the *target* (tx/ty) on pointer events. The consumer lerps
 * x/y toward tx/ty each frame.
 *
 * Default position when the pointer hasn't entered yet: centered (0.5, 0.5).
 */
export function useCursor(
  targetRef: RefObject<HTMLElement | null>
): RefObject<CursorState> {
  const cursor = useRef<CursorState>({
    x: 0.5,
    y: 0.5,
    tx: 0.5,
    ty: 0.5,
    active: false,
  })

  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    function handlePointerMove(e: PointerEvent) {
      // The Effect's stale-closure check on targetRef isn't needed —
      // the ref is dereferenced fresh each event.
      const node = targetRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      cursor.current.tx = (e.clientX - rect.left) / rect.width
      cursor.current.ty = (e.clientY - rect.top) / rect.height
      cursor.current.active = true
    }

    function handlePointerLeave() {
      cursor.current.tx = 0.5
      cursor.current.ty = 0.5
      cursor.current.active = false
    }

    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [targetRef])

  return cursor
}
