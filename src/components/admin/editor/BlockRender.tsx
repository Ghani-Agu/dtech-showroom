'use client'

/**
 * BlockRender — renders a block to the site-styled preview. Container blocks
 * receive their children via `childrenSlot` so the canvas can inject drop
 * zones + selectable wrappers; export/preview passes plain rendered children.
 */
import React, { type CSSProperties, type ReactNode } from 'react'
import {
  Sparkles, Zap, ShieldCheck, Truck, Headphones, Cpu, Monitor, Wifi,
  Star, Heart, Award, Rocket, Check, Phone, Mail, MapPin, Clock, Gift,
  Tag, Package, ChevronRight, ExternalLink, MessageSquare, Lightbulb,
  AlertTriangle, X,
  type LucideIcon,
} from 'lucide-react'
import type { Block } from './types'
import { computeStyle, parseCustomCss, bgValue } from './style'

// Aliases for callout / banner tones — using icons we know exist in
// the installed lucide-react@1.16.x (which doesn't ship brand or
// "Circle"-suffixed variants).
const Info: LucideIcon = Lightbulb
const CheckCircle: LucideIcon = Check
const XCircle: LucideIcon = X

const ICONS: Record<string, LucideIcon> = {
  Sparkles, Zap, ShieldCheck, Truck, Headphones, Cpu, Monitor, Wifi,
  Star, Heart, Award, Rocket, Check, Phone, Mail, MapPin, Clock, Gift,
  Tag, Package,
}

export interface RenderCtx {
  editing: boolean
  selected: boolean
  onText?: (key: string, value: string) => void
}

const MINT = 'var(--we-accent)'

function s(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}
function arr<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

/** Inline-editable text node (commits on blur, no re-render while typing). */
function Editable({
  tag = 'span',
  value,
  field,
  ctx,
  style,
  className,
  multiline = false,
}: {
  tag?: keyof React.JSX.IntrinsicElements
  value: string
  field: string
  ctx: RenderCtx
  style?: CSSProperties
  className?: string
  multiline?: boolean
}) {
  const Tag = tag as React.ElementType
  if (ctx.editing && ctx.selected && ctx.onText) {
    const commit = ctx.onText
    return React.createElement(
      Tag,
      {
        contentEditable: true,
        suppressContentEditableWarning: true,
        spellCheck: false,
        className: `we-editable ${className ?? ''}`,
        style,
        onBlur: (e: React.FocusEvent<HTMLElement>) =>
          commit(field, e.currentTarget.textContent ?? ''),
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
          if (!multiline && e.key === 'Enter') {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).blur()
          }
        },
      },
      value
    )
  }
  return React.createElement(Tag, { className, style }, value)
}

function Kicker({ text, ctx, field = 'kicker' }: { text: string; ctx: RenderCtx; field?: string }) {
  if (!text) return null
  return (
    <span className="we-kicker">
      <span className="we-kicker-dot" />
      <Editable tag="span" value={text} field={field} ctx={ctx} />
    </span>
  )
}

function Btn({
  label,
  href,
  variant = 'primary',
  newTab,
}: {
  label: string
  href?: string
  variant?: string
  newTab?: boolean
}) {
  if (!label) return null
  return (
    <a
      href={href || '#'}
      className={`we-btn we-btn-${variant}`}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      onClick={(e) => e.preventDefault()}
    >
      {label}
    </a>
  )
}

function wrapMax(maxWidth: number | undefined, children: ReactNode) {
  if (!maxWidth) return children
  return (
    <div style={{ maxWidth: `${maxWidth}px`, marginInline: 'auto', width: '100%' }}>
      {children}
    </div>
  )
}

/** Title with an accent substring rendered in mint. */
function titleWithAccent(title: string, accent: string): ReactNode {
  if (!accent || !title.includes(accent)) return title
  const [before, after] = title.split(accent)
  return (
    <>
      {before}
      <span style={{ color: MINT }}>{accent}</span>
      {after}
    </>
  )
}

function videoEmbed(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export function renderBlock(
  block: Block,
  ctx: RenderCtx,
  childrenSlot?: ReactNode
): ReactNode {
  const p = block.props
  const st = block.style
  const base: CSSProperties = { ...computeStyle(st), ...parseCustomCss(st.customCss) }
  const max = st.maxWidth

  switch (block.type) {
    // ───────── Layout ─────────
    case 'section':
      return (
        <section className="we-block-section" style={base}>
          {wrapMax(max, childrenSlot)}
        </section>
      )
    case 'columns': {
      const cols = Number(p.columns) || 2
      const gap = Number(p.gap) || 24
      return (
        <div
          className="we-cols"
          data-stack={p.stackOnMobile ? '1' : '0'}
          style={{ ...base, gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}
        >
          {childrenSlot}
        </div>
      )
    }
    case 'card':
      return (
        <div className="we-card" style={base}>
          {childrenSlot}
        </div>
      )
    case 'spacer':
      return <div style={{ height: `${Number(p.height) || 48}px` }} />
    case 'divider':
      return (
        <hr
          style={{
            border: 0,
            borderTop: `1px solid ${st.borderColor ?? 'var(--we-line)'}`,
            marginTop: st.marginTop ?? 16,
            marginBottom: st.marginBottom ?? 16,
          }}
        />
      )

    // ───────── Texte ─────────
    case 'eyebrow':
      return (
        <div style={base}>
          <Kicker text={s(p.text)} ctx={ctx} field="text" />
        </div>
      )
    case 'heading': {
      const lvl = (s(p.level, 'h2')) as 'h1' | 'h2' | 'h3' | 'h4'
      return (
        <Editable
          tag={lvl}
          value={s(p.text)}
          field="text"
          ctx={ctx}
          style={{ margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1, ...base }}
        />
      )
    }
    case 'paragraph':
      return (
        <Editable
          tag="p"
          value={s(p.text)}
          field="text"
          ctx={ctx}
          multiline
          style={{ margin: 0, ...base }}
        />
      )
    case 'list': {
      const items = arr(p.items)
      const ListTag = (p.ordered ? 'ol' : 'ul') as React.ElementType
      return React.createElement(
        ListTag,
        { className: 'we-list', style: { ...base } },
        items.map((it, i) => <li key={i}>{s(it.text)}</li>)
      )
    }
    case 'quote':
      return (
        <blockquote className="we-quote" style={base}>
          <Editable tag="p" value={s(p.text)} field="text" ctx={ctx} multiline style={{ margin: 0 }} />
          {s(p.author) && <cite className="we-quote-cite">— {s(p.author)}</cite>}
        </blockquote>
      )
    case 'button':
      return (
        <div style={{ ...base, display: 'flex', justifyContent: alignToFlex(st.textAlign) }}>
          <Btn label={s(p.label)} href={s(p.href)} variant={s(p.variant, 'primary')} newTab={!!p.newTab} />
        </div>
      )

    // ───────── Médias ─────────
    case 'image': {
      const ratio = s(p.ratio, '16/9')
      return (
        <figure style={{ margin: 0, ...base }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s(p.src, '/placeholder-product.png')}
            alt={s(p.alt)}
            style={{
              width: '100%',
              display: 'block',
              aspectRatio: ratio === 'auto' ? undefined : ratio.replace('/', ' / '),
              objectFit: (s(p.fit, 'cover') as 'cover' | 'contain'),
              borderRadius: 'inherit',
            }}
          />
        </figure>
      )
    }
    case 'gallery': {
      const items = arr(p.items)
      const cols = Number(p.columns) || 3
      const gap = Number(p.gap) || 12
      return (
        <div
          style={{ ...base, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}
        >
          {items.map((it, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={s(it.src, '/placeholder-product.png')}
              alt={s(it.alt)}
              style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
          ))}
        </div>
      )
    }
    case 'video': {
      const embed = videoEmbed(s(p.url))
      return (
        <div style={{ ...base, aspectRatio: '16 / 9', overflow: 'hidden', background: '#04060c' }}>
          {embed ? (
            <iframe
              src={embed}
              style={{ width: '100%', height: '100%', border: 0, borderRadius: 'inherit' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="video"
            />
          ) : s(p.url) ? (
            <video src={s(p.url)} controls style={{ width: '100%', height: '100%' }} />
          ) : (
            <div className="we-placeholder">Ajoutez un lien vidéo</div>
          )}
        </div>
      )
    }
    case 'icon': {
      const Icon = ICONS[s(p.name, 'Sparkles')] ?? Sparkles
      return (
        <div style={{ ...base, display: 'flex', justifyContent: alignToFlex(st.textAlign) }}>
          <Icon size={Number(p.size) || 40} color={st.textColor || MINT} strokeWidth={1.75} />
        </div>
      )
    }
    case 'logoCloud': {
      const items = arr(p.items)
      return (
        <div style={{ ...base, textAlign: 'center' }}>
          {s(p.title) && <p className="we-logocloud-title">{s(p.title)}</p>}
          <div className="we-logocloud">
            {items.map((it, i) => (
              <span key={i} className="we-logocloud-item">{s(it.text)}</span>
            ))}
          </div>
        </div>
      )
    }

    // ───────── Sections ─────────
    case 'navbar': {
      const links = arr(p.links)
      return (
        <header className="we-navbar" style={base}>
          <span className="we-navbar-brand">
            {s(p.brand, 'D-Tech')}
            <span style={{ color: MINT }}>.</span>
          </span>
          <nav className="we-navbar-links">
            {links.map((l, i) => (
              <a key={i} href={s(l.href)} onClick={(e) => e.preventDefault()}>{s(l.label)}</a>
            ))}
          </nav>
          {s(p.cta) && <Btn label={s(p.cta)} href={s(p.ctaHref)} variant="primary" />}
        </header>
      )
    }
    case 'hero': {
      const stats = arr(p.stats)
      return (
        <section className="we-hero" style={base}>
          {wrapMax(max, (
            <div className="we-hero-inner" data-align={st.textAlign ?? 'left'}>
              <Kicker text={s(p.kicker)} ctx={ctx} />
              <Editable
                tag="h1"
                value={s(p.title)}
                field="title"
                ctx={ctx}
                multiline
                className="we-hero-title"
              />
              {!ctx.selected && s(p.accent) && (
                <span className="we-hero-accent-note" />
              )}
              <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-hero-sub" />
              <div className="we-hero-actions">
                <Btn label={s(p.primaryLabel)} href={s(p.primaryHref)} variant="primary" />
                <Btn label={s(p.secondaryLabel)} href={s(p.secondaryHref)} variant="ghost" />
              </div>
              {stats.length > 0 && (
                <div className="we-hero-stats">
                  {stats.map((it, i) => (
                    <div key={i} className="we-hero-stat">
                      <span className="we-hero-stat-v">{s(it.value)}</span>
                      <span className="we-hero-stat-l">{s(it.label)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )
    }
    case 'heroSimple':
      return (
        <section className="we-hero" style={{ ...base, textAlign: 'center' }}>
          {wrapMax(max ?? 760, (
            <div className="we-hero-inner" data-align="center">
              <Kicker text={s(p.kicker)} ctx={ctx} />
              <Editable tag="h1" value={s(p.title)} field="title" ctx={ctx} multiline className="we-hero-title" />
              <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-hero-sub" />
              <div className="we-hero-actions" style={{ justifyContent: 'center' }}>
                <Btn label={s(p.primaryLabel)} href={s(p.primaryHref)} variant="primary" />
              </div>
            </div>
          ))}
        </section>
      )
    case 'featureGrid': {
      const items = arr(p.items)
      const cols = Number(p.columns) || 3
      return (
        <section style={base}>
          {wrapMax(max ?? 1100, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-feature-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {items.map((it, i) => {
                  const Icon = ICONS[s(it.icon, 'Sparkles')] ?? Sparkles
                  return (
                    <div key={i} className="we-feature">
                      <span className="we-feature-icon"><Icon size={22} color={MINT} /></span>
                      <h3 className="we-feature-title">{s(it.title)}</h3>
                      <p className="we-feature-text">{s(it.text)}</p>
                    </div>
                  )
                })}
              </div>
            </>
          ))}
        </section>
      )
    }
    case 'statsBand': {
      const items = arr(p.items)
      return (
        <section className="we-statsband" style={base}>
          {wrapMax(max ?? 1100, (
            <div className="we-stats-band">
              {items.map((it, i) => (
                <div key={i} className="we-stat">
                  <span className="we-stat-v">{s(it.value)}</span>
                  <span className="we-stat-l">{s(it.label)}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      )
    }
    case 'stat':
      return (
        <div className="we-stat" style={base}>
          <Editable tag="span" value={s(p.value)} field="value" ctx={ctx} className="we-stat-v" />
          <Editable tag="span" value={s(p.label)} field="label" ctx={ctx} className="we-stat-l" />
        </div>
      )
    case 'ctaBanner':
      return (
        <section style={{ marginInline: 'auto', maxWidth: max ?? 1100 }}>
          <div className="we-cta" style={base}>
            <Editable tag="h2" value={s(p.title)} field="title" ctx={ctx} className="we-cta-title" />
            <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-cta-sub" />
            <div className="we-hero-actions" style={{ justifyContent: 'center' }}>
              <Btn label={s(p.primaryLabel)} href={s(p.primaryHref)} variant="primary" />
            </div>
          </div>
        </section>
      )
    case 'testimonials': {
      const items = arr(p.items)
      return (
        <section style={base}>
          {wrapMax(max ?? 1100, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-testimonials">
                {items.map((it, i) => (
                  <figure key={i} className="we-testimonial">
                    <div className="we-stars">{'★★★★★'}</div>
                    <blockquote>{s(it.text)}</blockquote>
                    <figcaption>{s(it.author)}{s(it.role) ? ` · ${s(it.role)}` : ''}</figcaption>
                  </figure>
                ))}
              </div>
            </>
          ))}
        </section>
      )
    }
    case 'faq': {
      const items = arr(p.items)
      return (
        <section style={base}>
          {wrapMax(max ?? 820, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-faq">
                {items.map((it, i) => (
                  <details key={i} className="we-faq-item" open={i === 0}>
                    <summary>{s(it.q)}<ChevronRight size={16} className="we-faq-chev" /></summary>
                    <p>{s(it.a)}</p>
                  </details>
                ))}
              </div>
            </>
          ))}
        </section>
      )
    }
    case 'pricing': {
      const items = arr(p.items)
      return (
        <section style={base}>
          {wrapMax(max ?? 1100, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-pricing">
                {items.map((it, i) => (
                  <div key={i} className={`we-price-card ${it.featured ? 'is-featured' : ''}`}>
                    {it.featured ? <span className="we-price-badge">Populaire</span> : null}
                    <h3 className="we-price-name">{s(it.name)}</h3>
                    <div className="we-price-amount">{s(it.price)}</div>
                    <ul className="we-price-features">
                      {s(it.features).split('·').map((f, j) => (
                        <li key={j}>{f.trim()}</li>
                      ))}
                    </ul>
                    <Btn label={s(it.cta, 'Choisir')} variant={it.featured ? 'primary' : 'ghost'} />
                  </div>
                ))}
              </div>
            </>
          ))}
        </section>
      )
    }
    case 'newsletter':
      return (
        <section style={base}>
          {wrapMax(max ?? 640, (
            <div style={{ textAlign: 'center' }}>
              <Editable tag="h2" value={s(p.title)} field="title" ctx={ctx} className="we-cta-title" />
              <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-cta-sub" />
              <div className="we-newsletter">
                <input className="we-input" placeholder={s(p.placeholder, 'Votre e-mail')} readOnly />
                <Btn label={s(p.button, 'S’inscrire')} variant="primary" />
              </div>
            </div>
          ))}
        </section>
      )
    case 'contactBand':
      return (
        <section style={base}>
          {wrapMax(max ?? 1000, (
            <div className="we-contact">
              <Editable tag="h2" value={s(p.title)} field="title" ctx={ctx} className="we-cta-title" />
              <div className="we-contact-row">
                <span className="we-contact-item"><Phone size={16} color={MINT} /> {s(p.phone)}</span>
                <span className="we-contact-item"><MapPin size={16} color={MINT} /> {s(p.address)}</span>
                <Btn label="WhatsApp" href={s(p.whatsapp)} variant="primary" newTab />
              </div>
            </div>
          ))}
        </section>
      )
    case 'imageText': {
      const left = s(p.side) === 'left'
      return (
        <section style={base}>
          {wrapMax(max ?? 1100, (
            <div className="we-imagetext" data-side={left ? 'left' : 'right'}>
              <div className="we-imagetext-copy">
                <Kicker text={s(p.kicker)} ctx={ctx} />
                <Editable tag="h2" value={s(p.title)} field="title" ctx={ctx} className="we-section-title" />
                <Editable tag="p" value={s(p.text)} field="text" ctx={ctx} multiline className="we-section-sub" />
                <Btn label={s(p.buttonLabel)} href={s(p.buttonHref)} variant="ghost" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="we-imagetext-img" src={s(p.image, '/placeholder-product.png')} alt="" />
            </div>
          ))}
        </section>
      )
    }
    case 'footer': {
      const cols = arr(p.columns)
      return (
        <footer className="we-footer" style={base}>
          {wrapMax(max ?? 1100, (
            <>
              <div className="we-footer-grid">
                <div className="we-footer-brand">
                  <span className="we-navbar-brand">{s(p.brand, 'D-Tech')}<span style={{ color: MINT }}>.</span></span>
                  <p>{s(p.tagline)}</p>
                </div>
                {cols.map((c, i) => (
                  <div key={i} className="we-footer-col">
                    <h4>{s(c.title)}</h4>
                    {s(c.links).split(',').map((pair, j) => {
                      const [label] = pair.split('|')
                      return <a key={j} href="#" onClick={(e) => e.preventDefault()}>{label?.trim()}</a>
                    })}
                  </div>
                ))}
              </div>
              <div className="we-footer-bottom">{s(p.copyright)}</div>
            </>
          ))}
        </footer>
      )
    }

    // ───────── Commerce ─────────
    case 'productGrid': {
      const items = arr(p.items)
      const cols = Number(p.columns) || 4
      return (
        <section style={base}>
          {wrapMax(max ?? 1200, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-products" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {items.map((it, i) => (
                  <div key={i} className="we-product">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s(it.image, '/placeholder-product.png')} alt={s(it.name)} className="we-product-img" />
                    <span className="we-product-brand">{s(it.brand)}</span>
                    <h3 className="we-product-name">{s(it.name)}</h3>
                    <div className="we-product-meta">
                      <span className="we-product-rating"><Star size={12} fill={MINT} color={MINT} /> {s(it.rating)}</span>
                      <span className="we-product-price">{s(it.price)}</span>
                    </div>
                    <span className="we-btn we-btn-primary we-product-cta">Ajouter au panier</span>
                  </div>
                ))}
              </div>
            </>
          ))}
        </section>
      )
    }
    case 'categoryRail': {
      const items = arr(p.items)
      return (
        <section style={base}>
          {wrapMax(max ?? 1200, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-rail">
                {items.map((it, i) => (
                  <div key={i} className="we-rail-card">
                    <h3>{s(it.name)}</h3>
                    <span className="we-rail-count">{s(it.count)} produits</span>
                  </div>
                ))}
              </div>
            </>
          ))}
        </section>
      )
    }
    case 'brandRail': {
      const items = arr(p.items)
      return (
        <section style={base}>
          {wrapMax(max ?? 1200, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-brandrail">
                {items.map((it, i) => (
                  <span key={i} className="we-brand-chip">{s(it.name)}</span>
                ))}
              </div>
            </>
          ))}
        </section>
      )
    }

    // ───────── Avancé ─────────
    case 'html':
      return <div style={base} dangerouslySetInnerHTML={{ __html: s(p.html) }} />
    case 'map':
      return (
        <iframe
          title="map"
          style={{ width: '100%', height: `${Number(p.height) || 360}px`, border: 0, ...base }}
          src={`https://www.google.com/maps?q=${encodeURIComponent(s(p.query, 'Alger'))}&output=embed`}
          loading="lazy"
        />
      )

    // ───────── Sections v2 ─────────
    case 'heroImage': {
      const overlay = Math.max(0, Math.min(100, Number(p.overlay) || 0)) / 100
      return (
        <section className="we-hero we-hero-bg" style={base}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="we-hero-bg-img" src={s(p.image, '/placeholder-product.png')} alt="" />
          <div className="we-hero-bg-veil" style={{ background: `rgba(0,0,0,${overlay})` }} />
          {wrapMax(max ?? 1100, (
            <div className="we-hero-inner" data-align={st.textAlign ?? 'left'}>
              <Kicker text={s(p.kicker)} ctx={ctx} />
              <Editable tag="h1" value={s(p.title)} field="title" ctx={ctx} multiline className="we-hero-title" />
              <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-hero-sub" />
              <div className="we-hero-actions">
                <Btn label={s(p.primaryLabel)} href={s(p.primaryHref)} variant="primary" />
                <Btn label={s(p.secondaryLabel)} href={s(p.secondaryHref)} variant="ghost" />
              </div>
            </div>
          ))}
        </section>
      )
    }
    case 'heroVideo': {
      const overlay = Math.max(0, Math.min(100, Number(p.overlay) || 0)) / 100
      const url = s(p.videoUrl)
      const embed = videoEmbed(url)
      return (
        <section className="we-hero we-hero-bg" style={base}>
          {embed ? (
            <iframe
              className="we-hero-bg-video"
              src={`${embed}?autoplay=1&mute=1&loop=1&playlist=${embed.split('/').pop()}&controls=0`}
              title="hero video"
              allow="autoplay; encrypted-media"
            />
          ) : url ? (
            <video className="we-hero-bg-video" src={url} autoPlay muted loop playsInline />
          ) : (
            <div className="we-hero-bg-veil" style={{ background: 'linear-gradient(135deg, var(--we-accent), color-mix(in oklab, var(--we-accent) 40%, black))' }} />
          )}
          <div className="we-hero-bg-veil" style={{ background: `rgba(0,0,0,${overlay})` }} />
          {wrapMax(max ?? 1100, (
            <div className="we-hero-inner" data-align={st.textAlign ?? 'center'}>
              <Kicker text={s(p.kicker)} ctx={ctx} />
              <Editable tag="h1" value={s(p.title)} field="title" ctx={ctx} multiline className="we-hero-title" />
              <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-hero-sub" />
              <div className="we-hero-actions" style={{ justifyContent: st.textAlign === 'center' ? 'center' : 'flex-start' }}>
                <Btn label={s(p.primaryLabel)} href={s(p.primaryHref)} variant="primary" />
              </div>
            </div>
          ))}
        </section>
      )
    }
    case 'heroSplit': {
      const left = s(p.side) === 'left'
      return (
        <section className="we-hero" style={base}>
          {wrapMax(max ?? 1180, (
            <div className="we-imagetext" data-side={left ? 'left' : 'right'}>
              <div className="we-imagetext-copy">
                <Kicker text={s(p.kicker)} ctx={ctx} />
                <Editable tag="h1" value={s(p.title)} field="title" ctx={ctx} multiline className="we-hero-title" />
                <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-hero-sub" />
                <div className="we-hero-actions">
                  <Btn label={s(p.primaryLabel)} href={s(p.primaryHref)} variant="primary" />
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="we-imagetext-img" src={s(p.image, '/placeholder-product.png')} alt="" />
            </div>
          ))}
        </section>
      )
    }
    case 'sectionHeader': {
      const align = s(p.align, 'center')
      return (
        <section style={{ ...base, textAlign: align as 'left' | 'center' }}>
          {wrapMax(max ?? 760, (
            <div className={`we-section-head we-section-head-${align}`}>
              <Kicker text={s(p.kicker)} ctx={ctx} />
              <Editable tag="h2" value={s(p.title)} field="title" ctx={ctx} className="we-section-title" />
              <Editable tag="p" value={s(p.subtitle)} field="subtitle" ctx={ctx} multiline className="we-section-sub" />
            </div>
          ))}
        </section>
      )
    }
    case 'team': {
      const items = arr(p.items)
      const cols = Number(p.columns) || 3
      return (
        <section style={base}>
          {wrapMax(max ?? 1100, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <div className="we-team-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {items.map((it, i) => (
                  <figure key={i} className="we-team-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s(it.image) ? (
                      <img src={s(it.image)} alt={s(it.name)} className="we-team-img" />
                    ) : (
                      <div className="we-team-img we-team-img-empty">
                        {s(it.name).slice(0, 1).toUpperCase() || '?'}
                      </div>
                    )}
                    <figcaption>
                      <strong className="we-team-name">{s(it.name)}</strong>
                      <span className="we-team-role">{s(it.role)}</span>
                      <p className="we-team-bio">{s(it.bio)}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          ))}
        </section>
      )
    }
    case 'tabs': {
      const items = arr(p.items)
      return (
        <section style={base}>
          {wrapMax(max ?? 980, (
            <div className="we-tabs">
              <Kicker text={s(p.kicker)} ctx={ctx} />
              <div className="we-tabs-bar" role="tablist">
                {items.map((it, i) => (
                  <button key={i} type="button" className={`we-tabs-tab ${i === 0 ? 'is-on' : ''}`} role="tab">
                    {s(it.label, `Onglet ${i + 1}`)}
                  </button>
                ))}
              </div>
              <div className="we-tabs-body" role="tabpanel">
                {/* Show only the first tab's body in the editor preview — the
                    public site can wire interactive switching at hydration. */}
                {items[0] ? <p>{s(items[0].body)}</p> : null}
              </div>
            </div>
          ))}
        </section>
      )
    }
    case 'steps': {
      const items = arr(p.items)
      const orientation = s(p.orientation, 'horizontal') as 'horizontal' | 'vertical'
      return (
        <section style={base}>
          {wrapMax(max ?? 1100, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <ol className={`we-steps we-steps-${orientation}`}>
                {items.map((it, i) => (
                  <li key={i} className="we-step">
                    <span className="we-step-n">{i + 1}</span>
                    <div>
                      <strong className="we-step-title">{s(it.title)}</strong>
                      <p className="we-step-text">{s(it.text)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ))}
        </section>
      )
    }
    case 'timeline': {
      const items = arr(p.items)
      return (
        <section style={base}>
          {wrapMax(max ?? 820, (
            <>
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <ul className="we-timeline">
                {items.map((it, i) => (
                  <li key={i} className="we-tline-item">
                    <span className="we-tline-date">{s(it.date)}</span>
                    <strong className="we-tline-title">{s(it.title)}</strong>
                    <p className="we-tline-text">{s(it.text)}</p>
                  </li>
                ))}
              </ul>
            </>
          ))}
        </section>
      )
    }
    case 'carousel': {
      const items = arr(p.items)
      const ratio = s(p.ratio, '16/9')
      return (
        <section style={base}>
          <div className="we-carousel">
            <div className="we-carousel-track">
              {items.map((it, i) => (
                <div key={i} className="we-carousel-slide" style={{ aspectRatio: ratio.replace('/', ' / ') }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s(it.image, '/placeholder-product.png')} alt={s(it.caption)} />
                  {s(it.caption) && <span className="we-carousel-cap">{s(it.caption)}</span>}
                </div>
              ))}
            </div>
            {p.showDots !== false && items.length > 0 && (
              <div className="we-carousel-dots">
                {items.map((_, i) => (
                  <span key={i} className={`we-carousel-dot ${i === 0 ? 'is-on' : ''}`} />
                ))}
              </div>
            )}
          </div>
        </section>
      )
    }
    case 'banner': {
      const tone = s(p.tone, 'info')
      const ToneIcon = tone === 'success' ? CheckCircle : tone === 'warn' ? AlertTriangle : tone === 'promo' ? Gift : Info
      return (
        <div className={`we-banner we-banner-${tone}`} style={base}>
          <ToneIcon size={15} />
          <span className="we-banner-text">{s(p.text)}</span>
          {s(p.ctaLabel) && (
            <a className="we-banner-cta" href={s(p.ctaHref, '#')} onClick={(e) => e.preventDefault()}>
              {s(p.ctaLabel)} →
            </a>
          )}
        </div>
      )
    }
    case 'contactForm': {
      return (
        <section style={base}>
          {wrapMax(max ?? 720, (
            <div className="we-form">
              <SectionHead kicker={s(p.kicker)} title={s(p.title)} ctx={ctx} />
              <form
                className="we-form-body"
                action={s(p.action, '/api/inquiry')}
                method={s(p.method, 'POST')}
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="we-form-row">
                  <label className="we-form-field">
                    <span>{s(p.nameLabel, 'Nom complet')}</span>
                    <input type="text" name="name" required />
                  </label>
                  <label className="we-form-field">
                    <span>{s(p.emailLabel, 'E-mail')}</span>
                    <input type="email" name="email" required />
                  </label>
                </div>
                <div className="we-form-row">
                  <label className="we-form-field">
                    <span>{s(p.phoneLabel, 'Téléphone')}</span>
                    <input type="tel" name="phone" />
                  </label>
                  <label className="we-form-field">
                    <span>{s(p.subjectLabel, 'Sujet')}</span>
                    <input type="text" name="subject" />
                  </label>
                </div>
                <label className="we-form-field">
                  <span>{s(p.messageLabel, 'Votre message')}</span>
                  <textarea name="message" rows={5} required />
                </label>
                <button type="submit" className="we-btn we-btn-primary we-form-submit">
                  {s(p.submitLabel, 'Envoyer →')}
                </button>
                {s(p.consent) && <p className="we-form-consent">{s(p.consent)}</p>}
              </form>
            </div>
          ))}
        </section>
      )
    }
    case 'socialLinks': {
      const items = arr(p.items)
      // lucide-react@1.16 doesn't ship brand icons (Facebook, Instagram,
      // LinkedIn, etc.) for trademark reasons. We use generic icons and
      // rely on the visible network name / handle for differentiation.
      const ICON_FOR: Record<string, LucideIcon> = {
        facebook: ExternalLink,
        instagram: ExternalLink,
        whatsapp: MessageSquare,
        linkedin: ExternalLink,
        x: ExternalLink,
        youtube: ExternalLink,
        tiktok: ExternalLink,
        mail: Mail,
        phone: Phone,
      }
      return (
        <section style={base}>
          {s(p.title) && (
            <Editable tag="p" value={s(p.title)} field="title" ctx={ctx} className="we-social-title" />
          )}
          <div className="we-social-row">
            {items.map((it, i) => {
              const IconCmp = ICON_FOR[s(it.network)] ?? Sparkles
              return (
                <a
                  key={i}
                  href={s(it.href, '#')}
                  className="we-social-chip"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.preventDefault()}
                >
                  <IconCmp size={15} />
                  <span>{s(it.handle)}</span>
                </a>
              )
            })}
          </div>
        </section>
      )
    }
    case 'buttonGroup': {
      const items = arr(p.items)
      const align = s(p.align, 'left') as 'left' | 'center' | 'right'
      return (
        <div
          style={{ ...base, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}
        >
          {items.map((it, i) => (
            <Btn
              key={i}
              label={s(it.label)}
              href={s(it.href)}
              variant={s(it.variant, 'primary')}
            />
          ))}
        </div>
      )
    }
    case 'accordion': {
      const items = arr(p.items)
      const openFirst = p.openFirst !== false
      return (
        <section style={base}>
          {wrapMax(max ?? 820, (
            <div className="we-acc">
              {items.map((it, i) => (
                <details key={i} className="we-acc-item" open={openFirst && i === 0}>
                  <summary>
                    {s(it.title)}
                    <ChevronRight size={16} className="we-acc-chev" />
                  </summary>
                  <p>{s(it.body)}</p>
                </details>
              ))}
            </div>
          ))}
        </section>
      )
    }
    case 'counter':
      return (
        <div className="we-counter" style={base}>
          <span className="we-counter-v">
            {s(p.prefix)}<span data-counter={s(p.target)}>{s(p.target)}</span>{s(p.suffix)}
          </span>
          <span className="we-counter-l">{s(p.label)}</span>
        </div>
      )
    case 'badge': {
      const tone = s(p.tone, 'mint')
      return (
        <span className={`we-badge we-badge-${tone}`} style={base}>
          {s(p.text)}
        </span>
      )
    }
    case 'progress': {
      const v = Math.max(0, Math.min(100, Number(p.value) || 0))
      return (
        <div className="we-progress" style={base}>
          <div className="we-progress-head">
            <span>{s(p.label)}</span>
            <span className="we-progress-v">{v}%</span>
          </div>
          <div className="we-progress-bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
            <div className="we-progress-fill" style={{ width: `${v}%` }} />
          </div>
        </div>
      )
    }
    case 'callout': {
      const tone = s(p.tone, 'info')
      const ToneIcon = tone === 'success' ? CheckCircle : tone === 'warn' ? AlertTriangle : tone === 'error' ? XCircle : Info
      return (
        <aside className={`we-callout we-callout-${tone}`} style={base}>
          <span className="we-callout-icon"><ToneIcon size={18} /></span>
          <div>
            <strong className="we-callout-title">{s(p.title)}</strong>
            <p className="we-callout-text">{s(p.text)}</p>
          </div>
        </aside>
      )
    }
    case 'code':
      return (
        <pre className="we-code" style={base}>
          {s(p.language) && <span className="we-code-lang">{s(p.language)}</span>}
          <code>{s(p.code)}</code>
        </pre>
      )
    case 'embed': {
      const url = s(p.url)
      if (!url) return <div className="we-placeholder">Ajoutez une URL à intégrer</div>
      return (
        <iframe
          title="embed"
          src={url}
          style={{ width: '100%', height: `${Number(p.height) || 480}px`, border: 0, ...base }}
          loading="lazy"
        />
      )
    }

    default:
      return <div className="we-placeholder">Bloc inconnu : {block.type}</div>
  }
}

function SectionHead({ kicker, title, ctx }: { kicker: string; title: string; ctx: RenderCtx }) {
  return (
    <div className="we-section-head">
      <Kicker text={kicker} ctx={ctx} />
      <Editable tag="h2" value={title} field="title" ctx={ctx} className="we-section-title" />
    </div>
  )
}

function alignToFlex(align?: string): string {
  if (align === 'center') return 'center'
  if (align === 'right') return 'flex-end'
  return 'flex-start'
}

export { titleWithAccent, bgValue }
