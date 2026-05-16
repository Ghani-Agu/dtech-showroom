import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    '[email] RESEND_API_KEY is not set — password reset emails will fail in production'
  )
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null

export const FROM = {
  email: process.env.RESEND_FROM_EMAIL ?? 'noreply@d-techalgerie.com',
  name: process.env.RESEND_FROM_NAME ?? 'Dtech Algérie',
}

export function getFromHeader(): string {
  return `${FROM.name} <${FROM.email}>`
}
