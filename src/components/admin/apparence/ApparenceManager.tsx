'use client'

/**
 * Apparence — pick which storefront design is live and take it live.
 *
 * Selecting a card stages the choice locally; "Mettre en ligne" publishes it
 * via the design server action, after which the live site re-renders in the
 * chosen design. Both designs share the same data — only the interface
 * changes. See src/lib/site-design.ts and src/server/design-actions.ts.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ExternalLink, Rocket } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'
import { cn } from '@/lib/utils'
import { publishDesign, saveDesignDraft } from '@/server/design-actions'
import { DESIGN_IDS, DESIGN_META, type DesignId } from '@/lib/site-design'

interface ApparenceManagerProps {
  /** The design currently live for visitors. */
  live: DesignId
  /** The staged/draft design to pre-select. */
  initialSelected: DesignId
}

export function ApparenceManager({ live, initialSelected }: ApparenceManagerProps) {
  const router = useRouter()
  const [liveDesign, setLiveDesign] = useState<DesignId>(live)
  const [selected, setSelected] = useState<DesignId>(initialSelected)
  const [pending, startTransition] = useTransition()

  function select(id: DesignId) {
    if (id === selected) return
    setSelected(id)
    // Stage the choice (best-effort; the live state only changes on publish).
    void saveDesignDraft(id)
  }

  function goLive() {
    startTransition(async () => {
      const r = await publishDesign(selected)
      if (r.ok) {
        setLiveDesign(selected)
        toast.success(
          selected === 'brand'
            ? 'Nouveau design en ligne sur le site.'
            : 'Design actuel en ligne sur le site.'
        )
        router.refresh()
      } else {
        toast.error(r.error ?? 'Échec de la mise en ligne')
      }
    })
  }

  const dirty = selected !== liveDesign

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {DESIGN_IDS.map((id) => (
          <DesignCard
            key={id}
            id={id}
            selected={selected === id}
            isLive={liveDesign === id}
            onSelect={() => select(id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-5">
        <p className="font-body text-sm text-[var(--admin-text-secondary)]">
          {dirty ? (
            <>
              Sélection&nbsp;: <strong className="text-white">{DESIGN_META[selected].label}</strong>{' '}
              — pas encore en ligne.
            </>
          ) : (
            <>
              En ligne&nbsp;: <strong className="text-white">{DESIGN_META[liveDesign].label}</strong>.
            </>
          )}
        </p>

        <div className="flex items-center gap-3">
          <a
            href="/fr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-body text-sm text-[var(--admin-text-secondary)] underline decoration-[var(--admin-text-tertiary)] underline-offset-4 transition-colors hover:text-white hover:decoration-[var(--admin-cyan)]"
          >
            Voir le site <ExternalLink className="size-3.5" />
          </a>
          <Button variant="primary" onClick={goLive} loading={pending} disabled={!dirty}>
            <Rocket className="size-4" />
            Mettre en ligne
          </Button>
        </div>
      </div>
    </div>
  )
}

function DesignCard({
  id,
  selected,
  isLive,
  onSelect,
}: {
  id: DesignId
  selected: boolean
  isLive: boolean
  onSelect: () => void
}) {
  const meta = DESIGN_META[id]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'glass-surface group relative overflow-hidden rounded-2xl p-0 text-left outline-none transition-[border-color,box-shadow,transform]',
        'focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]',
        selected
          ? 'border-[color-mix(in_oklab,_var(--c-mint)_55%,_transparent)] shadow-[0_0_30px_-8px_color-mix(in_oklab,_var(--c-mint)_60%,_transparent)]'
          : 'hover:border-[color-mix(in_oklab,_var(--c-mint)_30%,_transparent)] hover:-translate-y-px'
      )}
    >
      {/* mini preview */}
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/[0.06]">
        {id === 'brand' ? <BrandPreview /> : <ClassicPreview />}
      </div>

      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base text-white">{meta.label}</h3>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--c-mint)_16%,transparent)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-cyan)]">
                ● En ligne
              </span>
            )}
          </div>
          <p className="mt-1 font-body text-xs leading-relaxed text-[var(--admin-text-tertiary)]">
            {meta.desc}
          </p>
        </div>
        <span
          className={cn(
            'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition-colors',
            selected
              ? 'border-transparent bg-[var(--c-mint)] text-[var(--admin-on-accent)]'
              : 'border-white/20 text-transparent'
          )}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      </div>
    </button>
  )
}

/* ---- decorative palette mockups (not the real pages) ---- */

function BrandPreview() {
  return (
    <div className="absolute inset-0 bg-[#f3f8f9] p-3">
      <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 shadow-sm">
        <span className="font-display text-[11px] font-bold text-[#182125]">
          <span className="text-[#0aa2b0]">d</span>tech
        </span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-4 rounded-full bg-[#e2ecee]" />
          <span className="h-1.5 w-4 rounded-full bg-[#e2ecee]" />
          <span className="h-3 w-7 rounded-full bg-[#0aa2b0]" />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <div className="flex-1 space-y-1.5 py-1">
          <span className="block h-2 w-4/5 rounded bg-[#182125]/80" />
          <span className="block h-2 w-3/5 rounded bg-[#0aa2b0]" />
          <span className="block h-1.5 w-full rounded bg-[#cfe1e3]" />
          <span className="mt-1 block h-3 w-16 rounded-full bg-[#0aa2b0]" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="aspect-square rounded-md bg-white shadow-sm ring-1 ring-[#e2ecee]" />
          ))}
        </div>
      </div>
      <span className="absolute bottom-2 right-2 size-3 rounded-full bg-[#f5b40e]" />
    </div>
  )
}

function ClassicPreview() {
  return (
    <div className="absolute inset-0 bg-[#0a0f12] p-3">
      <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
        <span className="font-display text-[11px] font-bold text-white">D-Tech</span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-4 rounded-full bg-white/15" />
          <span className="h-1.5 w-4 rounded-full bg-white/15" />
          <span className="h-3 w-7 rounded-full bg-[#3ad1c4]" />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <div className="flex-1 space-y-1.5 py-1">
          <span className="block h-2 w-4/5 rounded bg-white/80" />
          <span className="block h-2 w-3/5 rounded bg-[#3ad1c4]" />
          <span className="block h-1.5 w-full rounded bg-white/15" />
          <span className="mt-1 block h-3 w-16 rounded-full bg-white/15" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="aspect-square rounded-md border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  )
}
