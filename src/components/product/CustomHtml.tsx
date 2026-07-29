'use client'

/**
 * CustomHtml — renders the admin-authored HTML block AND runs its scripts.
 *
 * WHY THIS EXISTS (ROUND 22)
 * ------------------------------------------------------------------
 * The "Code HTML" field on a product used to be rendered with a bare
 * `dangerouslySetInnerHTML`. Two separate things then swallowed anything
 * script-driven — which is most real-world embed code:
 *
 *   1. `sanitizeCustomHtml()` deleted every `<script>` before render;
 *   2. even with the scripts left in, the HTML spec says a `<script>`
 *      inserted through `innerHTML` is INERT — it sits in the DOM and never
 *      executes. `dangerouslySetInnerHTML` is exactly that path.
 *
 * So pasting a widget produced an empty gap: no error, no content, nothing to
 * debug.
 *
 * The server hands us markup where each `<script>` has already been swapped
 * for an inert `<template data-dtech-script="…">` carrier (see
 * `prepareCustomHtml` in `src/lib/custom-html.ts` for why a template rather
 * than the script tag itself). On mount we walk those carriers in order and
 * replace each with a real `document.createElement('script')`, which the
 * browser executes — the standard trick every embed loader uses.
 *
 * Order is preserved the way the browser would do it: an external script is
 * awaited before the next carrier runs, so a widget's `init()` snippet cannot
 * fire before the library it depends on has loaded.
 *
 * KNOWN LIMIT: embeds built on `document.write()` (very old ad/counter code)
 * cannot work — calling it after load blanks the document, so we deliberately
 * do not shim it. Everything modern (DOM APIs, iframes, module scripts, async
 * loaders) works.
 */

import { useEffect, useRef } from 'react'
import { SCRIPT_CARRIER_ATTR } from '@/lib/custom-html'

interface Props {
  /** Output of `prepareCustomHtml()`. */
  html: string
  className?: string
  style?: React.CSSProperties
}

interface ScriptPayload {
  attrs: Record<string, string>
  code: string
}

function decodePayload(b64: string): ScriptPayload | null {
  try {
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as ScriptPayload
  } catch {
    return null
  }
}

/** Swap an inert carrier for a live <script> so the browser executes it. */
function runCarrier(carrier: Element): Promise<void> {
  const payload = decodePayload(carrier.getAttribute(SCRIPT_CARRIER_ATTR) ?? '')
  if (!payload) {
    carrier.remove()
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    for (const [name, value] of Object.entries(payload.attrs)) {
      try {
        script.setAttribute(name, value)
      } catch {
        /* an invalid attribute name must not stop the rest of the block */
      }
    }
    if (!payload.attrs.src) script.textContent = payload.code

    if (payload.attrs.src) {
      // Wait for external sources: a widget's inline init() must not run
      // before its library is on the page. Resolve on error too — one dead
      // CDN must not stop everything after it.
      script.addEventListener('load', () => resolve(), { once: true })
      script.addEventListener('error', () => resolve(), { once: true })
      carrier.replaceWith(script)
    } else {
      carrier.replaceWith(script)
      resolve()
    }
  })
}

export function CustomHtml({ html, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Keyed by the markup itself: React StrictMode runs effects twice in dev,
  // and a second pass would execute every script a second time.
  const ranFor = useRef<string | null>(null)

  useEffect(() => {
    const host = ref.current
    if (!host || !html) return
    if (ranFor.current === html) return
    ranFor.current = html

    let cancelled = false
    const carriers = Array.from(host.querySelectorAll(`[${SCRIPT_CARRIER_ATTR}]`))
    if (carriers.length === 0) return

    void (async () => {
      for (const carrier of carriers) {
        if (cancelled) return
        // The node can already be gone if a previous script rewrote the
        // container — plenty of embeds do exactly that.
        if (!carrier.isConnected) continue
        try {
          await runCarrier(carrier)
        } catch (err) {
          console.warn('[custom-html] script failed', err)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [html])

  if (!html) return null

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      // Server-rendered verbatim. React never diffs the inside of a
      // dangerouslySetInnerHTML node, so the effect above is free to swap the
      // carriers for live scripts without fighting hydration.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
