'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { ParticleSphere, type ParticleSphereProps } from './ParticleSphere'
import { RadialBackdrop } from './RadialBackdrop'
import { useCursor } from './hooks/useCursor'
import { useHeroScroll } from './hooks/useHeroScroll'

/**
 * Wraps ParticleSphere in a group that shifts the sphere right of
 * viewport center on desktop (gives the left-aligned typography
 * breathing room). Centered on mobile.
 *
 * Lives inside the Canvas so it can read R3F viewport units via
 * useThree; the `isMobile` prop comes from HeroScene's matchMedia
 * detection (parallel JS-side mobile state).
 */
function SphereStage(props: ParticleSphereProps) {
  const { viewport } = useThree()
  const offsetX = props.isMobile ? 0 : viewport.width * 0.18
  return (
    <group position={[offsetX, 0, 0]}>
      <ParticleSphere {...props} />
    </group>
  )
}

const MOBILE_BREAKPOINT = 768
const DESKTOP_PARTICLES = 12000
const MOBILE_PARTICLES = 5000

/**
 * R3F scene root for the hero.
 *
 * Composition (back to front):
 *   1. Canvas clear color (#050308 — the void)
 *   2. RadialBackdrop plane (warm amber glow) at z=-3
 *   3. ParticleSphere at origin, additive blended
 *   4. EffectComposer: Bloom (mandatory visual signature) + Vignette
 *
 * On mobile: lower DPR, fewer particles, lower bloom intensity, no
 * vignette (it darkens corners too much on small screens).
 */
export function HeroScene() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const cursorRef = useCursor(wrapperRef)
  const scrollRef = useHeroScroll(wrapperRef)
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function decide() {
      const coarse = window.matchMedia('(pointer: coarse)').matches
      const narrow = window.innerWidth < MOBILE_BREAKPOINT
      const mobile = coarse && narrow
      setIsMobile(mobile)
      setDpr(mobile ? [1, 1.25] : [1, 1.5])
    }
    decide()
    window.addEventListener('resize', decide)
    return () => window.removeEventListener('resize', decide)
  }, [])

  // Forward scroll progress to the section root as a CSS variable so
  // the HTML overlay can fade without re-rendering React on scroll.
  useEffect(() => {
    let raf = 0
    function tick() {
      const p = scrollRef.current
      const opacityProgress = Math.min(1, Math.max(0, (p - 0.2) / 0.3))
      const section = wrapperRef.current?.parentElement
      if (section) {
        section.style.setProperty(
          '--hero-overlay-opacity',
          String(1 - opacityProgress)
        )
        // Grid fades on the same schedule as the sphere itself.
        const gridFade = Math.min(1, Math.max(0, (p - 0.3) / 0.3))
        section.style.setProperty(
          '--hero-grid-opacity',
          String(1 - gridFade)
        )
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scrollRef])

  const particleCount = isMobile ? MOBILE_PARTICLES : DESKTOP_PARTICLES
  // Bloom is now a single tuned value (was differentiated mobile/desktop).
  // Lower DPR carries most of the perf savings; bloom can stay restrained
  // everywhere.
  const bloomIntensity = 0.65

  return (
    <div
      ref={wrapperRef}
      data-hero-root
      className="absolute inset-0"
    >
      <Canvas
        dpr={dpr}
        frameloop="always"
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0, 6], fov: 38, near: 0.1, far: 50 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#050308']} />

        <RadialBackdrop />

        <SphereStage
          key={particleCount}
          particleCount={particleCount}
          cursorRef={cursorRef}
          scrollRef={scrollRef}
          isMobile={isMobile}
        />

        <EffectComposer multisampling={4}>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.9}
            radius={0.5}
            mipmapBlur
          />
          {isMobile ? (
            <></>
          ) : (
            <Vignette eskil={false} offset={0.2} darkness={0.6} />
          )}
        </EffectComposer>
      </Canvas>
    </div>
  )
}
