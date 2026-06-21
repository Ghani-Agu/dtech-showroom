/** Turn a BlockStyle into inline CSS + a custom-CSS string. */
import type { CSSProperties } from 'react'
import type { BlockStyle } from './types'

export const FONT_OPTIONS = [
  { label: 'Geist (du site)', value: 'var(--font-geist-sans), Inter, system-ui, sans-serif' },
  { label: 'Mono (Geist Mono)', value: 'var(--font-geist-mono), ui-monospace, monospace' },
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
]

const SHADOWS: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  md: '0 10px 30px -12px rgba(0,0,0,0.55)',
  lg: '0 30px 70px -24px rgba(0,0,0,0.7)',
  glow: '0 0 0 1px rgba(124,224,195,0.22), 0 0 40px -6px rgba(124,224,195,0.45)',
}

/** Background (solid or gradient). */
export function bgValue(s: BlockStyle): string | undefined {
  if (!s.bgColor) return undefined
  if (s.gradient && s.bgColor2) {
    return `linear-gradient(135deg, ${s.bgColor}, ${s.bgColor2})`
  }
  return s.bgColor
}

/** Inline style object for a block root. */
export function computeStyle(s: BlockStyle): CSSProperties {
  const css: CSSProperties = {}
  if (s.textColor) css.color = s.textColor
  const bg = bgValue(s)
  if (bg) css.background = bg
  if (s.fontFamily) css.fontFamily = s.fontFamily
  if (s.fontSize != null) css.fontSize = `${s.fontSize}px`
  if (s.fontWeight != null) css.fontWeight = s.fontWeight
  if (s.lineHeight != null) css.lineHeight = s.lineHeight
  if (s.letterSpacing != null) css.letterSpacing = `${s.letterSpacing}em`
  if (s.textAlign) css.textAlign = s.textAlign
  if (s.italic) css.fontStyle = 'italic'
  if (s.underline) css.textDecoration = 'underline'
  if (s.uppercase) css.textTransform = 'uppercase'
  if (s.paddingY != null) {
    css.paddingTop = `${s.paddingY}px`
    css.paddingBottom = `${s.paddingY}px`
  }
  if (s.paddingX != null) {
    css.paddingLeft = `${s.paddingX}px`
    css.paddingRight = `${s.paddingX}px`
  }
  if (s.marginTop != null) css.marginTop = `${s.marginTop}px`
  if (s.marginBottom != null) css.marginBottom = `${s.marginBottom}px`
  if (s.radius != null) css.borderRadius = `${s.radius}px`
  if (s.borderWidth != null && s.borderWidth > 0) {
    css.borderStyle = 'solid'
    css.borderWidth = `${s.borderWidth}px`
    css.borderColor = s.borderColor ?? 'rgba(124,224,195,0.3)'
  }
  if (s.shadow && s.shadow !== 'none') css.boxShadow = SHADOWS[s.shadow]
  if (s.opacity != null) css.opacity = s.opacity / 100
  return css
}

/** Parse a `customCss` string into a CSSProperties-ish object. */
export function parseCustomCss(raw?: string): CSSProperties {
  if (!raw) return {}
  const out: Record<string, string> = {}
  raw.split(';').forEach((decl) => {
    const i = decl.indexOf(':')
    if (i === -1) return
    const prop = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (!prop || !val) return
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = val
  })
  return out as CSSProperties
}

/**
 * Data attributes for the per-device hide flags. Attach the return value
 * via JSX spread onto the block's root element. CSS in editor.css turns
 * these into `display: none` for the matching `.we-canvas[data-device]`.
 */
export function deviceVisibilityAttrs(
  s: BlockStyle
): Record<string, string | undefined> {
  return {
    'data-hide-desktop': s.hideOnDesktop ? '1' : undefined,
    'data-hide-tablet': s.hideOnTablet ? '1' : undefined,
    'data-hide-mobile': s.hideOnMobile ? '1' : undefined,
  }
}
