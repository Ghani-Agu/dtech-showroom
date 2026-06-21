'use client'

import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Soft warm radial glow plane behind the particle sphere.
 *
 * Uses a CanvasTexture so we pay the gradient cost once at mount and
 * just sample it from a basic material thereafter — no per-frame
 * fragment work, no shader compile.
 *
 * Per spec §8 layer 2: subtle, behind the sphere at z=-3, no
 * depth-write so it never z-fights with the additive points.
 */
export function RadialBackdrop() {
  const { viewport } = useThree()

  // useState lazy initializer (not useMemo) so React Compiler can
  // preserve the memoization. The HeroScene mounts this inside
  // dynamic({ ssr: false }), so `document` is always defined here.
  const [texture] = useState<THREE.Texture>(() => {
    const size = 1024
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      // Pathological fallback if 2D context is unavailable. Returning
      // an empty Texture keeps the component functional; the plane
      // just won't show its glow.
      return new THREE.Texture()
    }

    const cx = size / 2
    const cy = size / 2
    const radius = size / 2

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    // Cool cyan-tinted center fading to deep void at the edges. Per
    // the recolor spec, this background does NOT participate in the
    // hover color shift — it stays cool at all times.
    gradient.addColorStop(0, '#0a2440')
    gradient.addColorStop(0.5, '#070818')
    gradient.addColorStop(1, '#050308')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    return tex
  })

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  // Over-sized plane at z=-3 so the gradient stays past the viewport.
  const planeWidth = Math.max(viewport.width, viewport.height) * 2.4
  const planeHeight = planeWidth

  return (
    <mesh position={[0, 0, -3]} renderOrder={-2}>
      <planeGeometry args={[planeWidth, planeHeight, 1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent={false}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  )
}
