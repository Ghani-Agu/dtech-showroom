'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { particleFragmentShader } from './shaders/particle.frag'
import { particleVertexShader } from './shaders/particle.vert'

// =====================================================================
// Default rest state — Dtech brand cyan-blue. Sampled from v2 §4
// accent family + chroma.cool. All static surfaces stay in this
// palette; the hover palette below only activates during interaction
// (consistent with v2 §4 chroma "animation-only" rule).
// =====================================================================
const REST_PALETTE = {
  particleHot: new THREE.Color('#a8e8ff'),  // near-white cyan (top)
  particleMid: new THREE.Color('#4dc4ff'),  // mid cyan-blue
  particleDeep: new THREE.Color('#1466cc'), // deep electric blue (bottom)
} as const

// Hover state — warm amber tension. Only active when cursor over hero.
const HOVER_PALETTE = {
  particleHot: new THREE.Color('#ffe4a8'),
  particleMid: new THREE.Color('#ffb04d'),
  particleDeep: new THREE.Color('#cc5a14'),
} as const

export interface ParticleSphereProps {
  /** 12000 desktop / 5000 mobile per HeroScene. */
  particleCount: number
  /** Ref to {x,y} cursor in 0..1 space (origin top-left). */
  cursorRef: React.RefObject<{ x: number; y: number }>
  /** Scroll progress 0..1 — drives recession + opacity. */
  scrollRef: React.RefObject<number>
  /** Whether the device is mobile (changes hover trigger from
   *  enter/leave to tap-and-drag). */
  isMobile: boolean
}

const SPHERE_RADIUS = 1.4
const CURSOR_LERP = 0.06
const MAX_TILT_RAD_X = (15 * Math.PI) / 180 // ±15°
const ROTATION_Y_RAD_PER_SEC = 0.05

// Type assertion shape for the shader uniforms we own.
type SphereUniforms = {
  u_time: { value: number }
  u_size: { value: number }
  u_breathing: { value: number }
  u_hover: { value: number }
  u_emission: { value: number }
  u_cursorPos: { value: THREE.Vector3 }
  u_cursorForce: { value: number }
  u_colorHot_rest: { value: THREE.Color }
  u_colorMid_rest: { value: THREE.Color }
  u_colorDeep_rest: { value: THREE.Color }
  u_colorHot_hover: { value: THREE.Color }
  u_colorMid_hover: { value: THREE.Color }
  u_colorDeep_hover: { value: THREE.Color }
}

/**
 * Fibonacci-distributed particle sphere with shader-driven breathing,
 * rest↔hover color interpolation, cursor-driven brightness/spin
 * acceleration, and per-vertex disturbance near the cursor's projected
 * world position.
 */
export function ParticleSphere({
  particleCount,
  cursorRef,
  scrollRef,
  isMobile,
}: ParticleSphereProps) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const dampedCursor = useRef({ x: 0.5, y: 0.5 })

  // Hover state — JS-side refs that drive shader uniforms each frame.
  const hoverRef = useRef(0)
  const targetHoverRef = useRef(0)
  const emissionRef = useRef(1.0)
  const cursorVelocityRef = useRef(0)
  const prevCursorRef = useRef({ x: 0.5, y: 0.5 })
  const baseYRotRef = useRef(0)

  // Pre-allocated objects reused inside useFrame — no per-frame
  // Vector3 allocations.
  const tmpCursorNdc = useMemo(() => new THREE.Vector3(0, 0, 0.5), [])
  const tmpCursorWorld = useMemo(() => new THREE.Vector3(), [])

  const camera = useThree((state) => state.camera)

  // Build the geometry once on mount. useState lazy init (not useMemo)
  // for React Compiler purity-during-render compliance.
  const [geometry] = useState<THREE.BufferGeometry>(() => {
    const positions = new Float32Array(particleCount * 3)
    const aGradient = new Float32Array(particleCount)
    const aRandom = new Float32Array(particleCount)
    const phi = Math.PI * (Math.sqrt(5) - 1) // golden angle

    for (let i = 0; i < particleCount; i++) {
      const y = 1 - (i / (particleCount - 1)) * 2 // -1..1
      const radiusAtY = Math.sqrt(1 - y * y)
      const theta = phi * i
      const x = Math.cos(theta) * radiusAtY
      const z = Math.sin(theta) * radiusAtY

      positions[i * 3] = x * SPHERE_RADIUS
      positions[i * 3 + 1] = y * SPHERE_RADIUS
      positions[i * 3 + 2] = z * SPHERE_RADIUS

      // Single-float gradient parameter; the shader looks up the actual
      // color from interpolated rest↔hover stops at render time.
      aGradient[i] = (y + 1) * 0.5  // 0 at bottom, 1 at top
      aRandom[i] = Math.random()
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aGradient', new THREE.BufferAttribute(aGradient, 1))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 1))
    return geo
  })

  // Initial uniforms — material owns them after mount; updates flow
  // through materialRef.current.uniforms (React 19 lint pattern).
  const initialUniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_size: { value: isMobile ? 22 : 30 },
      u_breathing: { value: 0.055 },
      u_hover: { value: 0 },
      u_emission: { value: 1.0 },
      u_cursorPos: { value: new THREE.Vector3(0, 0, 5) },
      u_cursorForce: { value: 0 },
      u_colorHot_rest: { value: REST_PALETTE.particleHot.clone() },
      u_colorMid_rest: { value: REST_PALETTE.particleMid.clone() },
      u_colorDeep_rest: { value: REST_PALETTE.particleDeep.clone() },
      u_colorHot_hover: { value: HOVER_PALETTE.particleHot.clone() },
      u_colorMid_hover: { value: HOVER_PALETTE.particleMid.clone() },
      u_colorDeep_hover: { value: HOVER_PALETTE.particleDeep.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Attach hover-trigger listeners on the hero root.
  //
  // Desktop: distance-based — pointerenter would fire viewport-wide
  // (the hero is full-bleed) producing amber-at-rest UX. Instead we
  // listen to pointermove and only set hover=1 when the cursor is
  // within ~25% normalized distance of the sphere's projected screen
  // center. The sphere is offset 18% right of center on desktop (see
  // SphereStage in HeroScene), so the hover anchor matches.
  //
  // Mobile: pointerdown/pointerup substitutes for hover — touch
  // devices have no spatial "hover" concept; tap-and-drag activates
  // the hover state for the duration of the touch.
  useEffect(() => {
    const el = document.querySelector('[data-hero-root]')
    if (!(el instanceof HTMLElement)) return

    if (isMobile) {
      function on() {
        targetHoverRef.current = 1
      }
      function off() {
        targetHoverRef.current = 0
      }
      el.addEventListener('pointerdown', on)
      el.addEventListener('pointerup', off)
      el.addEventListener('pointercancel', off)
      return () => {
        el.removeEventListener('pointerdown', on)
        el.removeEventListener('pointerup', off)
        el.removeEventListener('pointercancel', off)
      }
    }

    // Desktop: distance-based.
    const SPHERE_SCREEN_X = 0.68  // 0.5 (center) + 0.18 (right-offset)
    const SPHERE_SCREEN_Y = 0.5
    const HOVER_RADIUS = 0.25     // ~25% of viewport diagonal

    function onMove(e: PointerEvent) {
      const node = el as HTMLElement
      const rect = node.getBoundingClientRect()
      const cx = (e.clientX - rect.left) / rect.width
      const cy = (e.clientY - rect.top) / rect.height
      const dx = cx - SPHERE_SCREEN_X
      const dy = cy - SPHERE_SCREEN_Y
      const dist = Math.sqrt(dx * dx + dy * dy)
      targetHoverRef.current = dist < HOVER_RADIUS ? 1 : 0
    }
    function onLeave() {
      targetHoverRef.current = 0
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [isMobile])

  useFrame((state, delta) => {
    const m = materialRef.current
    const group = groupRef.current
    if (!m || !group) return

    const t = state.clock.elapsedTime
    const u = m.uniforms as unknown as SphereUniforms

    // Existing breathing + time uniforms.
    u.u_time.value = t
    u.u_breathing.value = 0.055 + Math.sin(t * 0.45) * 0.025

    // Damped hover lerp — ~600ms to fully transition at lambda=4.
    hoverRef.current = THREE.MathUtils.damp(
      hoverRef.current,
      targetHoverRef.current,
      4,
      delta
    )
    u.u_hover.value = hoverRef.current

    // Emission boost tracks hover (1.0 → 1.25).
    const targetEmission = 1.0 + hoverRef.current * 0.25
    emissionRef.current = THREE.MathUtils.damp(
      emissionRef.current,
      targetEmission,
      4,
      delta
    )
    u.u_emission.value = emissionRef.current

    // Damp the raw cursor target into our smoothed value (drives both
    // tilt and cursor-world projection).
    dampedCursor.current.x +=
      (cursorRef.current.x - dampedCursor.current.x) * CURSOR_LERP
    dampedCursor.current.y +=
      (cursorRef.current.y - dampedCursor.current.y) * CURSOR_LERP

    // Cursor velocity → disturbance force. Speed measured from the
    // smoothed cursor so it tracks visible motion, not jitter.
    const cx = dampedCursor.current.x
    const cy = dampedCursor.current.y
    const dx = cx - prevCursorRef.current.x
    const dy = cy - prevCursorRef.current.y
    const speed = Math.sqrt(dx * dx + dy * dy)
    cursorVelocityRef.current = THREE.MathUtils.damp(
      cursorVelocityRef.current,
      Math.min(speed * 30, 1),
      8,
      delta
    )
    // Only apply disturbance while hovered — multiplies cleanly with
    // u_hover so the effect fades out alongside the color shift.
    u.u_cursorForce.value = cursorVelocityRef.current * hoverRef.current
    prevCursorRef.current.x = cx
    prevCursorRef.current.y = cy

    // Project cursor to world space and place a bit in front of the
    // sphere center so disturbance happens where the cursor *appears*
    // to be in 3D. Reuses pre-allocated Vector3s — no per-frame allocs.
    const clipX = (cx - 0.5) * 2
    const clipY = -(cy - 0.5) * 2 // flip Y to GL convention
    tmpCursorNdc.set(clipX, clipY, 0.5)
    tmpCursorWorld.copy(tmpCursorNdc).unproject(camera)
    tmpCursorWorld.multiplyScalar(1.5)
    u.u_cursorPos.value.copy(tmpCursorWorld)

    // X-axis tilt (existing behavior) — damped.
    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      (cy - 0.5) * 2 * MAX_TILT_RAD_X * (isMobile ? 0 : 1),
      3,
      delta
    )

    // Y-axis: base auto-rotation always-on + cursor-driven follow that
    // scales with hover state. On rest, only the base rotation applies.
    baseYRotRef.current += ROTATION_Y_RAD_PER_SEC * delta
    const cursorYOffset = isMobile
      ? (cx - 0.5) * 0.4 * hoverRef.current
      : (cx - 0.5) * 0.4 * hoverRef.current
    group.rotation.y = THREE.MathUtils.damp(
      group.rotation.y,
      baseYRotRef.current + cursorYOffset,
      3,
      delta
    )

    // Scroll-driven recession + opacity (unchanged).
    const p = scrollRef.current
    const zProgress = Math.min(1, p / 0.6)
    group.position.z = -3 * zProgress
    const opacityProgress = Math.min(
      1,
      Math.max(0, (p - 0.3) / (0.6 - 0.3))
    )
    m.opacity = 1 - opacityProgress
  })

  // Dispose geometry + material on unmount.
  useEffect(() => {
    const material = materialRef.current
    return () => {
      material?.dispose()
      geometry.dispose()
    }
  }, [geometry])

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={particleVertexShader}
          fragmentShader={particleFragmentShader}
          uniforms={initialUniforms}
          transparent
          depthWrite={false}
          // vertexColors deliberately unset — see prior fix in this
          // file's history (commit re-attempt: see shader docstring).
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
