'use client'

import { cn } from '@/lib/utils'

/** Google truncates around these widths; character counts are the practical proxy. */
const TITLE_MAX = 60
const DESC_MAX = 155

function clamp(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function Meter({
  value,
  soft,
  hard,
}: {
  value: number
  /** Recommended ceiling — over this, Google is likely to truncate. */
  soft: number
  /** Schema limit — over this, saving fails. */
  hard: number
}) {
  const over = value > soft
  const bad = value > hard
  const pct = Math.min(100, Math.round((value / hard) * 100))
  return (
    <span className="mt-1.5 flex items-center gap-2">
      <span
        aria-hidden
        className="h-1 flex-1 overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <span
          className="block h-full rounded-full transition-[width]"
          style={{
            width: `${pct}%`,
            background: bad
              ? 'var(--c-rose)'
              : over
                ? 'var(--c-amber)'
                : 'var(--c-emerald)',
          }}
        />
      </span>
      <span
        className="shrink-0 font-mono text-[10.5px]"
        style={{
          color: bad
            ? 'var(--c-rose)'
            : over
              ? 'var(--c-amber)'
              : 'var(--admin-text-tertiary)',
        }}
      >
        {value}/{soft}
        {over && !bad ? ' · coupé' : ''}
        {bad ? ' · trop long' : ''}
      </span>
    </span>
  )
}

/**
 * Live Google-result preview for the SEO tab.
 *
 * The fields used to be pure guesswork: you typed a title, saved, and nothing
 * visible changed anywhere (they weren't even read by the product page until
 * this round). Showing the actual fallback chain — SEO field → name/tagline —
 * makes it obvious what a visitor and a crawler will see.
 */
export function SerpPreview({
  seoTitle,
  seoDescription,
  name,
  tagline,
  slug,
  siteUrl,
}: {
  seoTitle: string
  seoDescription: string
  name: string
  tagline: string
  slug: string
  siteUrl: string
}) {
  const usingTitleFallback = seoTitle.trim().length === 0
  const usingDescFallback = seoDescription.trim().length === 0

  const effectiveTitle = (seoTitle.trim() || name || 'Nom du produit').trim()
  const effectiveDesc = (
    seoDescription.trim() ||
    tagline ||
    'Ajoutez une accroche ou une description SEO.'
  ).trim()

  const host = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-[var(--admin-text-tertiary)]">
        Aperçu Google
      </p>

      <div className="mt-3 rounded-lg bg-[#101418] p-4">
        <p className="truncate font-body text-[12px] text-[#9aa8b8]">
          {host} › fr › products › {slug || 'adresse-du-produit'}
        </p>
        <p className="mt-1 font-body text-[17px] leading-snug text-[#8ab4f8]">
          {clamp(effectiveTitle, TITLE_MAX)}
          <span className="text-[#9aa8b8]"> — Dtech</span>
        </p>
        <p className="mt-1 font-body text-[13px] leading-relaxed text-[#bdc7d1]">
          {clamp(effectiveDesc, DESC_MAX)}
        </p>
      </div>

      <dl className="mt-3 space-y-2.5">
        <div>
          <dt className="flex items-center gap-2 font-body text-xs text-white">
            Titre
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[1px]'
              )}
              style={
                usingTitleFallback
                  ? {
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--admin-text-tertiary)',
                    }
                  : {
                      background: 'color-mix(in oklab, var(--c-emerald) 14%, transparent)',
                      color: 'var(--c-emerald)',
                    }
              }
            >
              {usingTitleFallback ? 'nom du produit' : 'titre SEO'}
            </span>
          </dt>
          <dd>
            <Meter value={effectiveTitle.length} soft={TITLE_MAX} hard={120} />
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-body text-xs text-white">
            Description
            <span
              className="rounded-full px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[1px]"
              style={
                usingDescFallback
                  ? {
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--admin-text-tertiary)',
                    }
                  : {
                      background: 'color-mix(in oklab, var(--c-emerald) 14%, transparent)',
                      color: 'var(--c-emerald)',
                    }
              }
            >
              {usingDescFallback ? 'accroche' : 'description SEO'}
            </span>
          </dt>
          <dd>
            <Meter value={effectiveDesc.length} soft={DESC_MAX} hard={300} />
          </dd>
        </div>
      </dl>

      <p className="mt-3 font-body text-[11px] leading-relaxed text-[var(--admin-text-tertiary)]">
        Ces deux champs alimentent réellement la balise titre et la
        méta-description de la fiche produit, ainsi que l&apos;aperçu partagé
        sur Facebook et WhatsApp.
      </p>
    </div>
  )
}
