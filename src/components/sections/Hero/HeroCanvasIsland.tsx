'use client'

import dynamic from 'next/dynamic'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { HeroFallback } from './HeroFallback'

// Lazy-load the R3F scene — pulls in three, drei, and postprocessing.
// ssr:false requires this to live in a client component (Next 16).
const HeroScene = dynamic(
  () => import('./HeroScene').then((m) => ({ default: m.HeroScene })),
  {
    ssr: false,
    loading: () => <HeroFallback />,
  }
)

export interface HeroCanvasIslandProps {
  ariaLabel: string
}

export function HeroCanvasIsland({ ariaLabel }: HeroCanvasIslandProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <HeroFallback reducedMotion />
  }

  return (
    <div role="img" aria-label={ariaLabel} className="absolute inset-0">
      <HeroScene />
    </div>
  )
}
