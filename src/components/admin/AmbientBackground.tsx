'use client'

/**
 * Decorative ambient background — three blurred orbs + 8 drifting
 * particles. Static blur, animated transform/opacity only (see globals.css
 * keyframes). Reduced-motion respect is handled entirely via CSS in
 * globals.css under @media (prefers-reduced-motion: reduce).
 */

export interface AmbientBackgroundProps {
  className?: string
}

interface ParticleSpec {
  left: string
  delay: string
  duration: string
  size: number
}

// 8 particles with varied delays/durations for fake density.
const PARTICLES: ParticleSpec[] = [
  { left: '8%', delay: '0s', duration: '22s', size: 2 },
  { left: '17%', delay: '5s', duration: '28s', size: 3 },
  { left: '29%', delay: '12s', duration: '24s', size: 2 },
  { left: '41%', delay: '3s', duration: '30s', size: 3 },
  { left: '55%', delay: '9s', duration: '26s', size: 2 },
  { left: '68%', delay: '15s', duration: '32s', size: 3 },
  { left: '82%', delay: '6s', duration: '25s', size: 2 },
  { left: '93%', delay: '11s', duration: '29s', size: 2 },
]

export function AmbientBackground({ className }: AmbientBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={
        'pointer-events-none fixed inset-0 z-0 overflow-hidden ' +
        (className ?? '')
      }
    >
      {/* Orb 1 — cyan, top-left */}
      <div
        className="ambient-orb absolute"
        style={{
          top: '-10%',
          left: '-10%',
          width: '40rem',
          height: '40rem',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--c-mint) 26%, transparent) 0%, transparent 70%)',
          filter: 'blur(60px)',
          willChange: 'transform',
          animation: 'admin-float-orb-1 14s ease-in-out infinite',
        }}
      />
      {/* Orb 2 — purple, bottom-right */}
      <div
        className="ambient-orb absolute"
        style={{
          bottom: '-15%',
          right: '-10%',
          width: '44rem',
          height: '44rem',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--c-blue) 22%, transparent) 0%, transparent 70%)',
          filter: 'blur(72px)',
          willChange: 'transform',
          animation: 'admin-float-orb-2 18s ease-in-out infinite',
        }}
      />
      {/* Orb 3 — pink, mid */}
      <div
        className="ambient-orb absolute"
        style={{
          top: '30%',
          left: '40%',
          width: '32rem',
          height: '32rem',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--c-mint) 12%, transparent) 0%, transparent 70%)',
          filter: 'blur(64px)',
          willChange: 'transform',
          animation: 'admin-float-orb-3 16s ease-in-out infinite',
        }}
      />

      {/* Mint grid — faded radially like the public site */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--admin-line) 1px, transparent 1px), linear-gradient(90deg, var(--admin-line) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          maskImage:
            'radial-gradient(ellipse 75% 55% at 50% 30%, black 0%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 55% at 50% 30%, black 0%, transparent 75%)',
        }}
      />

      {/* Subtle noise/grid overlay for tactile depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, var(--admin-overlay) 100%)',
        }}
      />

      {/* Particle field — 8 only, varied delays */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="ambient-particle absolute bottom-0"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '9999px',
            background: 'color-mix(in oklab, var(--c-mint) 60%, transparent)',
            boxShadow: '0 0 6px color-mix(in oklab, var(--c-mint) 50%, transparent)',
            willChange: 'transform, opacity',
            animation: `admin-drift ${p.duration} linear ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
