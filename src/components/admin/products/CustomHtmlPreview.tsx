'use client'

/**
 * CustomHtmlPreview — "Aperçu" for the product "Code HTML" block.
 *
 * ROUND 22. The block executes its scripts on the public page now, so the
 * admin needs a way to see whether a pasted embed actually works BEFORE
 * publishing it — previously the only feedback loop was "save, open the
 * storefront, guess".
 *
 * It renders into a sandboxed <iframe srcdoc>, deliberately NOT innerHTML:
 *
 *   - an embed that calls document.write(), throws, or navigates cannot take
 *     the product form down with it;
 *   - `sandbox="allow-scripts"` (no allow-same-origin) means the preview
 *     cannot read the admin session cookie or poke at the parent page;
 *   - the frame is only created when you ask for it, so simply opening the
 *     Contenu tab never runs anybody's code.
 *
 * The frame reports its own height back through postMessage so the preview
 * grows with the content instead of scrolling in a fixed box.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'

const FRAME_CSS = `
  :root { color-scheme: dark; }
  body {
    margin: 0; padding: 14px 16px;
    background: #0b0e13; color: #d7dbe3;
    font: 15px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif;
    overflow-wrap: break-word;
  }
  h2, h3, h4 { color: #fff; margin: 16px 0 8px; line-height: 1.25; }
  h2 { font-size: 21px } h3 { font-size: 18px } h4 { font-size: 16px }
  p { margin: 0 0 10px }
  ul, ol { margin: 0 0 12px; padding-inline-start: 20px }
  a { color: #35d0d6 }
  img, video, iframe { max-width: 100%; border-radius: 10px }
  iframe { width: 100%; aspect-ratio: 16/9; height: auto; border: 0 }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px }
  th, td { border: 1px solid #232935; padding: 8px 11px; text-align: start }
`

function buildDoc(html: string, channel: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${FRAME_CSS}</style></head><body>
${html}
<script>
(function () {
  function send() {
    parent.postMessage(
      { __dtechPreview: ${JSON.stringify(channel)}, h: document.documentElement.scrollHeight },
      '*'
    )
  }
  window.addEventListener('load', send)
  new ResizeObserver(send).observe(document.documentElement)
  window.addEventListener('error', function (e) {
    parent.postMessage(
      { __dtechPreview: ${JSON.stringify(channel)}, err: String(e.message || e) },
      '*'
    )
  })
  send()
})()
<\/script>
</body></html>`
}

export function CustomHtmlPreview({ html }: { html: string }) {
  const channel = useId()
  const [open, setOpen] = useState(false)
  // Snapshot: typing in the textarea must not re-run an embed on every
  // keystroke. The frame refreshes when you open it or press "Actualiser".
  const [doc, setDoc] = useState<string | null>(null)
  const [height, setHeight] = useState(160)
  const [err, setErr] = useState<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as { __dtechPreview?: string; h?: number; err?: string }
      if (!d || d.__dtechPreview !== channel) return
      if (typeof d.h === 'number') setHeight(Math.min(1400, Math.max(80, d.h + 4)))
      if (d.err) setErr(d.err)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [channel])

  function refresh() {
    setErr(null)
    setDoc(buildDoc(html, channel))
  }

  if (!html.trim()) return null

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!open) refresh()
            setOpen((v) => !v)
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-white/[0.07]"
        >
          {open ? <EyeOff size={13} /> : <Eye size={13} />}
          {open ? 'Masquer l’aperçu' : 'Aperçu du rendu'}
        </button>
        {open ? (
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] px-3 py-1.5 font-body text-xs text-[var(--admin-text-secondary)] transition-colors hover:text-white"
          >
            <RefreshCw size={13} />
            Actualiser
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.08]">
          <iframe
            ref={frameRef}
            title="Aperçu du code HTML"
            sandbox="allow-scripts allow-popups allow-forms"
            srcDoc={doc ?? ''}
            style={{ width: '100%', height, border: 0, display: 'block' }}
          />
        </div>
      ) : null}

      {open && err ? (
        <p className="mt-1 font-mono text-[11px] text-red-400">
          Erreur dans le code : {err}
        </p>
      ) : null}
    </div>
  )
}
