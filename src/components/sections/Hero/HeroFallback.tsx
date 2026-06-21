/**
 * Static fallback for reduced-motion users and the SSR/dynamic-loading
 * window. A pure CSS approximation of the lit particle sphere — a
 * radial amber gradient where the sphere would be, against the deep
 * void canvas. Pleasant on its own, not a sad placeholder.
 *
 * Renders identically server- and client-side (no hooks, no random,
 * no browser APIs) so SSR markup matches the dynamic loading state.
 */
export interface HeroFallbackProps {
  /** When true, this is the reduced-motion variant; suppress any
   *  ambient css animation hints. Otherwise the dim amber glow can
   *  pulse very subtly while the real scene loads. */
  reducedMotion?: boolean
}

export function HeroFallback({ reducedMotion = false }: HeroFallbackProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Layer 1 — deep void */}
      <div className="absolute inset-0" style={{ background: '#050308' }} />

      {/* Layer 2 — cool cyan radial glow centered where the sphere
          would be (recolored to match REST_PALETTE; reduced-motion
          users see the sphere as cyan, not amber). */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: '60vmin',
          height: '60vmin',
          transform: 'translate(-50%, -50%)',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, #4dc4ff 0%, #1466cc 18%, #0a3a7a 38%, rgba(10,58,122,0) 70%)',
          filter: 'blur(28px)',
          opacity: 0.5,
          animation: reducedMotion
            ? 'none'
            : 'hero-fallback-pulse 6s ease-in-out infinite',
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Single keyframe injected here so the fallback doesn't depend on
          globals.css being loaded. ~6s breathing matches the live scene
          spec. */}
      <style>{`
        @keyframes hero-fallback-pulse {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.7;  transform: translate(-50%, -50%) scale(1.04); }
        }
      `}</style>
    </div>
  )
}
