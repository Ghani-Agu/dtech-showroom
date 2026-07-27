/**
 * custom-html.ts — light sanitizer for the admin-authored HTML block shown
 * on product pages.
 *
 * Trust model: only admins/staff with the "products" section can write this
 * content, so the goal is defense-in-depth (strip active script vectors),
 * not bulletproof filtering of hostile input. iframes (YouTube embeds),
 * tables, images and inline styles are deliberately allowed.
 */
export function sanitizeCustomHtml(html: string): string {
  if (!html) return ''
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
