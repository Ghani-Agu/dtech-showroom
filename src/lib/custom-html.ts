/**
 * custom-html.ts — the admin-authored HTML block shown on product pages.
 *
 * TRUST MODEL (ROUND 22)
 * ------------------------------------------------------------------
 * Only a signed-in user holding the "products" section can write this field.
 * The block was asked to behave like every other "paste your embed code here"
 * box on the web: whatever is pasted must RUN. Round 8 shipped the opposite —
 * `<script>` was stripped — so pasting a supplier widget, a 3D viewer, a
 * video player or an analytics snippet produced an empty space and looked
 * like the feature was broken.
 *
 * TWO THINGS HAD TO CHANGE, NOT ONE
 * ------------------------------------------------------------------
 * 1. the sanitizer stopped deleting `<script>`;
 * 2. the render path had to actually execute it. HTML injected through
 *    `innerHTML` / `dangerouslySetInnerHTML` leaves its scripts INERT — that
 *    is the spec, not a React quirk. A script only runs when it is created
 *    with `document.createElement`.
 *
 * WHY THE TEMPLATE CARRIER
 * ------------------------------------------------------------------
 * The obvious fix — emit the `<script>` tags server-side and revive them on
 * mount — works, but React 19 treats `<script>` as a hoistable resource and
 * logs a hydration mismatch for the surrounding tree ("this won't be patched
 * up"), which risks React discarding the server markup for that subtree.
 *
 * So `prepareCustomHtml()` swaps every `<script>` for an inert
 * `<template data-dtech-script="…">` carrying the original attributes and
 * body, base64-encoded. A `<template>` is invisible, inert, valid anywhere,
 * and React has no opinion about it — hydration stays clean, the markup
 * around it is still server-rendered for SEO, and the position of each script
 * inside the block is preserved exactly.
 * `src/components/product/CustomHtml.tsx` turns the templates back into live
 * scripts on mount.
 *
 * Base64 rather than escaping: the payload is arbitrary JavaScript, and JS
 * full of `<`, `>` and quotes cannot be dropped into markup safely by hand.
 */

export interface SanitizeOptions {
  /** Leave `<script>` and inline handlers alone. Product pages: true. */
  allowScripts?: boolean
}

/** Marker attribute read back by the client component. */
export const SCRIPT_CARRIER_ATTR = 'data-dtech-script'

export function sanitizeCustomHtml(
  html: string,
  options: SanitizeOptions = {}
): string {
  if (!html) return ''
  if (options.allowScripts) return html

  return (
    html
      // <script>…</script> blocks (and orphan open/self-closing tags)
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script\b[^>]*\/?>/gi, '')
      // inline event handlers: onclick="…", onload='…', onerror=x
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
      // javascript: URLs in href/src/xlink:href
      .replace(
        /((?:href|src|xlink:href)\s*=\s*)(["']?)\s*javascript:[^"'>\s]*\2/gi,
        '$1$2#$2'
      )
  )
}

/** `<script src="x" defer>code</script>` → { attrs: {...}, code: 'code' } */
function parseScriptTag(openTag: string, body: string) {
  const attrs: Record<string, string> = {}
  const attrRe = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  // Skip the tag name itself.
  const inner = openTag.replace(/^<script/i, '').replace(/\/?>$/, '')
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(inner)) !== null) {
    const name = m[1]
    if (!name) continue
    attrs[name.toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return { attrs, code: body }
}

function encodePayload(payload: unknown): string {
  const json = JSON.stringify(payload)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64')
  }
  // Browser fallback (the admin preview builds payloads client-side).
  return btoa(String.fromCharCode(...new TextEncoder().encode(json)))
}

/**
 * Server-side transform: markup stays renderable, scripts ride along in inert
 * `<template>` carriers. Returns '' for empty input.
 */
export function prepareCustomHtml(html: string): string {
  if (!html) return ''

  let out = html.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    (_full, rawAttrs: string, body: string) => {
      const { attrs, code } = parseScriptTag(`<script${rawAttrs}>`, body)
      return `<template ${SCRIPT_CARRIER_ATTR}="${encodePayload({ attrs, code })}"></template>`
    }
  )

  // Self-closing / unterminated `<script src=…>` with no body.
  out = out.replace(/<script\b([^>]*?)\/?>(?!\s*<\/script)/gi, (_full, rawAttrs: string) => {
    const { attrs } = parseScriptTag(`<script${rawAttrs}>`, '')
    return `<template ${SCRIPT_CARRIER_ATTR}="${encodePayload({ attrs, code: '' })}"></template>`
  })

  return out
}

/** True when the block contains something that needs client-side execution. */
export function customHtmlHasScripts(html: string): boolean {
  return /<script\b/i.test(html)
}
