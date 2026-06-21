/**
 * Email templates — small inline functions returning { html, text }.
 *
 * We deliberately avoid pulling in @react-email or a framework here:
 *   - The templates are short.
 *   - Inline-only HTML survives every email client.
 *   - It's easy to read and theme without extra deps.
 *
 * All templates accept absolute URLs (no relative). Callers compute these
 * from NEXT_PUBLIC_SITE_URL.
 */

const BRAND = {
  bg: '#0a0a0d',
  fg: '#f5f5f3',
  accent: '#3ec5e0',
  mint: '#7ce0c3',
  muted: 'rgba(245,245,243,0.78)',
  faint: 'rgba(245,245,243,0.5)',
  panel: '#11121a',
  line: 'rgba(245,245,243,0.10)',
}

function brandHeader(siteUrl: string): string {
  return `
    <div style="padding:24px 32px 12px;">
      <p style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.faint};margin:0 0 6px;">
        D-TECH Algérie
      </p>
      <a href="${siteUrl}" style="display:inline-flex;align-items:center;gap:8px;color:${BRAND.fg};text-decoration:none;font-family:'Inter',system-ui,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.015em;">
        D-Tech<span style="color:${BRAND.mint};">.</span>
      </a>
    </div>
    <div style="height:1px;background:${BRAND.line};margin:0 32px;"></div>
  `
}

function brandFooter(opts: {
  siteUrl: string
  unsubscribeUrl?: string
  rawSubscriberEmail?: string
}): string {
  const { siteUrl, unsubscribeUrl, rawSubscriberEmail } = opts
  return `
    <div style="height:1px;background:${BRAND.line};margin:32px 32px 0;"></div>
    <div style="padding:18px 32px 28px;font-family:'Inter',system-ui,sans-serif;font-size:12px;color:${BRAND.faint};line-height:1.6;">
      ${rawSubscriberEmail ? `Vous recevez cet email parce que <strong style="color:${BRAND.muted};font-weight:500;">${escapeHtml(rawSubscriberEmail)}</strong> est abonné à la newsletter D-Tech.<br/>` : ''}
      ${unsubscribeUrl
        ? `<a href="${unsubscribeUrl}" style="color:${BRAND.accent};text-decoration:underline;">Me désabonner</a> · `
        : ''}
      <a href="${siteUrl}" style="color:${BRAND.accent};text-decoration:underline;">d-techalgerie.com</a>
      <br/>
      © ${new Date().getFullYear()} D-Tech Algérie — Cité 05 Juillet, Bab Ezzouar, Alger.
    </div>
  `
}

function shell(inner: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#04060c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#04060c;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.bg};border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden;">
        <tr><td>${inner}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  )
}

// ── Confirmation (double-opt-in) ──────────────────────────────────────
export function confirmationTemplate(opts: {
  siteUrl: string
  confirmUrl: string
  locale?: string
}): { html: string; text: string } {
  const { siteUrl, confirmUrl, locale = 'fr' } = opts
  const txt = LOCALE_STRINGS[locale] ?? DEFAULT_CONFIRMATION_STRINGS
  const inner = `
    ${brandHeader(siteUrl)}
    <div style="padding:32px;font-family:'Inter',system-ui,sans-serif;color:${BRAND.fg};">
      <h1 style="margin:0 0 14px;font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">
        ${escapeHtml(txt.confirmTitle)}<span style="color:${BRAND.mint};">.</span>
      </h1>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
        ${escapeHtml(txt.confirmLead)}
      </p>
      <a href="${confirmUrl}" style="display:inline-block;background:${BRAND.mint};color:#04060c;text-decoration:none;font-weight:700;font-size:14px;padding:13px 22px;border-radius:999px;">
        ${escapeHtml(txt.confirmCta)} &rarr;
      </a>
      <p style="margin:24px 0 0;font-size:12.5px;line-height:1.55;color:${BRAND.faint};">
        ${escapeHtml(txt.confirmFallback)}<br/>
        <a href="${confirmUrl}" style="color:${BRAND.accent};word-break:break-all;">${confirmUrl}</a>
      </p>
      <p style="margin:18px 0 0;font-size:12.5px;color:${BRAND.faint};">
        ${escapeHtml(txt.confirmIgnore)}
      </p>
    </div>
    ${brandFooter({ siteUrl })}
  `
  const text = `${txt.confirmTitle}\n\n${txt.confirmLead}\n\n${confirmUrl}\n\n${txt.confirmIgnore}`
  return { html: shell(inner), text }
}

// ── Campaign envelope (wraps the admin-authored body) ─────────────────
export function campaignEnvelope(opts: {
  siteUrl: string
  preheader?: string
  bodyHtml: string
  unsubscribeUrl: string
  subscriberEmail: string
  /** Marker tag for the tracking pixel — when set, an <img> is appended. */
  trackingPixelUrl?: string
}): { html: string; text: string } {
  const {
    siteUrl,
    preheader,
    bodyHtml,
    unsubscribeUrl,
    subscriberEmail,
    trackingPixelUrl,
  } = opts

  const inner = `
    ${preheader ? `<div style="display:none;font-size:1px;line-height:1px;color:#04060c;opacity:0;max-height:0;max-width:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ''}
    ${brandHeader(siteUrl)}
    <div style="padding:28px 32px;font-family:'Inter',system-ui,sans-serif;color:${BRAND.fg};font-size:15px;line-height:1.65;">
      ${bodyHtml}
    </div>
    ${brandFooter({ siteUrl, unsubscribeUrl, rawSubscriberEmail: subscriberEmail })}
    ${trackingPixelUrl ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;border:0;outline:0;text-decoration:none;width:1px;height:1px;" />` : ''}
  `
  // Plain-text version — strip tags coarsely.
  const text = bodyHtml
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { html: shell(inner), text: `${text}\n\nMe désabonner: ${unsubscribeUrl}` }
}

// ── i18n strings for the confirmation email ───────────────────────────
type ConfirmationStrings = {
  confirmTitle: string
  confirmLead: string
  confirmCta: string
  confirmFallback: string
  confirmIgnore: string
}

const DEFAULT_CONFIRMATION_STRINGS: ConfirmationStrings = {
  confirmTitle: 'Confirmez votre inscription',
  confirmLead:
    'Cliquez sur le bouton ci-dessous pour confirmer votre inscription à la newsletter D-Tech. Vous recevrez les nouveaux produits, les offres et les annonces.',
  confirmCta: 'Confirmer mon inscription',
  confirmFallback: "Si le bouton ne marche pas, copiez ce lien dans votre navigateur :",
  confirmIgnore:
    "Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message — aucune inscription n'aura lieu.",
}

const LOCALE_STRINGS: Record<string, ConfirmationStrings> = {
  fr: DEFAULT_CONFIRMATION_STRINGS,
  en: {
    confirmTitle: 'Confirm your subscription',
    confirmLead:
      "Click the button below to confirm your subscription to the D-Tech newsletter. You'll receive new product launches, offers, and updates.",
    confirmCta: 'Confirm subscription',
    confirmFallback: "If the button doesn't work, copy this link into your browser:",
    confirmIgnore: "If you didn't request this, just ignore — nothing will happen.",
  },
  ar: {
    confirmTitle: 'تأكيد الاشتراك',
    confirmLead:
      'انقر على الزر أدناه لتأكيد اشتراكك في النشرة الإخبارية لـ D-Tech. ستصلك المنتجات الجديدة والعروض والتحديثات.',
    confirmCta: 'تأكيد الاشتراك',
    confirmFallback: 'إذا لم يعمل الزر، انسخ هذا الرابط إلى متصفحك:',
    confirmIgnore: 'إن لم تكن صاحب الطلب، تجاهل هذه الرسالة — لن يتم تسجيل أي اشتراك.',
  },
}
