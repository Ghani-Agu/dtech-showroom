'use client'

import dynamic from 'next/dynamic'

// Client-component wrapper so we can use next/dynamic with ssr:false.
// (Next 15+ disallows ssr:false in Server Components; the async homepage
// imports this thin client shim instead of calling dynamic() itself.)
export const ShaderHeroDynamic = dynamic(
  () => import('./index').then((mod) => mod.ShaderHero),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, oklch(0.06 0.005 240) 0%, oklch(0.10 0.008 240) 100%)',
        }}
      />
    ),
  }
)

export default ShaderHeroDynamic
