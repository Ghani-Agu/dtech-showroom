'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// =========================================================================
// FRAGMENT SHADER — Cool Void with subtle gradient breathing
// =========================================================================
const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uQuality; // 1.0 = full, 0.5 = mobile/degraded
varying vec2 vUv;

// Simple value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec2 uv = vUv;

  // Base vertical gradient — deeper at top, very slightly elevated at bottom
  vec3 colorTop = vec3(0.039, 0.039, 0.051);    // oklch ~0.06 0.005 240
  vec3 colorBottom = vec3(0.067, 0.067, 0.082); // oklch ~0.10 0.008 240
  vec3 baseColor = mix(colorTop, colorBottom, uv.y);

  // Breathing motion — extremely subtle, ~10 second cycle
  float breathing = sin(uTime * 0.628) * 0.5 + 0.5; // 0..1, 10s period
  breathing = breathing * 0.015; // very low amplitude
  baseColor += vec3(breathing);

  // Subtle noise variation — adds organic texture
  float noiseValue = noise(uv * 8.0 + uTime * 0.05);
  baseColor += (noiseValue - 0.5) * 0.008;

  // Radial vignette — slight darkening at corners, slight lightening center
  vec2 center = uv - 0.5;
  float distFromCenter = length(center);
  float vignette = 1.0 - smoothstep(0.3, 0.85, distFromCenter) * 0.4;
  baseColor *= vignette;

  gl_FragColor = vec4(baseColor, 1.0);
}
`

// =========================================================================
// VERTEX SHADER — pass-through
// =========================================================================
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// =========================================================================
// PARTICLE FIELD — Drifting dust motes (desktop only)
// =========================================================================
function ParticleField({ count }: { count: number }) {
  const meshRef = useRef<THREE.Points>(null)
  const { mouse, viewport } = useThree()
  const mouseLerp = useRef(new THREE.Vector2(0, 0))

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * viewport.width * 1.2
      positions[i * 3 + 1] = (Math.random() - 0.5) * viewport.height * 1.2
      positions[i * 3 + 2] = 0

      velocities[i * 3] = (Math.random() - 0.5) * 0.002
      velocities[i * 3 + 1] = 0.005 + Math.random() * 0.015 // upward drift
      velocities[i * 3 + 2] = 0
    }

    return { positions, velocities }
  }, [count, viewport])

  useFrame(() => {
    if (!meshRef.current) return

    // Lerp mouse position with heavy damping
    mouseLerp.current.x +=
      ((mouse.x * viewport.width) / 2 - mouseLerp.current.x) * 0.02
    mouseLerp.current.y +=
      ((mouse.y * viewport.height) / 2 - mouseLerp.current.y) * 0.02

    const geometry = meshRef.current.geometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const pos = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const xIdx = i * 3
      const yIdx = i * 3 + 1

      pos[xIdx]! += velocities[xIdx]!
      pos[yIdx]! += velocities[yIdx]!

      // Subtle cursor attraction (very weak)
      const dx = mouseLerp.current.x - pos[xIdx]!
      const dy = mouseLerp.current.y - pos[yIdx]!
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0 && dist < 4) {
        const force = (1 - dist / 4) * 0.0005
        pos[xIdx]! += dx * force
        pos[yIdx]! += dy * force
      }

      // Wrap when off-screen top
      if (pos[yIdx]! > viewport.height / 2 + 1) {
        pos[yIdx] = -viewport.height / 2 - 1
        pos[xIdx] = (Math.random() - 0.5) * viewport.width * 1.2
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#7a8590"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// =========================================================================
// SHADER PLANE — Full-viewport background
// =========================================================================
function ShaderPlane({ quality }: { quality: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, mouse, size } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uQuality: { value: quality },
    }),
    [size.width, size.height, quality]
  )

  useFrame((state) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime!.value = state.clock.elapsedTime
    materialRef.current.uniforms.uMouse!.value.set(mouse.x, mouse.y)
    materialRef.current.uniforms.uQuality!.value = quality
  })

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  )
}

// =========================================================================
// SCENE — Composes shader plane + particles, with quality control
// =========================================================================
function Scene({ enableParticles }: { enableParticles: boolean }) {
  const [quality, setQuality] = useState(1.0)

  return (
    <PerformanceMonitor
      onDecline={() => setQuality(0.5)}
      onIncline={() => setQuality(1.0)}
    >
      <ShaderPlane quality={quality} />
      {enableParticles && quality >= 1.0 ? <ParticleField count={60} /> : null}
    </PerformanceMonitor>
  )
}

// =========================================================================
// VIEWPORT-WIDTH OBSERVER — React 19 idiom (useSyncExternalStore)
// =========================================================================
const MOBILE_QUERY = '(max-width: 767px)'
const SMALL_QUERY = '(max-width: 479px)'

function subscribeViewport(callback: () => void): () => void {
  const mqMobile = window.matchMedia(MOBILE_QUERY)
  const mqSmall = window.matchMedia(SMALL_QUERY)
  mqMobile.addEventListener('change', callback)
  mqSmall.addEventListener('change', callback)
  return () => {
    mqMobile.removeEventListener('change', callback)
    mqSmall.removeEventListener('change', callback)
  }
}

interface ViewportFlags {
  isMobile: boolean
  isSmall: boolean
}

const SERVER_VIEWPORT: ViewportFlags = { isMobile: false, isSmall: false }
let lastViewport: ViewportFlags = SERVER_VIEWPORT

function getViewportSnapshot(): ViewportFlags {
  const next: ViewportFlags = {
    isMobile: window.matchMedia(MOBILE_QUERY).matches,
    isSmall: window.matchMedia(SMALL_QUERY).matches,
  }
  if (
    next.isMobile !== lastViewport.isMobile ||
    next.isSmall !== lastViewport.isSmall
  ) {
    lastViewport = next
  }
  return lastViewport
}

function getServerViewportSnapshot(): ViewportFlags {
  return SERVER_VIEWPORT
}

function useViewport(): ViewportFlags {
  return useSyncExternalStore(
    subscribeViewport,
    getViewportSnapshot,
    getServerViewportSnapshot
  )
}

// =========================================================================
// EXPORT — Mobile-detection wrapper + reduced-motion fallback
// =========================================================================
export function ShaderHero() {
  const prefersReducedMotion = useReducedMotion()
  const { isMobile, isSmall } = useViewport()

  // Reduced motion: static gradient div, no canvas
  if (prefersReducedMotion) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, oklch(0.06 0.005 240) 0%, oklch(0.10 0.008 240) 100%)',
        }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 50 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, isMobile ? 1.25 : 1.75]}
        frameloop="always"
        style={{ pointerEvents: 'none' }}
      >
        <Scene enableParticles={!isSmall} />
      </Canvas>
    </div>
  )
}

export default ShaderHero
