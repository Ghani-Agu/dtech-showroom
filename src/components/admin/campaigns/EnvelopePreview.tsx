'use client'

import { useMemo, useState } from 'react'
import { Eye, Monitor, Smartphone } from 'lucide-react'
import { compileBlocksToHtml, type EmailBlock } from '@/lib/email-blocks'
import { campaignEnvelope } from '@/lib/email-templates'

interface EnvelopePreviewProps {
  subject: string
  preheader: string
  blocks: EmailBlock[]
}

const LOCALES = [
  { id: 'fr', label: 'FR' },
  { id: 'en', label: 'EN' },
  { id: 'ar', label: 'AR' },
] as const

/**
 * Exact-envelope preview: compiles the blocks with the SAME compiler the
 * server uses and wraps them in the SAME envelope the recipients get
 * (header, localized footer, unsubscribe line) inside a sandboxed iframe —
 * not an approximation of the email, the email itself.
 */
export function EnvelopePreview({ subject, preheader, blocks }: EnvelopePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [locale, setLocale] = useState<'fr' | 'en' | 'ar'>('fr')

  const html = useMemo(() => {
    const siteUrl =
      typeof window !== 'undefined' ? window.location.origin : 'https://d-techalgerie.com'
    const bodyHtml = compileBlocksToHtml(blocks, { siteUrl })
    return campaignEnvelope({
      siteUrl,
      preheader: preheader || undefined,
      bodyHtml,
      bodyText: '',
      unsubscribeUrl: '#unsubscribe',
      subscriberEmail: 'client@exemple.dz',
      locale,
    }).html
  }, [blocks, preheader, locale])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--admin-glass-border)] px-5 py-3">
        <p className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          <Eye size={13} /> Aperçu exact
        </p>
        <span className="ml-auto inline-flex items-center gap-1">
          {LOCALES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLocale(l.id)}
              aria-pressed={locale === l.id}
              className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                locale === l.id
                  ? 'bg-[color-mix(in_oklab,var(--c-mint)_14%,transparent)] text-[var(--c-mint)]'
                  : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
              }`}
            >
              {l.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-[var(--admin-glass-border-strong)]" aria-hidden />
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            aria-pressed={device === 'desktop'}
            aria-label="Aperçu ordinateur"
            className={`rounded-md p-1.5 ${device === 'desktop' ? 'bg-[var(--admin-soft-2)] text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            aria-pressed={device === 'mobile'}
            aria-label="Aperçu mobile"
            className={`rounded-md p-1.5 ${device === 'mobile' ? 'bg-[var(--admin-soft-2)] text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
          >
            <Smartphone size={14} />
          </button>
        </span>
      </div>

      {/* Inbox-row mock — how the subject + preheader read in Gmail. */}
      <div className="border-b border-[var(--admin-glass-border)] bg-[var(--admin-soft)] px-5 py-3">
        <p className="truncate font-body text-[13px]">
          <strong className="font-semibold text-[var(--admin-text-primary)]">D-Tech Algérie</strong>
          <span className="mx-2 text-[var(--admin-text-tertiary)]">·</span>
          <span className="font-medium text-[var(--admin-text-primary)]">
            {subject || 'Sans objet'}
          </span>
          {preheader && (
            <span className="text-[var(--admin-text-tertiary)]"> — {preheader}</span>
          )}
        </p>
      </div>

      <div className="flex justify-center overflow-x-auto bg-[#04060c] p-4">
        <iframe
          title="Aperçu de l’email"
          sandbox=""
          srcDoc={html}
          style={{
            width: device === 'desktop' ? 640 : 375,
            maxWidth: '100%',
            height: 620,
            border: 0,
            background: 'transparent',
            transition: 'width 0.25s ease',
          }}
        />
      </div>
    </div>
  )
}
