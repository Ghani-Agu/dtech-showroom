export const locales = ['en', 'fr', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
}

export function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale)
}
