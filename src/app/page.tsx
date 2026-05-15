export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-surface-base px-8 py-16 md:px-16 md:py-24">
      <div className="mx-auto max-w-5xl space-y-24">
        {/* Header */}
        <header className="space-y-2">
          <p className="font-mono text-xs tracking-wider text-text-muted uppercase">
            dtech-showroom · phase 1.1
          </p>
          <h1 className="font-display text-5xl font-medium tracking-tight text-text-primary">
            Brand Tokens<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-lg text-text-secondary">
            Type and color verification page. Every token from the v2 brand spec, rendered.
          </p>
        </header>

        {/* Type Scale */}
        <section className="space-y-8">
          <h2 className="font-mono text-xs tracking-wider text-text-muted uppercase">
            Type Scale · 1.250 Minor Third
          </h2>
          <div className="space-y-4">
            <div className="font-display text-9xl tracking-tight text-text-primary leading-tight">9xl</div>
            <div className="font-display text-8xl tracking-tight text-text-primary leading-tight">8xl</div>
            <div className="font-display text-7xl tracking-tight text-text-primary leading-tight">7xl</div>
            <div className="font-display text-6xl tracking-tight text-text-primary leading-tight">6xl</div>
            <div className="font-display text-5xl tracking-snug text-text-primary leading-snug">5xl Display</div>
            <div className="font-display text-4xl tracking-snug text-text-primary leading-snug">4xl Display</div>
            <div className="font-display text-3xl text-text-primary leading-snug">3xl Display</div>
            <div className="font-body text-2xl text-text-primary leading-normal">2xl Body</div>
            <div className="font-body text-xl text-text-primary leading-normal">xl Body</div>
            <div className="font-body text-lg text-text-primary leading-normal">lg Body — the quick brown fox jumps over the lazy dog</div>
            <div className="font-body text-base text-text-primary leading-normal">base Body — the quick brown fox jumps over the lazy dog</div>
            <div className="font-body text-sm text-text-secondary leading-normal">sm Secondary — the quick brown fox jumps over the lazy dog</div>
            <div className="font-mono text-xs tracking-wide text-text-muted uppercase">XS Mono Caps — i9-13900HX · 24 CORES · 5.4GHZ</div>
          </div>
        </section>

        {/* Surface Ladder */}
        <section className="space-y-4">
          <h2 className="font-mono text-xs tracking-wider text-text-muted uppercase">
            Surface Ladder · 6 Steps
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="aspect-square rounded-md bg-surface-void p-4">
              <p className="font-mono text-xs text-text-muted">void</p>
              <p className="font-mono text-xs text-text-muted">0.06</p>
            </div>
            <div className="aspect-square rounded-md bg-surface-base p-4">
              <p className="font-mono text-xs text-text-muted">base</p>
              <p className="font-mono text-xs text-text-muted">0.10</p>
            </div>
            <div className="aspect-square rounded-md bg-surface-base-plus p-4">
              <p className="font-mono text-xs text-text-muted">base+</p>
              <p className="font-mono text-xs text-text-muted">0.13</p>
            </div>
            <div className="aspect-square rounded-md bg-surface-elevated p-4">
              <p className="font-mono text-xs text-text-secondary">elevated</p>
              <p className="font-mono text-xs text-text-secondary">0.16</p>
            </div>
            <div className="aspect-square rounded-md bg-surface-overlay p-4">
              <p className="font-mono text-xs text-text-secondary">overlay</p>
              <p className="font-mono text-xs text-text-secondary">0.20</p>
            </div>
            <div className="aspect-square rounded-md bg-surface-overlay-plus p-4">
              <p className="font-mono text-xs text-text-secondary">overlay+</p>
              <p className="font-mono text-xs text-text-secondary">0.24</p>
            </div>
          </div>
        </section>

        {/* Text Ladder */}
        <section className="space-y-4">
          <h2 className="font-mono text-xs tracking-wider text-text-muted uppercase">
            Text Ladder · 4 Steps
          </h2>
          <div className="space-y-2 rounded-md bg-surface-elevated p-8">
            <p className="font-body text-lg text-text-primary">text-primary · the curated catalog leads</p>
            <p className="font-body text-lg text-text-secondary">text-secondary · supporting detail and metadata</p>
            <p className="font-body text-lg text-text-muted">text-muted · timestamps, helpers, peripheral information</p>
            <p className="font-body text-lg text-text-disabled">text-disabled · unavailable controls only</p>
          </div>
        </section>

        {/* Accent */}
        <section className="space-y-4">
          <h2 className="font-mono text-xs tracking-wider text-text-muted uppercase">
            Accent · Signal Cyan · One Color, Eleven Places
          </h2>
          <div className="rounded-md bg-surface-elevated p-8">
            <p className="font-display text-3xl text-text-primary">
              Sixteen inches<span className="text-accent">.</span> Two-forty hertz<span className="text-accent">.</span>
            </p>
            <p className="font-body mt-4 text-base text-text-secondary">
              Inquiry CTA preview: <span className="text-text-primary underline decoration-text-muted hover:decoration-accent">Discuss this with us <span className="text-accent">→</span></span>
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-text-disabled/20 pt-8">
          <p className="font-mono text-xs tracking-wider text-text-muted uppercase">
            Tokens loaded. Fonts loaded. Foundation ready for components.
          </p>
        </footer>
      </div>
    </main>
  )
}
