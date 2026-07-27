/**
 * email-blocks.ts — the campaign composer's block model + the compiler that
 * turns blocks into email-safe HTML (tables + inline styles only).
 *
 * PURE module: no server-only imports, no DB — it is imported BOTH by the
 * client composer (live preview) and by server actions (canonical compile
 * at save/send time). Keep it dependency-free.
 *
 * Rendering contract: the compiled fragment is injected INSIDE
 * `campaignEnvelope()` (src/lib/email-templates), which provides the dark
 * card, base font, header and footer. Blocks therefore only produce inner
 * content and inherit color/font from the envelope.
 */

export const CAMPAIGN_AUDIENCES = ['all', 'fr', 'en', 'ar'] as const
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number]

export type EmailBlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'products'
  | 'divider'
  | 'spacer'
  | 'html'

export interface EmailProductRef {
  slug: string
  name: string
  tagline: string
  /** Site-relative (`/images/…`) or absolute image URL. */
  image: string
  brand?: string
}

/**
 * One flat shape for every block type — simpler to edit in form state and
 * to survive JSON round-trips than a discriminated union. The compiler
 * only reads the fields relevant to `type` and defends against absences.
 */
export interface EmailBlock {
  id: string
  type: EmailBlockType
  /** heading + text content */
  text?: string
  /** image */
  src?: string
  alt?: string
  /** optional link target for image, required for button */
  href?: string
  /** button label */
  label?: string
  align?: 'left' | 'center'
  /** products showcase (max 3 per block) */
  products?: EmailProductRef[]
  /** spacer height px (8–96) */
  size?: number
  /** raw HTML escape hatch */
  html?: string
}

const ACCENT = '#3ec5e0'
/** D-Tech blue — matches BRAND.mint in email-templates (round-10 re-theme). */
const MINT = '#4f9dff'
const FG = '#f5f5f3'
const MUTED = 'rgba(245,245,243,0.78)'
const FAINT = 'rgba(245,245,243,0.5)'
const LINE = 'rgba(245,245,243,0.10)'
const PANEL = '#11121a'

export function escapeEmailHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  )
}

/** Site-relative path → absolute URL (emails cannot resolve relative URLs). */
export function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  const v = (pathOrUrl ?? '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  const base = siteUrl.replace(/\/+$/, '')
  return v.startsWith('/') ? `${base}${v}` : `${base}/${v}`
}

/** Only http(s) (or site-relative, resolved later) — kills javascript: etc. */
function safeHref(raw: string | undefined, siteUrl: string): string {
  const v = (raw ?? '').trim()
  if (!v) return ''
  if (v.startsWith('/')) return absoluteUrl(v, siteUrl)
  if (/^https?:\/\//i.test(v)) return v
  return ''
}

/** Plain text → paragraphs. Blank line = new <p>, single newline = <br>. */
function textToParagraphs(text: string): string {
  const paras = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paras.length === 0) return ''
  return paras
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${MUTED};">${escapeEmailHtml(p).replace(/\n/g, '<br/>')}</p>`
    )
    .join('')
}

function compileHeading(b: EmailBlock): string {
  const t = (b.text ?? '').trim()
  if (!t) return ''
  return `<h2 style="margin:6px 0 14px;font-size:21px;font-weight:700;letter-spacing:-0.015em;line-height:1.25;color:${FG};">${escapeEmailHtml(t)}<span style="color:${MINT};">.</span></h2>`
}

function compileButton(b: EmailBlock, siteUrl: string): string {
  const url = safeHref(b.href, siteUrl)
  const label = (b.label ?? '').trim()
  if (!url || !label) return ''
  const align = b.align === 'center' ? 'center' : 'left'
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="${align}" style="padding:6px 0 18px;">
      <a href="${escapeEmailHtml(url)}" style="display:inline-block;background:${MINT};color:#04060c;text-decoration:none;font-weight:700;font-size:14px;padding:13px 22px;border-radius:999px;">${escapeEmailHtml(label)} &rarr;</a>
    </td>
  </tr></table>`
}

function compileImage(b: EmailBlock, siteUrl: string): string {
  const src = safeHref(b.src, siteUrl)
  if (!src) return ''
  const img = `<img src="${escapeEmailHtml(src)}" alt="${escapeEmailHtml(b.alt ?? '')}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:10px;border:1px solid ${LINE};" />`
  const href = safeHref(b.href, siteUrl)
  const inner = href ? `<a href="${escapeEmailHtml(href)}" style="text-decoration:none;">${img}</a>` : img
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="padding:4px 0 16px;">${inner}</td>
  </tr></table>`
}

function compileProducts(b: EmailBlock, siteUrl: string): string {
  const products = (b.products ?? []).slice(0, 3)
  if (products.length === 0) return ''
  const cards = products
    .map((p) => {
      const url = absoluteUrl(`/fr/products/${encodeURIComponent(p.slug)}`, siteUrl)
      const img = absoluteUrl(p.image, siteUrl)
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL};border:1px solid ${LINE};border-radius:12px;margin:0 0 12px;">
        <tr>
          <td width="120" style="padding:12px;" valign="top">
            <a href="${escapeEmailHtml(url)}" style="text-decoration:none;">
              <img src="${escapeEmailHtml(img)}" alt="${escapeEmailHtml(p.name)}" width="108" style="display:block;width:108px;height:auto;border-radius:8px;background:#ffffff;" />
            </a>
          </td>
          <td style="padding:14px 16px 14px 2px;" valign="middle">
            ${p.brand ? `<p style="margin:0 0 3px;font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;color:${FAINT};">${escapeEmailHtml(p.brand)}</p>` : ''}
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${FG};line-height:1.35;">
              <a href="${escapeEmailHtml(url)}" style="color:${FG};text-decoration:none;">${escapeEmailHtml(p.name)}</a>
            </p>
            <p style="margin:0 0 8px;font-size:12.5px;line-height:1.5;color:${MUTED};">${escapeEmailHtml(p.tagline)}</p>
            <a href="${escapeEmailHtml(url)}" style="font-size:12.5px;font-weight:600;color:${ACCENT};text-decoration:underline;">Voir le produit &rarr;</a>
          </td>
        </tr>
      </table>`
    })
    .join('')
  return `<div style="padding:4px 0 8px;">${cards}</div>`
}

function compileDivider(): string {
  return `<div style="height:1px;background:${LINE};margin:18px 0;"></div>`
}

function compileSpacer(b: EmailBlock): string {
  const size = Math.min(96, Math.max(8, Math.round(b.size ?? 24)))
  return `<div style="height:${size}px;line-height:${size}px;font-size:1px;">&nbsp;</div>`
}

/**
 * Raw HTML passthrough. The active-content stripping (scripts, on*
 * handlers, javascript: URLs) is applied by the SERVER at save time via
 * sanitizeCustomHtml — the compiler itself stays pure and unopinionated.
 */
function compileHtml(b: EmailBlock): string {
  return b.html ?? ''
}

export function compileBlocksToHtml(
  blocks: EmailBlock[],
  opts: { siteUrl: string }
): string {
  const { siteUrl } = opts
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
          return compileHeading(b)
        case 'text':
          return textToParagraphs(b.text ?? '')
        case 'image':
          return compileImage(b, siteUrl)
        case 'button':
          return compileButton(b, siteUrl)
        case 'products':
          return compileProducts(b, siteUrl)
        case 'divider':
          return compileDivider()
        case 'spacer':
          return compileSpacer(b)
        case 'html':
          return compileHtml(b)
        default:
          return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

/** Plain-text mirror for the text/plain MIME part. */
export function blocksToText(blocks: EmailBlock[], opts: { siteUrl: string }): string {
  const lines: string[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        if (b.text?.trim()) lines.push(b.text.trim().toUpperCase())
        break
      case 'text':
        if (b.text?.trim()) lines.push(b.text.trim())
        break
      case 'button':
        if (b.label?.trim() && b.href?.trim())
          lines.push(`${b.label.trim()}: ${safeHref(b.href, opts.siteUrl)}`)
        break
      case 'image':
        if (b.alt?.trim()) lines.push(`[${b.alt.trim()}]`)
        break
      case 'products':
        for (const p of b.products ?? []) {
          lines.push(
            `${p.brand ? `${p.brand} — ` : ''}${p.name}: ${absoluteUrl(`/fr/products/${p.slug}`, opts.siteUrl)}`
          )
        }
        break
      case 'html':
        if (b.html) {
          const stripped = b.html
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          if (stripped) lines.push(stripped)
        }
        break
      default:
        break
    }
  }
  return lines.join('\n\n')
}

const VALID_TYPES: readonly EmailBlockType[] = [
  'heading',
  'text',
  'image',
  'button',
  'products',
  'divider',
  'spacer',
  'html',
]

const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.slice(0, max) : ''

/**
 * Defensive parse of a stored/POSTed blocks value. Returns null when the
 * value is not a usable blocks array (caller falls back to legacy HTML).
 * Deterministic (no randomness) — safe to call during SSR render.
 */
export function parseBlocks(value: unknown): EmailBlock[] | null {
  let raw = value
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!Array.isArray(raw)) return null
  const out: EmailBlock[] = []
  raw.slice(0, 60).forEach((item, i) => {
    if (!item || typeof item !== 'object') return
    const o = item as Record<string, unknown>
    const type = o.type
    if (typeof type !== 'string' || !(VALID_TYPES as string[]).includes(type)) return
    const block: EmailBlock = {
      id: str(o.id, 40) || `blk-${i}`,
      type: type as EmailBlockType,
    }
    if (typeof o.text === 'string') block.text = o.text.slice(0, 8_000)
    if (typeof o.src === 'string') block.src = o.src.slice(0, 1_000)
    if (typeof o.alt === 'string') block.alt = o.alt.slice(0, 300)
    if (typeof o.href === 'string') block.href = o.href.slice(0, 1_000)
    if (typeof o.label === 'string') block.label = o.label.slice(0, 120)
    if (o.align === 'center' || o.align === 'left') block.align = o.align
    if (typeof o.size === 'number' && Number.isFinite(o.size)) block.size = o.size
    if (typeof o.html === 'string') block.html = o.html.slice(0, 60_000)
    if (Array.isArray(o.products)) {
      block.products = o.products
        .slice(0, 3)
        .map((p): EmailProductRef | null => {
          if (!p || typeof p !== 'object') return null
          const pr = p as Record<string, unknown>
          const slug = str(pr.slug, 200)
          const name = str(pr.name, 300)
          if (!slug || !name) return null
          return {
            slug,
            name,
            tagline: str(pr.tagline, 400),
            image: str(pr.image, 1_000),
            ...(str(pr.brand, 120) ? { brand: str(pr.brand, 120) } : {}),
          }
        })
        .filter((p): p is EmailProductRef => p !== null)
    }
    out.push(block)
  })
  return out
}

/** Starter content for a freshly created campaign. */
export function defaultBlocks(): EmailBlock[] {
  return [
    { id: 'blk-h', type: 'heading', text: 'Du nouveau chez D-Tech' },
    {
      id: 'blk-t',
      type: 'text',
      text: 'Bonjour,\n\nDécouvrez nos dernières nouveautés et offres du moment.',
    },
    { id: 'blk-b', type: 'button', label: 'Voir le catalogue', href: '/fr/products', align: 'left' },
  ]
}

/** Wrap a legacy raw-HTML campaign body as a single html block. */
export function legacyBlocksFromHtml(html: string): EmailBlock[] {
  return [{ id: 'blk-legacy', type: 'html', html }]
}
